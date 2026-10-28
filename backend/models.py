from datetime import datetime, date

from sqlalchemy import Float, Integer, Date, DateTime, Index
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class ActualGeneration(Base):
    __tablename__ = "actual_generation"

    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    settlement_date: Mapped[date] = mapped_column(Date, nullable=False)
    settlement_period: Mapped[int] = mapped_column(Integer, nullable=False)
    publish_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    generation_mw: Mapped[float] = mapped_column(Float, nullable=False)


class ForecastGeneration(Base):
    __tablename__ = "forecast_generation"

    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    publish_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    generation_mw: Mapped[float] = mapped_column(Float, nullable=False)

    __table_args__ = (
        Index("forecast_publish_idx", "publish_time"),
    )
