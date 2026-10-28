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

## Project structure

```
analytics-dashboard/
├── CLAUDE.md                  # AI coding assistant rules
├── PLAN.md                    # Original project plan and decisions
├── README.md                  # This file
├── docker-compose.yml         # Postgres container setup
├── .env                       # Environment variables (not committed)
│
├── backend/
│   ├── requirements.txt       # Python dependencies
│   ├── config.py              # App configuration (reads .env via python-dotenv)
│   ├── models.py              # SQLAlchemy ORM models (ActualGeneration, ForecastGeneration)
│   ├── schemas.py             # Pydantic request/response models
│   ├── db.py                  # SQLAlchemy engine, session factory, dependency injection
│   ├── queries.py             # ORM query functions (forecast selection, aggregations)
│   ├── metrics.py             # Pure functions for error metrics (MAE, RMSE, bias, nMAE, MAPE)
│   ├── main.py                # FastAPI app with all API endpoints
│   ├── ingest.py              # Data ingestion script (backfill + incremental from Elexon API)
│   ├── schema.sql             # Database table definitions (run by Docker on first start)
│   └── tests/
│       └── test_metrics.py    # Unit tests for metrics calculations
│
├── frontend/
│   ├── package.json           # Node dependencies and scripts
│   ├── vite.config.js         # Vite config with API proxy to backend
│   ├── index.html             # HTML entry point
│   └── src/
│       ├── main.jsx           # React entry point
│       ├── App.jsx            # Main app layout, tabs, month/timezone selectors
│       ├── App.css            # All dashboard styles
│       ├── api.js             # Fetch helper for API calls
│       └── components/
│           ├── StatCards.jsx   # Hero KPI cards, worst misses, performance snapshot, export
│           ├── DailyChart.jsx  # Daily MAE and bias bar charts
│           ├── SeriesChart.jsx # Hourly forecast vs actual line chart + error bars
│           └── DataTable.jsx   # Filterable, sortable interval data table
```

## How to start the application

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

## API endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/meta` | Analysis window config and table row counts |
| `GET /api/summary?tz=&month=` | Aggregate accuracy metrics for the window |
| `GET /api/daily?tz=&month=` | Per-day breakdown of MAE, RMSE, bias |
| `GET /api/series?date=&tz=` | Hourly forecast vs actual for one day |
| `GET /api/worst?n=&tz=&month=` | Top N largest forecast misses |
| `GET /api/versions?start_time=` | All forecast versions for one interval |

## AI assistance

CSS styling and some UI component fixes were done with the help of Claude. The dashboard layout, chart design, and responsive styling were generated and refined using AI assistance.

