import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Boolean, Integer, Enum, Text, ForeignKey, JSON, Numeric, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from src.models.base import Base


class LicenseType(str, enum.Enum):
    TRIAL = "trial"
    PERSONAL = "personal"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"
    LIFETIME = "lifetime"
    SUBSCRIPTION = "subscription"
    CUSTOM = "custom"


class LicenseStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    SUSPENDED = "suspended"
    REVOKED = "revoked"
    PENDING = "pending"


class License(Base):
    __tablename__ = "licenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    license_key = Column(String(255), unique=True, nullable=False, index=True)
    license_type = Column(Enum(LicenseType), nullable=False)
    status = Column(Enum(LicenseStatus), default=LicenseStatus.PENDING, nullable=False)
    issued_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=True)
    max_activations = Column(Integer, default=1)
    current_activations = Column(Integer, default=0)
    features = Column(JSON, default=dict)
    metadata_json = Column("metadata", JSON, default=dict)
    is_trial = Column(Boolean, default=False)
    trial_days = Column(Integer, nullable=True)
    parent_license_id = Column(UUID(as_uuid=True), ForeignKey("licenses.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="licenses")
    devices = relationship("Activation", back_populates="license")
    subscription = relationship("Subscription", back_populates="license", uselist=False)

    __table_args__ = (
        Index("idx_license_user_status", "user_id", "status"),
        Index("idx_license_type_status", "license_type", "status"),
    )
