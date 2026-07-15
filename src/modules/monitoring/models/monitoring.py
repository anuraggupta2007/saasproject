import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Enum, JSON, Text, Index, Boolean, Float, Integer
from src.models.base import Base, BaseModelMixin


class EventSeverity(str, enum.Enum):
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class EventType(str, enum.Enum):
    SYSTEM_STARTUP = "system_startup"
    SYSTEM_SHUTDOWN = "system_shutdown"
    HEALTH_CHECK = "health_check"
    ALERT_TRIGGERED = "alert_triggered"
    ALERT_RESOLVED = "alert_resolved"
    CONFIG_CHANGE = "config_change"
    SECURITY_EVENT = "security_event"
    DEPLOYMENT = "deployment"
    MAINTENANCE = "maintenance"
    PERFORMANCE_DEGRADATION = "performance_degradation"
    CAPACITY_WARNING = "capacity_warning"
    ERROR_OCCURRED = "error_occurred"


class SystemEvent(Base, BaseModelMixin):
    __tablename__ = "monitoring_system_events"

    event_type = Column(Enum(EventType), nullable=False, index=True)
    severity = Column(Enum(EventSeverity), nullable=False, index=True)
    source = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    metadata_ = Column("metadata", JSON, default=dict)
    correlation_id = Column(String(36), index=True)
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime(timezone=True))
    resolved_by = Column(String(36))

    __table_args__ = (
        Index("ix_system_events_created", "created_at"),
        Index("ix_system_events_type_severity", "event_type", "severity"),
    )


class AlertRule(Base, BaseModelMixin):
    __tablename__ = "alert_rules"

    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text)
    metric_name = Column(String(255), nullable=False)
    condition = Column(String(50), nullable=False)
    threshold = Column(Float, nullable=False)
    severity = Column(Enum(EventSeverity), nullable=False)
    enabled = Column(Boolean, default=True)
    cooldown_seconds = Column(Integer, default=300)
    notification_channels = Column(JSON, default=list)
    metadata_ = Column("metadata", JSON, default=dict)


class AlertHistory(Base, BaseModelMixin):
    __tablename__ = "alert_history"

    alert_rule_id = Column(String(36), nullable=False, index=True)
    alert_rule_name = Column(String(255), nullable=False)
    severity = Column(Enum(EventSeverity), nullable=False)
    triggered_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime(timezone=True))
    value = Column(Float, nullable=False)
    threshold = Column(Float, nullable=False)
    message = Column(Text)
    metadata_ = Column("metadata", JSON, default=dict)

    __table_args__ = (
        Index("ix_alert_history_triggered", "triggered_at"),
    )


class HealthSnapshot(Base, BaseModelMixin):
    __tablename__ = "health_snapshots"

    overall_status = Column(String(20), nullable=False)
    api_healthy = Column(Boolean, default=True)
    database_healthy = Column(Boolean, default=True)
    redis_healthy = Column(Boolean, default=True)
    celery_healthy = Column(Boolean, default=True)
    storage_healthy = Column(Boolean, default=True)
    disk_usage_percent = Column(Float, default=0.0)
    memory_usage_percent = Column(Float, default=0.0)
    cpu_usage_percent = Column(Float, default=0.0)
    active_connections = Column(Integer, default=0)
    queue_depth = Column(Integer, default=0)
    metadata_ = Column("metadata", JSON, default=dict)

    __table_args__ = (
        Index("ix_health_snapshots_overall", "overall_status"),
        Index("ix_health_snapshots_created", "created_at"),
    )
