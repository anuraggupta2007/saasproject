import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from enum import Enum


class LicenseTypeSchema(str, Enum):
    TRIAL = "trial"
    PERSONAL = "personal"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"
    LIFETIME = "lifetime"
    SUBSCRIPTION = "subscription"
    CUSTOM = "custom"


class LicenseStatusSchema(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    SUSPENDED = "suspended"
    REVOKED = "revoked"
    PENDING = "pending"


class LicenseBase(BaseModel):
    license_type: LicenseTypeSchema
    max_activations: int = Field(ge=1, le=100)
    features: dict = Field(default_factory=dict)
    trial_days: Optional[int] = None
    expires_at: Optional[datetime] = None


class LicenseCreateRequest(BaseModel):
    user_id: uuid.UUID
    license_type: LicenseTypeSchema
    max_activations: int = Field(default=1, ge=1, le=100)
    features: dict = Field(default_factory=dict)
    trial_days: Optional[int] = None
    expires_at: Optional[datetime] = None
    metadata: dict = Field(default_factory=dict)


class LicenseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    license_key: str
    license_type: LicenseTypeSchema
    status: LicenseStatusSchema
    issued_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    max_activations: int
    current_activations: int
    features: dict = Field(default_factory=dict)
    is_trial: bool = False
    trial_days: Optional[int] = None
    created_at: Optional[datetime] = None


class LicenseListResponse(BaseModel):
    licenses: list[LicenseResponse]
    total: int
    page: int
    page_size: int


class LicenseValidateRequest(BaseModel):
    license_key: str
    device_fingerprint: str
    offline_token: Optional[str] = None


class LicenseValidateResponse(BaseModel):
    valid: bool
    license_id: Optional[uuid.UUID] = None
    status: Optional[LicenseStatusSchema] = None
    expires_at: Optional[datetime] = None
    features: dict = Field(default_factory=dict)
    validation_token: Optional[str] = None
    message: str = ""


class LicenseUpgradeRequest(BaseModel):
    license_id: uuid.UUID
    target_license_type: LicenseTypeSchema
    max_activations: Optional[int] = None
    features: Optional[dict] = None


class LicenseRenewRequest(BaseModel):
    license_id: uuid.UUID
    billing_cycle: Optional[str] = None
    extend_days: Optional[int] = None


class LicenseRevokeRequest(BaseModel):
    license_id: uuid.UUID
    reason: Optional[str] = None


class LicenseSuspendRequest(BaseModel):
    license_id: uuid.UUID
    reason: Optional[str] = None
    suspend_until: Optional[datetime] = None
