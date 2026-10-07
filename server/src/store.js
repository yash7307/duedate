import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const filePath = join(root, 'data', 'filings.json');

const seed = [
  { id: 'gst-sep', title: 'GSTR-3B · September', type: 'GST', dueDate: '2026-10-20', status: 'upcoming', assignee: 'Aditi Sharma', notes: 'Reconcile purchase register before filing.' },
  { id: 'tds-q2', title: 'TDS Return · Q2', type: 'TDS', dueDate: '2026-10-31', status: 'upcoming', assignee: 'Rahul Mehta', notes: 'Collect Form 16A details.' },
  { id: 'adv-q3', title: 'Advance Tax · Q3', type: 'Advance Tax', dueDate: '2026-12-15', status: 'upcoming', assignee: 'Aditi Sharma', notes: 'Estimate year-end income and tax liability.' },
  { id: 'gst-aug', title: 'GSTR-3B · August', type: 'GST', dueDate: '2026-09-20', status: 'overdue', assignee: 'Aditi Sharma', notes: 'Payment pending.' },
  { id: 'tds-q1', title: 'TDS Return · Q1', type: 'TDS', dueDate: '2026-07-31', status: 'completed', assignee: 'Rahul Mehta', notes: 'Acknowledgement received.' }
];

function ensureFile() {
  if (!existsSync(filePath)) {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify(seed, null, 2));
  }
}

export function getFilings() {
  ensureFile();
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

export function saveFilings(filings) {
  ensureFile();
  writeFileSync(filePath, JSON.stringify(filings, null, 2));
}
