import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update, delete, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.modules.uploads.models.base import (
    Upload,
    UploadChunk,
    UserUploadQuota,
    UploadStatus,
)


class UploadRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, upload: Upload) -> Upload:
        self.session.add(upload)
        await self.session.flush()
        await self.session.refresh(upload)
        return upload

    async def get_by_id(self, upload_id: uuid.UUID) -> Upload | None:
        result = await self.session.execute(
            select(Upload).where(Upload.id == upload_id)
        )
        return result.scalar_one_or_none()

    async def get_by_id_and_user(
        self,
        upload_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Upload | None:
        result = await self.session.execute(
            select(Upload).where(
                Upload.id == upload_id,
                Upload.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_by_hash_and_user(
        self,
        sha256_hash: str,
        user_id: uuid.UUID,
    ) -> Upload | None:
        result = await self.session.execute(
            select(Upload).where(
                Upload.sha256_hash == sha256_hash,
                Upload.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def update(
        self,
        upload_id: uuid.UUID,
        **kwargs,
    ) -> Upload | None:
        kwargs["updated_at"] = datetime.now(timezone.utc)
        await self.session.execute(
            update(Upload).where(Upload.id == upload_id).values(**kwargs)
        )
        await self.session.flush()
        return await self.get_by_id(upload_id)

    async def delete(self, upload_id: uuid.UUID) -> bool:
        result = await self.session.execute(
            delete(Upload).where(Upload.id == upload_id)
        )
        await self.session.flush()
        return result.rowcount > 0

    async def list_user_uploads(
        self,
        user_id: uuid.UUID,
        status: UploadStatus | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Upload], int]:
        query = select(Upload).where(Upload.user_id == user_id)

        if status:
            query = query.where(Upload.status == status)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.offset((page - 1) * page_size).limit(page_size)
        query = query.order_by(Upload.created_at.desc())
        result = await self.session.execute(query)

        return list(result.scalars().all()), total

    async def get_user_storage_usage(self, user_id: uuid.UUID) -> int:
        result = await self.session.execute(
            select(func.coalesce(func.sum(Upload.file_size), 0)).where(
                Upload.user_id == user_id,
                Upload.status != UploadStatus.CANCELLED,
            )
        )
        return result.scalar() or 0

    async def get_user_upload_count(self, user_id: uuid.UUID) -> int:
        result = await self.session.execute(
            select(func.count()).select_from(Upload).where(
                Upload.user_id == user_id,
                Upload.status != UploadStatus.CANCELLED,
            )
        )
        return result.scalar() or 0

    async def mark_as_processing(self, upload_id: uuid.UUID) -> None:
        await self.update(upload_id, status=UploadStatus.PROCESSING)

    async def mark_as_completed(self, upload_id: uuid.UUID) -> None:
        await self.update(
            upload_id,
            status=UploadStatus.COMPLETED,
            upload_progress=100,
            completed_at=datetime.now(timezone.utc),
        )

    async def mark_as_failed(
        self,
        upload_id: uuid.UUID,
        error_message: str,
    ) -> None:
        await self.update(
            upload_id,
            status=UploadStatus.FAILED,
            error_message=error_message,
        )

    async def cleanup_expired_uploads(self, hours: int = 24) -> int:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        result = await self.session.execute(
            update(Upload).where(
                Upload.status.in_([
                    UploadStatus.PENDING,
                    UploadStatus.UPLOADING,
                ]),
                Upload.created_at < cutoff,
            ).values(
                status=UploadStatus.EXPIRED,
                error_message="Upload expired due to inactivity",
            )
        )
        await self.session.flush()
        return result.rowcount


class ChunkRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, chunk: UploadChunk) -> UploadChunk:
        self.session.add(chunk)
        await self.session.flush()
        await self.session.refresh(chunk)
        return chunk

    async def get_by_upload_and_number(
        self,
        upload_id: uuid.UUID,
        chunk_number: int,
    ) -> UploadChunk | None:
        result = await self.session.execute(
            select(UploadChunk).where(
                UploadChunk.upload_id == upload_id,
                UploadChunk.chunk_number == chunk_number,
            )
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, chunk_id: uuid.UUID) -> UploadChunk | None:
        result = await self.session.execute(
            select(UploadChunk).where(UploadChunk.id == chunk_id)
        )
        return result.scalar_one_or_none()

    async def update(
        self,
        chunk_id: uuid.UUID,
        **kwargs,
    ) -> UploadChunk | None:
        kwargs["updated_at"] = datetime.now(timezone.utc)
        await self.session.execute(
            update(UploadChunk).where(UploadChunk.id == chunk_id).values(**kwargs)
        )
        await self.session.flush()
        return await self.get_by_id(chunk_id)

    async def get_upload_chunks(
        self,
        upload_id: uuid.UUID,
    ) -> list[UploadChunk]:
        result = await self.session.execute(
            select(UploadChunk)
            .where(UploadChunk.upload_id == upload_id)
            .order_by(UploadChunk.chunk_number)
        )
        return list(result.scalars().all())

    async def count_uploaded_chunks(self, upload_id: uuid.UUID) -> int:
        result = await self.session.execute(
            select(func.count()).select_from(UploadChunk).where(
                UploadChunk.upload_id == upload_id,
                UploadChunk.is_uploaded == True,
            )
        )
        return result.scalar() or 0

    async def delete_upload_chunks(self, upload_id: uuid.UUID) -> int:
        result = await self.session.execute(
            delete(UploadChunk).where(UploadChunk.upload_id == upload_id)
        )
        await self.session.flush()
        return result.rowcount


class UserQuotaRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_user_id(self, user_id: uuid.UUID) -> UserUploadQuota | None:
        result = await self.session.execute(
            select(UserUploadQuota).where(UserUploadQuota.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create(self, quota: UserUploadQuota) -> UserUploadQuota:
        self.session.add(quota)
        await self.session.flush()
        await self.session.refresh(quota)
        return quota

    async def update(
        self,
        user_id: uuid.UUID,
        **kwargs,
    ) -> UserUploadQuota | None:
        kwargs["updated_at"] = datetime.now(timezone.utc)
        await self.session.execute(
            update(UserUploadQuota)
            .where(UserUploadQuota.user_id == user_id)
            .values(**kwargs)
        )
        await self.session.flush()
        return await self.get_by_user_id(user_id)

    async def increment_usage(
        self,
        user_id: uuid.UUID,
        file_size: int,
    ) -> UserUploadQuota | None:
        quota = await self.get_by_user_id(user_id)
        if quota:
            return await self.update(
                user_id,
                used_storage_bytes=quota.used_storage_bytes + file_size,
                current_uploads=quota.current_uploads + 1,
            )
        return None

    async def decrement_usage(
        self,
        user_id: uuid.UUID,
        file_size: int,
    ) -> UserUploadQuota | None:
        quota = await self.get_by_user_id(user_id)
        if quota:
            return await self.update(
                user_id,
                used_storage_bytes=max(0, quota.used_storage_bytes - file_size),
                current_uploads=max(0, quota.current_uploads - 1),
            )
        return None
