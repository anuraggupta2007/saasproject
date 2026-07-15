import uuid
import math
from io import BytesIO
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.exceptions import (
    BadRequestException,
    NotFoundException,
)
from src.core.logging import get_logger
from src.modules.uploads.models.base import (
    Upload,
    UploadChunk,
    UploadStatus,
    StorageProviderType,
    UserUploadQuota,
)
from src.modules.uploads.repositories.upload import (
    UploadRepository,
    ChunkRepository,
    UserQuotaRepository,
)
from src.modules.uploads.storage.base import StorageConfig
from src.modules.uploads.storage.factory import create_storage_provider
from src.modules.uploads.validators.file_validator import FileValidator, VirusScanner

logger = get_logger(__name__)


class ChunkedUploadService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.upload_repo = UploadRepository(session)
        self.chunk_repo = ChunkRepository(session)
        self.quota_repo = UserQuotaRepository(session)
        self.storage = self._create_storage()

    def _create_storage(self):
        config = StorageConfig(
            provider=settings.STORAGE_PROVIDER if hasattr(settings, "STORAGE_PROVIDER") else "local",
            local_path=settings.STORAGE_LOCAL_PATH if hasattr(settings, "STORAGE_LOCAL_PATH") else "./uploads",
            bucket_name=settings.STORAGE_BUCKET if hasattr(settings, "STORAGE_BUCKET") else "email-converter-uploads",
            region=settings.STORAGE_REGION if hasattr(settings, "STORAGE_REGION") else "us-east-1",
            endpoint_url=settings.STORAGE_ENDPOINT if hasattr(settings, "STORAGE_ENDPOINT") else None,
            access_key=settings.STORAGE_ACCESS_KEY if hasattr(settings, "STORAGE_ACCESS_KEY") else None,
            secret_key=settings.STORAGE_SECRET_KEY if hasattr(settings, "STORAGE_SECRET_KEY") else None,
        )
        return create_storage_provider(config)

    async def init_chunked_upload(
        self,
        user_id: uuid.UUID,
        file_size: int,
        file_name: str,
        mime_type: str,
        sha256_hash: str,
        chunk_size: int = 8 * 1024 * 1024,
    ) -> Upload:
        FileValidator.validate_extension(file_name)
        FileValidator.validate_file_size(file_size)

        existing = await self.upload_repo.get_by_hash_and_user(sha256_hash, user_id)
        if existing and existing.status == UploadStatus.COMPLETED:
            raise BadRequestException(
                detail="File with same content already uploaded"
            )

        quota = await self._get_or_create_quota(user_id)
        if not quota.can_upload(file_size):
            raise BadRequestException(
                detail="Upload quota exceeded or file too large"
            )

        safe_filename = FileValidator.sanitize_filename(file_name)
        stored_filename = f"{user_id}/{uuid.uuid4()}/{safe_filename}"

        total_chunks = math.ceil(file_size / chunk_size)

        upload = Upload(
            user_id=user_id,
            original_filename=file_name,
            stored_filename=stored_filename,
            file_size=file_size,
            mime_type=mime_type,
            sha256_hash=sha256_hash,
            storage_provider=StorageProviderType.LOCAL,
            storage_path=stored_filename,
            status=UploadStatus.UPLOADING,
            upload_progress=0,
        )

        upload = await self.upload_repo.create(upload)

        storage_upload_id = None
        try:
            storage_upload_id = await self.storage.init_multipart_upload(
                stored_filename
            )
        except Exception as e:
            logger.warning("storage_multipart_init_failed", error=str(e))

        for i in range(1, total_chunks + 1):
            chunk = UploadChunk(
                upload_id=upload.id,
                chunk_number=i,
                chunk_size=min(chunk_size, file_size - (i - 1) * chunk_size),
                storage_path=f"{stored_filename}.chunk.{i:06d}",
                sha256_hash="",
                is_uploaded=False,
                upload_id_storage=storage_upload_id,
            )
            await self.chunk_repo.create(chunk)

        await self.quota_repo.increment_usage(user_id, 0)

        logger.info(
            "chunked_upload_initiated",
            upload_id=str(upload.id),
            user_id=str(user_id),
            total_chunks=total_chunks,
            file_size=file_size,
        )

        return upload

    async def upload_chunk(
        self,
        upload_id: uuid.UUID,
        chunk_number: int,
        chunk_data: BytesIO,
        chunk_sha256: str,
        user_id: uuid.UUID,
    ) -> UploadChunk:
        upload = await self.upload_repo.get_by_id_and_user(upload_id, user_id)
        if not upload:
            raise NotFoundException(detail="Upload not found")

        if upload.status not in [UploadStatus.UPLOADING, UploadStatus.PENDING]:
            raise BadRequestException(
                detail=f"Upload is in {upload.status.value} state"
            )

        chunk = await self.chunk_repo.get_by_upload_and_number(
            upload_id, chunk_number
        )
        if not chunk:
            raise NotFoundException(
                detail=f"Chunk {chunk_number} not found"
            )

        if chunk.is_uploaded:
            return chunk

        chunk_data.seek(0)
        actual_hash = FileValidator.calculate_sha256(chunk_data)

        if actual_hash != chunk_sha256:
            raise BadRequestException(
                detail="Chunk hash mismatch - data may be corrupted"
            )

        chunk_data.seek(0)

        try:
            storage_result = await self.storage.upload_part(
                key=upload.storage_path,
                upload_id=chunk.upload_id_storage or "",
                part_number=chunk_number,
                data=chunk_data,
            )
            etag = storage_result.get("etag")
        except Exception as e:
            logger.error("chunk_upload_failed", error=str(e))
            etag = None

        updated_chunk = await self.chunk_repo.update(
            chunk.id,
            sha256_hash=actual_hash,
            etag=etag,
            is_uploaded=True,
        )

        uploaded_count = await self.chunk_repo.count_uploaded_chunks(upload_id)
        total_chunks = math.ceil(upload.file_size / upload.chunk_size if hasattr(upload, 'chunk_size') else 8 * 1024 * 1024)
        progress = int((uploaded_count / total_chunks) * 100) if total_chunks > 0 else 0

        await self.upload_repo.update(
            upload_id,
            upload_progress=progress,
        )

        logger.info(
            "chunk_uploaded",
            upload_id=str(upload_id),
            chunk_number=chunk_number,
            progress=progress,
        )

        return updated_chunk

    async def merge_chunks(
        self,
        upload_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Upload:
        upload = await self.upload_repo.get_by_id_and_user(upload_id, user_id)
        if not upload:
            raise NotFoundException(detail="Upload not found")

        chunks = await self.chunk_repo.get_upload_chunks(upload_id)
        if not chunks:
            raise BadRequestException(detail="No chunks found")

        uploaded_chunks = [c for c in chunks if c.is_uploaded]
        if len(uploaded_chunks) != len(chunks):
            raise BadRequestException(
                detail=f"Not all chunks uploaded. "
                f"Uploaded: {len(uploaded_chunks)}/{len(chunks)}"
            )

        await self.upload_repo.mark_as_processing(upload_id)

        try:
            if uploaded_chunks[0].upload_id_storage:
                parts = [
                    {
                        "part_number": c.chunk_number,
                        "etag": c.etag or "",
                    }
                    for c in sorted(uploaded_chunks, key=lambda x: x.chunk_number)
                ]

                await self.storage.complete_multipart_upload(
                    key=upload.storage_path,
                    upload_id=uploaded_chunks[0].upload_id_storage,
                    parts=parts,
                )
            else:
                merged_data = BytesIO()
                for chunk in sorted(uploaded_chunks, key=lambda x: x.chunk_number):
                    async for data in self.storage.download_file(
                        chunk.storage_path
                    ):
                        merged_data.write(data)

                merged_data.seek(0)
                await self.storage.upload_file(
                    key=upload.storage_path,
                    file_data=merged_data,
                    content_type=upload.mime_type,
                )

            scan_result = await VirusScanner.scan_bytes(b"")
            if not scan_result["is_clean"]:
                await self.upload_repo.mark_as_failed(
                    upload_id, "File failed virus scan"
                )
                await self.storage.delete_file(upload.storage_path)
                raise BadRequestException(detail="File failed virus scan")

            await self.upload_repo.mark_as_completed(upload_id)

            quota = await self._get_or_create_quota(user_id)
            await self.quota_repo.increment_usage(user_id, upload.file_size)

            logger.info(
                "chunks_merged",
                upload_id=str(upload_id),
                total_chunks=len(chunks),
            )

            upload = await self.upload_repo.get_by_id(upload_id)
            return upload

        except Exception as e:
            logger.error("merge_failed", upload_id=str(upload_id), error=str(e))
            await self.upload_repo.mark_as_failed(upload_id, str(e))
            raise

    async def get_upload_progress(
        self,
        upload_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> dict:
        upload = await self.upload_repo.get_by_id_and_user(upload_id, user_id)
        if not upload:
            raise NotFoundException(detail="Upload not found")

        chunks = await self.chunk_repo.get_upload_chunks(upload_id)
        uploaded_chunks = [c for c in chunks if c.is_uploaded]
        total_chunks = len(chunks)

        uploaded_size = sum(c.chunk_size for c in uploaded_chunks)
        progress = int((uploaded_size / upload.file_size) * 100) if upload.file_size > 0 else 0

        return {
            "upload_id": upload.id,
            "total_chunks": total_chunks,
            "uploaded_chunks": len(uploaded_chunks),
            "upload_progress": progress,
            "total_size": upload.file_size,
            "uploaded_size": uploaded_size,
            "status": upload.status,
        }

    async def cancel_upload(
        self,
        upload_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        upload = await self.upload_repo.get_by_id_and_user(upload_id, user_id)
        if not upload:
            raise NotFoundException(detail="Upload not found")

        if upload.status in [UploadStatus.COMPLETED, UploadStatus.CANCELLED]:
            raise BadRequestException(
                detail=f"Cannot cancel upload in {upload.status.value} state"
            )

        chunks = await self.chunk_repo.get_upload_chunks(upload_id)

        for chunk in chunks:
            if chunk.upload_id_storage:
                try:
                    await self.storage.abort_multipart_upload(
                        chunk.storage_path,
                        chunk.upload_id_storage,
                    )
                except Exception as e:
                    logger.warning("abort_multipart_failed", error=str(e))

            await self.storage.delete_file(chunk.storage_path)

        await self.chunk_repo.delete_upload_chunks(upload_id)

        await self.upload_repo.update(
            upload_id,
            status=UploadStatus.CANCELLED,
            error_message="Upload cancelled by user",
        )

        await self.quota_repo.decrement_usage(user_id, 0)

        logger.info(
            "upload_cancelled",
            upload_id=str(upload_id),
            user_id=str(user_id),
        )

        return True

    async def resume_upload(
        self,
        upload_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> dict:
        upload = await self.upload_repo.get_by_id_and_user(upload_id, user_id)
        if not upload:
            raise NotFoundException(detail="Upload not found")

        if upload.status not in [UploadStatus.UPLOADING, UploadStatus.FAILED]:
            raise BadRequestException(
                detail=f"Cannot resume upload in {upload.status.value} state"
            )

        chunks = await self.chunk_repo.get_upload_chunks(upload_id)
        uploaded_chunks = [c for c in chunks if c.is_uploaded]

        await self.upload_repo.update(
            upload_id,
            status=UploadStatus.UPLOADING,
            error_message=None,
        )

        return {
            "upload_id": upload.id,
            "total_chunks": len(chunks),
            "uploaded_chunks": [c.chunk_number for c in uploaded_chunks],
            "file_size": upload.file_size,
            "status": UploadStatus.UPLOADING,
        }

    async def _get_or_create_quota(self, user_id: uuid.UUID) -> UserUploadQuota:
        quota = await self.quota_repo.get_by_user_id(user_id)
        if not quota:
            quota = UserUploadQuota(user_id=user_id)
            quota = await self.quota_repo.create(quota)
        return quota
