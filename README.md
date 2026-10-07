# DueDate

An approachable small-business compliance dashboard for tracking GST, TDS, advance-tax, and ROC filing deadlines.

## What it includes

- Responsive React dashboard with search, filters, upcoming/overdue summaries, and filing completion actions.
- Express API for dashboard data and filing create/update operations.
- MongoDB Atlas persistence for filings and workspace settings. The app seeds starter filings only when the database is empty.

## Run locally

```bash
npm install
npm run install:all
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:4000`.

Create `server/.env` from `server/.env.example` and replace the placeholders with your MongoDB Atlas credentials before starting the API. Never commit this file.

New filings, completion changes, deleted filings, and saved workspace settings are stored in MongoDB. You can inspect the `filings` and `workspaceSettings` collections in Atlas to confirm writes.
