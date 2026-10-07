import { MongoClient } from 'mongodb';

const seed = [
  { id: 'gst-sep', title: 'GSTR-3B · September', type: 'GST', dueDate: '2026-10-20', status: 'upcoming', assignee: 'Aditi Sharma', notes: 'Reconcile purchase register before filing.' },
  { id: 'tds-q2', title: 'TDS Return · Q2', type: 'TDS', dueDate: '2026-10-31', status: 'upcoming', assignee: 'Rahul Mehta', notes: 'Collect Form 16A details.' },
  { id: 'adv-q3', title: 'Advance Tax · Q3', type: 'Advance Tax', dueDate: '2026-12-15', status: 'upcoming', assignee: 'Aditi Sharma', notes: 'Estimate year-end income and tax liability.' },
  { id: 'gst-aug', title: 'GSTR-3B · August', type: 'GST', dueDate: '2026-09-20', status: 'overdue', assignee: 'Aditi Sharma', notes: 'Payment pending.' },
  { id: 'tds-q1', title: 'TDS Return · Q1', type: 'TDS', dueDate: '2026-07-31', status: 'completed', assignee: 'Rahul Mehta', notes: 'Acknowledgement received.' }
];

let collection;
let settingsCollection;

const defaultSettings = {
  businessName: 'Studio Vertex',
  gstin: '27AABCU9603R1ZM',
  financialYear: '2026-27',
  alerts: { email: true, overdue: true, digest: false }
};

export async function connectDatabase() {
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  collection = client.db().collection('filings');
  settingsCollection = client.db().collection('workspaceSettings');
  await collection.createIndex({ tenantId: 1, id: 1 }, { unique: true });
  if (await collection.countDocuments() === 0) await collection.insertMany(seed.map((filing) => ({ ...filing, tenantId: 'demo-tenant' })));
  await settingsCollection.updateOne({ tenantId: 'demo-tenant' }, { $setOnInsert: { tenantId: 'demo-tenant', ...defaultSettings } }, { upsert: true });
  console.log('Connected to MongoDB Atlas');
}

export async function getFilings(tenantId) {
  return collection.find({ tenantId }, { projection: { _id: 0 } }).sort({ dueDate: 1 }).toArray();
}

export async function createFiling(filing) {
  await collection.insertOne(filing);
  return filing;
}

export async function updateFiling(tenantId, id, changes) {
  return collection.findOneAndUpdate({ tenantId, id }, { $set: changes }, { returnDocument: 'after', projection: { _id: 0 } });
}

export async function deleteFiling(tenantId, id) {
  return collection.deleteOne({ tenantId, id });
}

export async function getSettings(tenantId) {
  return settingsCollection.findOne({ tenantId }, { projection: { _id: 0, tenantId: 0 } });
}

export async function updateSettings(tenantId, changes) {
  await settingsCollection.updateOne({ tenantId }, { $set: changes }, { upsert: true });
  return getSettings(tenantId);
}
