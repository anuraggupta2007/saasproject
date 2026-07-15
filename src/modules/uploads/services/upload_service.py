import uuid
from io import BytesIO
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.exceptions import (
    BadRequestException,
    ConflictException,
    NotFoundException,
)
from src.core.logging import get_logger
from src.modules.uploads.models.base import (
    Upload,
    UploadStatus,
    StorageProviderType,
    UserUploadQuota,
)
from src.modules.uploads.repositories.upload import (
    UploadRepository,
    UserQuotaRepository,
)
from src.modules.uploads.storage.base import StorageConfig
from src.modules.uploads.storage.factory import create_storage_provider
from src.modules.uploads.validators.file_validator import FileValidator, VirusScanner

logger = get_logger(__name__)


class UploadService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.upload_repo = UploadRepository(session)
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

    async def upload_file(
        self,
        user_id: uuid.UUID,
        file_data: BytesIO,
        filename: str,
        file_size: int,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> Upload:
        validation = FileValidator.validate_upload(filename, file_data, file_size)

        existing = await self.upload_repo.get_by_hash_and_user(
            validation["sha256_hash"], user_id
        )
        if existing and existing.status == UploadStatus.COMPLETED:
            raise ConflictException(
                detail="File with same content already uploaded",
            )

        quota = await self._get_or_create_quota(user_id)
        if not quota.can_upload(file_size):
            raise BadRequestException(
                detail="Upload quota exceeded or file too large",
            )

        stored_filename = f"{user_id}/{uuid.uuid4()}/{validation['safe_filename']}"
        file_data.seek(0)

        storage_file = await self.storage.upload_file(
            key=stored_filename,
            file_data=file_data,
            content_type=validation["mime_type"],
            metadata={
                "user_id": str(user_id),
                "original_filename": filename,
            },
        )

        upload = Upload(
            user_id=user_id,
            original_filename=filename,
            stored_filename=stored_filename,
            file_size=file_size,
            mime_type=validation["mime_type"],
            sha256_hash=validation["sha256_hash"],
            storage_provider=StorageProviderType.LOCAL,
            storage_path=stored_filename,
            status=UploadStatus.UPLOADING,
            upload_progress=100,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        upload = await self.upload_repo.create(upload)

        await self.quota_repo.increment_usage(user_id, file_size)

        scan_result = await VirusScanner.scan_bytes(file_data.read())
        upload.is_virus_scanned = True
        upload.virus_scan_result = scan_result["result"]

        if not scan_result["is_clean"]:
            await self.upload_repo.mark_as_failed(
                upload.id, "File failed virus scan"
            )
            await self.storage.delete_file(stored_filename)
            await self.quota_repo.decrement_usage(user_id, file_size)
            raise BadRequestException(detail="File failed virus scan")

        await self.upload_repo.mark_as_completed(upload.id)

        logger.info(
            "file_uploaded",
            upload_id=str(upload.id),
            user_id=str(user_id),
            filename=filename,
            size=file_size,
        )

        return upload

    async def get_upload(
        self,
        upload_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Upload:
        upload = await self.upload_repo.get_by_id_and_user(upload_id, user_id)
        if not upload:
            raise NotFoundException(detail="Upload not found")
        return upload

    async def list_uploads(
        self,
        user_id: uuid.UUID,
        status: UploadStatus | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Upload], int]:
        return await self.upload_repo.list_user_uploads(
            user_id, status, page, page_size
        )

    async def delete_upload(
        self,
        upload_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        upload = await self.upload_repo.get_by_id_and_user(upload_id, user_id)
        if not upload:
            raise NotFoundException(detail="Upload not found")

        if upload.status in [UploadStatus.UPLOADING, UploadStatus.PROCESSING]:
            raise BadRequestException(
                detail="Cannot delete upload in progress"
            )

        await self.storage.delete_file(upload.storage_path)

        await self.upload_repo.delete(upload_id)

        await self.quota_repo.decrement_usage(user_id, upload.file_size)

        logger.info(
            "upload_deleted",
            upload_id=str(upload_id),
            user_id=str(user_id),
        )

        return True

    async def get_download_url(
        self,
        upload_id: uuid.UUID,
        user_id: uuid.UUID,
        expires_in: int = 3600,
    ) -> str:
        upload = await self.upload_repo.get_by_id_and_user(upload_id, user_id)
        if not upload:
            raise NotFoundException(detail="Upload not found")

        if upload.status != UploadStatus.COMPLETED:
            raise BadRequestException(detail="Upload is not completed")

        return await self.storage.get_presigned_url(
            upload.storage_path, expires_in
        )

    async def get_user_quota(self, user_id: uuid.UUID) -> UserUploadQuota:
        return await self._get_or_create_quota(user_id)

    async def _get_or_create_quota(self, user_id: uuid.UUID) -> UserUploadQuota:
        quota = await self.quota_repo.get_by_user_id(user_id)
        if not quota:
            quota = UserUploadQuota(user_id=user_id)
            quota = await self.quota_repo.create(quota)
        return quota
