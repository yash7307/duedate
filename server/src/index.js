import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { getFilings, saveFilings } from './store.js';

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
app.get('/api/filings', (_req, res) => res.json(getFilings().map(normalized)));
app.get('/api/dashboard', (_req, res) => {
  const filings = getFilings().map(normalized);
  const summary = {
    total: filings.length,
    upcoming: filings.filter((item) => item.status === 'upcoming').length,
    overdue: filings.filter((item) => item.status === 'overdue').length,
    completed: filings.filter((item) => item.status === 'completed').length
  };
  res.json({ summary, nextDeadline: filings.filter((item) => item.status === 'upcoming').sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] || null });
});
app.post('/api/filings', (req, res) => {
  const { title, type, dueDate, assignee = 'Unassigned', notes = '' } = req.body;
  if (!title || !type || !dueDate) return res.status(400).json({ message: 'Title, filing type, and due date are required.' });
  const filing = normalized({ id: crypto.randomUUID(), title, type, dueDate, assignee, notes, status: 'upcoming' });
  const filings = getFilings();
  filings.unshift(filing);
  saveFilings(filings);
  res.status(201).json(filing);
});
app.patch('/api/filings/:id', (req, res) => {
  const filings = getFilings();
  const index = filings.findIndex((item) => item.id === req.params.id);
  if (index < 0) return res.status(404).json({ message: 'Filing not found.' });
  filings[index] = normalized({ ...filings[index], ...req.body });
  saveFilings(filings);
  res.json(filings[index]);
});
app.listen(port, () => console.log(`DueDate API running at http://localhost:${port}`));
