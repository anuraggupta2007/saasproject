from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# --- API Key Schemas ---

class APIKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    scopes: List[str] = Field(default_factory=lambda: ["read"])
    expires_in_days: Optional[int] = Field(None, ge=1, le=365)
    ip_restrictions: List[str] = Field(default_factory=list)
    rate_limit_override: Optional[int] = Field(None, ge=1, le=100000)
    daily_quota_override: Optional[int] = Field(None, ge=1, le=10000000)
    metadata: dict = Field(default_factory=dict)

    @field_validator("scopes")
    @classmethod
    def validate_scopes(cls, v):
        valid_scopes = {"read", "write", "delete", "admin", "webhooks"}
        for scope in v:
            if scope not in valid_scopes:
                raise ValueError(f"Invalid scope: {scope}. Must be one of: {valid_scopes}")
        return v


class APIKeyResponse(BaseModel):
    id: UUID
    name: str
    key_prefix: str
    scopes: List[str]
    tier: str
    is_active: bool
    expires_at: Optional[datetime]
    last_used_at: Optional[datetime]
    ip_restrictions: List[str]
    created_at: datetime

    class Config:
        from_attributes = True


class APIKeyCreatedResponse(BaseModel):
    id: UUID
    name: str
    api_key: str = Field(..., description="Full API key. Store securely - it won't be shown again.")
    key_prefix: str
    scopes: List[str]
    tier: str
    expires_at: Optional[datetime]
    created_at: datetime


class APIKeyRotateResponse(BaseModel):
    id: UUID
    name: str
    new_api_key: str = Field(..., description="New API key. Previous key is immediately invalidated.")
    key_prefix: str
    rotated_at: datetime


# --- OAuth2 Schemas ---

class OAuth2ClientCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    redirect_uris: List[str] = Field(default_factory=list)
    grant_types: List[str] = Field(default_factory=lambda: ["client_credentials"])
    scopes: List[str] = Field(default_factory=lambda: ["read"])

    @field_validator("grant_types")
    @classmethod
    def validate_grant_types(cls, v):
        valid = {"client_credentials", "authorization_code", "refresh_token"}
        for gt in v:
            if gt not in valid:
                raise ValueError(f"Invalid grant type: {gt}")
        return v


class OAuth2ClientResponse(BaseModel):
    id: UUID
    client_id: str
    name: str
    description: Optional[str]
    redirect_uris: List[str]
    grant_types: List[str]
    scopes: List[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class OAuth2TokenRequest(BaseModel):
    grant_type: str = Field(..., pattern="^(client_credentials|authorization_code|refresh_token)$")
    client_id: str
    client_secret: str
    scope: Optional[str] = None
    code: Optional[str] = None
    refresh_token: Optional[str] = None


class OAuth2TokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int = 3600
    refresh_token: Optional[str] = None
    scope: str


# --- Webhook Schemas ---

class WebhookCreate(BaseModel):
    url: str = Field(..., max_length=2048)
    events: List[str] = Field(..., min_length=1)
    description: Optional[str] = Field(None, max_length=500)
    metadata: dict = Field(default_factory=dict)

    @field_validator("events")
    @classmethod
    def validate_events(cls, v):
        valid_events = {
            "conversion.completed", "conversion.failed", "conversion.started",
            "upload.completed", "upload.failed",
            "payment.successful", "payment.failed",
            "license.created", "license.expired", "license.revoked",
            "subscription.created", "subscription.cancelled", "subscription.renewed",
        }
        for event in v:
            if event not in valid_events:
                raise ValueError(f"Invalid event: {event}. Valid: {valid_events}")
        return v


class WebhookResponse(BaseModel):
    id: UUID
    url: str
    events: List[str]
    is_active: bool
    description: Optional[str]
    secret: str = Field(..., description="Webhook signing secret")
    created_at: datetime

    class Config:
        from_attributes = True


class WebhookDeliveryResponse(BaseModel):
    id: UUID
    webhook_id: UUID
    event: str
    status: str
    status_code: Optional[int]
    attempts: int
    max_attempts: int
    next_retry_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# --- Rate Limit Schemas ---

class RateLimitStatus(BaseModel):
    tier: str
    requests_per_minute: int
    requests_per_hour: int
    requests_per_day: int
    burst_limit: int
    current_minute_usage: int
    current_hour_usage: int
    current_day_usage: int
    reset_at: datetime


# --- Upload Schemas ---

class UploadCreate(BaseModel):
    filename: str = Field(..., max_length=500)
    content_type: str = Field(default="application/mbox")
    file_size: int = Field(..., gt=0)
    metadata: dict = Field(default_factory=dict)


class UploadResponse(BaseModel):
    id: UUID
    filename: str
    status: str
    file_size: int
    upload_url: Optional[str]
    chunk_size: Optional[int]
    total_chunks: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class UploadChunkResponse(BaseModel):
    chunk_number: int
    uploaded: bool
    size_bytes: int


# --- Conversion Schemas ---

class ConversionCreate(BaseModel):
    upload_id: UUID
    target_format: str = Field(..., pattern="^(pdf|html|txt|json|csv|eml)$")
    options: dict = Field(default_factory=dict)
    webhook_url: Optional[str] = Field(None, max_length=2048)
    metadata: dict = Field(default_factory=dict)


class ConversionResponse(BaseModel):
    id: UUID
    upload_id: UUID
    status: str
    progress: int
    source_format: str
    target_format: str
    input_size_bytes: int
    output_size_bytes: Optional[int]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    error_message: Optional[str]
    download_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ConversionListResponse(BaseModel):
    items: List[ConversionResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


# --- Search Schemas ---

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    filters: dict = Field(default_factory=dict)
    sort_by: Optional[str] = None
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$")
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class SearchResult(BaseModel):
    id: UUID
    score: float
    source: dict
    highlights: dict = Field(default_factory=dict)


class SearchResponse(BaseModel):
    query: str
    total_results: int
    page: int
    page_size: int
    results: List[SearchResult]
    took_ms: float


# --- User Schemas ---

class UserProfileResponse(BaseModel):
    id: UUID
    email: str
    name: str
    tier: str
    api_keys_count: int
    conversions_today: int
    conversions_limit: int
    storage_used_bytes: int
    storage_limit_bytes: int
    created_at: datetime


class UserUsageResponse(BaseModel):
    period: str
    api_requests: int
    conversions: int
    storage_used_bytes: int
    bandwidth_bytes: int
    api_key_usage: List[dict]


class SubscriptionResponse(BaseModel):
    id: UUID
    plan: str
    status: str
    current_period_start: datetime
    current_period_end: datetime
    features: dict
    limits: dict


# --- Pagination ---

class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    sort_by: Optional[str] = None
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$")


class PaginatedResponse(BaseModel):
    items: List[dict]
    total: int
    page: int
    page_size: int
    has_more: bool
    total_pages: int


# --- Error Schemas ---

class APIError(BaseModel):
    code: str
    message: str
    details: Optional[dict] = None
    request_id: Optional[str] = None


class APIErrorResponse(BaseModel):
    error: APIError
    timestamp: datetime
    documentation_url: Optional[str] = None
