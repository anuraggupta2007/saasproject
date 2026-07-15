from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field, EmailStr


class SessionResponse(BaseModel):
    id: str
    device_name: str | None = None
    device_type: str | None = None
    ip_address: str | None = None
    location_country: str | None = None
    location_city: str | None = None
    last_activity_at: datetime
    created_at: datetime
    is_current: bool = False

    model_config = {"from_attributes": True}


class SessionListResponse(BaseModel):
    sessions: list[SessionResponse]
    total: int


class RevokeSessionRequest(BaseModel):
    session_id: str
    reason: str = Field(max_length=255, default="user_requested")


class APIKeyCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    scopes: list[str] = Field(default_factory=list)
    rate_limit: int = Field(default=1000, ge=10, le=100000)
    daily_quota: int = Field(default=10000, ge=100, le=1000000)
    expires_in_days: int | None = Field(default=None, ge=1, le=365)


class APIKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    scopes: list[str]
    rate_limit: int
    daily_quota: int
    is_active: bool
    last_used_at: datetime | None = None
    expires_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class APIKeyCreateResponse(BaseModel):
    api_key: str
    key_id: str
    name: str
    message: str


class APIKeyListResponse(BaseModel):
    api_keys: list[APIKeyResponse]
    total: int


class SecurityEventResponse(BaseModel):
    id: str
    event_type: str
    severity: str
    ip_address: str | None = None
    resource: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)
    blocked: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class SecurityEventListResponse(BaseModel):
    events: list[SecurityEventResponse]
    total: int
    page: int
    page_size: int


class SecurityEventCreateRequest(BaseModel):
    event_type: str
    severity: str = "info"
    resource: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)


class TrustedDeviceResponse(BaseModel):
    id: str
    device_name: str | None = None
    device_type: str | None = None
    browser: str | None = None
    os: str | None = None
    ip_address: str | None = None
    last_seen_at: datetime
    trusted_until: datetime
    is_active: bool

    model_config = {"from_attributes": True}


class TrustedDeviceListResponse(BaseModel):
    devices: list[TrustedDeviceResponse]
    total: int


class AddTrustedDeviceRequest(BaseModel):
    device_name: str = Field(min_length=1, max_length=255)
    device_fingerprint: str = Field(min_length=1, max_length=64)
    device_type: str | None = None
    browser: str | None = None
    os: str | None = None
    trust_duration_days: int = Field(default=30, ge=1, le=365)


class MFASetupResponse(BaseModel):
    secret: str
    qr_code_url: str
    backup_codes: list[str]
    message: str


class MFAVerifyRequest(BaseModel):
    code: str = Field(min_length=6, max_length=8)
    method: str = "totp"


class MFAToggleRequest(BaseModel):
    enable: bool
    code: str = Field(min_length=6, max_length=8)


class MFATatusResponse(BaseModel):
    enabled: bool
    method: str | None = None
    verified: bool = False
    backup_codes_remaining: int = 0


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=12)
    confirm_password: str


class PasswordStrengthResponse(BaseModel):
    score: int = Field(ge=0, le=5)
    feedback: list[str]
    is_valid: bool


class SecuritySettingsResponse(BaseModel):
    mfa_enabled: bool
    trusted_devices_count: int
    active_sessions_count: int
    api_keys_count: int
    last_password_change: datetime | None = None
    password_expires_at: datetime | None = None
    account_locked: bool = False


class AuditLogResponse(BaseModel):
    id: str
    user_id: str | None = None
    action: str
    resource_type: str
    resource_id: str | None = None
    changes: dict[str, Any] = Field(default_factory=dict)
    ip_address: str | None = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogListResponse(BaseModel):
    logs: list[AuditLogResponse]
    total: int
    page: int
    page_size: int


class LoginAttemptResponse(BaseModel):
    id: str
    email: str
    ip_address: str
    success: bool
    failure_reason: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MagicLinkRequest(BaseModel):
    email: EmailStr


class MagicLinkVerifyRequest(BaseModel):
    token: str


class AccountLockoutResponse(BaseModel):
    locked: bool
    locked_until: datetime | None = None
    failed_attempts: int
    max_attempts: int
