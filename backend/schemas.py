from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class MetaResponse(BaseModel):
    window_from: str
    window_to: str
    cutoff_time: str
    actual_count: int
    forecast_count: int
    actual_latest_publish: Optional[str] = None
    forecast_latest_publish: Optional[str] = None


class SummaryResponse(BaseModel):
    n: int
    total: int
    mae: Optional[float] = None
    rmse: Optional[float] = None
    bias: Optional[float] = None
    nmae: Optional[float] = None
    mape: Optional[float] = None
    expected: int
    coverage: str
    tz: str
    month: str


class DailyRow(BaseModel):
    date: str
    n: int
    total: int
    mae: Optional[float] = None
    rmse: Optional[float] = None
    bias: Optional[float] = None
    nmae: Optional[float] = None
    mape: Optional[float] = None


class SeriesRow(BaseModel):
    start_time: str
    publish_time: str
    forecast_mw: float
    actual_mw: Optional[float] = None
    error: Optional[float] = None


class WorstRow(BaseModel):
    start_time: str
    forecast_mw: float
    actual_mw: float
    error: float


class VersionRow(BaseModel):
    publish_time: str
    generation_mw: float
