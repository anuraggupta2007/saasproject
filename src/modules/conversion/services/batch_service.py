import uuid
import asyncio
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_logger
from src.modules.conversion.models.base import (
    ConversionJob,
    ConversionBatch,
    ConversionStatus,
    OutputFormat,
)
from src.modules.conversion.repositories.conversion import (
    ConversionJobRepository,
    ConversionBatchRepository,
)
from src.modules.conversion.services.conversion_service import ConversionService

logger = get_logger(__name__)


class BatchConversionService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.job_repo = ConversionJobRepository(session)
        self.batch_repo = ConversionBatchRepository(session)
        self.conversion_service = ConversionService(session)

    async def create_batch(
        self,
        user_id: uuid.UUID,
        message_ids: list[uuid.UUID],
        output_format: OutputFormat,
        name: str | None = None,
        compression_enabled: bool = True,
        options: dict | None = None,
    ) -> ConversionBatch:
        batch = ConversionBatch(
            user_id=user_id,
            name=name or f"Batch {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}",
            output_format=output_format,
            status=ConversionStatus.PENDING,
            total_count=len(message_ids),
            compression_enabled=compression_enabled,
            options=options,
        )

        batch = await self.batch_repo.create(batch)

        for message_id in message_ids:
            job = ConversionJob(
                user_id=user_id,
                batch_id=batch.id,
                message_id=message_id,
                output_format=output_format,
                status=ConversionStatus.PENDING,
                compression_enabled=compression_enabled,
                options=options,
            )
            await self.job_repo.create(job)

        logger.info(
            "batch_created",
            batch_id=str(batch.id),
            user_id=str(user_id),
            total_count=len(message_ids),
            format=output_format.value,
        )

        return batch

    async def process_batch(
        self,
        batch_id: uuid.UUID,
        max_concurrent: int = 5,
    ) -> dict:
        batch = await self.batch_repo.get_by_id(batch_id)
        if not batch:
            raise ValueError(f"Batch not found: {batch_id}")

        await self.batch_repo.update(
            batch_id,
            status=ConversionStatus.PROCESSING,
            processing_started_at=datetime.now(timezone.utc),
        )

        jobs = await self.job_repo.get_batch_jobs(batch_id)
        pending_jobs = [j for j in jobs if j.status == ConversionStatus.PENDING]

        completed = 0
        failed = 0

        semaphore = asyncio.Semaphore(max_concurrent)

        async def process_with_semaphore(job: ConversionJob) -> tuple[bool, str | None]:
            async with semaphore:
                try:
                    result = await self.conversion_service.process_conversion(job.id)
                    return result.success, None if result.success else "; ".join(result.errors)
                except Exception as e:
                    return False, str(e)

        tasks = [process_with_semaphore(job) for job in pending_jobs]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, Exception):
                failed += 1
            else:
                success, error = result
                if success:
                    completed += 1
                else:
                    failed += 1

        total_size = sum(
            job.output_size or 0
            for job in jobs
            if job.status == ConversionStatus.COMPLETED
        )

        status = ConversionStatus.COMPLETED if failed == 0 else (
            ConversionStatus.FAILED if completed == 0 else ConversionStatus.COMPLETED
        )

        duration_ms = None
        if batch.processing_started_at:
            duration_ms = int(
                (datetime.now(timezone.utc) - batch.processing_started_at).total_seconds() * 1000
            )

        await self.batch_repo.update(
            batch_id,
            status=status,
            completed_count=completed,
            failed_count=failed,
            progress=100 if status != ConversionStatus.PROCESSING else 0,
            output_size=total_size,
            processing_completed_at=datetime.now(timezone.utc),
            processing_duration_ms=duration_ms,
        )

        logger.info(
            "batch_completed",
            batch_id=str(batch_id),
            completed=completed,
            failed=failed,
            duration_ms=duration_ms,
        )

        return {
            "batch_id": str(batch_id),
            "status": status.value,
            "completed": completed,
            "failed": failed,
            "total": len(pending_jobs),
            "duration_ms": duration_ms,
        }

    async def get_batch(
        self,
        batch_id: uuid.UUID,
    ) -> ConversionBatch | None:
        return await self.batch_repo.get_by_id(batch_id)

    async def list_user_batches(
        self,
        user_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[ConversionBatch], int]:
        return await self.batch_repo.list_user_batches(user_id, page, page_size)

    async def get_batch_progress(
        self,
        batch_id: uuid.UUID,
    ) -> dict:
        batch = await self.batch_repo.get_by_id(batch_id)
        if not batch:
            raise ValueError(f"Batch not found: {batch_id}")

        jobs = await self.job_repo.get_batch_jobs(batch_id)

        status_counts = {}
        for job in jobs:
            status = job.status.value
            status_counts[status] = status_counts.get(status, 0) + 1

        total = len(jobs)
        completed = status_counts.get("completed", 0)
        progress = int((completed / total) * 100) if total > 0 else 0

        return {
            "batch_id": str(batch_id),
            "status": batch.status.value,
            "total": total,
            "completed": completed,
            "failed": status_counts.get("failed", 0),
            "processing": status_counts.get("processing", 0),
            "pending": status_counts.get("pending", 0),
            "progress": progress,
            "status_counts": status_counts,
        }

    async def cancel_batch(
        self,
        batch_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        batch = await self.batch_repo.get_by_id(batch_id)
        if not batch or batch.user_id != user_id:
            return False

        if batch.status in [ConversionStatus.COMPLETED, ConversionStatus.CANCELLED]:
            return False

        jobs = await self.job_repo.get_batch_jobs(batch_id)
        for job in jobs:
            if job.status in [ConversionStatus.PENDING, ConversionStatus.PROCESSING]:
                await self.conversion_service.cancel_job(job.id, user_id)

        await self.batch_repo.update(
            batch_id,
            status=ConversionStatus.CANCELLED,
        )

        return True

    async def delete_batch(
        self,
        batch_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        batch = await self.batch_repo.get_by_id(batch_id)
        if not batch or batch.user_id != user_id:
            return False

        if batch.status == ConversionStatus.PROCESSING:
            return False

        jobs = await self.job_repo.get_batch_jobs(batch_id)
        for job in jobs:
            if job.status != ConversionStatus.PROCESSING:
                await self.job_repo.delete(job.id)

        await self.batch_repo.delete(batch_id)
        return True
