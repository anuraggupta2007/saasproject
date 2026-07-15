import time
import hashlib
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_logger
from src.modules.conversion.models.base import (
    ConversionJob,
    ConversionLog,
    ConversionStatus,
    OutputFormat,
)
from src.modules.conversion.repositories.conversion import (
    ConversionJobRepository,
    ConversionLogRepository,
    DownloadHistoryRepository,
)
from src.modules.conversion.strategies.base import ConversionContext, ConversionResult
from src.modules.conversion.strategies.factory import ConversionStrategyFactory

logger = get_logger(__name__)


class ConversionService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.job_repo = ConversionJobRepository(session)
        self.log_repo = ConversionLogRepository(session)
        self.download_repo = DownloadHistoryRepository(session)

    async def start_conversion(
        self,
        user_id: uuid.UUID,
        message_id: uuid.UUID,
        output_format: OutputFormat,
        compression_enabled: bool = False,
        compression_password: str | None = None,
        options: dict | None = None,
    ) -> ConversionJob:
        if not ConversionStrategyFactory.is_supported(output_format.value):
            raise ValueError(f"Unsupported format: {output_format.value}")

        job = ConversionJob(
            user_id=user_id,
            message_id=message_id,
            output_format=output_format,
            status=ConversionStatus.PENDING,
            compression_enabled=compression_enabled,
            compression_password=compression_password,
            options=options,
        )

        job = await self.job_repo.create(job)

        await self._log_event(
            job.id,
            "conversion_started",
            "info",
            f"Conversion to {output_format.value} started",
        )

        logger.info(
            "conversion_started",
            job_id=str(job.id),
            user_id=str(user_id),
            format=output_format.value,
        )

        return job

    async def process_conversion(
        self,
        job_id: uuid.UUID,
    ) -> ConversionResult:
        job = await self.job_repo.get_by_id(job_id)
        if not job:
            raise ValueError(f"Job not found: {job_id}")

        await self.job_repo.update(
            job_id,
            status=ConversionStatus.PROCESSING,
            processing_started_at=datetime.now(timezone.utc),
        )

        start_time = time.time()

        try:
            context = await self._build_conversion_context(job.message_id)

            strategy = ConversionStrategyFactory.get_strategy(job.output_format.value)

            result = await strategy.convert(context)

            if result.success:
                import hashlib
                output_hash = hashlib.sha256(
                    result.content.encode("utf-8") if isinstance(result.content, str) else result.content
                ).hexdigest()

                duration_ms = int((time.time() - start_time) * 1000)

                await self.job_repo.update(
                    job_id,
                    status=ConversionStatus.COMPLETED,
                    progress=100,
                    output_filename=result.filename,
                    output_size=result.file_size,
                    output_hash=output_hash,
                    processing_completed_at=datetime.now(timezone.utc),
                    processing_duration_ms=duration_ms,
                )

                await self._log_event(
                    job_id,
                    "conversion_completed",
                    "info",
                    f"Conversion completed in {duration_ms}ms",
                    {"duration_ms": duration_ms, "file_size": result.file_size},
                )

                logger.info(
                    "conversion_completed",
                    job_id=str(job_id),
                    duration_ms=duration_ms,
                    file_size=result.file_size,
                )

                return result
            else:
                await self.job_repo.update(
                    job_id,
                    status=ConversionStatus.FAILED,
                    error_message="; ".join(result.errors),
                    error_details={"errors": result.errors, "warnings": result.warnings},
                    processing_completed_at=datetime.now(timezone.utc),
                    processing_duration_ms=int((time.time() - start_time) * 1000),
                )

                await self._log_event(
                    job_id,
                    "conversion_failed",
                    "error",
                    "; ".join(result.errors),
                    {"errors": result.errors},
                )

                return result

        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)

            await self.job_repo.update(
                job_id,
                status=ConversionStatus.FAILED,
                error_message=str(e),
                processing_completed_at=datetime.now(timezone.utc),
                processing_duration_ms=duration_ms,
            )

            await self._log_event(
                job_id,
                "conversion_error",
                "error",
                str(e),
            )

            logger.error(
                "conversion_error",
                job_id=str(job_id),
                error=str(e),
            )

            return ConversionResult(
                success=False,
                errors=[str(e)],
            )

    async def get_job(
        self,
        job_id: uuid.UUID,
    ) -> ConversionJob | None:
        return await self.job_repo.get_by_id(job_id)

    async def list_user_jobs(
        self,
        user_id: uuid.UUID,
        status: ConversionStatus | None = None,
        output_format: OutputFormat | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[ConversionJob], int]:
        return await self.job_repo.list_user_jobs(
            user_id, status, output_format, page=page, page_size=page_size
        )

    async def cancel_job(
        self,
        job_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        job = await self.job_repo.get_by_id(job_id)
        if not job or job.user_id != user_id:
            return False

        if job.status in [ConversionStatus.COMPLETED, ConversionStatus.CANCELLED]:
            return False

        await self.job_repo.update(
            job_id,
            status=ConversionStatus.CANCELLED,
            error_message="Cancelled by user",
        )

        await self._log_event(
            job_id,
            "conversion_cancelled",
            "info",
            "Conversion cancelled by user",
        )

        return True

    async def delete_job(
        self,
        job_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        job = await self.job_repo.get_by_id(job_id)
        if not job or job.user_id != user_id:
            return False

        if job.status == ConversionStatus.PROCESSING:
            return False

        await self.job_repo.delete(job_id)
        return True

    async def record_download(
        self,
        job_id: uuid.UUID,
        user_id: uuid.UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        await self.download_repo.increment_download(
            job_id, user_id, ip_address, user_agent
        )

        await self.job_repo.update(
            job_id,
            download_count=ConversionJob.download_count + 1,
        )

    async def get_user_stats(
        self,
        user_id: uuid.UUID,
    ) -> dict:
        return await self.job_repo.get_user_stats(user_id)

    async def get_supported_formats(self) -> list[dict]:
        formats = []
        for fmt in ConversionStrategyFactory.get_supported_formats():
            info = ConversionStrategyFactory.get_format_info(fmt)
            formats.append(info)
        return formats

    async def _build_conversion_context(
        self,
        message_id: uuid.UUID,
    ) -> ConversionContext:
        from src.modules.mime.services.processing_service import MimeProcessingService

        mime_service = MimeProcessingService(self.session)
        message = await mime_service.get_message(message_id)

        if not message:
            raise ValueError(f"MIME message not found: {message_id}")

        body = message.body if hasattr(message, "body") else None
        attachments = message.attachments if hasattr(message, "attachments") else []

        return ConversionContext(
            message_id=str(message.id),
            subject=message.subject,
            from_address=message.from_address,
            to_addresses=message.to_addresses,
            cc_addresses=message.cc_addresses,
            date=message.date.isoformat() if message.date else None,
            html_body=body.html_body if body else None,
            text_body=body.text_body if body else None,
            attachments=[
                {
                    "filename": att.filename,
                    "content_type": att.content_type,
                    "content_id": att.content_id,
                    "file_size": att.file_size,
                    "sha256_hash": att.sha256_hash,
                    "is_inline": att.is_inline,
                    "content_disposition": att.content_disposition,
                }
                for att in attachments
            ],
        )

    async def _log_event(
        self,
        job_id: uuid.UUID,
        event_type: str,
        severity: str,
        message: str,
        details: dict | None = None,
        duration_ms: int | None = None,
    ) -> None:
        log = ConversionLog(
            job_id=job_id,
            event_type=event_type,
            severity=severity,
            message=message,
            details=details,
            duration_ms=duration_ms,
        )
        await self.log_repo.create(log)
