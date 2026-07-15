import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Boolean, Integer, Numeric, Enum, JSON, Text, Index
from sqlalchemy.dialects.postgresql import UUID

from src.models.base import Base


class CouponType(str, enum.Enum):
    PERCENTAGE = "percentage"
    FIXED_AMOUNT = "fixed_amount"
    FREE_TRIAL = "free_trial"


class CouponStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    coupon_type = Column(Enum(CouponType), nullable=False)
    value = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD")
    max_uses = Column(Integer, nullable=True)
    used_count = Column(Integer, default=0)
    max_uses_per_user = Column(Integer, default=1)
    min_purchase_amount = Column(Numeric(12, 2), nullable=True)
    applicable_plans = Column(JSON, default=list)
    status = Column(Enum(CouponStatus), default=CouponStatus.ACTIVE)
    starts_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    metadata_json = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_coupon_code", "code"),
        Index("idx_coupon_status", "status"),
    )


class CouponUsage(Base):
    __tablename__ = "coupon_usage"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    coupon_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    payment_id = Column(UUID(as_uuid=True), nullable=True)
    discount_amount = Column(Numeric(12, 2), nullable=False)
    used_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_coupon_usage_coupon_user", "coupon_id", "user_id"),
    )
