import uuid
from datetime import datetime, timezone

from sqlalchemy import select, update, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.conversion.models.base import (
    ConversionJob,
    ConversionBatch,
    ConversionLog,
    DownloadHistory,
    ConversionStatus,
    OutputFormat,
)


class ConversionJobRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, job: ConversionJob) -> ConversionJob:
        self.session.add(job)
        await self.session.flush()
        await self.session.refresh(job)
        return job

    async def get_by_id(self, job_id: uuid.UUID) -> ConversionJob | None:
        result = await self.session.execute(
            select(ConversionJob).where(ConversionJob.id == job_id)
        )
        return result.scalar_one_or_none()

    async def update(
        self,
        job_id: uuid.UUID,
        **kwargs,
    ) -> ConversionJob | None:
        kwargs["updated_at"] = datetime.now(timezone.utc)
        await self.session.execute(
            update(ConversionJob).where(ConversionJob.id == job_id).values(**kwargs)
        )
        await self.session.flush()
        return await self.get_by_id(job_id)

    async def delete(self, job_id: uuid.UUID) -> bool:
        result = await self.session.execute(
            delete(ConversionJob).where(ConversionJob.id == job_id)
        )
        await self.session.flush()
        return result.rowcount > 0

    async def list_user_jobs(
        self,
        user_id: uuid.UUID,
        status: ConversionStatus | None = None,
        output_format: OutputFormat | None = None,
        batch_id: uuid.UUID | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[ConversionJob], int]:
        query = select(ConversionJob).where(ConversionJob.user_id == user_id)

        if status:
            query = query.where(ConversionJob.status == status)
        if output_format:
            query = query.where(ConversionJob.output_format == output_format)
        if batch_id:
            query = query.where(ConversionJob.batch_id == batch_id)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.offset((page - 1) * page_size).limit(page_size)
        query = query.order_by(ConversionJob.created_at.desc())
        result = await self.session.execute(query)

        return list(result.scalars().all()), total

    async def get_batch_jobs(
        self,
        batch_id: uuid.UUID,
    ) -> list[ConversionJob]:
        result = await self.session.execute(
            select(ConversionJob)
            .where(ConversionJob.batch_id == batch_id)
            .order_by(ConversionJob.created_at)
        )
        return list(result.scalars().all())

    async def count_user_jobs(
        self,
        user_id: uuid.UUID,
        status: ConversionStatus | None = None,
    ) -> int:
        query = select(func.count()).select_from(ConversionJob).where(
            ConversionJob.user_id == user_id
        )
        if status:
            query = query.where(ConversionJob.status == status)
        return (await self.session.execute(query)).scalar() or 0

    async def get_user_stats(self, user_id: uuid.UUID) -> dict:
        base_query = select(ConversionJob).where(ConversionJob.user_id == user_id)

        total = (
            await self.session.execute(
                select(func.count()).select_from(base_query.subquery())
            )
        ).scalar() or 0

        completed = (
            await self.session.execute(
                select(func.count()).select_from(
                    base_query.where(
                        ConversionJob.status == ConversionStatus.COMPLETED
                    ).subquery()
                )
            )
        ).scalar() or 0

        failed = (
            await self.session.execute(
                select(func.count()).select_from(
                    base_query.where(
                        ConversionJob.status == ConversionStatus.FAILED
                    ).subquery()
                )
            )
        ).scalar() or 0

        total_size = (
            await self.session.execute(
                select(func.coalesce(func.sum(ConversionJob.output_size), 0)).where(
                    ConversionJob.user_id == user_id,
                    ConversionJob.status == ConversionStatus.COMPLETED,
                )
            )
        ).scalar() or 0

        avg_time = (
            await self.session.execute(
                select(func.coalesce(
                    func.avg(ConversionJob.processing_duration_ms), 0
                )).where(
                    ConversionJob.user_id == user_id,
                    ConversionJob.status == ConversionStatus.COMPLETED,
                )
            )
        ).scalar() or 0

        format_dist = {}
        for fmt in OutputFormat:
            count = (
                await self.session.execute(
                    select(func.count()).select_from(
                        base_query.where(
                            ConversionJob.output_format == fmt
                        ).subquery()
                    )
                )
            ).scalar() or 0
            if count > 0:
                format_dist[fmt.value] = count

        return {
            "total_conversions": total,
            "completed_conversions": completed,
            "failed_conversions": failed,
            "total_size": total_size,
            "average_processing_time_ms": int(avg_time),
            "format_distribution": format_dist,
        }

    async def cleanup_expired(self) -> int:
        result = await self.session.execute(
            update(ConversionJob).where(
                ConversionJob.expires_at < datetime.now(timezone.utc),
                ConversionJob.status.in_([
                    ConversionStatus.COMPLETED,
                    ConversionStatus.FAILED,
                ]),
            ).values(
                status=ConversionStatus.CANCELLED,
                error_message="Job expired",
            )
        )
        await self.session.flush()
        return result.rowcount


class ConversionBatchRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, batch: ConversionBatch) -> ConversionBatch:
        self.session.add(batch)
        await self.session.flush()
        await self.session.refresh(batch)
        return batch

    async def get_by_id(self, batch_id: uuid.UUID) -> ConversionBatch | None:
        result = await self.session.execute(
            select(ConversionBatch).where(ConversionBatch.id == batch_id)
        )
        return result.scalar_one_or_none()

    async def update(
        self,
        batch_id: uuid.UUID,
        **kwargs,
    ) -> ConversionBatch | None:
        kwargs["updated_at"] = datetime.now(timezone.utc)
        await self.session.execute(
            update(ConversionBatch).where(ConversionBatch.id == batch_id).values(**kwargs)
        )
        await self.session.flush()
        return await self.get_by_id(batch_id)

    async def delete(self, batch_id: uuid.UUID) -> bool:
        result = await self.session.execute(
            delete(ConversionBatch).where(ConversionBatch.id == batch_id)
        )
        await self.session.flush()
        return result.rowcount > 0

    async def list_user_batches(
        self,
        user_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[ConversionBatch], int]:
        query = select(ConversionBatch).where(
            ConversionBatch.user_id == user_id
        )

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.offset((page - 1) * page_size).limit(page_size)
        query = query.order_by(ConversionBatch.created_at.desc())
        result = await self.session.execute(query)

        return list(result.scalars().all()), total

    async def increment_completed(self, batch_id: uuid.UUID) -> None:
        await self.session.execute(
            update(ConversionBatch)
            .where(ConversionBatch.id == batch_id)
            .values(
                completed_count=ConversionBatch.completed_count + 1,
            )
        )
        await self.session.flush()

    async def increment_failed(self, batch_id: uuid.UUID) -> None:
        await self.session.execute(
            update(ConversionBatch)
            .where(ConversionBatch.id == batch_id)
            .values(
                failed_count=ConversionBatch.failed_count + 1,
            )
        )
        await self.session.flush()


class ConversionLogRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, log: ConversionLog) -> ConversionLog:
        self.session.add(log)
        await self.session.flush()
        await self.session.refresh(log)
        return log

    async def get_job_logs(
        self,
        job_id: uuid.UUID,
        severity: str | None = None,
    ) -> list[ConversionLog]:
        query = select(ConversionLog).where(ConversionLog.job_id == job_id)
        if severity:
            query = query.where(ConversionLog.severity == severity)
        query = query.order_by(ConversionLog.created_at)
        result = await self.session.execute(query)
        return list(result.scalars().all())


class DownloadHistoryRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, history: DownloadHistory) -> DownloadHistory:
        self.session.add(history)
        await self.session.flush()
        await self.session.refresh(history)
        return history

    async def increment_download(
        self,
        job_id: uuid.UUID,
        user_id: uuid.UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> DownloadHistory:
        history = DownloadHistory(
            job_id=job_id,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return await self.create(history)

    async def get_download_count(self, job_id: uuid.UUID) -> int:
        result = await self.session.execute(
            select(func.count()).select_from(DownloadHistory).where(
                DownloadHistory.job_id == job_id
            )
        )
        return result.scalar() or 0
