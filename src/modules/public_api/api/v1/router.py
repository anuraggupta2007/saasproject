from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Header, Query, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from src.modules.public_api.schemas import (
    APIKeyCreate, APIKeyResponse, APIKeyCreatedResponse, APIKeyRotateResponse,
    WebhookCreate, WebhookResponse, WebhookDeliveryResponse,
    ConversionCreate, ConversionResponse, ConversionListResponse,
    UploadCreate, UploadResponse,
    SearchRequest, SearchResponse,
    UserProfileResponse, UserUsageResponse, SubscriptionResponse,
    RateLimitStatus, APIError, APIErrorResponse,
)
from src.modules.public_api.auth import api_key_manager, jwt_manager, scopes_manager
from src.modules.public_api.rate_limiting import rate_limit_service, TierConfig, quota_manager
from src.modules.public_api.webhooks import webhook_manager

router = APIRouter(prefix="/api/public/v1", tags=["Public API v1"])
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    x_api_key: Optional[str] = Header(None),
):
    if x_api_key:
        if not api_key_manager.validate_key_format(x_api_key):
            raise HTTPException(status_code=401, detail="Invalid API key format")
        key_hash = api_key_manager.extract_key_hash(x_api_key)
        return {"authenticated": True, "method": "api_key", "key_hash": key_hash}
    if credentials:
        payload = jwt_manager.decode_token(credentials.credentials)
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return {"authenticated": True, "method": "jwt", "user_id": payload.get("sub")}
    raise HTTPException(status_code=401, detail="Authentication required")


# =============================================================================
# Authentication Endpoints
# =============================================================================

@router.post("/auth/keys", response_model=APIKeyCreatedResponse, status_code=201)
async def create_api_key(body: APIKeyCreate, user=Depends(get_current_user)):
    full_key, key_hash, key_prefix = api_key_manager.generate_key()
    expires_at = None
    if body.expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=body.expires_in_days)
    return APIKeyCreatedResponse(
        id=uuid4(),
        name=body.name,
        api_key=full_key,
        key_prefix=key_prefix,
        scopes=body.scopes,
        tier="free",
        expires_at=expires_at,
        created_at=datetime.utcnow(),
    )


@router.get("/auth/keys", response_model=list[APIKeyResponse])
async def list_api_keys(user=Depends(get_current_user)):
    return []


@router.post("/auth/keys/{key_id}/rotate", response_model=APIKeyRotateResponse)
async def rotate_api_key(key_id: UUID, user=Depends(get_current_user)):
    full_key, key_hash, key_prefix = api_key_manager.rotate_key()
    return APIKeyRotateResponse(
        id=key_id,
        name="rotated-key",
        new_api_key=full_key,
        key_prefix=key_prefix,
        rotated_at=datetime.utcnow(),
    )


@router.delete("/auth/keys/{key_id}")
async def revoke_api_key(key_id: UUID, user=Depends(get_current_user)):
    return {"status": "revoked", "key_id": str(key_id)}


@router.post("/auth/oauth/token")
async def create_oauth_token(
    grant_type: str,
    client_id: str,
    client_secret: str,
    scope: Optional[str] = None,
):
    if grant_type != "client_credentials":
        raise HTTPException(status_code=400, detail="Unsupported grant type")
    token = jwt_manager.create_oauth2_token(
        client_id=client_id,
        user_id=uuid4(),
        scopes=scope.split() if scope else ["read"],
    )
    return {
        "access_token": token,
        "token_type": "Bearer",
        "expires_in": 3600,
        "scope": scope or "read",
    }


# =============================================================================
# User Endpoints
# =============================================================================

@router.get("/users/me", response_model=UserProfileResponse)
async def get_user_profile(user=Depends(get_current_user)):
    return UserProfileResponse(
        id=uuid4(),
        email="user@example.com",
        name="User",
        tier="free",
        api_keys_count=1,
        conversions_today=0,
        conversions_limit=100,
        storage_used_bytes=0,
        storage_limit_bytes=1073741824,
        created_at=datetime.utcnow(),
    )


@router.get("/users/me/usage", response_model=UserUsageResponse)
async def get_user_usage(
    period: str = Query("current", pattern="^(current|previous|custom)$"),
    user=Depends(get_current_user),
):
    return UserUsageResponse(
        period=period,
        api_requests=0,
        conversions=0,
        storage_used_bytes=0,
        bandwidth_bytes=0,
        api_key_usage=[],
    )


@router.get("/users/me/subscription", response_model=SubscriptionResponse)
async def get_user_subscription(user=Depends(get_current_user)):
    return SubscriptionResponse(
        id=uuid4(),
        plan="free",
        status="active",
        current_period_start=datetime.utcnow(),
        current_period_end=datetime.utcnow() + timedelta(days=30),
        features={"conversions": 100, "storage_gb": 1},
        limits={"requests_per_minute": 10, "file_size_mb": 50},
    )


# =============================================================================
# Upload Endpoints
# =============================================================================

@router.post("/uploads", response_model=UploadResponse, status_code=201)
async def create_upload(body: UploadCreate, user=Depends(get_current_user)):
    upload_id = uuid4()
    chunk_size = 8 * 1024 * 1024
    total_chunks = (body.file_size + chunk_size - 1) // chunk_size
    return UploadResponse(
        id=upload_id,
        filename=body.filename,
        status="pending",
        file_size=body.file_size,
        upload_url=f"/api/public/v1/uploads/{upload_id}/chunks",
        chunk_size=chunk_size,
        total_chunks=total_chunks,
        created_at=datetime.utcnow(),
    )


@router.get("/uploads/{upload_id}", response_model=UploadResponse)
async def get_upload(upload_id: UUID, user=Depends(get_current_user)):
    return UploadResponse(
        id=upload_id,
        filename="upload.mbox",
        status="completed",
        file_size=1024000,
        upload_url=None,
        chunk_size=None,
        total_chunks=None,
        created_at=datetime.utcnow(),
    )


@router.post("/uploads/{upload_id}/chunks")
async def upload_chunk(
    upload_id: UUID,
    chunk_number: int,
    data: bytes,
    user=Depends(get_current_user),
):
    return {"chunk_number": chunk_number, "uploaded": True, "size_bytes": len(data)}


@router.delete("/uploads/{upload_id}")
async def delete_upload(upload_id: UUID, user=Depends(get_current_user)):
    return {"status": "deleted", "upload_id": str(upload_id)}


# =============================================================================
# Conversion Endpoints
# =============================================================================

@router.post("/conversions", response_model=ConversionResponse, status_code=201)
async def create_conversion(body: ConversionCreate, user=Depends(get_current_user)):
    conversion_id = uuid4()
    return ConversionResponse(
        id=conversion_id,
        upload_id=body.upload_id,
        status="queued",
        progress=0,
        source_format="mbox",
        target_format=body.target_format,
        input_size_bytes=0,
        output_size_bytes=None,
        started_at=None,
        completed_at=None,
        error_message=None,
        download_url=None,
        created_at=datetime.utcnow(),
    )


@router.get("/conversions/{conversion_id}", response_model=ConversionResponse)
async def get_conversion(conversion_id: UUID, user=Depends(get_current_user)):
    return ConversionResponse(
        id=conversion_id,
        upload_id=uuid4(),
        status="completed",
        progress=100,
        source_format="mbox",
        target_format="pdf",
        input_size_bytes=1024000,
        output_size_bytes=2048000,
        started_at=datetime.utcnow(),
        completed_at=datetime.utcnow(),
        error_message=None,
        download_url=f"/api/public/v1/conversions/{conversion_id}/download",
        created_at=datetime.utcnow(),
    )


@router.get("/conversions", response_model=ConversionListResponse)
async def list_conversions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    user=Depends(get_current_user),
):
    return ConversionListResponse(
        items=[],
        total=0,
        page=page,
        page_size=page_size,
        has_more=False,
    )


@router.post("/conversions/{conversion_id}/cancel")
async def cancel_conversion(conversion_id: UUID, user=Depends(get_current_user)):
    return {"status": "cancelled", "conversion_id": str(conversion_id)}


@router.get("/conversions/{conversion_id}/download")
async def download_conversion(conversion_id: UUID, user=Depends(get_current_user)):
    return {"download_url": f"https://storage.example.com/converted/{conversion_id}.pdf"}


# =============================================================================
# Search Endpoints
# =============================================================================

@router.post("/search", response_model=SearchResponse)
async def search_emails(body: SearchRequest, user=Depends(get_current_user)):
    return SearchResponse(
        query=body.query,
        total_results=0,
        page=body.page,
        page_size=body.page_size,
        results=[],
        took_ms=0,
    )


@router.get("/search/suggestions")
async def search_suggestions(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    user=Depends(get_current_user),
):
    return {"suggestions": [], "query": q}


# =============================================================================
# Webhook Endpoints
# =============================================================================

@router.post("/webhooks", response_model=WebhookResponse, status_code=201)
async def create_webhook(body: WebhookCreate, user=Depends(get_current_user)):
    secret = api_key_manager.generate_key()[0]
    return WebhookResponse(
        id=uuid4(),
        url=body.url,
        events=body.events,
        is_active=True,
        description=body.description,
        secret=secret,
        created_at=datetime.utcnow(),
    )


@router.get("/webhooks", response_model=list[WebhookResponse])
async def list_webhooks(user=Depends(get_current_user)):
    return []


@router.get("/webhooks/{webhook_id}", response_model=WebhookResponse)
async def get_webhook(webhook_id: UUID, user=Depends(get_current_user)):
    return WebhookResponse(
        id=webhook_id,
        url="https://example.com/webhook",
        events=["conversion.completed"],
        is_active=True,
        description=None,
        secret="whsec_***",
        created_at=datetime.utcnow(),
    )


@router.delete("/webhooks/{webhook_id}")
async def delete_webhook(webhook_id: UUID, user=Depends(get_current_user)):
    return {"status": "deleted", "webhook_id": str(webhook_id)}


@router.post("/webhooks/{webhook_id}/test")
async def test_webhook(webhook_id: UUID, user=Depends(get_current_user)):
    return {"status": "sent", "webhook_id": str(webhook_id)}


@router.get("/webhooks/{webhook_id}/deliveries", response_model=list[WebhookDeliveryResponse])
async def list_webhook_deliveries(
    webhook_id: UUID,
    limit: int = Query(50, ge=1, le=200),
    user=Depends(get_current_user),
):
    return []


# =============================================================================
# Rate Limit & Usage Endpoints
# =============================================================================

@router.get("/rate-limit/status", response_model=RateLimitStatus)
async def get_rate_limit_status(user=Depends(get_current_user)):
    return RateLimitStatus(
        tier="free",
        requests_per_minute=10,
        requests_per_hour=200,
        requests_per_day=1000,
        burst_limit=20,
        current_minute_usage=0,
        current_hour_usage=0,
        current_day_usage=0,
        reset_at=datetime.utcnow() + timedelta(minutes=1),
    )


@router.get("/tiers")
async def list_tiers():
    return TierConfig.get_all_tiers()


# =============================================================================
# Health & Info Endpoints
# =============================================================================

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/openapi.json")
async def openapi_spec():
    return {
        "openapi": "3.1.0",
        "info": {
            "title": "Email Converter API",
            "version": "1.0.0",
            "description": "Public REST API for Email Converter SaaS",
        },
        "servers": [
            {"url": "https://api.emailconverter.com", "description": "Production"},
            {"url": "https://staging-api.emailconverter.com", "description": "Staging"},
        ],
    }
