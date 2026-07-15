import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any
from enum import Enum


class EventTypeSchema(str, Enum):
    USER_LOGIN = "user_login"
    USER_REGISTRATION = "user_registration"
    CONVERSION_STARTED = "conversion_started"
    CONVERSION_COMPLETED = "conversion_completed"
    CONVERSION_FAILED = "conversion_failed"
    FILE_UPLOADED = "file_uploaded"
    PAYMENT_COMPLETED = "payment_completed"
    PAYMENT_FAILED = "payment_failed"
    LICENSE_ACTIVATED = "license_activated"
    API_REQUEST = "api_request"
    ERROR_OCCURRED = "error_occurred"


class ReportTypeSchema(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"


class ReportStatusSchema(str, Enum):
    PENDING = "pending"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class AnalyticsEventCreateRequest(BaseModel):
    event_type: EventTypeSchema
    user_id: Optional[uuid.UUID] = None
    session_id: Optional[str] = None
    properties: dict = Field(default_factory=dict)
    metrics: dict = Field(default_factory=dict)
    source: Optional[str] = None


class AnalyticsEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    event_type: EventTypeSchema
    user_id: Optional[uuid.UUID] = None
    properties: dict = Field(default_factory=dict)
    metrics: dict = Field(default_factory=dict)
    created_at: Optional[datetime] = None


class AnalyticsEventListResponse(BaseModel):
    events: List[AnalyticsEventResponse]
    total: int
    page: int
    page_size: int


class DAUResponse(BaseModel):
    date: str
    count: int


class WAUResponse(BaseModel):
    week_start: str
    count: int


class MAUResponse(BaseModel):
    month: str
    count: int


class UserMetricsResponse(BaseModel):
    dau: List[DAUResponse] = Field(default_factory=list)
    wau: List[WAUResponse] = Field(default_factory=list)
    mau: List[MAUResponse] = Field(default_factory=list)
    new_registrations: int = 0
    churn_rate: float = 0.0
    customer_lifetime_value: float = 0.0


class ConversionMetricsResponse(BaseModel):
    total_conversions: int = 0
    successful_conversions: int = 0
    failed_conversions: int = 0
    success_rate: float = 0.0
    average_conversion_time_ms: float = 0.0
    format_popularity: dict = Field(default_factory=dict)
    average_upload_size_mb: float = 0.0
    queue_wait_time_avg_ms: float = 0.0
    worker_utilization: float = 0.0


class RevenueMetricsResponse(BaseModel):
    total_revenue: float = 0.0
    monthly_revenue: float = 0.0
    average_revenue_per_user: float = 0.0
    refunds_total: float = 0.0
    net_revenue: float = 0.0
    subscription_growth: float = 0.0
    mrr: float = 0.0
    arr: float = 0.0


class StorageMetricsResponse(BaseModel):
    total_storage_mb: float = 0.0
    storage_by_user: dict = Field(default_factory=dict)
    total_uploaded_files: int = 0
    total_converted_files: int = 0
    attachment_storage_mb: float = 0.0
    cleanup_statistics: dict = Field(default_factory=dict)


class APIMetricsResponse(BaseModel):
    total_requests: int = 0
    average_response_time_ms: float = 0.0
    error_rate: float = 0.0
    top_endpoints: List[dict] = Field(default_factory=list)
    rate_limit_violations: int = 0
    authentication_failures: int = 0


class ReportCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    report_type: ReportTypeSchema
    format: str = "json"
    parameters: dict = Field(default_factory=dict)
    scheduled_at: Optional[datetime] = None


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    report_type: ReportTypeSchema
    status: ReportStatusSchema
    format: str
    parameters: dict = Field(default_factory=dict)
    file_path: Optional[str] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class ReportListResponse(BaseModel):
    reports: List[ReportResponse]
    total: int
    page: int
    page_size: int


class ReportDataResponse(BaseModel):
    report_id: uuid.UUID
    name: str
    data: Any
    format: str
    generated_at: Optional[datetime] = None


class DashboardWidgetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    widget_type: str
    config: dict = Field(default_factory=dict)
    refresh_interval_seconds: int
    is_active: bool
    created_at: Optional[datetime] = None


class DashboardWidgetCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    widget_type: str
    config: dict = Field(default_factory=dict)
    data_query: Optional[str] = None
    refresh_interval_seconds: int = 300


class DashboardDataResponse(BaseModel):
    widgets: List[dict] = Field(default_factory=list)
    kpis: dict = Field(default_factory=dict)
    charts: dict = Field(default_factory=dict)
    recent_activity: List[dict] = Field(default_factory=list)


class LeaderboardResponse(BaseModel):
    metric_name: str
    period: str
    entries: List[dict] = Field(default_factory=list)


class HeatmapResponse(BaseModel):
    metric_name: str
    data: List[dict] = Field(default_factory=list)
    x_label: str = ""
    y_label: str = ""


class BusinessMetricsResponse(BaseModel):
    user_metrics: UserMetricsResponse
    conversion_metrics: ConversionMetricsResponse
    revenue_metrics: RevenueMetricsResponse
    storage_metrics: StorageMetricsResponse
    api_metrics: APIMetricsResponse
    generated_at: datetime
