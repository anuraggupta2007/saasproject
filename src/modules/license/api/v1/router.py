import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import get_current_user
from src.modules.license.schemas.license import (
    LicenseCreateRequest,
    LicenseResponse,
    LicenseListResponse,
    LicenseValidateRequest,
    LicenseValidateResponse,
    LicenseUpgradeRequest,
    LicenseRenewRequest,
    LicenseRevokeRequest,
    LicenseSuspendRequest,
)
from src.modules.license.schemas.activation import (
    ActivationRequest,
    ActivationResponse,
    ActivationListResponse,
    DeactivationRequest,
    DeactivationResponse,
)
from src.modules.license.schemas.subscription import (
    SubscriptionResponse,
    SubscriptionRenewRequest,
    SubscriptionCancelRequest,
)
from src.modules.license.schemas.feature import (
    FeatureCheckRequest,
    FeatureCheckResponse,
    FeatureAccessResponse,
)
from src.modules.license.schemas.device import (
    DeviceRegisterRequest,
    DeviceResponse,
    DeviceListResponse,
)
from src.modules.license.services.license_service import LicenseService
from src.modules.license.services.activation_service import ActivationService
from src.modules.license.services.validation_service import ValidationService
from src.modules.license.services.subscription_service import SubscriptionService
from src.modules.license.services.trial_service import TrialService
from src.modules.license.models.license import LicenseType

router = APIRouter(prefix="/license", tags=["License"])


@router.post(
    "/activate",
    response_model=ActivationResponse,
    summary="Activate a license on a device",
)
async def activate_license(
    request: ActivationRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req: Request = None,
):
    service = ActivationService(db)

    result = await service.activate_license(
        license_key=request.license_key,
        device_fingerprint=request.device_fingerprint,
        device_name=request.device_name,
        device_type=request.device_type,
        os_type=request.os_type,
        os_version=request.os_version,
        ip_address=req.client.host if req else None,
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"],
        )

    return ActivationResponse(
        id=result["activation_id"],
        license_id=uuid.uuid4(),
        device_id=uuid.uuid4(),
        user_id=uuid.UUID(current_user["id"]),
        status="active",
        validation_token=result.get("validation_token"),
    )


@router.post(
    "/validate",
    response_model=LicenseValidateResponse,
    summary="Validate a license",
)
async def validate_license(
    request: LicenseValidateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ValidationService(db)

    if request.offline_token:
        result = await service.validate_offline(request.offline_token)
    else:
        result = await service.validate_online(
            request.license_key,
            request.device_fingerprint,
        )

    return LicenseValidateResponse(**result)


@router.post(
    "/deactivate",
    response_model=DeactivationResponse,
    summary="Deactivate a device",
)
async def deactivate_device(
    request: DeactivationRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req: Request = None,
):
    service = ActivationService(db)

    result = await service.deactivate_license(
        activation_id=request.activation_id,
        user_id=uuid.UUID(current_user["id"]),
        reason=request.reason,
        ip_address=req.client.host if req else None,
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"],
        )

    return DeactivationResponse(**result)


@router.get(
    "/activations",
    response_model=ActivationListResponse,
    summary="List activations for a license",
)
async def list_activations(
    license_id: uuid.UUID = Query(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ActivationService(db)

    result = await service.list_activations(
        license_id=license_id,
        user_id=uuid.UUID(current_user["id"]),
    )

    return ActivationListResponse(
        activations=[ActivationResponse.model_validate(a) for a in result["activations"]],
        total=result["total"],
        max_activations=result["max_activations"],
        remaining_activations=result["remaining_activations"],
    )


@router.post(
    "/upgrade",
    response_model=LicenseResponse,
    summary="Upgrade a license",
)
async def upgrade_license(
    request: LicenseUpgradeRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req: Request = None,
):
    service = LicenseService(db)

    license = await service.upgrade_license(
        license_id=request.license_id,
        target_license_type=LicenseType(request.target_license_type),
        max_activations=request.max_activations,
        features=request.features,
        ip_address=req.client.host if req else None,
    )

    if not license:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="License not found",
        )

    return LicenseResponse.model_validate(license)


@router.post(
    "/renew",
    response_model=LicenseResponse,
    summary="Renew a license",
)
async def renew_license(
    request: LicenseRenewRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req: Request = None,
):
    service = LicenseService(db)

    license = await service.renew_license(
        license_id=request.license_id,
        extend_days=request.extend_days or 365,
        ip_address=req.client.host if req else None,
    )

    if not license:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="License not found",
        )

    return LicenseResponse.model_validate(license)


@router.post(
    "/revoke",
    summary="Revoke a license",
)
async def revoke_license(
    request: LicenseRevokeRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req: Request = None,
):
    service = LicenseService(db)

    license = await service.revoke_license(
        license_id=request.license_id,
        reason=request.reason,
        ip_address=req.client.host if req else None,
    )

    if not license:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="License not found",
        )

    return {"message": "License revoked successfully"}


@router.get(
    "/subscriptions",
    response_model=SubscriptionResponse,
    summary="Get user subscription",
)
async def get_subscription(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SubscriptionService(db)

    subscription = await service.get_user_subscription(
        uuid.UUID(current_user["id"])
    )

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription",
        )

    return SubscriptionResponse.model_validate(subscription)


@router.post(
    "/subscriptions/renew",
    summary="Renew subscription",
)
async def renew_subscription(
    request: SubscriptionRenewRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SubscriptionService(db)

    result = await service.renew_subscription(
        subscription_id=request.subscription_id,
        extend_days=request.extend_days,
        payment_amount=request.payment_amount,
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"],
        )

    return result


@router.post(
    "/subscriptions/cancel",
    summary="Cancel subscription",
)
async def cancel_subscription(
    request: SubscriptionCancelRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SubscriptionService(db)

    result = await service.cancel_subscription(
        subscription_id=request.subscription_id,
        user_id=uuid.UUID(current_user["id"]),
        reason=request.reason,
        cancel_immediately=request.cancel_immediately,
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"],
        )

    return result


@router.post(
    "/feature/check",
    response_model=FeatureCheckResponse,
    summary="Check feature access",
)
async def check_feature(
    request: FeatureCheckRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ValidationService(db)

    result = await service.check_feature_access(
        feature_key=request.feature_key,
        user_id=uuid.UUID(current_user["id"]),
        license_id=request.license_id,
    )

    return FeatureCheckResponse(**result)


@router.get(
    "/features",
    response_model=FeatureAccessResponse,
    summary="Get all user features",
)
async def get_features(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ValidationService(db)

    result = await service.get_user_features(
        user_id=uuid.UUID(current_user["id"]),
    )

    features = {
        k: FeatureCheckResponse(**v, feature_key=k)
        for k, v in result["features"].items()
    }

    return FeatureAccessResponse(
        features=features,
        plan_name=result.get("plan_name"),
        license_type=result.get("license_type"),
    )


@router.post(
    "/devices/register",
    response_model=DeviceResponse,
    summary="Register a device",
)
async def register_device(
    request: DeviceRegisterRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from src.modules.license.repositories.device import DeviceRepository

    repo = DeviceRepository(db)

    device = await repo.get_or_create_device(
        user_id=uuid.UUID(current_user["id"]),
        fingerprint=request.fingerprint,
        device_name=request.device_name,
        device_type=request.device_type.value if request.device_type else None,
        os_type=request.os_type,
        os_version=request.os_version,
        ip_address=request.ip_address,
    )

    return DeviceResponse.model_validate(device)


@router.get(
    "/devices",
    response_model=DeviceListResponse,
    summary="List user devices",
)
async def list_devices(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from src.modules.license.repositories.device import DeviceRepository

    repo = DeviceRepository(db)

    devices = await repo.get_user_devices(uuid.UUID(current_user["id"]))

    return DeviceListResponse(
        devices=[DeviceResponse.model_validate(d) for d in devices],
        total=len(devices),
    )


@router.post(
    "/trial/start",
    summary="Start a trial",
)
async def start_trial(
    trial_days: int = Query(default=7, ge=1, le=30),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    req: Request = None,
):
    service = TrialService(db)

    result = await service.start_trial(
        user_id=uuid.UUID(current_user["id"]),
        trial_days=trial_days,
        email_verified=True,
        ip_address=req.client.host if req else None,
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"],
        )

    return result


@router.get(
    "/trial/status",
    summary="Check trial status",
)
async def check_trial_status(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TrialService(db)

    result = await service.check_trial_status(
        uuid.UUID(current_user["id"]),
    )

    return result
