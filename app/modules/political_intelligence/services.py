from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime, timedelta
import json
import logging
from urllib import error as urlerror
from urllib import parse, request

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.core.settings import settings
from app.modules.political_intelligence.models import (
    EventCluster,
    MarketSuggestion,
    PoliticalEvent,
    SchedulerJob,
    ScrapeRun,
)
from app.modules.political_intelligence.schemas import SchedulerJobUpsert


logger = logging.getLogger(__name__)

TOPIC_KEYWORDS = {
    "election": "elections",
    "vote": "elections",
    "senate": "legislature",
    "congress": "legislature",
    "policy": "policy",
    "law": "policy",
    "president": "executive",
    "minister": "executive",
    "court": "judiciary",
}


def now_utc() -> datetime:
    return datetime.now(UTC)


def _detect_topic(text: str) -> str:
    lowered = text.lower()
    for keyword, topic in TOPIC_KEYWORDS.items():
        if keyword in lowered:
            return topic
    return "general-politics"


def _parse_datetime(raw: str | None) -> datetime | None:
    if not raw:
        return None

    candidates = [
        "%Y%m%d%H%M%S",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S.%fZ",
    ]
    for fmt in candidates:
        try:
            parsed = datetime.strptime(raw, fmt)
            return parsed.replace(tzinfo=UTC)
        except ValueError:
            continue
    return None


def _http_get_json(url: str) -> dict:
    logger.debug("HTTP GET JSON | url=%s", url)
    req = request.Request(url, headers={"User-Agent": "verdict-backend/1.0"})
    with request.urlopen(req, timeout=settings.POLITICAL_HTTP_TIMEOUT_SECONDS) as response:
        payload = response.read().decode("utf-8")
    logger.debug("HTTP GET JSON success | bytes=%s", len(payload))
    return json.loads(payload)


def _fetch_gdelt_candidates() -> list[dict]:
    params = {
        "query": settings.POLITICAL_SCRAPE_QUERY,
        "mode": "ArtList",
        "maxrecords": settings.POLITICAL_SCRAPE_MAX_PER_SOURCE,
        "sort": "datedesc",
        "format": "json",
    }
    url = f"https://api.gdeltproject.org/api/v2/doc/doc?{parse.urlencode(params)}"

    logger.info("Fetching political candidates from GDELT")
    data = _http_get_json(url)
    articles = data.get("articles", [])

    candidates: list[dict] = []
    for article in articles:
        source_url = article.get("url")
        headline = article.get("title") or "Untitled"
        if not source_url:
            continue
        candidates.append(
            {
                "source": "gdelt",
                "source_url": source_url,
                "headline": headline,
                "summary": article.get("seendate") or "",
                "published_at": _parse_datetime(article.get("seendate")),
                "metadata_json": {
                    "source_name": article.get("sourceCountry"),
                    "social": article.get("socialimage"),
                    "language": article.get("language"),
                    "provider": "gdelt",
                },
            }
        )

    logger.info("GDELT fetch complete | candidates=%s", len(candidates))
    return candidates


def _fetch_gnews_candidates() -> list[dict]:
    if not settings.GNEWS_API_KEY:
        logger.debug("GNews fetch skipped: missing API key")
        return []

    params = {
        "q": settings.POLITICAL_SCRAPE_QUERY,
        "lang": "en",
        "max": settings.POLITICAL_SCRAPE_MAX_PER_SOURCE,
        "token": settings.GNEWS_API_KEY,
    }
    url = f"https://gnews.io/api/v4/search?{parse.urlencode(params)}"

    logger.info("Fetching political candidates from GNews")
    data = _http_get_json(url)
    articles = data.get("articles", [])

    candidates: list[dict] = []
    for article in articles:
        source_url = article.get("url")
        headline = article.get("title") or "Untitled"
        if not source_url:
            continue
        source_meta = article.get("source") or {}
        candidates.append(
            {
                "source": "gnews",
                "source_url": source_url,
                "headline": headline,
                "summary": article.get("description") or "",
                "published_at": _parse_datetime(article.get("publishedAt")),
                "metadata_json": {
                    "source_name": source_meta.get("name"),
                    "source_url": source_meta.get("url"),
                    "provider": "gnews",
                },
            }
        )

    logger.info("GNews fetch complete | candidates=%s", len(candidates))
    return candidates


def _seed_candidates() -> list[dict]:
    return [
        {
            "source": "internal_seed",
            "source_url": "https://seed.local/election-reform",
            "headline": "Election reform bill moves to senate vote",
            "summary": "Committee approved major voting process changes.",
            "published_at": now_utc(),
            "metadata_json": {"provider": "seed"},
        },
        {
            "source": "internal_seed",
            "source_url": "https://seed.local/court-policy",
            "headline": "Court hearing set on public policy challenge",
            "summary": "Judiciary review may affect nationwide implementation.",
            "published_at": now_utc(),
            "metadata_json": {"provider": "seed"},
        },
    ]


def ensure_default_scheduler_job(db: Session, interval_minutes: int) -> SchedulerJob:
    job = db.scalar(select(SchedulerJob).where(SchedulerJob.name == "political-topic-scraper"))
    if job:
        changed = False
        if job.interval_minutes != interval_minutes:
            job.interval_minutes = interval_minutes
            changed = True
        if not job.is_active:
            job.is_active = True
            changed = True
        if changed:
            job.next_run_at = now_utc() + timedelta(minutes=1)
            db.commit()
            db.refresh(job)
            logger.info(
                "Default scheduler job updated | id=%s interval_min=%s active=%s next_run_at=%s",
                job.id,
                job.interval_minutes,
                job.is_active,
                job.next_run_at,
            )
        else:
            logger.debug(
                "Default scheduler job unchanged | id=%s interval_min=%s active=%s next_run_at=%s",
                job.id,
                job.interval_minutes,
                job.is_active,
                job.next_run_at,
            )
        return job

    run_at = now_utc() + timedelta(minutes=1)
    job = SchedulerJob(
        name="political-topic-scraper",
        interval_minutes=interval_minutes,
        is_active=True,
        next_run_at=run_at,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    logger.info(
        "Default scheduler job created | id=%s interval_min=%s next_run_at=%s",
        job.id,
        job.interval_minutes,
        job.next_run_at,
    )
    return job


def list_jobs(db: Session) -> list[SchedulerJob]:
    stmt: Select[tuple[SchedulerJob]] = select(SchedulerJob).order_by(SchedulerJob.id.asc())
    return list(db.scalars(stmt).all())


def upsert_job(db: Session, payload: SchedulerJobUpsert) -> SchedulerJob:
    job = db.scalar(select(SchedulerJob).where(SchedulerJob.name == payload.name))
    next_run = now_utc() + timedelta(minutes=payload.interval_minutes)

    if not job:
        job = SchedulerJob(
            name=payload.name,
            interval_minutes=payload.interval_minutes,
            is_active=payload.is_active,
            next_run_at=next_run,
        )
        db.add(job)
    else:
        job.interval_minutes = payload.interval_minutes
        job.is_active = payload.is_active
        if payload.is_active:
            job.next_run_at = next_run
    db.commit()
    db.refresh(job)
    return job


def get_due_jobs(db: Session, as_of: datetime | None = None) -> list[SchedulerJob]:
    timestamp = as_of or now_utc()
    stmt: Select[tuple[SchedulerJob]] = (
        select(SchedulerJob)
        .where(SchedulerJob.is_active.is_(True))
        .where(SchedulerJob.next_run_at.is_not(None))
        .where(SchedulerJob.next_run_at <= timestamp)
    )
    jobs = list(db.scalars(stmt).all())
    logger.debug("Due jobs loaded | as_of=%s count=%s", timestamp, len(jobs))
    return jobs


def _cluster_events_by_topic(db: Session, events: list[PoliticalEvent]) -> list[EventCluster]:
    if not events:
        return []

    grouped: dict[str, list[PoliticalEvent]] = defaultdict(list)
    for event in events:
        topic = event.detected_topic or "general-politics"
        grouped[topic].append(event)

    clusters: list[EventCluster] = []
    for topic, grouped_events in grouped.items():
        latest = max((ev.published_at for ev in grouped_events if ev.published_at), default=None)
        label = f"{topic.replace('-', ' ').title()} pulse"
        cluster = EventCluster(
            topic=topic,
            label=label,
            confidence=min(0.95, 0.5 + 0.05 * len(grouped_events)),
            latest_event_at=latest,
        )
        db.add(cluster)
        clusters.append(cluster)

    db.flush()
    logger.info(
        "Event clustering complete | input_events=%s clusters=%s",
        len(events),
        len(clusters),
    )
    return clusters


def _make_suggestion(cluster: EventCluster, related_events: list[PoliticalEvent]) -> MarketSuggestion:
    title = f"{cluster.topic.replace('-', ' ').title()} market"
    question = f"Will the next major {cluster.topic.replace('-', ' ')} development occur within 30 days?"
    resolution = (
        "Resolve YES if two independent mainstream sources confirm the event. "
        "Resolve NO if no qualifying event occurs by market expiry."
    )
    recent_events = sorted(
        related_events,
        key=lambda event: event.published_at or now_utc(),
        reverse=True,
    )[:3]
    return MarketSuggestion(
        cluster_id=cluster.id,
        status="proposed",
        title=title,
        market_question=question,
        resolution_criteria=resolution,
        confidence=cluster.confidence,
        metadata_json={
            "generated_by": "heuristic-v1",
            "topic": cluster.topic,
            "cluster_label": cluster.label,
            "source_context": [
                {
                    "headline": event.headline,
                    "summary": event.summary,
                    "source": event.source,
                    "source_url": event.source_url,
                    "published_at": event.published_at.isoformat() if event.published_at else None,
                }
                for event in recent_events
            ],
        },
    )


def _gather_candidates() -> list[dict]:
    candidates: list[dict] = []

    if settings.POLITICAL_SOURCE_GDELT_ENABLED:
        try:
            candidates.extend(_fetch_gdelt_candidates())
        except (urlerror.URLError, TimeoutError, json.JSONDecodeError) as exc:
            logger.warning("GDELT fetch failed: %s", exc)

    if settings.POLITICAL_SOURCE_GNEWS_ENABLED:
        try:
            candidates.extend(_fetch_gnews_candidates())
        except (urlerror.URLError, TimeoutError, json.JSONDecodeError) as exc:
            logger.warning("GNews fetch failed: %s", exc)

    if not candidates:
        logger.warning("No external candidates fetched; falling back to seed data")
        candidates = _seed_candidates()

    logger.info("Candidate gathering complete | total_candidates=%s", len(candidates))
    return candidates


def _discover_events(db: Session) -> list[PoliticalEvent]:
    created: list[PoliticalEvent] = []
    skipped_existing = 0

    for item in _gather_candidates():
        existing = db.scalar(
            select(PoliticalEvent).where(
                PoliticalEvent.source == item["source"],
                PoliticalEvent.source_url == item["source_url"],
            )
        )
        if existing:
            skipped_existing += 1
            continue

        text = f"{item['headline']} {item['summary']}"
        event = PoliticalEvent(
            source=item["source"],
            source_url=item["source_url"],
            headline=item["headline"],
            summary=item.get("summary") or "",
            detected_topic=_detect_topic(text),
            published_at=item.get("published_at") or now_utc(),
            metadata_json=item.get("metadata_json") or {"detector": "keyword-v1"},
        )
        db.add(event)
        created.append(event)

    db.flush()
    logger.info(
        "Event discovery complete | created=%s skipped_existing=%s",
        len(created),
        skipped_existing,
    )
    return created


def run_job_once(db: Session, job: SchedulerJob) -> ScrapeRun:
    logger.info("Job run started | job_id=%s name=%s", job.id, job.name)
    run = ScrapeRun(job_id=job.id, status="running")
    db.add(run)
    db.flush()

    try:
        events = _discover_events(db)
        clusters = _cluster_events_by_topic(db, events)

        suggestions = [
            _make_suggestion(
                cluster,
                [event for event in events if (event.detected_topic or "general-politics") == cluster.topic],
            )
            for cluster in clusters
        ]
        for suggestion in suggestions:
            db.add(suggestion)

        now = now_utc()
        run.status = "completed"
        run.finished_at = now
        run.events_discovered = len(events)
        run.clusters_generated = len(clusters)
        run.suggestions_generated = len(suggestions)

        job.last_run_at = now
        job.next_run_at = now + timedelta(minutes=job.interval_minutes)

        db.commit()
        db.refresh(run)
        logger.info(
            "Job run completed | run_id=%s job_id=%s events=%s clusters=%s suggestions=%s next_run_at=%s",
            run.id,
            job.id,
            run.events_discovered,
            run.clusters_generated,
            run.suggestions_generated,
            job.next_run_at,
        )
        return run
    except Exception as exc:
        run.status = "failed"
        run.finished_at = now_utc()
        run.error_message = str(exc)
        db.commit()
        db.refresh(run)
        logger.exception("Job run failed | run_id=%s job_id=%s", run.id, job.id)
        raise


def recent_runs(db: Session, limit: int = 20) -> list[ScrapeRun]:
    stmt: Select[tuple[ScrapeRun]] = select(ScrapeRun).order_by(ScrapeRun.started_at.desc()).limit(limit)
    return list(db.scalars(stmt).all())


def list_clusters(db: Session, limit: int = 50) -> list[EventCluster]:
    stmt: Select[tuple[EventCluster]] = select(EventCluster).order_by(EventCluster.created_at.desc()).limit(limit)
    return list(db.scalars(stmt).all())


def list_market_suggestions(db: Session, limit: int = 50) -> list[MarketSuggestion]:
    stmt: Select[tuple[MarketSuggestion]] = (
        select(MarketSuggestion).order_by(MarketSuggestion.created_at.desc()).limit(limit)
    )
    return list(db.scalars(stmt).all())


def get_job_by_id(db: Session, job_id: int) -> SchedulerJob | None:
    return db.get(SchedulerJob, job_id)
