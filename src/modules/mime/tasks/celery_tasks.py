import uuid
from celery import shared_task
from celery.utils.log import get_task_logger

from src.core.config import settings

logger = get_task_logger(__name__)


@shared_task(
    bind=True,
    name="mime.process_message",
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
    reject_on_worker_lost=True,
)
def process_mime_message(
    self,
    message_id: str,
    user_id: str,
    upload_id: str,
    raw_content: str | None = None,
    storage_path: str | None = None,
):
    logger.info(
        "processing_mime_message",
        message_id=message_id,
        user_id=user_id,
        task_id=self.request.id,
    )

    try:
        from src.db.session import async_session_factory
        from src.modules.mime.services.processing_service import MimeProcessingService

        async def _process():
            async with async_session_factory() as session:
                service = MimeProcessingService(session)

                if raw_content:
                    content = raw_content
                elif storage_path:
                    from src.modules.uploads.storage.factory import create_storage_provider
                    from src.modules.uploads.storage.base import StorageConfig

                    config = StorageConfig(
                        provider=settings.STORAGE_PROVIDER,
                        local_path=settings.STORAGE_LOCAL_PATH,
                    )
                    storage = create_storage_provider(config)

                    chunks = []
                    async for chunk in storage.download_file(storage_path):
                        chunks.append(chunk)
                    content = b"".join(chunks).decode("utf-8", errors="replace")
                else:
                    raise ValueError("Either raw_content or storage_path must be provided")

                result = await service.process_message(
                    user_id=uuid.UUID(user_id),
                    upload_id=uuid.UUID(upload_id),
                    raw_content=content,
                )
                await session.commit()
                return result

        import asyncio
        result = asyncio.run(_process())

        return {
            "message_id": message_id,
            "status": "completed",
            "result": result,
        }

    except Exception as exc:
        logger.error(
            "mime_processing_failed",
            message_id=message_id,
            error=str(exc),
        )
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    name="mime.process_batch",
    max_retries=2,
    default_retry_delay=120,
)
def process_mime_batch(
    self,
    upload_ids: list[str],
    user_id: str,
):
    logger.info(
        "processing_mime_batch",
        total=len(upload_ids),
        user_id=user_id,
        task_id=self.request.id,
    )

    try:
        from src.db.session import async_session_factory
        from src.modules.mime.services.processing_service import MimeProcessingService
        from src.modules.uploads.services.upload_service import UploadService

        async def _process_batch():
            results = []
            async with async_session_factory() as session:
                mime_service = MimeProcessingService(session)
                upload_service = UploadService(session)

                for upload_id in upload_ids:
                    try:
                        download_url = await upload_service.get_download_url(
                            uuid.UUID(upload_id),
                            uuid.UUID(user_id),
                        )

                        import httpx
                        async with httpx.AsyncClient() as client:
                            response = await client.get(download_url)
                            raw_content = response.text

                        result = await mime_service.process_message(
                            user_id=uuid.UUID(user_id),
                            upload_id=uuid.UUID(upload_id),
                            raw_content=raw_content,
                        )
                        results.append({
                            "upload_id": upload_id,
                            "status": "completed",
                            "result": result,
                        })
                    except Exception as e:
                        results.append({
                            "upload_id": upload_id,
                            "status": "failed",
                            "error": str(e),
                        })

                await session.commit()
            return results

        import asyncio
        results = asyncio.run(_process_batch())

        completed = sum(1 for r in results if r["status"] == "completed")
        failed = sum(1 for r in results if r["status"] == "failed")

        return {
            "total": len(upload_ids),
            "completed": completed,
            "failed": failed,
            "results": results,
        }

    except Exception as exc:
        logger.error("batch_processing_failed", error=str(exc))
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    name="mime.extract_attachments",
    max_retries=2,
    default_retry_delay=60,
)
def extract_mime_attachments(
    self,
    message_id: str,
    user_id: str,
):
    logger.info(
        "extracting_attachments",
        message_id=message_id,
        task_id=self.request.id,
    )

    try:
        from src.db.session import async_session_factory
        from src.modules.mime.services.processing_service import MimeProcessingService

        async def _extract():
            async with async_session_factory() as session:
                service = MimeProcessingService(session)
                attachments = await service.get_attachments(uuid.UUID(message_id))

                return {
                    "message_id": message_id,
                    "attachments_count": len(attachments),
                    "attachments": [
                        {
                            "id": str(a.id),
                            "filename": a.filename,
                            "content_type": a.content_type,
                            "file_size": a.file_size,
                        }
                        for a in attachments
                    ],
                }

        import asyncio
        return asyncio.run(_extract())

    except Exception as exc:
        logger.error("attachment_extraction_failed", error=str(exc))
        raise self.retry(exc=exc)


@shared_task(
    name="mime.cleanup_old_messages",
)
def cleanup_old_mime_messages():
    logger.info("starting_cleanup_old_messages")

    try:
        from src.db.session import async_session_factory
        from sqlalchemy import delete
        from src.modules.mime.models.base import MimeMessage
        from datetime import datetime, timedelta, timezone

        async def _cleanup():
            async with async_session_factory() as session:
                cutoff = datetime.now(timezone.utc) - timedelta(days=90)

                result = await session.execute(
                    delete(MimeMessage).where(
                        MimeMessage.created_at < cutoff,
                        MimeMessage.parse_status.in_([
                            "failed",
                            "cancelled",
                        ]),
                    )
                )
                await session.commit()
                return result.rowcount

        import asyncio
        count = asyncio.run(_cleanup())

        logger.info("cleanup_completed", deleted_count=count)
        return {"deleted_count": count}

    except Exception as exc:
        logger.error("cleanup_failed", error=str(exc))
        raise
