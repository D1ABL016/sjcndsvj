from datetime import datetime

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from backend.models import ActualGeneration, ForecastGeneration


def selected_forecasts(db: Session, from_ts: datetime, to_ts: datetime, cutoff: str):
    cutoff_expr = text("""
        (date_trunc('day', forecast_generation.start_time AT TIME ZONE 'UTC')
         - interval '1 day'
         + CAST(:cutoff AS time)) AT TIME ZONE 'UTC'
    """).bindparams(cutoff=cutoff)

    subq = (
        db.query(
            ForecastGeneration.start_time,
            ForecastGeneration.publish_time,
            ForecastGeneration.generation_mw.label("forecast_mw"),
            ActualGeneration.generation_mw.label("actual_mw"),
            func.row_number().over(
                partition_by=ForecastGeneration.start_time,
                order_by=ForecastGeneration.publish_time.desc(),
            ).label("rn"),
        )
        .outerjoin(ActualGeneration, ActualGeneration.start_time == ForecastGeneration.start_time)
        .filter(ForecastGeneration.start_time >= from_ts)
        .filter(ForecastGeneration.start_time < to_ts)
        .filter(ForecastGeneration.publish_time <= cutoff_expr)
        .subquery()
    )

    rows = (
        db.query(
            subq.c.start_time,
            subq.c.publish_time,
            subq.c.forecast_mw,
            subq.c.actual_mw,
        )
        .filter(subq.c.rn == 1)
        .order_by(subq.c.start_time)
        .all()
    )

    return [
        {
            "start_time": r.start_time,
            "publish_time": r.publish_time,
            "forecast_mw": r.forecast_mw,
            "actual_mw": r.actual_mw,
        }
        for r in rows
    ]


def series_for_day(db: Session, day_start: datetime, day_end: datetime, cutoff: str):
    cutoff_expr = text("""
        (date_trunc('day', forecast_generation.start_time AT TIME ZONE 'UTC')
         - interval '1 day'
         + CAST(:cutoff AS time)) AT TIME ZONE 'UTC'
    """).bindparams(cutoff=cutoff)

    subq = (
        db.query(
            ForecastGeneration.start_time,
            ForecastGeneration.publish_time,
            ForecastGeneration.generation_mw.label("forecast_mw"),
            ActualGeneration.generation_mw.label("actual_mw"),
            func.row_number().over(
                partition_by=ForecastGeneration.start_time,
                order_by=ForecastGeneration.publish_time.desc(),
            ).label("rn"),
        )
        .outerjoin(ActualGeneration, ActualGeneration.start_time == ForecastGeneration.start_time)
        .filter(ForecastGeneration.start_time >= day_start)
        .filter(ForecastGeneration.start_time < day_end)
        .filter(ForecastGeneration.publish_time <= cutoff_expr)
        .subquery()
    )

    rows = (
        db.query(
            subq.c.start_time,
            subq.c.publish_time,
            subq.c.forecast_mw,
            subq.c.actual_mw,
        )
        .filter(subq.c.rn == 1)
        .order_by(subq.c.start_time)
        .all()
    )

    return rows


def table_counts(db: Session):
    actual_count = db.query(func.count()).select_from(ActualGeneration).scalar()
    forecast_count = db.query(func.count()).select_from(ForecastGeneration).scalar()
    actual_latest = db.query(func.max(ActualGeneration.publish_time)).scalar()
    forecast_latest = db.query(func.max(ForecastGeneration.publish_time)).scalar()
    return {
        "actual_count": actual_count,
        "forecast_count": forecast_count,
        "actual_latest": actual_latest,
        "forecast_latest": forecast_latest,
    }


def versions_for_interval(db: Session, start_time: datetime):
    rows = (
        db.query(ForecastGeneration.publish_time, ForecastGeneration.generation_mw)
        .filter(ForecastGeneration.start_time == start_time)
        .order_by(ForecastGeneration.publish_time)
        .all()
    )
    return rows


def latest_forecast_publish(db: Session):
    return db.query(func.max(ForecastGeneration.publish_time)).scalar()
