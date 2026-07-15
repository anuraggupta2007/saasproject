import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.datetime_utils import ensure_utc
from src.core.logging import get_logger
from src.modules.license.models.license import License, LicenseStatus, LicenseType
from src.modules.license.models.audit import AuditLog, AuditAction
from src.modules.license.repositories.license import LicenseRepository
from src.modules.license.repositories.audit import AuditLogRepository
from src.modules.license.security.crypto import license_crypto

logger = get_logger(__name__)


class LicenseService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.license_repo = LicenseRepository(session)
        self.audit_repo = AuditLogRepository(session)

    async def create_license(
        self,
        user_id: uuid.UUID,
        license_type: LicenseType,
        max_activations: int = 1,
        features: dict = None,
        trial_days: Optional[int] = None,
        expires_at: Optional[datetime] = None,
        metadata: dict = None,
        ip_address: Optional[str] = None,
    ) -> License:
        license_key = license_crypto.generate_license_key()
        encrypted_key = license_crypto.encrypt_license_key(license_key)

        is_trial = license_type == LicenseType.TRIAL
        if is_trial and trial_days:
            expires_at = datetime.now(timezone.utc) + timedelta(days=trial_days)

        license = License(
            user_id=user_id,
            license_key=encrypted_key,
            license_type=license_type,
            status=LicenseStatus.ACTIVE if not is_trial else LicenseStatus.ACTIVE,
            max_activations=max_activations,
            features=features or {},
            is_trial=is_trial,
            trial_days=trial_days,
            expires_at=expires_at,
            metadata_json=metadata or {},
        )

        license = await self.license_repo.save(license)

        await self.audit_repo.log(
            user_id=user_id,
            license_id=license.id,
            action=AuditAction.LICENSE_CREATED,
            details={
                "license_type": license_type.value,
                "max_activations": max_activations,
            },
            ip_address=ip_address,
        )

        logger.info(
            "license_created",
            license_id=str(license.id),
            user_id=str(user_id),
            license_type=license_type.value,
        )

        return license

    async def get_license(self, license_id: uuid.UUID) -> Optional[License]:
        return await self.license_repo.get_by_id(license_id)

    async def get_license_by_key(self, license_key: str) -> Optional[License]:
        return await self.license_repo.get_by_key(license_key)

    async def validate_license(
        self,
        license_key: str,
        device_fingerprint: str,
        offline_token: Optional[str] = None,
    ) -> dict:
        encrypted_key = license_crypto.encrypt_license_key(license_key)
        license = await self.license_repo.get_by_key(encrypted_key)

        if not license:
            return {
                "valid": False,
                "message": "License not found",
            }

        if license.status == LicenseStatus.REVOKED:
            return {
                "valid": False,
                "message": "License has been revoked",
            }

        if license.status == LicenseStatus.SUSPENDED:
            return {
                "valid": False,
                "message": "License is suspended",
            }

        if license.expires_at and ensure_utc(license.expires_at) < datetime.now(timezone.utc):
            await self.license_repo.update(license.id, status=LicenseStatus.EXPIRED)
            return {
                "valid": False,
                "message": "License has expired",
            }

        validation_token = license_crypto.generate_validation_token(
            str(license.id),
            device_fingerprint,
            str(license.expires_at or (datetime.now(timezone.utc) + timedelta(days=365))),
        )

        return {
            "valid": True,
            "license_id": license.id,
            "status": license.status,
            "expires_at": license.expires_at,
            "features": license.features,
            "validation_token": validation_token,
            "message": "License is valid",
        }

    async def suspend_license(
        self,
        license_id: uuid.UUID,
        reason: str = None,
        ip_address: Optional[str] = None,
    ) -> Optional[License]:
        license = await self.license_repo.update(
            license_id,
            status=LicenseStatus.SUSPENDED,
        )

        if license:
            await self.audit_repo.log(
                user_id=license.user_id,
                license_id=license_id,
                action=AuditAction.LICENSE_SUSPENDED,
                details={"reason": reason},
                ip_address=ip_address,
            )

        return license

    async def revoke_license(
        self,
        license_id: uuid.UUID,
        reason: str = None,
        ip_address: Optional[str] = None,
    ) -> Optional[License]:
        license = await self.license_repo.update(
            license_id,
            status=LicenseStatus.REVOKED,
        )

        if license:
            await self.audit_repo.log(
                user_id=license.user_id,
                license_id=license_id,
                action=AuditAction.LICENSE_REVOKED,
                details={"reason": reason},
                ip_address=ip_address,
            )

        return license

    async def renew_license(
        self,
        license_id: uuid.UUID,
        extend_days: int = 365,
        ip_address: Optional[str] = None,
    ) -> Optional[License]:
        license = await self.license_repo.get_by_id(license_id)
        if not license:
            return None

        current_expiry = license.expires_at or datetime.now(timezone.utc)
        if ensure_utc(current_expiry) < datetime.now(timezone.utc):
            current_expiry = datetime.now(timezone.utc)

        new_expiry = current_expiry + timedelta(days=extend_days)

        license = await self.license_repo.update(
            license_id,
            status=LicenseStatus.ACTIVE,
            expires_at=new_expiry,
        )

        if license:
            await self.audit_repo.log(
                user_id=license.user_id,
                license_id=license_id,
                action=AuditAction.LICENSE_RENEWED,
                details={"extend_days": extend_days, "new_expiry": new_expiry.isoformat()},
                ip_address=ip_address,
            )

        return license

    async def upgrade_license(
        self,
        license_id: uuid.UUID,
        target_license_type: LicenseType,
        max_activations: Optional[int] = None,
        features: Optional[dict] = None,
        ip_address: Optional[str] = None,
    ) -> Optional[License]:
        license = await self.license_repo.get_by_id(license_id)
        if not license:
            return None

        update_data = {
            "license_type": target_license_type,
        }

        if max_activations is not None:
            update_data["max_activations"] = max_activations

        if features is not None:
            update_data["features"] = features

        license = await self.license_repo.update(license_id, **update_data)

        if license:
            await self.audit_repo.log(
                user_id=license.user_id,
                license_id=license_id,
                action=AuditAction.LICENSE_CREATED,
                details={
                    "action": "upgrade",
                    "new_type": target_license_type.value,
                },
                ip_address=ip_address,
            )

        return license

    async def list_user_licenses(
        self,
        user_id: uuid.UUID,
        status: Optional[LicenseStatus] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[License], int]:
        return await self.license_repo.get_user_licenses(
            user_id, status=status, page=page, page_size=page_size
        )

    async def get_expiring_licenses(self, within_days: int = 7) -> list[License]:
        return await self.license_repo.get_expiring_licenses(within_days)

    async def cleanup_expired_licenses(self) -> int:
        expired = await self.license_repo.get_expired_licenses()
        count = 0
        for license in expired:
            await self.license_repo.update(
                license.id,
                status=LicenseStatus.EXPIRED,
            )
            count += 1
        return count
