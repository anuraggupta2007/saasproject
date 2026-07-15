from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field, EmailStr


class OrganizationCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=3, max_length=100, pattern=r"^[a-z0-9-]+$")
    description: str | None = None
    website: str | None = None
    settings: dict[str, Any] = Field(default_factory=dict)


class OrganizationUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    website: str | None = None
    logo_url: str | None = None
    settings: dict[str, Any] | None = None
    branding: dict[str, Any] | None = None


class OrganizationResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: str | None = None
    logo_url: str | None = None
    website: str | None = None
    owner_id: str
    plan: str
    is_active: bool
    created_at: datetime
    member_count: int = 0
    tenant_count: int = 0

    model_config = {"from_attributes": True}


class OrganizationListResponse(BaseModel):
    organizations: list[OrganizationResponse]
    total: int


class TenantCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=3, max_length=100, pattern=r"^[a-z0-9-]+$")
    plan: str = "free"
    billing_email: str | None = None
    settings: dict[str, Any] = Field(default_factory=dict)


class TenantUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    plan: str | None = None
    billing_email: str | None = None
    settings: dict[str, Any] | None = None
    is_active: bool | None = None


class TenantResponse(BaseModel):
    id: str
    organization_id: str
    name: str
    slug: str
    plan: str
    max_users: int
    max_storage_gb: int
    max_api_calls: int
    max_conversions: int
    storage_used_bytes: int
    api_calls_used: int
    conversions_used: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TenantListResponse(BaseModel):
    tenants: list[TenantResponse]
    total: int


class MembershipCreateRequest(BaseModel):
    user_id: str
    role: str = "member"
    permissions: list[str] = Field(default_factory=list)


class MembershipUpdateRequest(BaseModel):
    role: str | None = None
    permissions: list[str] | None = None
    is_active: bool | None = None


class MembershipResponse(BaseModel):
    id: str
    user_id: str
    organization_id: str
    tenant_id: str
    role: str
    is_active: bool
    joined_at: datetime
    permissions: list[str] = Field(default_factory=list)
    created_at: datetime

    model_config = {"from_attributes": True}


class MembershipListResponse(BaseModel):
    memberships: list[MembershipResponse]
    total: int


class InviteUserRequest(BaseModel):
    email: EmailStr
    role: str = "member"
    tenant_id: str | None = None
    message: str | None = None


class InvitationResponse(BaseModel):
    id: str
    email: str
    organization_id: str
    role: str
    status: str
    expires_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class InvitationListResponse(BaseModel):
    invitations: list[InvitationResponse]
    total: int


class InvitationAcceptRequest(BaseModel):
    token: str


class RoleCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    permissions: list[str] = Field(default_factory=list)


class RoleResponse(BaseModel):
    id: str
    organization_id: str
    name: str
    description: str | None = None
    permissions: list[str]
    is_system: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class RoleListResponse(BaseModel):
    roles: list[RoleResponse]
    total: int


class GatewayAPIKeyCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    scopes: list[str] = Field(default_factory=list)
    rate_limit: int = Field(default=1000, ge=10, le=100000)
    daily_quota: int = Field(default=10000, ge=100, le=1000000)
    expires_in_days: int | None = Field(default=None, ge=1, le=365)


class GatewayAPIKeyResponse(BaseModel):
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


class GatewayAPIKeyCreateResponse(BaseModel):
    api_key: str
    key_id: str
    name: str
    message: str


class GatewayAPIKeyListResponse(BaseModel):
    api_keys: list[GatewayAPIKeyResponse]
    total: int


class TenantUsageResponse(BaseModel):
    date: datetime
    api_calls: int
    storage_bytes: int
    conversions: int
    bandwidth_bytes: int
    active_users: int


class TenantUsageSummaryResponse(BaseModel):
    tenant_id: str
    period_days: int
    total_api_calls: int
    total_conversions: int
    total_storage_bytes: int
    total_bandwidth_bytes: int
    avg_daily_api_calls: float
    avg_daily_conversions: float
    storage_limit_gb: int
    api_calls_limit: int
    conversions_limit: int
    storage_usage_percent: float
    api_usage_percent: float
    conversion_usage_percent: float


class TenantSettingsResponse(BaseModel):
    tenant_id: str
    plan: str
    max_users: int
    max_storage_gb: int
    max_api_calls: int
    max_conversions: int
    settings: dict[str, Any]
    branding: dict[str, Any]
    custom_domain: str | None = None


class SwitchTenantRequest(BaseModel):
    tenant_id: str


class SwitchTenantResponse(BaseModel):
    access_token: str
    tenant_id: str
    organization_id: str
    role: str
    message: str


class TenantAuditLogResponse(BaseModel):
    id: str
    user_id: str
    action: str
    resource_type: str
    resource_id: str | None = None
    changes: dict[str, Any] = Field(default_factory=dict)
    ip_address: str | None = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TenantAuditLogListResponse(BaseModel):
    logs: list[TenantAuditLogResponse]
    total: int
    page: int
    page_size: int


class TenantStatsResponse(BaseModel):
    tenant_id: str
    organization_name: str
    tenant_name: str
    plan: str
    member_count: int
    total_api_calls: int
    total_conversions: int
    storage_used_gb: float
    storage_limit_gb: int
    active_members: int
    pending_invitations: int
