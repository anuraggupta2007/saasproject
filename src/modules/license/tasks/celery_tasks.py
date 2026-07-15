import uuid
import asyncio
from datetime import datetime, timezone

from src.core.celery_app import celery_app
from src.core.database import async_session_factory
from src.core.datetime_utils import ensure_utc
from src.core.logging import get_logger

logger = get_logger(__name__)


@celery_app.task(
    bind=True,
    name="license.cleanup_expired",
    max_retries=1,
)
def cleanup_expired_licenses(self):
    asyncio.run(_cleanup_expired_licenses_async())


async def _cleanup_expired_licenses_async():
    async with async_session_factory() as session:
        from src.modules.license.services.license_service import LicenseService

        service = LicenseService(session)
        count = await service.cleanup_expired_licenses()

        logger.info("expired_licenses_cleaned", count=count)
        return {"cleaned": count}


@celery_app.task(
    bind=True,
    name="license.check_subscriptions",
    max_retries=1,
)
def check_past_due_subscriptions(self):
    asyncio.run(_check_past_due_subscriptions_async())


async def _check_past_due_subscriptions_async():
    async with async_session_factory() as session:
        from src.modules.license.services.subscription_service import SubscriptionService

        service = SubscriptionService(session)
        results = await service.check_past_due()

        logger.info("subscriptions_checked", results=len(results))
        return {"processed": len(results), "results": results}


@celery_app.task(
    bind=True,
    name="license.send_expiry_reminders",
    max_retries=1,
)
def send_expiry_reminders(self):
    asyncio.run(_send_expiry_reminders_async())


async def _send_expiry_reminders_async():
    async with async_session_factory() as session:
        from src.modules.license.services.notification_service import NotificationService

        service = NotificationService(session)
        notifications = await service.get_all_pending_notifications()

        logger.info("expiry_reminders_sent", count=len(notifications))
        return {"notifications_sent": len(notifications), "notifications": notifications}


@celery_app.task(
    bind=True,
    name="license.validate_activations",
    max_retries=1,
)
def validate_all_activations(self):
    asyncio.run(_validate_all_activations_async())


async def _validate_all_activations_async():
    async with async_session_factory() as session:
        from sqlalchemy import select
        from src.modules.license.models.activation import Activation, ActivationStatus

        result = await session.execute(
            select(Activation).where(Activation.status == ActivationStatus.ACTIVE)
        )
        activations = list(result.scalars().all())

        validated = 0
        revoked = 0

        for activation in activations:
            if activation.expires_at and ensure_utc(activation.expires_at) < datetime.now(timezone.utc):
                activation.status = ActivationStatus.EXPIRED
                revoked += 1
            else:
                activation.last_validated = datetime.now(timezone.utc)
                validated += 1

        await session.commit()

        logger.info(
            "activations_validated",
            validated=validated,
            revoked=revoked,
        )
        return {"validated": validated, "revoked": revoked}


@celery_app.task(
    bind=True,
    name="license.generate_report",
)
def generate_license_report(self, user_id: str):
    asyncio.run(_generate_license_report_async(user_id))


async def _generate_license_report_async(user_id: str):
    async with async_session_factory() as session:
        from src.modules.license.services.license_service import LicenseService
        from src.modules.license.services.activation_service import ActivationService

        license_service = LicenseService(session)
        activation_service = ActivationService(session)

        licenses, total = await license_service.list_user_licenses(uuid.UUID(user_id))

        report = {
            "user_id": user_id,
            "total_licenses": total,
            "licenses": [],
        }

        for license in licenses:
            activations = await activation_service.list_activations(license.id, uuid.UUID(user_id))
            report["licenses"].append({
                "license_id": str(license.id),
                "type": license.license_type.value,
                "status": license.status.value,
                "activations": activations["total"],
                "max_activations": license.max_activations,
            })

        logger.info("license_report_generated", user_id=user_id)
        return report
