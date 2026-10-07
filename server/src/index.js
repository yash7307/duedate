import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDatabase, createFiling, getFilings, updateFiling } from './store.js';

const app = express();
const port = process.env.PORT || 4000;
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

function normalized(filing) {
  const today = new Date().toISOString().slice(0, 10);
  return filing.status !== 'completed' && filing.dueDate < today ? { ...filing, status: 'overdue' } : filing;
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/filings', async (_req, res, next) => {
  try { res.json((await getFilings()).map(normalized)); } catch (error) { next(error); }
});
app.get('/api/dashboard', async (_req, res, next) => {
  try {
    const filings = (await getFilings()).map(normalized);
    const summary = { total: filings.length, upcoming: filings.filter((item) => item.status === 'upcoming').length, overdue: filings.filter((item) => item.status === 'overdue').length, completed: filings.filter((item) => item.status === 'completed').length };
    res.json({ summary, nextDeadline: filings.filter((item) => item.status === 'upcoming').sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] || null });
  } catch (error) { next(error); }
});
app.post('/api/filings', async (req, res, next) => {
  const { title, type, dueDate, assignee = 'Unassigned', notes = '' } = req.body;
  if (!title || !type || !dueDate) return res.status(400).json({ message: 'Title, filing type, and due date are required.' });
  try { res.status(201).json(await createFiling(normalized({ id: crypto.randomUUID(), title, type, dueDate, assignee, notes, status: 'upcoming' }))); } catch (error) { next(error); }
});
app.patch('/api/filings/:id', async (req, res, next) => {
  try {
    const filing = await updateFiling(req.params.id, req.body);
    if (!filing) return res.status(404).json({ message: 'Filing not found.' });
    res.json(normalized(filing));
  } catch (error) { next(error); }
});
app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ message: 'Unable to complete this request.' }); });

connectDatabase().then(() => app.listen(port, () => console.log(`DueDate API running at http://localhost:${port}`))).catch((error) => { console.error('MongoDB connection failed:', error.message); process.exit(1); });
