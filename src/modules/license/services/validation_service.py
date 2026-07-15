import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.datetime_utils import ensure_utc
from src.core.logging import get_logger
from src.modules.license.models.license import License, LicenseStatus
from src.modules.license.models.activation import Activation, ActivationStatus
from src.modules.license.models.feature import Feature, PlanFeature
from src.modules.license.repositories.license import LicenseRepository
from src.modules.license.repositories.activation import ActivationRepository
from src.modules.license.repositories.feature import FeatureRepository, PlanFeatureRepository
from src.modules.license.security.crypto import license_crypto
from src.modules.license.security.signing import license_signer

logger = get_logger(__name__)


class ValidationService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.license_repo = LicenseRepository(session)
        self.activation_repo = ActivationRepository(session)
        self.feature_repo = FeatureRepository(session)
        self.plan_feature_repo = PlanFeatureRepository(session)

    async def validate_online(
        self,
        license_key: str,
        device_fingerprint: str,
    ) -> dict:
        encrypted_key = license_crypto.encrypt_license_key(license_key)
        license = await self.license_repo.get_by_key(encrypted_key)

        if not license:
            return {
                "valid": False,
                "error": "LICENSE_NOT_FOUND",
                "message": "License not found",
            }

        if license.status == LicenseStatus.REVOKED:
            return {
                "valid": False,
                "error": "LICENSE_REVOKED",
                "message": "License has been revoked",
            }

        if license.status == LicenseStatus.SUSPENDED:
            return {
                "valid": False,
                "error": "LICENSE_SUSPENDED",
                "message": "License is suspended",
            }

        if license.expires_at and ensure_utc(license.expires_at) < datetime.now(timezone.utc):
            return {
                "valid": False,
                "error": "LICENSE_EXPIRED",
                "message": "License has expired",
                "expired_at": license.expires_at.isoformat(),
            }

        device = await self.device_repo.get_by_fingerprint(device_fingerprint)
        if not device:
            return {
                "valid": False,
                "error": "DEVICE_NOT_FOUND",
                "message": "Device not registered",
            }

        activation = await self.activation_repo.get_by_license_and_device(
            license.id, device.id
        )

        if not activation or activation.status != ActivationStatus.ACTIVE:
            return {
                "valid": False,
                "error": "NOT_ACTIVATED",
                "message": "License not activated on this device",
            }

        validation_token = license_crypto.generate_validation_token(
            str(license.id),
            device_fingerprint,
            str(license.expires_at or (datetime.now(timezone.utc) + timedelta(days=365))),
        )

        await self.activation_repo.update_validation_token(activation.id, validation_token)

        return {
            "valid": True,
            "license_id": license.id,
            "status": license.status.value,
            "expires_at": license.expires_at.isoformat() if license.expires_at else None,
            "features": license.features,
            "validation_token": validation_token,
        }

    async def validate_offline(
        self,
        offline_token: str,
    ) -> dict:
        token_data = license_signer.verify_offline_token(offline_token)

        if not token_data:
            return {
                "valid": False,
                "error": "INVALID_TOKEN",
                "message": "Invalid or expired offline token",
            }

        license = await self.license_repo.get_by_id(uuid.UUID(token_data["license_id"]))

        if not license:
            return {
                "valid": False,
                "error": "LICENSE_NOT_FOUND",
                "message": "License not found",
            }

        if license.status == LicenseStatus.REVOKED:
            return {
                "valid": False,
                "error": "LICENSE_REVOKED",
                "message": "License has been revoked",
            }

        return {
            "valid": True,
            "license_id": license.id,
            "features": license.features,
            "offline_validated": True,
        }

    async def generate_offline_token(
        self,
        license_id: uuid.UUID,
        user_id: uuid.UUID,
        expires_in_hours: int = 24,
    ) -> Optional[str]:
        license = await self.license_repo.get_by_id(license_id)
        if not license or license.user_id != user_id:
            return None

        return license_signer.generate_offline_token(
            license_id=str(license.id),
            user_id=str(user_id),
            features=license.features,
            expires_in_hours=expires_in_hours,
        )

    async def check_feature_access(
        self,
        feature_key: str,
        user_id: uuid.UUID,
        license_id: Optional[uuid.UUID] = None,
    ) -> dict:
        feature = await self.feature_repo.get_by_key(feature_key)
        if not feature:
            return {
                "allowed": False,
                "feature_key": feature_key,
                "message": "Feature not found",
            }

        if feature.is_global:
            return {
                "allowed": True,
                "feature_key": feature_key,
                "value": feature.default_value,
                "message": "Global feature",
            }

        license = None
        if license_id:
            license = await self.license_repo.get_by_id(license_id)
        else:
            license = await self.license_repo.get_active_license(user_id)

        if not license:
            return {
                "allowed": False,
                "feature_key": feature_key,
                "message": "No active license",
            }

        if license.status != LicenseStatus.ACTIVE:
            return {
                "allowed": False,
                "feature_key": feature_key,
                "message": "License not active",
            }

        if license.expires_at and ensure_utc(license.expires_at) < datetime.now(timezone.utc):
            return {
                "allowed": False,
                "feature_key": feature_key,
                "message": "License expired",
            }

        feature_value = license.features.get(feature_key, feature.default_value)

        return {
            "allowed": bool(feature_value),
            "feature_key": feature_key,
            "value": feature_value,
            "license_type": license.license_type.value,
            "message": "Feature access granted" if feature_value else "Feature not available in your plan",
        }

    async def get_user_features(
        self,
        user_id: uuid.UUID,
        license_id: Optional[uuid.UUID] = None,
    ) -> dict:
        license = None
        if license_id:
            license = await self.license_repo.get_by_id(license_id)
        else:
            license = await self.license_repo.get_active_license(user_id)

        if not license:
            return {
                "features": {},
                "plan_name": None,
                "license_type": None,
            }

        all_features = await self.feature_repo.get_all_features()

        features = {}
        for feature in all_features:
            if feature.is_global:
                features[feature.key] = {
                    "allowed": True,
                    "value": feature.default_value,
                }
            else:
                value = license.features.get(feature.key, feature.default_value)
                features[feature.key] = {
                    "allowed": bool(value),
                    "value": value,
                }

        return {
            "features": features,
            "license_type": license.license_type.value,
            "license_id": str(license.id),
        }

    async def verify_tamper_detection(
        self,
        license_key: str,
        expected_hash: str,
    ) -> bool:
        actual_hash = license_signer.generate_hmac(license_key)
        return license_signer.verify_hmac(license_key, expected_hash)

    def _get_device_repo(self):
        from src.modules.license.repositories.device import DeviceRepository
        return DeviceRepository(self.session)
