import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { DateTime } from 'luxon';
import { z } from 'zod';
import { createFiling, deleteFiling, getFilings, getSettings, updateFiling, updateSettings } from './store.js';

const filingSchema = z.object({ title: z.string().trim().min(1).max(120), type: z.enum(['GST', 'TDS', 'Advance Tax', 'ROC']), dueDate: z.iso.date(), assignee: z.string().trim().max(100).optional(), notes: z.string().trim().max(2000).optional() });
const filingUpdateSchema = z.object({ status: z.enum(['upcoming', 'completed']).optional(), title: z.string().trim().min(1).max(120).optional(), notes: z.string().trim().max(2000).optional(), assignee: z.string().trim().max(100).optional() }).strict().refine((value) => Object.keys(value).length > 0);
const settingsSchema = z.object({ businessName: z.string().trim().min(1).max(120), gstin: z.string().trim().regex(/^[0-9A-Z]{15}$/), financialYear: z.string().regex(/^\d{4}-\d{2}$/), alerts: z.object({ email: z.boolean(), overdue: z.boolean(), digest: z.boolean() }) });

function normalized(filing, timezone, now = DateTime.utc()) {
  const today = now.setZone(timezone).toISODate();
  return filing.status !== 'completed' && filing.dueDate < today ? { ...filing, status: 'overdue' } : filing;
}
function invalid(res, error) { return res.status(400).json({ message: 'Invalid request.', fields: error.flatten().fieldErrors }); }

export function createApp(store = { createFiling, deleteFiling, getFilings, getSettings, updateFiling, updateSettings }, now = () => DateTime.utc(), config = {}) {
  const jwtSecret = config.jwtSecret || process.env.JWT_SECRET;
  const app = express();
  app.use(cors({ origin: config.corsOrigin || process.env.CLIENT_ORIGIN || 'http://localhost:5173', methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] }));
  app.use(express.json({ limit: '100kb' }));
  app.use(morgan('dev'));
  app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 250, standardHeaders: true, legacyHeaders: false }));
  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  if (!config.disableAuth) app.use('/api', (req, res, next) => {
    if (!jwtSecret) return res.status(500).json({ message: 'Server authentication is not configured.' });
    const header = req.get('authorization');
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Authentication required.' });
    try { req.user = jwt.verify(header.slice(7), jwtSecret); next(); } catch { res.status(401).json({ message: 'Invalid or expired token.' }); }
  });
  app.use('/api', (req, _res, next) => { req.tenantId = req.user?.tenantId || config.tenantId || 'test-tenant'; req.timezone = req.user?.timezone || 'Asia/Kolkata'; next(); });

  app.get('/api/filings', async (req, res, next) => { try { res.json((await store.getFilings(req.tenantId)).map((filing) => normalized(filing, req.timezone, now()))); } catch (error) { next(error); } });
  app.get('/api/dashboard', async (req, res, next) => { try { const filings = (await store.getFilings(req.tenantId)).map((filing) => normalized(filing, req.timezone, now())); const summary = { total: filings.length, upcoming: filings.filter((item) => item.status === 'upcoming').length, overdue: filings.filter((item) => item.status === 'overdue').length, completed: filings.filter((item) => item.status === 'completed').length }; res.json({ summary, nextDeadline: filings.filter((item) => item.status === 'upcoming').sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] || null }); } catch (error) { next(error); } });
  app.post('/api/filings', async (req, res, next) => { const parsed = filingSchema.safeParse(req.body); if (!parsed.success) return invalid(res, parsed.error); try { const filing = { id: crypto.randomUUID(), tenantId: req.tenantId, ...parsed.data, assignee: parsed.data.assignee || 'Unassigned', notes: parsed.data.notes || '', status: 'upcoming' }; res.status(201).json(await store.createFiling(normalized(filing, req.timezone, now()))); } catch (error) { next(error); } });
  app.patch('/api/filings/:id', async (req, res, next) => { const parsed = filingUpdateSchema.safeParse(req.body); if (!parsed.success) return invalid(res, parsed.error); try { const filing = await store.updateFiling(req.tenantId, req.params.id, parsed.data); if (!filing) return res.status(404).json({ message: 'Filing not found.' }); res.json(normalized(filing, req.timezone, now())); } catch (error) { next(error); } });
  app.delete('/api/filings/:id', async (req, res, next) => { try { const result = await store.deleteFiling(req.tenantId, req.params.id); if (!result.deletedCount) return res.status(404).json({ message: 'Filing not found.' }); res.status(204).end(); } catch (error) { next(error); } });
  app.get('/api/settings', async (req, res, next) => { try { res.json(await store.getSettings(req.tenantId)); } catch (error) { next(error); } });
  app.put('/api/settings', async (req, res, next) => { const parsed = settingsSchema.safeParse(req.body); if (!parsed.success) return invalid(res, parsed.error); try { res.json(await store.updateSettings(req.tenantId, parsed.data)); } catch (error) { next(error); } });
  app.use((error, _req, res, _next) => { if (error?.code === 11000) return res.status(409).json({ message: 'A record with these details already exists.' }); console.error(error); res.status(500).json({ message: 'Unable to complete this request.' }); });
  return app;
}
