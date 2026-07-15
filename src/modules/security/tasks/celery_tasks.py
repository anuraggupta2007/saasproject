import asyncio
from datetime import datetime, timezone

from src.core.celery_app import celery_app
from src.core.database import async_session_factory
from src.core.logging import get_logger

logger = get_logger(__name__)


@celery_app.task(
    bind=True,
    name="security.cleanup_expired_sessions",
    max_retries=2,
)
def cleanup_expired_sessions_task(self):
    asyncio.run(_cleanup_expired_sessions_async())


async def _cleanup_expired_sessions_async():
    async with async_session_factory() as session:
        from src.modules.security.repositories.security import UserSessionRepository

        repo = UserSessionRepository(session)
        deleted = await repo.cleanup_expired_sessions()

        logger.info("expired_sessions_cleaned", extra={"deleted": deleted})
        return {"deleted": deleted}


@celery_app.task(
    bind=True,
    name="security.cleanup_rate_limits",
    max_retries=2,
)
def cleanup_rate_limits_task(self):
    asyncio.run(_cleanup_rate_limits_async())


async def _cleanup_rate_limits_async():
    async with async_session_factory() as session:
        from src.modules.security.repositories.security import RateLimitRepository

        repo = RateLimitRepository(session)
        deleted = await repo.cleanup_expired()

        logger.info("rate_limits_cleaned", extra={"deleted": deleted})
        return {"deleted": deleted}


@celery_app.task(
    bind=True,
    name="security.cleanup_old_events",
    max_retries=2,
)
def cleanup_old_events_task(self, days: int = 90):
    asyncio.run(_cleanup_old_events_async(days))


async def _cleanup_old_events_async(days: int):
    async with async_session_factory() as session:
        from datetime import timedelta
        from sqlalchemy import delete
        from src.modules.security.models.security import SecurityEvent

        cutoff = datetime.now(timezone.utc) - timedelta(days=days)

        await session.execute(
            delete(SecurityEvent).where(SecurityEvent.created_at < cutoff)
        )
        await session.commit()

        logger.info("old_security_events_cleaned", extra={"days": days})
        return {"cleaned": True}
