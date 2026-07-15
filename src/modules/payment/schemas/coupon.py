import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from enum import Enum


class CouponTypeSchema(str, Enum):
    PERCENTAGE = "percentage"
    FIXED_AMOUNT = "fixed_amount"
    FREE_TRIAL = "free_trial"


class CouponStatusSchema(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"


class CouponCreateRequest(BaseModel):
    code: str = Field(min_length=3, max_length=50)
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    coupon_type: CouponTypeSchema
    value: float = Field(ge=0)
    currency: str = Field(default="USD", max_length=3)
    max_uses: Optional[int] = None
    max_uses_per_user: int = Field(default=1, ge=1)
    min_purchase_amount: Optional[float] = None
    applicable_plans: List[str] = Field(default_factory=list)
    starts_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class CouponUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    value: Optional[float] = None
    max_uses: Optional[int] = None
    status: Optional[CouponStatusSchema] = None
    expires_at: Optional[datetime] = None


class CouponResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str
    description: Optional[str] = None
    coupon_type: CouponTypeSchema
    value: float
    currency: str
    max_uses: Optional[int] = None
    used_count: int
    max_uses_per_user: int
    min_purchase_amount: Optional[float] = None
    applicable_plans: List[str] = Field(default_factory=list)
    status: CouponStatusSchema
    starts_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class CouponListResponse(BaseModel):
    coupons: List[CouponResponse]
    total: int
    page: int
    page_size: int


class CouponValidateRequest(BaseModel):
    code: str
    user_id: uuid.UUID
    plan_id: Optional[uuid.UUID] = None
    amount: Optional[float] = None


class CouponValidateResponse(BaseModel):
    valid: bool
    coupon_id: Optional[uuid.UUID] = None
    discount_amount: float = 0
    final_amount: float = 0
    message: str = ""


class CouponApplyRequest(BaseModel):
    code: str
    payment_id: uuid.UUID
    user_id: uuid.UUID
