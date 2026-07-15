import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from enum import Enum


class AdminRoleSchema(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    SUPPORT = "support"
    FINANCE = "finance"
    READ_ONLY = "read_only"


class AdminUserCreateRequest(BaseModel):
    user_id: uuid.UUID
    role: AdminRoleSchema
    permissions: List[str] = Field(default_factory=list)
    ip_allowlist: List[str] = Field(default_factory=list)


class AdminUserUpdateRequest(BaseModel):
    role: Optional[AdminRoleSchema] = None
    permissions: Optional[List[str]] = None
    ip_allowlist: Optional[List[str]] = None
    is_active: Optional[bool] = None


class AdminUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    role: AdminRoleSchema
    is_active: bool
    permissions: List[str] = Field(default_factory=list)
    ip_allowlist: List[str] = Field(default_factory=list)
    last_login_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class AdminUserListResponse(BaseModel):
    admins: List[AdminUserResponse]
    total: int


class DashboardOverviewResponse(BaseModel):
    total_users: int = 0
    active_users: int = 0
    total_conversions: int = 0
    daily_conversions: int = 0
    conversion_success_rate: float = 0.0
    failed_jobs: int = 0
    revenue: float = 0.0
    active_licenses: int = 0
    trial_users: int = 0
    storage_usage_mb: float = 0.0
    server_health: str = "healthy"
    worker_status: str = "running"


class DashboardMetricsResponse(BaseModel):
    daily_users: List[dict] = Field(default_factory=list)
    monthly_users: List[dict] = Field(default_factory=list)
    conversion_stats: dict = Field(default_factory=dict)
    revenue_analytics: dict = Field(default_factory=dict)
    storage_growth: List[dict] = Field(default_factory=list)
    api_usage: List[dict] = Field(default_factory=list)
    top_customers: List[dict] = Field(default_factory=list)


class UserManagementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: Optional[str] = None
    is_active: bool
    role: str = "user"
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    licenses_count: int = 0
    subscriptions_count: int = 0
    total_conversions: int = 0


class UserListResponse(BaseModel):
    users: List[UserManagementResponse]
    total: int
    page: int
    page_size: int


class ConversionJobAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    output_format: str
    status: str
    progress: int
    output_filename: Optional[str] = None
    output_size: Optional[int] = None
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    processing_duration_ms: Optional[int] = None


class ConversionJobListResponse(BaseModel):
    jobs: List[ConversionJobAdminResponse]
    total: int
    page: int
    page_size: int


class StorageAnalyticsResponse(BaseModel):
    total_files: int = 0
    total_size_mb: float = 0.0
    uploaded_files: int = 0
    converted_files: int = 0
    avg_file_size_mb: float = 0.0
    storage_by_type: dict = Field(default_factory=dict)


class WorkerStatusResponse(BaseModel):
    total_workers: int = 0
    active_workers: int = 0
    queue_lengths: dict = Field(default_factory=dict)
    running_jobs: int = 0
    failed_jobs: int = 0
    retry_queue: int = 0


class SystemHealthResponse(BaseModel):
    api_status: str = "healthy"
    database_status: str = "healthy"
    redis_status: str = "healthy"
    celery_status: str = "healthy"
    storage_status: str = "healthy"
    uptime_seconds: int = 0
    cpu_usage: float = 0.0
    memory_usage: float = 0.0


class AuditLogAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    action: str
    severity: str
    details: dict = Field(default_factory=dict)
    ip_address: Optional[str] = None
    created_at: Optional[datetime] = None


class AuditLogListResponse(BaseModel):
    logs: List[AuditLogAdminResponse]
    total: int
    page: int
    page_size: int


class AnnouncementCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1)
    announcement_type: str = "info"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    target_roles: List[str] = Field(default_factory=list)


class AnnouncementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    message: str
    announcement_type: str
    is_active: bool
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    created_at: Optional[datetime] = None


class AnnouncementListResponse(BaseModel):
    announcements: List[AnnouncementResponse]
    total: int


class BroadcastRequest(BaseModel):
    title: str
    message: str
    notification_type: str = "info"
    target_users: Optional[List[uuid.UUID]] = None
    send_email: bool = False


class SystemEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    event_type: str
    severity: str
    source: Optional[str] = None
    message: str
    details: dict = Field(default_factory=dict)
    resolved: bool
    created_at: Optional[datetime] = None


class SystemEventListResponse(BaseModel):
    events: List[SystemEventResponse]
    total: int
