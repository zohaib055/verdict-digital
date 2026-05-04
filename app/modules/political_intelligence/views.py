from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.political_intelligence import services
from app.modules.political_intelligence.schemas import (
    EventClusterOut,
    MarketSuggestionOut,
    SchedulerJobOut,
    SchedulerJobUpsert,
    ScrapeRunOut,
)


router = APIRouter()


@router.get("/scheduler/jobs", response_model=list[SchedulerJobOut])
def list_scheduler_jobs(db: Session = Depends(get_db)):
    return services.list_jobs(db)


@router.post("/scheduler/jobs", response_model=SchedulerJobOut)
def upsert_scheduler_job(payload: SchedulerJobUpsert, db: Session = Depends(get_db)):
    return services.upsert_job(db, payload)


@router.post("/scheduler/jobs/{job_id}/run", response_model=ScrapeRunOut)
def run_scheduler_job(job_id: int, db: Session = Depends(get_db)):
    job = services.get_job_by_id(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return services.run_job_once(db, job)


@router.get("/scheduler/runs", response_model=list[ScrapeRunOut])
def list_scheduler_runs(db: Session = Depends(get_db)):
    return services.recent_runs(db)


@router.get("/clusters", response_model=list[EventClusterOut])
def list_event_clusters(db: Session = Depends(get_db)):
    return services.list_clusters(db)


@router.get("/market-suggestions", response_model=list[MarketSuggestionOut])
def list_suggestions(db: Session = Depends(get_db)):
    return services.list_market_suggestions(db)
