from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import BinaryIO, AsyncGenerator
from datetime import datetime


@dataclass
class StorageFile:
    key: str
    bucket: str | None = None
    size: int = 0
    content_type: str | None = None
    etag: str | None = None
    last_modified: datetime | None = None
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass
class StorageConfig:
    provider: str = "local"
    local_path: str = "./uploads"
    bucket_name: str = "email-converter-uploads"
    region: str = "us-east-1"
    endpoint_url: str | None = None
    access_key: str | None = None
    secret_key: str | None = None
    public_url: str | None = None
    chunk_size: int = 8 * 1024 * 1024  # 8MB default


class StorageProvider(ABC):
    def __init__(self, config: StorageConfig):
        self.config = config

    @abstractmethod
    async def upload_file(
        self,
        key: str,
        file_data: BinaryIO,
        content_type: str | None = None,
        metadata: dict[str, str] | None = None,
    ) -> StorageFile:
        """Upload a file to storage."""
        pass

    @abstractmethod
    async def download_file(self, key: str) -> AsyncGenerator[bytes, None]:
        """Download a file from storage."""
        pass

    @abstractmethod
    async def delete_file(self, key: str) -> bool:
        """Delete a file from storage."""
        pass

    @abstractmethod
    async def file_exists(self, key: str) -> bool:
        """Check if file exists."""
        pass

    @abstractmethod
    async def get_file_info(self, key: str) -> StorageFile | None:
        """Get file metadata."""
        pass

    @abstractmethod
    async def get_presigned_url(
        self,
        key: str,
        expires_in: int = 3600,
    ) -> str:
        """Generate presigned URL."""
        pass

    @abstractmethod
    async def list_files(
        self,
        prefix: str = "",
        limit: int = 100,
    ) -> list[StorageFile]:
        """List files with prefix."""
        pass

    @abstractmethod
    async def copy_file(
        self,
        source_key: str,
        dest_key: str,
    ) -> StorageFile:
        """Copy file within storage."""
        pass

    @abstractmethod
    async def init_multipart_upload(self, key: str) -> str:
        """Initialize multipart upload, return upload ID."""
        pass

    @abstractmethod
    async def upload_part(
        self,
        key: str,
        upload_id: str,
        part_number: int,
        data: BinaryIO,
    ) -> dict:
        """Upload a part of multipart upload."""
        pass

    @abstractmethod
    async def complete_multipart_upload(
        self,
        key: str,
        upload_id: str,
        parts: list[dict],
    ) -> StorageFile:
        """Complete multipart upload."""
        pass

    @abstractmethod
    async def abort_multipart_upload(
        self,
        key: str,
        upload_id: str,
    ) -> bool:
        """Abort multipart upload."""
        pass
