import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.datetime_utils import ensure_utc
from src.core.logging import get_logger
from src.modules.license.models.activation import Activation, ActivationStatus
from src.modules.license.models.device import Device
from src.modules.license.models.license import License, LicenseStatus
from src.modules.license.models.audit import AuditAction
from src.modules.license.repositories.activation import ActivationRepository
from src.modules.license.repositories.device import DeviceRepository
from src.modules.license.repositories.license import LicenseRepository
from src.modules.license.repositories.audit import AuditLogRepository
from src.modules.license.security.crypto import license_crypto

logger = get_logger(__name__)


class ActivationService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.activation_repo = ActivationRepository(session)
        self.device_repo = DeviceRepository(session)
        self.license_repo = LicenseRepository(session)
        self.audit_repo = AuditLogRepository(session)

    async def activate_license(
        self,
        license_key: str,
        device_fingerprint: str,
        device_name: Optional[str] = None,
        device_type: Optional[str] = None,
        os_type: Optional[str] = None,
        os_version: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> dict:
        encrypted_key = license_crypto.encrypt_license_key(license_key)
        license = await self.license_repo.get_by_key(encrypted_key)

        if not license:
            return {
                "success": False,
                "message": "License not found",
            }

        if license.status != LicenseStatus.ACTIVE:
            return {
                "success": False,
                "message": f"License is {license.status.value}",
            }

        if license.expires_at and ensure_utc(license.expires_at) < datetime.now(timezone.utc):
            return {
                "success": False,
                "message": "License has expired",
            }

        active_count = await self.activation_repo.count_active_by_license(license.id)
        if active_count >= license.max_activations:
            return {
                "success": False,
                "message": "Maximum activations reached",
            }

        device = await self.device_repo.get_or_create_device(
            user_id=license.user_id,
            fingerprint=device_fingerprint,
            device_name=device_name,
            device_type=device_type,
            os_type=os_type,
            os_version=os_version,
            ip_address=ip_address,
        )

        existing_activation = await self.activation_repo.get_by_license_and_device(
            license.id, device.id
        )

        if existing_activation:
            if existing_activation.status == ActivationStatus.ACTIVE:
                validation_token = license_crypto.generate_validation_token(
                    str(license.id),
                    device_fingerprint,
                    str(license.expires_at or (datetime.now(timezone.utc) + timedelta(days=365))),
                )

                await self.activation_repo.update_validation_token(
                    existing_activation.id, validation_token
                )

                return {
                    "success": True,
                    "activation_id": existing_activation.id,
                    "validation_token": validation_token,
                    "message": "Already activated",
                }

            existing_activation.status = ActivationStatus.ACTIVE
            existing_activation.deactivated_at = None
            existing_activation.activated_at = datetime.now(timezone.utc)
            await self.session.commit()
            await self.session.refresh(existing_activation)

            activation = existing_activation
        else:
            activation = Activation(
                license_id=license.id,
                device_id=device.id,
                user_id=license.user_id,
                status=ActivationStatus.ACTIVE,
                expires_at=license.expires_at,
            )
            self.session.add(activation)
            await self.session.commit()
            await self.session.refresh(activation)

        await self.license_repo.increment_activations(license.id)

        validation_token = license_crypto.generate_validation_token(
            str(license.id),
            device_fingerprint,
            str(license.expires_at or (datetime.now(timezone.utc) + timedelta(days=365))),
        )

        await self.activation_repo.update_validation_token(activation.id, validation_token)

        await self.audit_repo.log(
            user_id=license.user_id,
            license_id=license.id,
            action=AuditAction.LICENSE_ACTIVATED,
            details={
                "device_fingerprint": device_fingerprint,
                "device_name": device_name,
            },
            ip_address=ip_address,
        )

        logger.info(
            "license_activated",
            license_id=str(license.id),
            device_id=str(device.id),
        )

        return {
            "success": True,
            "activation_id": activation.id,
            "validation_token": validation_token,
            "message": "License activated successfully",
        }

    async def deactivate_license(
        self,
        activation_id: uuid.UUID,
        user_id: uuid.UUID,
        reason: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> dict:
        activation = await self.activation_repo.get_by_id(activation_id)

        if not activation or activation.user_id != user_id:
            return {
                "success": False,
                "message": "Activation not found",
            }

        activation = await self.activation_repo.deactivate_by_id(activation_id)

        if activation:
            await self.license_repo.decrement_activations(activation.license_id)

            await self.audit_repo.log(
                user_id=user_id,
                license_id=activation.license_id,
                action=AuditAction.DEVICE_DEACTIVATED,
                details={
                    "activation_id": str(activation_id),
                    "reason": reason,
                },
                ip_address=ip_address,
            )

        return {
            "success": True,
            "message": "Device deactivated successfully",
            "activation_id": activation_id,
        }

    async def deactivate_by_device(
        self,
        device_fingerprint: str,
        license_key: str,
        user_id: uuid.UUID,
        ip_address: Optional[str] = None,
    ) -> dict:
        device = await self.device_repo.get_by_fingerprint(device_fingerprint)
        if not device:
            return {
                "success": False,
                "message": "Device not found",
            }

        encrypted_key = license_crypto.encrypt_license_key(license_key)
        license = await self.license_repo.get_by_key(encrypted_key)
        if not license:
            return {
                "success": False,
                "message": "License not found",
            }

        activation = await self.activation_repo.deactivate_by_device_and_license(
            device.id, license.id
        )

        if activation:
            await self.license_repo.decrement_activations(license.id)

            await self.audit_repo.log(
                user_id=user_id,
                license_id=license.id,
                action=AuditAction.DEVICE_DEACTIVATED,
                details={"device_fingerprint": device_fingerprint},
                ip_address=ip_address,
            )

        return {
            "success": True,
            "message": "Device deactivated successfully",
        }

    async def transfer_activation(
        self,
        source_device_id: uuid.UUID,
        target_device_fingerprint: str,
        license_id: uuid.UUID,
        user_id: uuid.UUID,
        ip_address: Optional[str] = None,
    ) -> dict:
        source_activation = await self.activation_repo.get_by_id(source_device_id)

        if not source_activation or source_activation.user_id != user_id:
            return {
                "success": False,
                "message": "Source activation not found",
            }

        if source_activation.license_id != license_id:
            return {
                "success": False,
                "message": "Activation does not belong to this license",
            }

        await self.activation_repo.deactivate_by_id(source_activation.id)

        result = await self.activate_license(
            license_key=await self._get_license_key(license_id),
            device_fingerprint=target_device_fingerprint,
            ip_address=ip_address,
        )

        if result["success"]:
            await self.audit_repo.log(
                user_id=user_id,
                license_id=license_id,
                action=AuditAction.DEVICE_TRANSFERRED,
                details={
                    "source_device_id": str(source_device_id),
                    "target_fingerprint": target_device_fingerprint,
                },
                ip_address=ip_address,
            )

        return result

    async def list_activations(
        self,
        license_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> dict:
        license = await self.license_repo.get_by_id(license_id)
        if not license or license.user_id != user_id:
            return {
                "activations": [],
                "total": 0,
                "max_activations": 0,
                "remaining_activations": 0,
            }

        activations = await self.activation_repo.get_active_by_license(license_id)

        return {
            "activations": activations,
            "total": len(activations),
            "max_activations": license.max_activations,
            "remaining_activations": license.max_activations - len(activations),
        }

    async def get_activation_history(
        self,
        license_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> list:
        license = await self.license_repo.get_by_id(license_id)
        if not license or license.user_id != user_id:
            return []

        return await self.activation_repo.get_activation_history(license_id)

    async def _get_license_key(self, license_id: uuid.UUID) -> str:
        license = await self.license_repo.get_by_id(license_id)
        if license:
            return license_crypto.decrypt_license_key(license.license_key)
        raise ValueError("License not found")
