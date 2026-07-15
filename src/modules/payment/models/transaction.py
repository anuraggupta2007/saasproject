import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Numeric, Enum, ForeignKey, JSON, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from src.models.base import Base


class TransactionType(str, enum.Enum):
    CHARGE = "charge"
    REFUND = "refund"
    DISPUTE = "dispute"
    ADJUSTMENT = "adjustment"
    CREDIT = "credit"


class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REVERSED = "reversed"


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payment_id = Column(UUID(as_uuid=True), ForeignKey("payments.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    type = Column(Enum(TransactionType), nullable=False)
    status = Column(Enum(TransactionStatus), default=TransactionStatus.PENDING, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD")
    provider_transaction_id = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    metadata_json = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    payment = relationship("Payment", back_populates="transactions")

    __table_args__ = (
        Index("idx_transaction_user_type", "user_id", "type"),
        Index("idx_transaction_payment", "payment_id"),
    )
