import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Boolean, Integer, Enum, Numeric, JSON, Index
from sqlalchemy.dialects.postgresql import UUID
import enum

from src.models.base import Base


class BillingCycle(str, enum.Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    LIFETIME = "lifetime"
    ENTERPRISE = "enterprise"


class PlanStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"


class Plan(Base):
    __tablename__ = "plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)
    display_name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    billing_cycle = Column(Enum(BillingCycle), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD")
    trial_days = Column(Integer, default=0)
    max_activations = Column(Integer, default=1)
    features = Column(JSON, default=dict)
    is_popular = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    status = Column(Enum(PlanStatus), default=PlanStatus.ACTIVE)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_plan_billing_cycle", "billing_cycle"),
        Index("idx_plan_status", "status"),
    )
