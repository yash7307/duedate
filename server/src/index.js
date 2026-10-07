import 'dotenv/config';
import { createApp } from './app.js';
import { connectDatabase } from './store.js';

const port = process.env.PORT || 4000;

connectDatabase()
  .then(() => createApp().listen(port, () => console.log(`DueDate API running at http://localhost:${port}`)))
  .catch((error) => { console.error('MongoDB connection failed:', error.message); process.exit(1); });
