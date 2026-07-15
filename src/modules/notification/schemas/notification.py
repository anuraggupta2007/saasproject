import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any
from enum import Enum


class NotificationChannelSchema(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    IN_APP = "in_app"
    WEBHOOK = "webhook"


class NotificationStatusSchema(str, Enum):
    PENDING = "pending"
    QUEUED = "queued"
    SENDING = "sending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RETRYING = "retrying"


class NotificationPrioritySchema(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class NotificationCreateRequest(BaseModel):
    user_id: uuid.UUID
    channel: NotificationChannelSchema
    template_name: Optional[str] = None
    subject: Optional[str] = None
    content: str
    html_content: Optional[str] = None
    recipient: str
    priority: NotificationPrioritySchema = NotificationPrioritySchema.NORMAL
    variables: dict = Field(default_factory=dict)
    scheduled_at: Optional[datetime] = None
    metadata: dict = Field(default_factory=dict)


class NotificationBatchRequest(BaseModel):
    notifications: List[NotificationCreateRequest]
    send_immediately: bool = True


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    channel: NotificationChannelSchema
    priority: NotificationPrioritySchema
    status: NotificationStatusSchema
    subject: Optional[str] = None
    content: str
    recipient: str
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    total: int
    unread_count: int
    page: int
    page_size: int


class NotificationMarkReadRequest(BaseModel):
    notification_ids: List[uuid.UUID]


class TemplateCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    template_type: str
    subject: Optional[str] = None
    body_text: str
    body_html: Optional[str] = None
    variables: List[str] = Field(default_factory=list)
    locale: str = "en"
    metadata: dict = Field(default_factory=dict)


class TemplateUpdateRequest(BaseModel):
    subject: Optional[str] = None
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    variables: Optional[List[str]] = None
    is_active: Optional[bool] = None
    metadata: Optional[dict] = None


class TemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    template_type: str
    subject: Optional[str] = None
    body_text: str
    body_html: Optional[str] = None
    variables: List[str] = Field(default_factory=list)
    locale: str
    version: int
    is_active: bool
    created_at: Optional[datetime] = None


class TemplateListResponse(BaseModel):
    templates: List[TemplateResponse]
    total: int


class TemplatePreviewRequest(BaseModel):
    template_name: str
    variables: dict = Field(default_factory=dict)
    locale: Optional[str] = None


class TemplatePreviewResponse(BaseModel):
    subject: Optional[str] = None
    body_text: str
    body_html: Optional[str] = None


class UserPreferencesResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    email_enabled: bool
    sms_enabled: bool
    push_enabled: bool
    in_app_enabled: bool
    webhook_enabled: bool
    webhook_url: Optional[str] = None
    frequency: str
    language: str
    timezone_str: str
    quiet_hours_start: Optional[int] = None
    quiet_hours_end: Optional[int] = None


class UserPreferencesUpdateRequest(BaseModel):
    email_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None
    webhook_enabled: Optional[bool] = None
    webhook_url: Optional[str] = None
    webhook_secret: Optional[str] = None
    frequency: Optional[str] = None
    language: Optional[str] = None
    timezone_str: Optional[str] = None
    quiet_hours_start: Optional[int] = None
    quiet_hours_end: Optional[int] = None


class DeliveryLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    notification_id: uuid.UUID
    channel: str
    provider: Optional[str] = None
    status: str
    provider_message_id: Optional[str] = None
    error_message: Optional[str] = None
    attempt: int
    created_at: Optional[datetime] = None


class NotificationStatsResponse(BaseModel):
    total_sent: int = 0
    total_delivered: int = 0
    total_failed: int = 0
    by_channel: dict = Field(default_factory=dict)
    by_status: dict = Field(default_factory=dict)
    delivery_rate: float = 0.0


class BroadcastRequest(BaseModel):
    channel: NotificationChannelSchema
    subject: Optional[str] = None
    content: str
    html_content: Optional[str] = None
    recipient_user_ids: Optional[List[uuid.UUID]] = None
    recipient_segments: Optional[List[str]] = None
    priority: NotificationPrioritySchema = NotificationPrioritySchema.NORMAL
    scheduled_at: Optional[datetime] = None
