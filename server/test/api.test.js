import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { DateTime } from 'luxon';
import { createApp } from '../src/app.js';

const fixedNow = () => DateTime.fromISO('2026-10-07T18:29:59.000Z');

function makeStore(seed = []) {
  let filings = structuredClone(seed);
  let settings = { businessName: 'Studio Vertex', gstin: '27AABCU9603R1ZM', financialYear: '2026-27', alerts: { email: true, overdue: true, digest: false } };
  return {
    createFiling: vi.fn(async (filing) => { if (filings.some((item) => item.id === filing.id)) throw new Error('duplicate key'); filings.push(filing); return filing; }),
    deleteFiling: vi.fn(async (_tenantId, id) => { const oldLength = filings.length; filings = filings.filter((filing) => filing.id !== id); return { deletedCount: oldLength - filings.length }; }),
    getFilings: vi.fn(async () => structuredClone(filings)),
    getSettings: vi.fn(async () => structuredClone(settings)),
    updateFiling: vi.fn(async (_tenantId, id, changes) => { const index = filings.findIndex((filing) => filing.id === id); if (index < 0) return null; filings[index] = { ...filings[index], ...changes }; return structuredClone(filings[index]); }),
    updateSettings: vi.fn(async (_tenantId, changes) => { settings = { ...settings, ...changes }; return structuredClone(settings); })
  };
}

describe('DueDate API', () => {
  let store;
  let app;

  beforeEach(() => {
    store = makeStore([
      { id: 'today', title: 'Due today', type: 'GST', dueDate: '2026-10-07', status: 'upcoming', assignee: 'A', notes: '' },
      { id: 'late', title: 'Late', type: 'TDS', dueDate: '2026-10-06', status: 'upcoming', assignee: 'A', notes: '' },
      { id: 'done', title: 'Done', type: 'GST', dueDate: '2026-10-01', status: 'completed', assignee: 'A', notes: '' },
      { id: 'next', title: 'Next', type: 'Advance Tax', dueDate: '2026-10-08', status: 'upcoming', assignee: 'A', notes: '' }
    ]);
    app = createApp(store, fixedNow, { disableAuth: true });
  });

  it('returns health status without authentication (security gap)', async () => {
    await request(app).get('/api/health').expect(200, { ok: true });
  });

  it('normalizes overdue filings while keeping due-today and completed filings intact', async () => {
    const { body } = await request(app).get('/api/filings').expect(200);
    expect(body.find((filing) => filing.id === 'late').status).toBe('overdue');
    expect(body.find((filing) => filing.id === 'today').status).toBe('upcoming');
    expect(body.find((filing) => filing.id === 'done').status).toBe('completed');
  });

  it('calculates dashboard status counts and next deadline at the date boundary', async () => {
    const { body } = await request(app).get('/api/dashboard').expect(200);
    expect(body.summary).toEqual({ total: 4, upcoming: 2, overdue: 1, completed: 1 });
    expect(body.nextDeadline.id).toBe('today');
  });

  it('creates a filing and supplies default optional fields', async () => {
    const { body } = await request(app).post('/api/filings').send({ title: 'GSTR-1', type: 'GST', dueDate: '2026-11-11' }).expect(201);
    expect(body).toMatchObject({ title: 'GSTR-1', assignee: 'Unassigned', status: 'upcoming' });
    expect(store.createFiling).toHaveBeenCalledOnce();
  });

  it('rejects missing required filing fields', async () => {
    await request(app).post('/api/filings').send({ title: 'Missing date' }).expect(400).expect(({ body }) => expect(body.message).toBe('Invalid request.'));
  });

  it('marks a filing complete and returns 404 for unknown filings', async () => {
    await request(app).patch('/api/filings/today').send({ status: 'completed' }).expect(200).expect(({ body }) => expect(body.status).toBe('completed'));
    await request(app).patch('/api/filings/missing').send({ status: 'completed' }).expect(404);
  });

  it('deletes a filing and returns 404 for unknown records', async () => {
    await request(app).delete('/api/filings/today').expect(204);
    await request(app).delete('/api/filings/missing').expect(404);
  });

  it('gets and updates workspace settings with validation', async () => {
    await request(app).get('/api/settings').expect(200).expect(({ body }) => expect(body.businessName).toBe('Studio Vertex'));
    await request(app).put('/api/settings').send({ businessName: 'New Co' }).expect(400);
    await request(app).put('/api/settings').send({ businessName: 'New Co', gstin: '22AAAAA0000A1Z5', financialYear: '2026-27', alerts: { email: false, overdue: true, digest: true } }).expect(200).expect(({ body }) => expect(body.businessName).toBe('New Co'));
  });

  it('returns a generic error when the persistence layer rejects a duplicate', async () => {
    store.createFiling.mockRejectedValueOnce(new Error('E11000 duplicate key'));
    await request(app).post('/api/filings').send({ title: 'Duplicate', type: 'GST', dueDate: '2026-11-11' }).expect(500, { message: 'Unable to complete this request.' });
  });
});
