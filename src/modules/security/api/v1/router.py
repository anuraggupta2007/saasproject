import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import get_current_user
from src.core.logging import get_logger
from src.modules.security.services.session_service import SessionService
from src.modules.security.services.api_key_service import APIKeyService
from src.modules.security.services.mfa_service import MFAService
from src.modules.security.services.rate_limit_service import RateLimitService
from src.modules.security.services.audit_service import AuditService
from src.modules.security.services.encryption_service import EncryptionService
from src.modules.security.repositories.security import SecurityEventRepository
from src.modules.security.schemas.security import (
    SessionResponse,
    SessionListResponse,
    RevokeSessionRequest,
    APIKeyCreateRequest,
    APIKeyResponse,
    APIKeyCreateResponse,
    APIKeyListResponse,
    SecurityEventResponse,
    SecurityEventListResponse,
    SecurityEventCreateRequest,
    TrustedDeviceResponse,
    TrustedDeviceListResponse,
    AddTrustedDeviceRequest,
    MFASetupResponse,
    MFAVerifyRequest,
    MFAToggleRequest,
    MFATatusResponse,
    PasswordChangeRequest,
    PasswordStrengthResponse,
    SecuritySettingsResponse,
    AuditLogResponse,
    AuditLogListResponse,
    LoginAttemptResponse,
    AccountLockoutResponse,
)

logger = get_logger(__name__)

router = APIRouter(prefix="/security", tags=["Security"])


@router.get(
    "/sessions",
    response_model=SessionListResponse,
    summary="Get active sessions",
)
async def get_sessions(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SessionService(db)
    sessions = await service.get_active_sessions(
        current_user["id"],
        current_user.get("session_jti"),
    )
    return SessionListResponse(sessions=sessions, total=len(sessions))


@router.post(
    "/sessions/revoke",
    summary="Revoke a session",
)
async def revoke_session(
    request: RevokeSessionRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SessionService(db)
    result = await service.revoke_session(
        current_user["id"],
        uuid.UUID(request.session_id),
        request.reason,
    )
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result


@router.post(
    "/sessions/revoke-all",
    summary="Revoke all sessions",
)
async def revoke_all_sessions(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SessionService(db)
    result = await service.revoke_all_sessions(current_user["id"])
    return result


@router.post(
    "/api-keys",
    response_model=APIKeyCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create API key",
)
async def create_api_key(
    request: APIKeyCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = APIKeyService(db)
    result = await service.create_api_key(
        user_id=current_user["id"],
        name=request.name,
        scopes=request.scopes,
        rate_limit=request.rate_limit,
        daily_quota=request.daily_quota,
        expires_in_days=request.expires_in_days,
    )
    return APIKeyCreateResponse(**result)


@router.get(
    "/api-keys",
    response_model=APIKeyListResponse,
    summary="List API keys",
)
async def list_api_keys(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = APIKeyService(db)
    keys = await service.get_user_api_keys(current_user["id"])
    return APIKeyListResponse(api_keys=keys, total=len(keys))


@router.post(
    "/api-keys/{key_id}/revoke",
    summary="Revoke API key",
)
async def revoke_api_key(
    key_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = APIKeyService(db)
    result = await service.revoke_api_key(current_user["id"], key_id)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result


@router.post(
    "/mfa/setup",
    response_model=MFASetupResponse,
    summary="Setup MFA",
)
async def setup_mfa(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = MFAService(db)
    result = await service.setup_mfa(current_user["id"], current_user.get("email"))
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return MFASetupResponse(**result)


@router.post(
    "/mfa/verify",
    summary="Verify MFA code",
)
async def verify_mfa(
    request: MFAVerifyRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = MFAService(db)
    result = await service.verify_and_enable(current_user["id"], request.code)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.get(
    "/mfa/status",
    response_model=MFATatusResponse,
    summary="Get MFA status",
)
async def get_mfa_status(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = MFAService(db)
    status = await service.get_mfa_status(current_user["id"])
    return MFATatusResponse(**status)


@router.post(
    "/mfa/disable",
    summary="Disable MFA",
)
async def disable_mfa(
    request: MFAVerifyRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = MFAService(db)
    result = await service.disable_mfa(current_user["id"], request.code)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.get(
    "/trusted-devices",
    response_model=TrustedDeviceListResponse,
    summary="List trusted devices",
)
async def list_trusted_devices(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SessionService(db)
    devices = await service.get_trusted_devices(current_user["id"])
    return TrustedDeviceListResponse(devices=devices, total=len(devices))


@router.post(
    "/trusted-devices",
    status_code=status.HTTP_201_CREATED,
    summary="Add trusted device",
)
async def add_trusted_device(
    request: AddTrustedDeviceRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SessionService(db)
    result = await service.add_trusted_device(
        user_id=current_user["id"],
        device_fingerprint=request.device_fingerprint,
        device_name=request.device_name,
        device_type=request.device_type,
        browser=request.browser,
        os=request.os,
        trust_duration_days=request.trust_duration_days,
    )
    return result


@router.post(
    "/trusted-devices/{device_id}/revoke",
    summary="Revoke trusted device",
)
async def revoke_trusted_device(
    device_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SessionService(db)
    result = await service.revoke_trusted_device(current_user["id"], device_id)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result


@router.get(
    "/events",
    response_model=SecurityEventListResponse,
    summary="Get security events",
)
async def get_security_events(
    event_type: str = Query(None),
    hours: int = Query(24, ge=1, le=168),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SecurityEventRepository(db)
    events, total = await repo.get_user_events(
        current_user["id"], event_type, hours, page, page_size
    )
    return SecurityEventListResponse(
        events=[SecurityEventResponse.model_validate(e) for e in events],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/events",
    response_model=SecurityEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create security event",
)
async def create_security_event(
    request: SecurityEventCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SecurityEventRepository(db)
    event = await repo.record_event(
        event_type=request.event_type,
        severity=request.severity,
        user_id=current_user["id"],
        resource=request.resource,
        details=request.details,
    )
    return SecurityEventResponse.model_validate(event)


@router.get(
    "/audit-logs",
    response_model=AuditLogListResponse,
    summary="Get audit logs",
)
async def get_audit_logs(
    action: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AuditService(db)
    logs, total = await service.get_user_audit_logs(
        current_user["id"], action, page, page_size
    )
    return AuditLogListResponse(
        logs=[AuditLogResponse.model_validate(l) for l in logs],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/settings",
    response_model=SecuritySettingsResponse,
    summary="Get security settings",
)
async def get_security_settings(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from src.modules.security.services.mfa_service import MFAService
    from src.modules.security.services.session_service import SessionService
    from src.modules.security.services.api_key_service import APIKeyService

    mfa_service = MFAService(db)
    session_service = SessionService(db)
    api_key_service = APIKeyService(db)

    mfa_status = await mfa_service.get_mfa_status(current_user["id"])
    sessions = await session_service.get_active_sessions(current_user["id"])
    api_keys = await api_key_service.get_user_api_keys(current_user["id"])

    return SecuritySettingsResponse(
        mfa_enabled=mfa_status["enabled"],
        trusted_devices_count=0,
        active_sessions_count=len(sessions),
        api_keys_count=len(api_keys),
        account_locked=False,
    )


@router.post(
    "/password/validate",
    response_model=PasswordStrengthResponse,
    summary="Validate password strength",
)
async def validate_password(
    password: str = Query(..., min_length=1),
    current_user: dict = Depends(get_current_user),
):
    from src.modules.security.services.password_service import PasswordService

    service = PasswordService.__new__(PasswordService)
    result = service.validate_password_strength(password)
    return PasswordStrengthResponse(**result)
