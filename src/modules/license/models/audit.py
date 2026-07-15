import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Integer, Enum, JSON, Index
from sqlalchemy.dialects.postgresql import UUID
import enum

from src.models.base import Base


class AuditAction(str, enum.Enum):
    LICENSE_CREATED = "license_created"
    LICENSE_ACTIVATED = "license_activated"
    LICENSE_VALIDATED = "license_validated"
    LICENSE_SUSPENDED = "license_suspended"
    LICENSE_REVOKED = "license_revoked"
    LICENSE_RENEWED = "license_renewed"
    DEVICE_REGISTERED = "device_registered"
    DEVICE_DEACTIVATED = "device_deactivated"
    DEVICE_TRANSFERRED = "device_transferred"
    SUBSCRIPTION_CREATED = "subscription_created"
    SUBSCRIPTION_CANCELLED = "subscription_cancelled"
    SUBSCRIPTION_RENEWED = "subscription_renewed"
    TRIAL_STARTED = "trial_started"
    TRIAL_CONVERTED = "trial_converted"
    FEATURE_ACCESSED = "feature_accessed"


class AuditSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AuditLog(Base):
    __tablename__ = "license_audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    license_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    action = Column(Enum(AuditAction), nullable=False, index=True)
    severity = Column(Enum(AuditSeverity), default=AuditSeverity.INFO)
    details = Column(JSON, default=dict)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_license_audit_user_action", "user_id", "action"),
        Index("idx_license_audit_created", "created_at"),
    )
