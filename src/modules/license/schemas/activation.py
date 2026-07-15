import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from enum import Enum


class ActivationStatusSchema(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"
    REVOKED = "revoked"


class ActivationRequest(BaseModel):
    license_key: str
    device_fingerprint: str
    device_name: Optional[str] = None
    device_type: Optional[str] = None
    os_type: Optional[str] = None
    os_version: Optional[str] = None
    ip_address: Optional[str] = None


class ActivationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    license_id: uuid.UUID
    device_id: uuid.UUID
    user_id: uuid.UUID
    status: ActivationStatusSchema
    activated_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    last_validated: Optional[datetime] = None
    validation_token: Optional[str] = None
    created_at: Optional[datetime] = None


class ActivationListResponse(BaseModel):
    activations: list[ActivationResponse]
    total: int
    max_activations: int
    remaining_activations: int


class DeactivationRequest(BaseModel):
    activation_id: uuid.UUID
    reason: Optional[str] = None


class DeactivationResponse(BaseModel):
    success: bool
    message: str
    activation_id: uuid.UUID


class ActivationHistoryEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    device_fingerprint: str
    device_name: Optional[str] = None
    status: ActivationStatusSchema
    activated_at: Optional[datetime] = None
    deactivated_at: Optional[datetime] = None
    ip_address: Optional[str] = None


class ActivationHistoryResponse(BaseModel):
    history: list[ActivationHistoryEntry]
    total: int
