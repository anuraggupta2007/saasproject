import uuid
import asyncio
from datetime import datetime, timezone

from src.core.celery_app import celery_app
from src.core.database import async_session_factory
from src.core.logging import get_logger

logger = get_logger(__name__)


@celery_app.task(
    bind=True,
    name="notification.send",
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
    track_started=True,
)
def send_notification_task(self, notification_id: str):
    asyncio.run(_send_notification_async(notification_id))


async def _send_notification_async(notification_id: str):
    async with async_session_factory() as session:
        from src.modules.notification.services.notification_service import NotificationService

        service = NotificationService(session)
        notification = await service.get_notification(uuid.UUID(notification_id))

        if notification:
            await service._process_notification(notification)


@celery_app.task(
    bind=True,
    name="notification.send_batch",
    max_retries=2,
)
def send_batch_notifications_task(self, notifications_json: str):
    import json
    asyncio.run(_send_batch_async(json.loads(notifications_json)))


async def _send_batch_async(notifications: list):
    async with async_session_factory() as session:
        from src.modules.notification.services.notification_service import NotificationService

        service = NotificationService(session)
        await service.send_batch(notifications)


@celery_app.task(
    bind=True,
    name="notification.process_scheduled",
)
def process_scheduled_notifications(self):
    asyncio.run(_process_scheduled_async())


async def _process_scheduled_async():
    async with async_session_factory() as session:
        from src.modules.notification.services.notification_service import NotificationService

        service = NotificationService(session)
        count = await service.process_scheduled_notifications()

        logger.info("scheduled_notifications_processed", count=count)
        return {"processed": count}


@celery_app.task(
    bind=True,
    name="notification.retry_failed",
)
def retry_failed_notifications(self):
    asyncio.run(_retry_failed_async())


async def _retry_failed_async():
    async with async_session_factory() as session:
        from src.modules.notification.services.notification_service import NotificationService

        service = NotificationService(session)
        count = await service.retry_failed_notifications()

        logger.info("failed_notifications_retried", count=count)
        return {"retried": count}


@celery_app.task(
    bind=True,
    name="notification.cleanup_old",
)
def cleanup_old_notifications(self, days: int = 90):
    asyncio.run(_cleanup_old_async(days))


async def _cleanup_old_async(days: int):
    async with async_session_factory() as session:
        from src.modules.notification.repositories.notification import NotificationRepository

        repo = NotificationRepository(session)
        count = await repo.cleanup_old_notifications(days)

        logger.info("old_notifications_cleaned", count=count, days=days)
        return {"cleaned": count}


@celery_app.task(
    bind=True,
    name="notification.send_email",
    max_retries=3,
    default_retry_delay=30,
)
def send_email_task(
    self,
    to: str,
    subject: str,
    body_text: str,
    body_html: str = None,
    from_email: str = None,
):
    asyncio.run(_send_email_async(to, subject, body_text, body_html, from_email))


async def _send_email_async(
    to: str,
    subject: str,
    body_text: str,
    body_html: str = None,
    from_email: str = None,
):
    from src.modules.notification.providers.sendgrid_provider import SendGridEmailProvider

    provider = SendGridEmailProvider()
    result = await provider.send_email(
        to=to,
        subject=subject,
        body_text=body_text,
        body_html=body_html,
        from_email=from_email,
    )

    logger.info(
        "email_task_completed",
        to=to,
        success=result.success,
    )

    return {"success": result.success, "message_id": result.message_id}


@celery_app.task(
    bind=True,
    name="notification.send_sms",
    max_retries=3,
    default_retry_delay=30,
)
def send_sms_task(self, to: str, message: str, from_number: str = None):
    asyncio.run(_send_sms_async(to, message, from_number))


async def _send_sms_async(to: str, message: str, from_number: str = None):
    from src.modules.notification.providers.twilio_provider import TwilioSMSProvider

    provider = TwilioSMSProvider()
    result = await provider.send_sms(
        to=to,
        message=message,
        from_number=from_number,
    )

    logger.info(
        "sms_task_completed",
        to=to,
        success=result.success,
    )

    return {"success": result.success, "message_id": result.message_id}
