import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

from src.modules.conversion.models.base import ConversionStatus, OutputFormat


class ConversionStartRequest(BaseModel):
    message_id: uuid.UUID
    output_format: OutputFormat
    compression_enabled: bool = False
    compression_password: str | None = None
    options: dict[str, Any] | None = None


class ConversionResponse(BaseModel):
    id: uuid.UUID
    message_id: uuid.UUID
    output_format: OutputFormat
    status: ConversionStatus
    progress: int
    output_filename: str | None = None
    output_size: int | None = None
    processing_duration_ms: int | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversionDetailResponse(ConversionResponse):
    output_storage_path: str | None = None
    output_hash: str | None = None
    compression_enabled: bool = False
    retry_count: int = 0
    download_count: int = 0
    expires_at: datetime | None = None
    options: dict[str, Any] | None = None


class ConversionStatusResponse(BaseModel):
    id: uuid.UUID
    status: ConversionStatus
    progress: int
    error: str | None = None


class ConversionCancelResponse(BaseModel):
    message: str
    job_id: uuid.UUID


class ConversionDeleteResponse(BaseModel):
    message: str
    job_id: uuid.UUID


class ConversionDownloadResponse(BaseModel):
    download_url: str
    filename: str
    file_size: int
    content_type: str
    expires_in: int = 3600


class ConversionJobResponse(ConversionResponse):
    pass


class ConversionJobListResponse(BaseModel):
    jobs: list[ConversionJobResponse]
    total: int
    page: int
    page_size: int


class ConversionListResponse(BaseModel):
    jobs: list[ConversionResponse]
    total: int
    page: int
    page_size: int
    pages: int


class ConversionBatchRequest(BaseModel):
    message_ids: list[uuid.UUID] = Field(..., min_length=1, max_length=1000)
    output_format: OutputFormat
    name: str | None = Field(None, max_length=255)
    compression_enabled: bool = True
    options: dict[str, Any] | None = None


class ConversionBatchResponse(BaseModel):
    id: uuid.UUID
    name: str | None = None
    output_format: OutputFormat
    status: ConversionStatus
    total_count: int
    completed_count: int
    failed_count: int
    progress: int
    output_size: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversionBatchDetailResponse(ConversionBatchResponse):
    output_storage_path: str | None = None
    compression_enabled: bool = True
    processing_started_at: datetime | None = None
    processing_completed_at: datetime | None = None
    processing_duration_ms: int | None = None
    error_message: str | None = None
    options: dict[str, Any] | None = None


class ConversionBatchListResponse(BaseModel):
    batches: list[ConversionBatchResponse]
    total: int
    page: int
    page_size: int
    pages: int


class ConversionStatsResponse(BaseModel):
    total_conversions: int
    completed_conversions: int
    failed_conversions: int
    total_size: int
    format_distribution: dict[str, int]
    average_processing_time_ms: int


class SupportedFormatsResponse(BaseModel):
    formats: list[dict[str, Any]]


class ConversionLogResponse(BaseModel):
    id: uuid.UUID
    event_type: str
    severity: str
    message: str
    details: dict[str, Any] | None = None
    duration_ms: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversionLogsResponse(BaseModel):
    logs: list[ConversionLogResponse]
    total: int
