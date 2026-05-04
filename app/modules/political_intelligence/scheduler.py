from __future__ import annotations

import asyncio
import logging

from app.core.database import SessionLocal
from app.core.settings import settings
from app.modules.political_intelligence import services


logger = logging.getLogger(__name__)


class PoliticalScheduler:
    def __init__(self) -> None:
        self._task: asyncio.Task | None = None
        self._running = False

    async def start(self) -> None:
        if self._running:
            logger.debug("Scheduler start skipped: already running")
            return

        self._running = True
        with SessionLocal() as db:
            job = services.ensure_default_scheduler_job(
                db, settings.POLITICAL_SCHEDULER_DEFAULT_INTERVAL_MINUTES
            )
            logger.info(
                "Scheduler default job ready | id=%s name=%s interval_min=%s next_run_at=%s",
                job.id,
                job.name,
                job.interval_minutes,
                job.next_run_at,
            )
        self._task = asyncio.create_task(self._loop())
        logger.info(
            "Political scheduler started | poll_seconds=%s",
            settings.POLITICAL_SCHEDULER_POLL_SECONDS,
        )

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("Political scheduler stopped")

    async def _loop(self) -> None:
        while self._running:
            try:
                with SessionLocal() as db:
                    due_jobs = services.get_due_jobs(db)
                    logger.debug("Scheduler tick | due_jobs=%s", len(due_jobs))
                    for job in due_jobs:
                        logger.info(
                            "Running scheduled job | id=%s name=%s interval_min=%s",
                            job.id,
                            job.name,
                            job.interval_minutes,
                        )
                        services.run_job_once(db, job)
            except Exception:
                logger.exception("Scheduler loop failed")

            await asyncio.sleep(settings.POLITICAL_SCHEDULER_POLL_SECONDS)


scheduler = PoliticalScheduler()
