import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Any
from enum import Enum


class WebhookEventStatusSchema(str, Enum):
    PENDING = "pending"
    PROCESSED = "processed"
    FAILED = "failed"
    SKIPPED = "skipped"


class WebhookEventCreateRequest(BaseModel):
    provider: str
    event_type: str
    provider_event_id: str
    payload: dict
    idempotency_key: Optional[str] = None


class WebhookEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    provider: str
    event_type: str
    provider_event_id: str
    status: WebhookEventStatusSchema
    processed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    retry_count: int
    created_at: Optional[datetime] = None


class WebhookEventListResponse(BaseModel):
    events: list[WebhookEventResponse]
    total: int
    page: int
    page_size: int


class WebhookProcessResult(BaseModel):
    success: bool
    event_id: uuid.UUID
    message: str = ""
    action_taken: Optional[str] = None


class StripeWebhookPayload(BaseModel):
    id: str
    object: str
    type: str
    data: dict
    created: int
    livemode: bool


class RazorpayWebhookPayload(BaseModel):
    event: str
    payload: dict
    created_at: int
