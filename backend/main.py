import re
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.config import WINDOW_FROM, WINDOW_TO, CUTOFF_TIME
from backend.db import get_db
from backend import queries
from backend import metrics
from backend.schemas import (
    MetaResponse, SummaryResponse, DailyRow, SeriesRow, WorstRow, VersionRow,
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MONTH_RE = re.compile(r"^\d{4}-\d{2}$")

window_from = datetime.fromisoformat(WINDOW_FROM.replace("Z", "+00:00"))
window_to = datetime.fromisoformat(WINDOW_TO.replace("Z", "+00:00"))


def _validate_date(s: str) -> str:
    if not DATE_RE.match(s):
        raise HTTPException(400, "bad date format, use YYYY-MM-DD")
    return s


def _parse_tz(tz_name: str):
    if not tz_name or tz_name == "UTC":
        return timezone.utc
    try:
        return ZoneInfo(tz_name)
    except (ZoneInfoNotFoundError, KeyError):
        raise HTTPException(400, f"unknown timezone: {tz_name}")


def _month_range(month_str: str | None):
    if not month_str:
        return window_from, window_to
    if not MONTH_RE.match(month_str):
        raise HTTPException(400, "bad month format, use YYYY-MM")
    year, month = int(month_str[:4]), int(month_str[5:7])
    from_ts = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        to_ts = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        to_ts = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    return from_ts, to_ts


def _convert_rows(rows: list, tz):
    if tz == timezone.utc:
        return rows
    return [
        {**r, "start_time": r["start_time"].astimezone(tz),
         "publish_time": r["publish_time"].astimezone(tz) if r.get("publish_time") else r.get("publish_time")}
        for r in rows
    ]


def _ts(dt, tz=None) -> str | None:
    if dt is None:
        return None
    if tz and tz != timezone.utc:
        dt = dt.astimezone(tz)
    return dt.isoformat()


@app.get("/api/meta", response_model=MetaResponse)
def meta(db: Session = Depends(get_db)):
    counts = queries.table_counts(db)
    return MetaResponse(
        window_from=WINDOW_FROM,
        window_to=WINDOW_TO,
        cutoff_time=CUTOFF_TIME,
        actual_count=counts["actual_count"],
        forecast_count=counts["forecast_count"],
        actual_latest_publish=_ts(counts["actual_latest"]),
        forecast_latest_publish=_ts(counts["forecast_latest"]),
    )


@app.get("/api/summary", response_model=SummaryResponse)
def summary(db: Session = Depends(get_db), tz: str = Query("UTC"), month: str = Query(None)):
    _parse_tz(tz)
    from_ts, to_ts = _month_range(month)
    rows = queries.selected_forecasts(db, from_ts, to_ts, CUTOFF_TIME)
    s = metrics.summarise(rows)
    total_hours = int((to_ts - from_ts).total_seconds() / 3600)
    return SummaryResponse(
        **s,
        expected=total_hours,
        coverage=f"{s['n']}/{total_hours}",
        tz=tz,
        month=month or window_from.strftime("%Y-%m"),
    )


@app.get("/api/daily", response_model=list[DailyRow])
def daily(db: Session = Depends(get_db), tz: str = Query("UTC"), month: str = Query(None)):
    target_tz = _parse_tz(tz)
    from_ts, to_ts = _month_range(month)
    rows = queries.selected_forecasts(db, from_ts, to_ts, CUTOFF_TIME)
    converted = _convert_rows(rows, target_tz)
    return [DailyRow(**d) for d in metrics.by_day(converted)]


@app.get("/api/series", response_model=list[SeriesRow])
def series(db: Session = Depends(get_db), date: str = Query(...), tz: str = Query("UTC")):
    date = _validate_date(date)
    target_tz = _parse_tz(tz)
    day_start = datetime.fromisoformat(f"{date}T00:00:00+00:00")
    day_end = day_start + timedelta(days=1)

    rows = queries.series_for_day(db, day_start, day_end, CUTOFF_TIME)
    return [
        SeriesRow(
            start_time=_ts(r.start_time, target_tz),
            publish_time=_ts(r.publish_time, target_tz),
            forecast_mw=r.forecast_mw,
            actual_mw=r.actual_mw,
            error=(r.forecast_mw - r.actual_mw) if r.actual_mw is not None else None,
        )
        for r in rows
    ]


@app.get("/api/worst", response_model=list[WorstRow])
def worst(db: Session = Depends(get_db), n: int = Query(5, ge=1, le=20), tz: str = Query("UTC"), month: str = Query(None)):
    target_tz = _parse_tz(tz)
    from_ts, to_ts = _month_range(month)
    rows = queries.selected_forecasts(db, from_ts, to_ts, CUTOFF_TIME)
    result = metrics.largest_errors(rows, n)
    return [
        WorstRow(
            start_time=_ts(r["start_time"], target_tz),
            forecast_mw=r["forecast_mw"],
            actual_mw=r["actual_mw"],
            error=r["error"],
        )
        for r in result
    ]


@app.get("/api/versions", response_model=list[VersionRow])
def versions(db: Session = Depends(get_db), start_time: str = Query(...)):
    try:
        st = datetime.fromisoformat(start_time)
    except ValueError:
        raise HTTPException(400, "bad start_time format")
    rows = queries.versions_for_interval(db, st)
    return [
        VersionRow(publish_time=_ts(r.publish_time), generation_mw=r.generation_mw)
        for r in rows
    ]
