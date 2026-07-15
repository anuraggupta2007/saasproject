import uuid
import asyncio
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.celery_app import celery_app
from src.core.database import async_session_factory
from src.core.logging import get_logger
from src.modules.conversion.services.conversion_service import ConversionService
from src.modules.conversion.services.batch_service import BatchConversionService
from src.modules.conversion.models.base import ConversionStatus

logger = get_logger(__name__)


@celery_app.task(
    bind=True,
    name="conversion.process_single",
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
    track_started=True,
)
def process_single_conversion(self, job_id: str):
    asyncio.run(_process_single_conversion_async(job_id))


async def _process_single_conversion_async(job_id: str):
    async with async_session_factory() as session:
        try:
            service = ConversionService(session)
            result = await service.process_conversion(uuid.UUID(job_id))

            logger.info(
                "celery_conversion_completed",
                job_id=job_id,
                success=result.success,
            )

            return {
                "job_id": job_id,
                "success": result.success,
                "errors": result.errors if not result.success else [],
            }
        except Exception as e:
            logger.error(
                "celery_conversion_failed",
                job_id=job_id,
                error=str(e),
            )
            raise


@celery_app.task(
    bind=True,
    name="conversion.process_batch",
    max_retries=1,
    default_retry_delay=120,
    acks_late=True,
    track_started=True,
)
def process_batch_conversion(self, batch_id: str, max_concurrent: int = 5):
    asyncio.run(_process_batch_conversion_async(batch_id, max_concurrent))


async def _process_batch_conversion_async(batch_id: str, max_concurrent: int):
    async with async_session_factory() as session:
        try:
            service = BatchConversionService(session)
            result = await service.process_batch(
                uuid.UUID(batch_id),
                max_concurrent,
            )

            logger.info(
                "celery_batch_completed",
                batch_id=batch_id,
                result=result,
            )

            return result
        except Exception as e:
            logger.error(
                "celery_batch_failed",
                batch_id=batch_id,
                error=str(e),
            )
            raise


@celery_app.task(
    bind=True,
    name="conversion.cleanup_expired",
)
def cleanup_expired_jobs(self, hours: int = 24):
    asyncio.run(_cleanup_expired_jobs_async(hours))


async def _cleanup_expired_jobs_async(hours: int):
    async with async_session_factory() as session:
        from datetime import timedelta

        from sqlalchemy import delete

        from src.modules.conversion.models.base import ConversionJob, ConversionBatch

        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

        batch_stmt = (
            delete(ConversionBatch)
            .where(
                ConversionBatch.status.in_([
                    ConversionStatus.COMPLETED,
                    ConversionStatus.CANCELLED,
                    ConversionStatus.FAILED,
                ]),
                ConversionBatch.processing_completed_at < cutoff,
            )
        )

        await session.execute(batch_stmt)

        job_stmt = (
            delete(ConversionJob)
            .where(
                ConversionJob.status.in_([
                    ConversionStatus.COMPLETED,
                    ConversionStatus.CANCELLED,
                    ConversionStatus.FAILED,
                ]),
                ConversionJob.processing_completed_at < cutoff,
            )
        )

        await session.execute(job_stmt)
        await session.commit()

        logger.info(
            "expired_jobs_cleaned",
            cutoff=cutoff.isoformat(),
        )

        return {"cleaned": True, "cutoff": cutoff.isoformat()}


@celery_app.task(
    name="conversion.notify_completed",
)
def notify_conversion_completed(job_id: str, user_id: str):
    logger.info(
        "conversion_notification_sent",
        job_id=job_id,
        user_id=user_id,
    )
    return {"notified": True, "user_id": user_id, "job_id": job_id}
