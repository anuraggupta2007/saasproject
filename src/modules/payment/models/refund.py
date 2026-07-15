import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Numeric, Enum, ForeignKey, JSON, Text, Index
from sqlalchemy.dialects.postgresql import UUID

from src.models.base import Base


class RefundStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"


class RefundReason(str, enum.Enum):
    DUPLICATE = "duplicate"
    FRAUDULENT = "fraudulent"
    REQUESTED_BY_CUSTOMER = "requested_by_customer"
    SUBSCRIPTION_CANCELLED = "subscription_cancelled"
    PRODUCT_UNSATISFACTORY = "product_unsatisfactory"
    OTHER = "other"


class Refund(Base):
    __tablename__ = "refunds"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payment_id = Column(UUID(as_uuid=True), ForeignKey("payments.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD")
    status = Column(Enum(RefundStatus), default=RefundStatus.PENDING, nullable=False)
    reason = Column(Enum(RefundReason), nullable=True)
    description = Column(Text, nullable=True)
    provider_refund_id = Column(String(255), nullable=True)
    metadata_json = Column("metadata", JSON, default=dict)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_refund_payment", "payment_id"),
        Index("idx_refund_user_status", "user_id", "status"),
    )
