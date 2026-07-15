from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field
from src.modules.monitoring.models.monitoring import EventSeverity, EventType


class HealthCheckResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str
    uptime_seconds: float
    checks: dict[str, Any]


class ComponentHealth(BaseModel):
    name: str
    status: str
    latency_ms: float | None = None
    message: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ReadinessResponse(BaseModel):
    status: str
    timestamp: datetime
    components: list[ComponentHealth]


class LivenessResponse(BaseModel):
    status: str
    timestamp: datetime
    uptime_seconds: float


class SystemStatusResponse(BaseModel):
    status: str
    timestamp: datetime
    api: dict[str, Any]
    database: dict[str, Any]
    redis: dict[str, Any]
    celery: dict[str, Any]
    storage: dict[str, Any]
    system: dict[str, Any]
    queue: dict[str, Any]


class SystemEventCreateRequest(BaseModel):
    event_type: EventType
    severity: EventSeverity
    source: str = Field(max_length=255)
    message: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    correlation_id: str | None = None


class SystemEventResponse(BaseModel):
    id: str
    event_type: EventType
    severity: EventSeverity
    source: str
    message: str
    metadata_: dict[str, Any] = Field(alias="metadata_")
    correlation_id: str | None = None
    resolved: bool
    resolved_at: datetime | None = None
    resolved_by: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SystemEventListResponse(BaseModel):
    events: list[SystemEventResponse]
    total: int
    page: int
    page_size: int


class AlertRuleCreateRequest(BaseModel):
    name: str = Field(max_length=255)
    description: str | None = None
    metric_name: str = Field(max_length=255)
    condition: str = Field(pattern="^(gt|gte|lt|lte|eq|ne)$")
    threshold: float
    severity: EventSeverity
    cooldown_seconds: int = Field(default=300, ge=60)
    notification_channels: list[str] = Field(default_factory=list)


class AlertRuleResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    metric_name: str
    condition: str
    threshold: float
    severity: EventSeverity
    enabled: bool
    cooldown_seconds: int
    notification_channels: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertHistoryResponse(BaseModel):
    id: str
    alert_rule_id: str
    alert_rule_name: str
    severity: EventSeverity
    triggered_at: datetime
    resolved_at: datetime | None = None
    value: float
    threshold: float
    message: str | None = None
    metadata_: dict[str, Any] = Field(alias="metadata_")
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertHistoryListResponse(BaseModel):
    alerts: list[AlertHistoryResponse]
    total: int
    page: int
    page_size: int


class HealthSnapshotResponse(BaseModel):
    id: str
    overall_status: str
    api_healthy: bool
    database_healthy: bool
    redis_healthy: bool
    celery_healthy: bool
    storage_healthy: bool
    disk_usage_percent: float
    memory_usage_percent: float
    cpu_usage_percent: float
    active_connections: int
    queue_depth: int
    metadata_: dict[str, Any] = Field(alias="metadata_")
    created_at: datetime

    model_config = {"from_attributes": True}


class MetricsQueryRequest(BaseModel):
    metric_name: str
    start_time: datetime | None = None
    end_time: datetime | None = None
    granularity: str = Field(default="1h", pattern="^(1m|5m|15m|1h|6h|1d|1w)$")


class MetricsResponse(BaseModel):
    metric_name: str
    data_points: list[dict[str, Any]]
    unit: str | None = None


class LogEntryResponse(BaseModel):
    timestamp: datetime
    level: str
    message: str
    source: str
    correlation_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class LogListResponse(BaseModel):
    logs: list[LogEntryResponse]
    total: int
    page: int
    page_size: int


class DashboardMetricsResponse(BaseModel):
    api: dict[str, Any]
    conversions: dict[str, Any]
    workers: dict[str, Any]
    infrastructure: dict[str, Any]
    generated_at: datetime
