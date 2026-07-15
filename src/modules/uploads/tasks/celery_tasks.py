import uuid
from celery import shared_task
from celery.utils.log import get_task_logger

from src.core.config import settings

logger = get_task_logger(__name__)


@shared_task(
    bind=True,
    name="uploads.process_upload",
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
    reject_on_worker_lost=True,
)
def process_upload(self, upload_id: str, user_id: str):
    logger.info(
        "processing_upload",
        upload_id=upload_id,
        user_id=user_id,
        task_id=self.request.id,
    )

    try:
        from src.db.session import async_session_factory
        from src.modules.uploads.services.upload_service import UploadService

        async def _process():
            async with async_session_factory() as session:
                service = UploadService(session)
                upload = await service.get_upload(
                    uuid.UUID(upload_id),
                    uuid.UUID(user_id),
                )
                logger.info("upload_processed", upload_id=upload_id)
                return {"status": "completed", "upload_id": upload_id}

        import asyncio
        result = asyncio.run(_process())
        return result

    except Exception as exc:
        logger.error(
            "upload_processing_failed",
            upload_id=upload_id,
            error=str(exc),
        )
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    name="uploads.scan_virus",
    max_retries=2,
    default_retry_delay=30,
)
def scan_virus(self, upload_id: str, file_path: str):
    logger.info(
        "scanning_virus",
        upload_id=upload_id,
        file_path=file_path,
        task_id=self.request.id,
    )

    try:
        from src.modules.uploads.validators.file_validator import VirusScanner

        async def _scan():
            result = await VirusScanner.scan_file(file_path)
            return result

        import asyncio
        result = asyncio.run(_scan())

        if not result["is_clean"]:
            logger.warning(
                "virus_detected",
                upload_id=upload_id,
                result=result,
            )

        return {
            "upload_id": upload_id,
            "scan_result": result,
        }

    except Exception as exc:
        logger.error(
            "virus_scan_failed",
            upload_id=upload_id,
            error=str(exc),
        )
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    name="uploads.merge_chunks",
    max_retries=3,
    default_retry_delay=120,
    acks_late=True,
)
def merge_chunks_task(self, upload_id: str, user_id: str):
    logger.info(
        "merging_chunks",
        upload_id=upload_id,
        user_id=user_id,
        task_id=self.request.id,
    )

    try:
        from src.db.session import async_session_factory
        from src.modules.uploads.services.chunked_service import ChunkedUploadService

        async def _merge():
            async with async_session_factory() as session:
                service = ChunkedUploadService(session)
                upload = await service.merge_chunks(
                    uuid.UUID(upload_id),
                    uuid.UUID(user_id),
                )
                return {"status": "completed", "upload_id": upload_id}

        import asyncio
        result = asyncio.run(_merge())
        return result

    except Exception as exc:
        logger.error(
            "merge_failed",
            upload_id=upload_id,
            error=str(exc),
        )
        raise self.retry(exc=exc)


@shared_task(
    name="uploads.cleanup_expired",
)
def cleanup_expired_uploads():
    logger.info("starting_cleanup_expired_uploads")

    try:
        from src.db.session import async_session_factory
        from src.modules.uploads.repositories.upload import UploadRepository

        async def _cleanup():
            async with async_session_factory() as session:
                repo = UploadRepository(session)
                count = await repo.cleanup_expired_uploads(hours=24)
                await session.commit()
                return count

        import asyncio
        count = asyncio.run(_cleanup())

        logger.info("cleanup_completed", expired_count=count)
        return {"expired_count": count}

    except Exception as exc:
        logger.error("cleanup_failed", error=str(exc))
        raise


@shared_task(
    bind=True,
    name="uploads.cancel_upload",
)
def cancel_upload_task(self, upload_id: str, user_id: str):
    logger.info(
        "cancelling_upload",
        upload_id=upload_id,
        user_id=user_id,
        task_id=self.request.id,
    )

    try:
        from src.db.session import async_session_factory
        from src.modules.uploads.services.chunked_service import ChunkedUploadService

        async def _cancel():
            async with async_session_factory() as session:
                service = ChunkedUploadService(session)
                success = await service.cancel_upload(
                    uuid.UUID(upload_id),
                    uuid.UUID(user_id),
                )
                return success

        import asyncio
        result = asyncio.run(_cancel())

        return {"status": "cancelled", "upload_id": upload_id}

    except Exception as exc:
        logger.error(
            "cancel_failed",
            upload_id=upload_id,
            error=str(exc),
        )
        raise
