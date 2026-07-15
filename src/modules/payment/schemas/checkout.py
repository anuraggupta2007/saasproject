import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from enum import Enum


class CheckoutMode(str, Enum):
    HOSTED = "hosted"
    EMBEDDED = "embedded"


class SubscriptionInterval(str, Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"
    ONE_TIME = "one_time"


class CheckoutCreateRequest(BaseModel):
    plan_id: uuid.UUID
    user_id: uuid.UUID
    mode: CheckoutMode = CheckoutMode.HOSTED
    interval: SubscriptionInterval = SubscriptionInterval.MONTHLY
    coupon_code: Optional[str] = None
    success_url: str
    cancel_url: str
    metadata: dict = Field(default_factory=dict)


class CheckoutResponse(BaseModel):
    checkout_id: str
    checkout_url: str
    mode: CheckoutMode
    expires_at: Optional[datetime] = None
    metadata: dict = Field(default_factory=dict)


class CheckoutVerifyRequest(BaseModel):
    checkout_id: str
    session_id: Optional[str] = None
    payment_intent_id: Optional[str] = None


class CheckoutVerifyResponse(BaseModel):
    success: bool
    payment_id: Optional[uuid.UUID] = None
    subscription_id: Optional[uuid.UUID] = None
    invoice_id: Optional[uuid.UUID] = None
    status: str
    message: str = ""


class PaymentMethodResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: str
    brand: Optional[str] = None
    last4: Optional[str] = None
    exp_month: Optional[int] = None
    exp_year: Optional[int] = None
    is_default: bool = False


class PaymentMethodListResponse(BaseModel):
    payment_methods: List[PaymentMethodResponse]
    default_method_id: Optional[str] = None
