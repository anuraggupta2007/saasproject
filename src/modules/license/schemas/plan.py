import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from enum import Enum


class BillingCycleSchema(str, Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    LIFETIME = "lifetime"
    ENTERPRISE = "enterprise"


class PlanStatusSchema(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"


class PlanBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    display_name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    billing_cycle: BillingCycleSchema
    price: float = Field(ge=0)
    currency: str = Field(default="USD", max_length=3)
    trial_days: int = Field(default=0, ge=0)
    max_activations: int = Field(default=1, ge=1)
    features: dict = Field(default_factory=dict)
    is_popular: bool = False
    sort_order: int = 0


class PlanCreateRequest(PlanBase):
    pass


class PlanUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    trial_days: Optional[int] = None
    max_activations: Optional[int] = None
    features: Optional[dict] = None
    is_popular: Optional[bool] = None
    sort_order: Optional[int] = None
    status: Optional[PlanStatusSchema] = None


class PlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    display_name: str
    description: Optional[str] = None
    billing_cycle: BillingCycleSchema
    price: float
    currency: str
    trial_days: int
    max_activations: int
    features: dict = Field(default_factory=dict)
    is_popular: bool
    sort_order: int
    status: PlanStatusSchema
    created_at: Optional[datetime] = None


class PlanListResponse(BaseModel):
    plans: List[PlanResponse]
    total: int
