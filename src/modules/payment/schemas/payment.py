import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from enum import Enum


class PaymentStatusSchema(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"
    DISPUTED = "disputed"


class PaymentMethodSchema(str, Enum):
    CARD = "card"
    BANK_TRANSFER = "bank_transfer"
    WALLET = "wallet"
    UPI = "upi"
    NET_BANKING = "net_banking"


class PaymentProviderSchema(str, Enum):
    STRIPE = "stripe"
    RAZORPAY = "razorpay"
    PAYPAL = "paypal"


class PaymentCreateRequest(BaseModel):
    amount: float = Field(gt=0)
    currency: str = Field(default="USD", max_length=3)
    payment_method: PaymentMethodSchema
    provider: PaymentProviderSchema
    subscription_id: Optional[uuid.UUID] = None
    invoice_id: Optional[uuid.UUID] = None
    description: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
    idempotency_key: Optional[str] = None


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    amount: float
    currency: str
    status: PaymentStatusSchema
    payment_method: Optional[PaymentMethodSchema] = None
    provider: PaymentProviderSchema
    provider_payment_id: Optional[str] = None
    description: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class PaymentListResponse(BaseModel):
    payments: List[PaymentResponse]
    total: int
    page: int
    page_size: int


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    payment_id: uuid.UUID
    type: str
    status: str
    amount: float
    currency: str
    description: Optional[str] = None
    created_at: Optional[datetime] = None
