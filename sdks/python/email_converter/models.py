from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional


class ConversionStatus(str, Enum):
    PENDING = "pending"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class Conversion:
    id: str
    upload_id: str
    status: ConversionStatus
    progress: int
    source_format: str
    target_format: str
    input_size_bytes: int
    output_size_bytes: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    download_url: Optional[str] = None
    created_at: Optional[datetime] = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ConversionListResponse:
    items: list[Conversion]
    total: int
    page: int
    page_size: int
    has_more: bool


@dataclass
class Upload:
    id: str
    filename: str
    status: str
    file_size: int
    upload_url: Optional[str] = None
    chunk_size: Optional[int] = None
    total_chunks: Optional[int] = None
    created_at: Optional[datetime] = None


@dataclass
class UploadResponse:
    id: str
    filename: str
    status: str
    file_size: int
    upload_url: Optional[str] = None
    chunk_size: Optional[int] = None
    total_chunks: Optional[int] = None
    created_at: Optional[datetime] = None


@dataclass
class Webhook:
    id: str
    url: str
    events: list[str]
    is_active: bool
    description: Optional[str] = None
    secret: Optional[str] = None
    created_at: Optional[datetime] = None


@dataclass
class WebhookDelivery:
    id: str
    webhook_id: str
    event_type: str
    status_code: Optional[int] = None
    response_body: Optional[str] = None
    attempts: int = 0
    next_retry_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


@dataclass
class RateLimitStatus:
    tier: str
    requests_per_minute: int
    requests_per_hour: int
    requests_per_day: int
    burst_limit: int
    current_minute_usage: int
    current_hour_usage: int
    current_day_usage: int
    reset_at: Optional[datetime] = None


@dataclass
class UserProfile:
    id: str
    email: str
    name: str
    tier: str
    api_keys_count: int
    conversions_today: int
    conversions_limit: int
    storage_used_bytes: int
    storage_limit_bytes: int
    created_at: Optional[datetime] = None


@dataclass
class SearchResult:
    id: str
    subject: str
    sender: str
    recipients: list[str]
    date: datetime
    snippet: str
    score: float
    highlights: dict[str, str] = field(default_factory=dict)


@dataclass
class SearchResponse:
    query: str
    total_results: int
    page: int
    page_size: int
    results: list[SearchResult]
    took_ms: int
