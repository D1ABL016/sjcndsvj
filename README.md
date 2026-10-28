# Wind Forecast Intelligence Dashboard

Analyses the accuracy of Elexon's day-ahead wind generation forecasts (WINDFOR) against actual metered output (FUELHH) for the UK grid. Built as a pilot project to show where and when forecast errors occur so energy trading teams can act on them.

## What it does

- Ingests forecast and actual wind generation data from the Elexon BMRS API
- Selects the latest forecast published before a 09:00 UTC day-ahead cutoff for each delivery hour
- Computes accuracy metrics: MAE, RMSE, bias, nMAE, MAPE
- Presents an interactive dashboard with:
  - **Overview** — headline accuracy %, error stats, worst forecast misses, daily performance charts
  - **Day Analysis** — hourly forecast vs actual overlay with error breakdown for any selected day
  - **Data Explorer** — filterable, sortable interval-level data table
- Supports timezone selection and monthly HTML report export

## Tech stack

- **Backend**: Python, FastAPI, SQLAlchemy ORM, Pydantic, PostgreSQL
- **Frontend**: React, Vite, Recharts
- **Database**: Postgres via Docker Compose

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- Docker and Docker Compose (for Postgres)

### 1. Start the database

```bash
docker compose up -d
```

This starts Postgres on port 5435 and runs `backend/schema.sql` to create tables.

### 2. Set up the backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

### 3. Backfill January 2026 data

```bash
python -m backend.ingest backfill 2025-12-30 2026-02-01
```

This pulls forecast and actual data from the Elexon API. Takes a few minutes.

### 4. Start the backend

```bash
uvicorn backend.main:app --reload
```

Runs on http://localhost:8000.

### 5. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on http://localhost:5173. The Vite dev server proxies `/api` requests to the backend.

### 6. Incremental updates (optional)

Run every 30 minutes via cron to keep data current:

```bash
python -m backend.ingest
```
