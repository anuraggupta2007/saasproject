import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator

from src.modules.uploads.models.base import UploadStatus, StorageProviderType


class UploadBase(BaseModel):
    original_filename: str = Field(..., max_length=500)


class UploadCreate(UploadBase):
    file_size: int = Field(..., gt=0, description="File size in bytes")
    mime_type: str = Field(..., max_length=100)
    sha256_hash: str = Field(..., min_length=64, max_length=64)


class UploadResponse(UploadBase):
    id: uuid.UUID
    stored_filename: str
    file_size: int
    mime_type: str
    sha256_hash: str
    storage_provider: StorageProviderType
    status: UploadStatus
    upload_progress: int
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None
    error_message: str | None = None
    metadata: dict[str, Any] | None = Field(None, validation_alias="metadata_")

    model_config = {"from_attributes": True, "populate_by_name": True}


class UploadListResponse(BaseModel):
    uploads: list[UploadResponse]
    total: int
    page: int
    page_size: int
    pages: int


class UploadDetailResponse(UploadResponse):
    ip_address: str | None = None
    user_agent: str | None = None
    is_virus_scanned: bool = False
    virus_scan_result: str | None = None
    expires_at: datetime | None = None


class UploadDeleteResponse(BaseModel):
    message: str
    upload_id: uuid.UUID


class UploadDownloadResponse(BaseModel):
    download_url: str
    expires_in: int = 3600


class ChunkedUploadInitRequest(BaseModel):
    file_size: int = Field(..., gt=0, description="Total file size in bytes")
    file_name: str = Field(..., max_length=500)
    mime_type: str = Field(..., max_length=100)
    sha256_hash: str = Field(..., min_length=64, max_length=64)
    chunk_size: int = Field(default=8 * 1024 * 1024, gt=0, description="Chunk size in bytes")

    @field_validator("chunk_size")
    @classmethod
    def validate_chunk_size(cls, v: int) -> int:
        if v < 1024 * 1024:  # Minimum 1MB
            raise ValueError("Chunk size must be at least 1MB")
        if v > 100 * 1024 * 1024:  # Maximum 100MB
            raise ValueError("Chunk size must be at most 100MB")
        return v


class ChunkedUploadInitResponse(BaseModel):
    upload_id: uuid.UUID
    chunk_size: int
    total_chunks: int
    storage_upload_id: str | None = None


class ChunkUploadRequest(BaseModel):
    chunk_number: int = Field(..., ge=1)
    sha256_hash: str = Field(..., min_length=64, max_length=64)


class ChunkUploadResponse(BaseModel):
    chunk_id: uuid.UUID
    chunk_number: int
    is_uploaded: bool
    upload_progress: int


class ChunkedUploadMergeRequest(BaseModel):
    @model_validator(mode="after")
    def validate_merge(self) -> "ChunkedUploadMergeRequest":
        return self


class ChunkedUploadMergeResponse(BaseModel):
    upload_id: uuid.UUID
    status: UploadStatus
    message: str


class ChunkedUploadProgressResponse(BaseModel):
    upload_id: uuid.UUID
    total_chunks: int
    uploaded_chunks: int
    upload_progress: int
    total_size: int
    uploaded_size: int
    status: UploadStatus


class UploadCancelResponse(BaseModel):
    message: str
    upload_id: uuid.UUID


class UserQuotaResponse(BaseModel):
    max_storage_bytes: int
    used_storage_bytes: int
    storage_remaining: int
    max_uploads: int
    current_uploads: int
    uploads_remaining: int
    max_file_size: int

    model_config = {"from_attributes": True}
