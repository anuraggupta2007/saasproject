import math
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.datetime_utils import ensure_utc
from src.core.logging import get_logger
from src.modules.license.models.license import License, LicenseType, LicenseStatus
from src.modules.license.models.audit import AuditAction
from src.modules.license.repositories.license import LicenseRepository
from src.modules.license.repositories.audit import AuditLogRepository
from src.modules.license.services.license_service import LicenseService

logger = get_logger(__name__)


class TrialService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.license_repo = LicenseRepository(session)
        self.audit_repo = AuditLogRepository(session)
        self.license_service = LicenseService(session)

    async def start_trial(
        self,
        user_id: uuid.UUID,
        trial_days: int = 7,
        email_verified: bool = False,
        ip_address: Optional[str] = None,
    ) -> dict:
        if not email_verified:
            return {
                "success": False,
                "message": "Email verification required for trial",
            }

        existing_trial = await self._get_user_trial(user_id)
        if existing_trial:
            return {
                "success": False,
                "message": "Trial already used",
                "trial_ends_at": existing_trial.expires_at.isoformat() if existing_trial.expires_at else None,
            }

        features = {
            "max_upload_size_mb": 10,
            "max_conversions_per_day": 50,
            "batch_conversion": False,
            "background_jobs": True,
            "api_access": False,
            "cloud_storage": False,
            "priority_support": False,
        }

        license = await self.license_service.create_license(
            user_id=user_id,
            license_type=LicenseType.TRIAL,
            max_activations=1,
            features=features,
            trial_days=trial_days,
            metadata={"trial_source": "self_service"},
            ip_address=ip_address,
        )

        await self.audit_repo.log(
            user_id=user_id,
            license_id=license.id,
            action=AuditAction.TRIAL_STARTED,
            details={
                "trial_days": trial_days,
                "email_verified": email_verified,
            },
            ip_address=ip_address,
        )

        logger.info(
            "trial_started",
            user_id=str(user_id),
            trial_days=trial_days,
        )

        return {
            "success": True,
            "license_id": license.id,
            "license_key": license_crypto.decrypt_license_key(license.license_key),
            "trial_days": trial_days,
            "expires_at": license.expires_at.isoformat(),
            "message": f"Trial started for {trial_days} days",
        }

    async def extend_trial(
        self,
        user_id: uuid.UUID,
        additional_days: int = 7,
        reason: str = None,
    ) -> dict:
        trial = await self._get_user_trial(user_id)
        if not trial:
            return {
                "success": False,
                "message": "No active trial found",
            }

        if trial.is_trial and trial.trial_days and trial.trial_days >= 30:
            return {
                "success": False,
                "message": "Maximum trial extension reached",
            }

        new_expiry = (trial.expires_at or datetime.now(timezone.utc)) + timedelta(days=additional_days)
        new_trial_days = (trial.trial_days or 7) + additional_days

        await self.license_repo.update(
            trial.id,
            expires_at=new_expiry,
            trial_days=new_trial_days,
        )

        return {
            "success": True,
            "expires_at": new_expiry.isoformat(),
            "trial_days": new_trial_days,
            "message": f"Trial extended by {additional_days} days",
        }

    async def check_trial_status(self, user_id: uuid.UUID) -> dict:
        trial = await self._get_user_trial(user_id)

        if not trial:
            return {
                "has_trial": False,
                "message": "No trial found",
            }

        if trial.expires_at and ensure_utc(trial.expires_at) < datetime.now(timezone.utc):
            return {
                "has_trial": True,
                "expired": True,
                "expires_at": trial.expires_at.isoformat(),
                "message": "Trial has expired",
            }

        remaining_days = math.ceil((trial.expires_at - datetime.now(timezone.utc)).total_seconds() / 86400) if trial.expires_at else None

        return {
            "has_trial": True,
            "expired": False,
            "expires_at": trial.expires_at.isoformat() if trial.expires_at else None,
            "remaining_days": remaining_days,
            "features": trial.features,
            "message": f"Trial active, {remaining_days} days remaining" if remaining_days else "Trial active",
        }

    async def convert_trial_to_license(
        self,
        user_id: uuid.UUID,
        target_license_type: LicenseType,
        max_activations: int = 1,
        features: dict = None,
    ) -> dict:
        trial = await self._get_user_trial(user_id)
        if not trial:
            return {
                "success": False,
                "message": "No active trial found",
            }

        if trial.expires_at and ensure_utc(trial.expires_at) < datetime.now(timezone.utc):
            return {
                "success": False,
                "message": "Trial has expired",
            }

        new_license = await self.license_service.create_license(
            user_id=user_id,
            license_type=target_license_type,
            max_activations=max_activations,
            features=features or {},
        )

        await self.license_repo.update(
            trial.id,
            status=LicenseStatus.REVOKED,
        )

        await self.audit_repo.log(
            user_id=user_id,
            license_id=new_license.id,
            action=AuditAction.TRIAL_CONVERTED,
            details={
                "trial_id": str(trial.id),
                "new_license_type": target_license_type.value,
            },
        )

        return {
            "success": True,
            "license_id": new_license.id,
            "license_key": license_crypto.decrypt_license_key(new_license.license_key),
            "message": "Trial converted successfully",
        }

    async def get_trial_reminders(self, within_days: int = 2) -> list[dict]:
        cutoff = datetime.now(timezone.utc) + timedelta(days=within_days)

        trials = await self.license_repo.get_expiring_licenses(within_days)

        reminders = []
        for trial in trials:
            if trial.is_trial:
                remaining = math.ceil((trial.expires_at - datetime.now(timezone.utc)).total_seconds() / 86400) if trial.expires_at else 0
                reminders.append({
                    "user_id": trial.user_id,
                    "license_id": trial.id,
                    "expires_at": trial.expires_at.isoformat() if trial.expires_at else None,
                    "remaining_days": remaining,
                })

        return reminders

    async def _get_user_trial(self, user_id: uuid.UUID) -> Optional[License]:
        from sqlalchemy import select, and_

        result = await self.session.execute(
            select(License).where(
                and_(
                    License.user_id == user_id,
                    License.is_trial == True,
                    License.status.in_([LicenseStatus.ACTIVE, LicenseStatus.PENDING]),
                )
            ).order_by(License.created_at.desc())
        )
        return result.scalar_one_or_none()


from src.modules.license.security.crypto import license_crypto
