# DueDate

An approachable small-business compliance dashboard for tracking GST, TDS, advance-tax, and ROC filing deadlines.

## What it includes

- Responsive React dashboard with search, filters, upcoming/overdue summaries, and filing completion actions.
- Express API for dashboard data and filing create/update operations.
- Seeded local JSON persistence so it runs without configuring a database.

## Run locally

```bash
npm install
npm run install:all
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:4000`.

For a production-ready evolution, replace `server/data/filings.json` with PostgreSQL and add authentication, tenant guards, and a scheduled reminder worker.
