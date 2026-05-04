from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.models import Base, TimestampMixin


class SchedulerJob(Base, TimestampMixin):
    __tablename__ = "scheduler_jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    interval_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30, server_default="30")
    is_active: Mapped[bool] = mapped_column(default=True, server_default=text("true"), nullable=False)
    next_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    runs: Mapped[list[ScrapeRun]] = relationship(back_populates="job")


class ScrapeRun(Base):
    __tablename__ = "scrape_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("scheduler_jobs.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="running", server_default="running")
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    events_discovered: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    clusters_generated: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    suggestions_generated: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    job: Mapped[SchedulerJob] = relationship(back_populates="runs")


class PoliticalEvent(Base, TimestampMixin):
    __tablename__ = "political_events"
    __table_args__ = (UniqueConstraint("source", "source_url", name="uq_political_events_source_url"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    source: Mapped[str] = mapped_column(String(120), nullable=False)
    source_url: Mapped[str] = mapped_column(Text, nullable=False)
    headline: Mapped[str] = mapped_column(String(400), nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    detected_topic: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    metadata_json: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )


class EventCluster(Base, TimestampMixin):
    __tablename__ = "event_clusters"

    id: Mapped[int] = mapped_column(primary_key=True)
    topic: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(240), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.5, server_default="0.5")
    latest_event_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class MarketSuggestion(Base, TimestampMixin):
    __tablename__ = "market_suggestions"

    id: Mapped[int] = mapped_column(primary_key=True)
    cluster_id: Mapped[int] = mapped_column(ForeignKey("event_clusters.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="proposed", server_default="proposed")
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    market_question: Mapped[str] = mapped_column(Text, nullable=False)
    resolution_criteria: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.5, server_default="0.5")
    metadata_json: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )
