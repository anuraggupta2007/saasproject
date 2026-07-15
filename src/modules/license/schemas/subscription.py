import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from enum import Enum


class SubscriptionStatusSchema(str, Enum):
    ACTIVE = "active"
    CANCELLED = "cancelled"
    PAUSED = "paused"
    EXPIRED = "expired"
    PAST_DUE = "past_due"
    TRIALING = "trialing"


class SubscriptionCreateRequest(BaseModel):
    user_id: uuid.UUID
    plan_id: uuid.UUID
    license_id: uuid.UUID
    trial_days: Optional[int] = None


class SubscriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    license_id: uuid.UUID
    plan_id: uuid.UUID
    status: SubscriptionStatusSchema
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    cancel_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    trial_start: Optional[datetime] = None
    trial_end: Optional[datetime] = None
    payment_status: str = "paid"
    last_payment_at: Optional[datetime] = None
    next_payment_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class SubscriptionRenewRequest(BaseModel):
    subscription_id: uuid.UUID
    extend_days: Optional[int] = None
    payment_amount: Optional[float] = None


class SubscriptionCancelRequest(BaseModel):
    subscription_id: uuid.UUID
    reason: Optional[str] = None
    cancel_immediately: bool = False


class SubscriptionUpgradeRequest(BaseModel):
    subscription_id: uuid.UUID
    new_plan_id: uuid.UUID
    prorate: bool = True


class SubscriptionListResponse(BaseModel):
    subscriptions: list[SubscriptionResponse]
    total: int
    page: int
    page_size: int
