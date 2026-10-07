import { MongoClient } from 'mongodb';

const seed = [
  { id: 'gst-sep', title: 'GSTR-3B · September', type: 'GST', dueDate: '2026-10-20', status: 'upcoming', assignee: 'Aditi Sharma', notes: 'Reconcile purchase register before filing.' },
  { id: 'tds-q2', title: 'TDS Return · Q2', type: 'TDS', dueDate: '2026-10-31', status: 'upcoming', assignee: 'Rahul Mehta', notes: 'Collect Form 16A details.' },
  { id: 'adv-q3', title: 'Advance Tax · Q3', type: 'Advance Tax', dueDate: '2026-12-15', status: 'upcoming', assignee: 'Aditi Sharma', notes: 'Estimate year-end income and tax liability.' },
  { id: 'gst-aug', title: 'GSTR-3B · August', type: 'GST', dueDate: '2026-09-20', status: 'overdue', assignee: 'Aditi Sharma', notes: 'Payment pending.' },
  { id: 'tds-q1', title: 'TDS Return · Q1', type: 'TDS', dueDate: '2026-07-31', status: 'completed', assignee: 'Rahul Mehta', notes: 'Acknowledgement received.' }
];

let collection;

export async function connectDatabase() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  collection = client.db().collection('filings');
  await collection.createIndex({ id: 1 }, { unique: true });
  if (await collection.countDocuments() === 0) await collection.insertMany(seed);
  console.log('Connected to MongoDB Atlas');
}

export async function getFilings() {
  return collection.find({}, { projection: { _id: 0 } }).sort({ dueDate: 1 }).toArray();
}

export async function createFiling(filing) {
  await collection.insertOne(filing);
  return filing;
}

export async function updateFiling(id, changes) {
  return collection.findOneAndUpdate({ id }, { $set: changes }, { returnDocument: 'after', projection: { _id: 0 } });
}
