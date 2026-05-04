from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class SchedulerJobOut(BaseModel):
    id: int
    name: str
    interval_minutes: int
    is_active: bool
    next_run_at: datetime | None
    last_run_at: datetime | None

    model_config = {"from_attributes": True}


class SchedulerJobUpsert(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    interval_minutes: int = Field(default=30, ge=1, le=1440)
    is_active: bool = True


class ScrapeRunOut(BaseModel):
    id: int
    job_id: int
    status: str
    started_at: datetime
    finished_at: datetime | None
    events_discovered: int
    clusters_generated: int
    suggestions_generated: int
    error_message: str | None

    model_config = {"from_attributes": True}


class EventClusterOut(BaseModel):
    id: int
    topic: str
    label: str
    confidence: float
    latest_event_at: datetime | None

    model_config = {"from_attributes": True}


class MarketSuggestionOut(BaseModel):
    id: int
    cluster_id: int
    status: str
    title: str
    market_question: str
    resolution_criteria: str
    confidence: float
    metadata_json: dict
    created_at: datetime

    model_config = {"from_attributes": True}
