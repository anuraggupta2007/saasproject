import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from enum import Enum


class AdminLicenseCreateRequest(BaseModel):
    user_id: uuid.UUID
    license_type: str
    max_activations: int = Field(default=1, ge=1, le=100)
    features: dict = Field(default_factory=dict)
    trial_days: Optional[int] = None
    expires_at: Optional[datetime] = None
    metadata: dict = Field(default_factory=dict)
    notes: Optional[str] = None


class AdminLicenseUpdateRequest(BaseModel):
    status: Optional[str] = None
    max_activations: Optional[int] = None
    features: Optional[dict] = None
    expires_at: Optional[datetime] = None
    notes: Optional[str] = None


class AdminSearchRequest(BaseModel):
    query: Optional[str] = None
    user_id: Optional[uuid.UUID] = None
    license_type: Optional[str] = None
    status: Optional[str] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class AdminUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    licenses_count: int = 0
    active_licenses: int = 0


class AdminUserListResponse(BaseModel):
    users: List[AdminUserResponse]
    total: int
    page: int
    page_size: int


class AdminAnalyticsResponse(BaseModel):
    total_licenses: int
    active_licenses: int
    expired_licenses: int
    suspended_licenses: int
    revoked_licenses: int
    total_activations: int
    active_activations: int
    total_subscriptions: int
    active_subscriptions: int
    revenue_by_type: dict = Field(default_factory=dict)
    licenses_by_type: dict = Field(default_factory=dict)
    recent_activity: List[dict] = Field(default_factory=list)


class AdminActivationListResponse(BaseModel):
    activations: list
    total: int
    page: int
    page_size: int


class AdminAuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    license_id: Optional[uuid.UUID] = None
    action: str
    severity: str
    details: dict = Field(default_factory=dict)
    ip_address: Optional[str] = None
    created_at: Optional[datetime] = None


class AdminAuditLogListResponse(BaseModel):
    logs: List[AdminAuditLogResponse]
    total: int
    page: int
    page_size: int
