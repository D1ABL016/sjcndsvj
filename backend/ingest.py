import sys
import time
from datetime import datetime, timedelta, timezone

import requests
from sqlalchemy.dialects.postgresql import insert

from backend.config import ELEXON_BASE_URL
from backend.db import SessionLocal
from backend.models import ActualGeneration, ForecastGeneration


def get_json(path, params):
    url = f"{ELEXON_BASE_URL}{path}"
    for attempt in range(3):
        resp = requests.get(url, params=params, timeout=60)
        if resp.status_code == 200:
            return resp.json()
        if attempt < 2:
            time.sleep(2 ** attempt)
    resp.raise_for_status()


def to_actual_row(rec):
    return {
        "start_time": rec["startTime"],
        "settlement_date": rec["settlementDate"],
        "settlement_period": rec["settlementPeriod"],
        "publish_time": rec["publishTime"],
        "generation_mw": rec["generation"],
    }


def to_forecast_row(rec):
    return {
        "start_time": rec["startTime"],
        "publish_time": rec["publishTime"],
        "generation_mw": rec["generation"],
    }


def fetch_actuals(day_from, day_to):
    data = get_json("/datasets/FUELHH/stream", {
        "settlementDateFrom": day_from,
        "settlementDateTo": day_to,
        "fuelType": "WIND",
    })
    wind = [r for r in data if r.get("fuelType") == "WIND"]
    return [to_actual_row(r) for r in wind]


def fetch_forecasts(time_from, time_to):
    data = get_json("/datasets/WINDFOR/stream", {
        "publishDateTimeFrom": time_from,
        "publishDateTimeTo": time_to,
    })
    return [to_forecast_row(r) for r in data]


def save_actuals(db, rows):
    if not rows:
        return 0
    stmt = insert(ActualGeneration).values(rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=["start_time"],
        set_={
            "settlement_date": stmt.excluded.settlement_date,
            "settlement_period": stmt.excluded.settlement_period,
            "publish_time": stmt.excluded.publish_time,
            "generation_mw": stmt.excluded.generation_mw,
        },
    )
    db.execute(stmt)
    db.commit()
    return len(rows)


def save_forecasts(db, rows):
    if not rows:
        return 0
    stmt = insert(ForecastGeneration).values(rows)
    stmt = stmt.on_conflict_do_nothing()
    db.execute(stmt)
    db.commit()
    return len(rows)


def run_backfill(start_date, end_date):
    db = SessionLocal()
    try:
        d = datetime.strptime(start_date, "%Y-%m-%d").date()
        end_d = datetime.strptime(end_date, "%Y-%m-%d").date()
        total_actual = 0
        while d <= end_d:
            chunk_end = min(d + timedelta(days=6), end_d)
            print(f"actuals {d} to {chunk_end}...")
            rows = fetch_actuals(d.isoformat(), chunk_end.isoformat())
            total_actual += save_actuals(db, rows)
            d = chunk_end + timedelta(days=1)
        print(f"actuals done: {total_actual} rows")

        dt = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc) + timedelta(days=1)
        total_forecast = 0
        while dt < end_dt:
            chunk_end = dt + timedelta(days=1)
            print(f"forecasts {dt.isoformat()} to {chunk_end.isoformat()}...")
            rows = fetch_forecasts(dt.isoformat(), chunk_end.isoformat())
            total_forecast += save_forecasts(db, rows)
            dt = chunk_end
        print(f"forecasts done: {total_forecast} rows")
    finally:
        db.close()


def run_incremental():
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)

        day_from = (now - timedelta(days=3)).strftime("%Y-%m-%d")
        day_to = now.strftime("%Y-%m-%d")
        print(f"incremental actuals {day_from} to {day_to}...")
        rows = fetch_actuals(day_from, day_to)
        n = save_actuals(db, rows)
        print(f"actuals: {n} rows upserted")

        from backend.queries import latest_forecast_publish
        latest = latest_forecast_publish(db)

        if latest is None:
            print("forecast table empty — run: python ingest.py backfill 2025-12-30 2026-02-01")
            return

        time_from = (latest - timedelta(hours=2)).isoformat()
        time_to = now.isoformat()
        print(f"incremental forecasts {time_from} to {time_to}...")
        rows = fetch_forecasts(time_from, time_to)
        n = save_forecasts(db, rows)
        print(f"forecasts: {n} rows inserted")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) >= 4 and sys.argv[1] == "backfill":
        run_backfill(sys.argv[2], sys.argv[3])
    else:
        run_incremental()
