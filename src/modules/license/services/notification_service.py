import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_logger
from src.modules.license.models.license import License
from src.modules.license.models.subscription import Subscription
from src.modules.license.models.audit import AuditLog
from src.modules.license.repositories.license import LicenseRepository
from src.modules.license.repositories.subscription import SubscriptionRepository

logger = get_logger(__name__)


class NotificationService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.license_repo = LicenseRepository(session)
        self.subscription_repo = SubscriptionRepository(session)

    async def check_license_expiry_reminders(self) -> list[dict]:
        reminders = []

        licenses_7days = await self.license_repo.get_expiring_licenses(within_days=7)
        for license in licenses_7days:
            remaining = (license.expires_at - datetime.now(timezone.utc)).days if license.expires_at else 0
            reminders.append({
                "type": "license_expiry",
                "user_id": str(license.user_id),
                "license_id": str(license.id),
                "license_type": license.license_type.value,
                "expires_at": license.expires_at.isoformat() if license.expires_at else None,
                "remaining_days": remaining,
                "severity": "warning" if remaining > 3 else "critical",
            })

        licenses_30days = await self.license_repo.get_expiring_licenses(within_days=30)
        for license in licenses_30days:
            remaining = (license.expires_at - datetime.now(timezone.utc)).days if license.expires_at else 0
            if remaining > 7:
                reminders.append({
                    "type": "license_expiry_30day",
                    "user_id": str(license.user_id),
                    "license_id": str(license.id),
                    "license_type": license.license_type.value,
                    "expires_at": license.expires_at.isoformat() if license.expires_at else None,
                    "remaining_days": remaining,
                    "severity": "info",
                })

        return reminders

    async def check_subscription_renewal_reminders(self) -> list[dict]:
        reminders = []

        expiring = await self.subscription_repo.get_expiring_subscriptions(within_days=3)
        for sub in expiring:
            remaining = (sub.current_period_end - datetime.now(timezone.utc)).days if sub.current_period_end else 0
            reminders.append({
                "type": "subscription_renewal",
                "user_id": str(sub.user_id),
                "subscription_id": str(sub.id),
                "plan_id": str(sub.plan_id),
                "expires_at": sub.current_period_end.isoformat() if sub.current_period_end else None,
                "remaining_days": remaining,
                "severity": "warning",
            })

        return reminders

    async def get_activation_confirmation(
        self,
        user_id: uuid.UUID,
        license_id: uuid.UUID,
        device_info: dict,
    ) -> dict:
        return {
            "type": "activation_confirmation",
            "user_id": str(user_id),
            "license_id": str(license_id),
            "device_info": device_info,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": "Device activated successfully",
        }

    async def get_payment_failure_notification(
        self,
        user_id: uuid.UUID,
        subscription_id: uuid.UUID,
        reason: str,
    ) -> dict:
        return {
            "type": "payment_failure",
            "user_id": str(user_id),
            "subscription_id": str(subscription_id),
            "reason": reason,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": "Payment failed. Please update your payment method.",
        }

    async def get_trial_ending_notification(
        self,
        user_id: uuid.UUID,
        license_id: uuid.UUID,
        remaining_days: int,
    ) -> dict:
        return {
            "type": "trial_ending",
            "user_id": str(user_id),
            "license_id": str(license_id),
            "remaining_days": remaining_days,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": f"Your trial ends in {remaining_days} days. Upgrade to continue.",
        }

    async def get_all_pending_notifications(self) -> list[dict]:
        notifications = []

        license_reminders = await self.check_license_expiry_reminders()
        notifications.extend(license_reminders)

        subscription_reminders = await self.check_subscription_renewal_reminders()
        notifications.extend(subscription_reminders)

        return sorted(notifications, key=lambda x: x.get("remaining_days", 365))
