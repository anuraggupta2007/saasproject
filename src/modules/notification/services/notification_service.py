import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_logger
from src.modules.notification.models.notification import (
    Notification,
    NotificationChannel,
    NotificationStatus,
    NotificationPriority,
)
from src.modules.notification.repositories.notification import NotificationRepository
from src.modules.notification.repositories.template import (
    TemplateRepository,
    DeliveryLogRepository,
    UserPreferencesRepository,
)
from src.modules.notification.providers.smtp_provider import SMTPEmailProvider
from src.modules.notification.providers.sendgrid_provider import SendGridEmailProvider
from src.modules.notification.providers.twilio_provider import TwilioSMSProvider

logger = get_logger(__name__)


class NotificationService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.notification_repo = NotificationRepository(session)
        self.template_repo = TemplateRepository(session)
        self.delivery_repo = DeliveryLogRepository(session)
        self.prefs_repo = UserPreferencesRepository(session)
        self.email_providers = {
            "smtp": SMTPEmailProvider(),
            "sendgrid": SendGridEmailProvider(),
        }
        self.sms_providers = {
            "twilio": TwilioSMSProvider(),
        }

    async def send_notification(
        self,
        user_id: uuid.UUID,
        channel: NotificationChannel,
        content: str,
        subject: Optional[str] = None,
        html_content: Optional[str] = None,
        recipient: Optional[str] = None,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        template_name: Optional[str] = None,
        variables: Optional[dict] = None,
        scheduled_at: Optional[datetime] = None,
        metadata: Optional[dict] = None,
    ) -> Notification:
        prefs = await self.prefs_repo.get_or_create(user_id)

        if not await self.prefs_repo.is_channel_enabled(user_id, channel.value):
            logger.info(
                "notification_skipped_channel_disabled",
                user_id=str(user_id),
                channel=channel.value,
            )
            return None

        if await self.prefs_repo.is_quiet_hours(user_id):
            if priority != NotificationPriority.URGENT:
                logger.info(
                    "notification_skipped_quiet_hours",
                    user_id=str(user_id),
                )
                scheduled_at = self._next_wake_time(prefs)

        template = None
        if template_name:
            template = await self.template_repo.get_by_name_and_locale(
                template_name,
                prefs.language or "en",
            )
            if template:
                content = self._render_template(template.body_text, variables or {})
                if template.body_html:
                    html_content = self._render_template(template.body_html, variables or {})
                if template.subject:
                    subject = self._render_template(template.subject, variables or {})

        notification = Notification(
            user_id=user_id,
            template_id=template.id if template else None,
            channel=channel,
            priority=priority,
            status=NotificationStatus.PENDING if not scheduled_at else NotificationStatus.QUEUED,
            subject=subject,
            content=content,
            html_content=html_content,
            recipient=recipient or "",
            metadata_json=metadata or {},
            scheduled_at=scheduled_at,
        )

        notification = await self.notification_repo.create(notification)

        if not scheduled_at:
            await self._process_notification(notification)

        logger.info(
            "notification_created",
            notification_id=str(notification.id),
            user_id=str(user_id),
            channel=channel.value,
        )

        return notification

    async def send_batch(
        self,
        notifications: list[dict],
        send_immediately: bool = True,
    ) -> list[Notification]:
        created = []
        for notif_data in notifications:
            notification = await self.send_notification(
                user_id=notif_data["user_id"],
                channel=NotificationChannel(notif_data["channel"]),
                content=notif_data["content"],
                subject=notif_data.get("subject"),
                html_content=notif_data.get("html_content"),
                recipient=notif_data.get("recipient", ""),
                priority=NotificationPriority(notif_data.get("priority", "normal")),
                template_name=notif_data.get("template_name"),
                variables=notif_data.get("variables"),
                scheduled_at=notif_data.get("scheduled_at"),
                metadata=notif_data.get("metadata"),
            )
            if notification:
                created.append(notification)
        return created

    async def _process_notification(self, notification: Notification) -> bool:
        try:
            await self.notification_repo.update(
                notification.id,
                status=NotificationStatus.SENDING,
            )

            result = None

            if notification.channel == NotificationChannel.EMAIL:
                result = await self._send_email(notification)
            elif notification.channel == NotificationChannel.SMS:
                result = await self._send_sms(notification)
            elif notification.channel == NotificationChannel.IN_APP:
                result = await self._send_in_app(notification)
            elif notification.channel == NotificationChannel.PUSH:
                result = await self._send_push(notification)

            if result and result.success:
                await self.notification_repo.update(
                    notification.id,
                    status=NotificationStatus.SENT,
                    sent_at=datetime.now(timezone.utc),
                )

                await self.delivery_repo.create(
                    notification_id=notification.id,
                    channel=notification.channel.value,
                    provider="default",
                    status="sent",
                    provider_message_id=result.message_id,
                )

                return True
            else:
                await self.notification_repo.update(
                    notification.id,
                    status=NotificationStatus.FAILED,
                    failed_at=datetime.now(timezone.utc),
                    error_message=result.error_message if result else "Unknown error",
                )
                return False

        except Exception as e:
            logger.error(
                "notification_process_error",
                notification_id=str(notification.id),
                error=str(e),
            )
            await self.notification_repo.update(
                notification.id,
                status=NotificationStatus.FAILED,
                failed_at=datetime.now(timezone.utc),
                error_message=str(e),
            )
            return False

    async def _send_email(self, notification: Notification):
        provider = self.email_providers.get("sendgrid")
        if not provider:
            provider = self.email_providers.get("smtp")

        return await provider.send_email(
            to=notification.recipient,
            subject=notification.subject or "Notification",
            body_text=notification.content,
            body_html=notification.html_content,
        )

    async def _send_sms(self, notification: Notification):
        provider = self.sms_providers.get("twilio")
        if not provider:
            return MessageResult(success=False, error_message="No SMS provider configured")

        return await provider.send_sms(
            to=notification.recipient,
            message=notification.content,
        )

    async def _send_in_app(self, notification: Notification):
        from src.modules.notification.providers.base import MessageResult
        return MessageResult(success=True, status="delivered")

    async def _send_push(self, notification: Notification):
        from src.modules.notification.providers.base import MessageResult
        return MessageResult(success=False, error_message="Push provider not configured")

    async def get_notification(self, notification_id: uuid.UUID) -> Optional[Notification]:
        return await self.notification_repo.get_by_id(notification_id)

    async def list_user_notifications(
        self,
        user_id: uuid.UUID,
        channel: Optional[NotificationChannel] = None,
        unread_only: bool = False,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Notification], int, int]:
        return await self.notification_repo.get_user_notifications(
            user_id, channel=channel, unread_only=unread_only, page=page, page_size=page_size
        )

    async def mark_as_read(
        self,
        user_id: uuid.UUID,
        notification_ids: list[uuid.UUID],
    ) -> int:
        return await self.notification_repo.mark_as_read(notification_ids)

    async def mark_all_as_read(self, user_id: uuid.UUID) -> int:
        return await self.notification_repo.mark_all_as_read(user_id)

    async def delete_notification(
        self,
        user_id: uuid.UUID,
        notification_id: uuid.UUID,
    ) -> bool:
        notification = await self.notification_repo.get_by_id(notification_id)
        if notification and notification.user_id == user_id:
            await self.notification_repo.delete(notification_id)
            return True
        return False

    async def get_notification_stats(self) -> dict:
        status_counts = await self.notification_repo.count_by_status()
        channel_counts = await self.notification_repo.count_by_channel()
        delivery_stats = await self.notification_repo.get_delivery_stats()

        return {
            **delivery_stats,
            "by_channel": channel_counts,
            "by_status": status_counts,
        }

    async def process_scheduled_notifications(self) -> int:
        scheduled = await self.notification_repo.get_scheduled_notifications()
        processed = 0
        for notification in scheduled:
            success = await self._process_notification(notification)
            if success:
                processed += 1
        return processed

    async def retry_failed_notifications(self) -> int:
        retryable = await self.notification_repo.get_retryable_notifications()
        retried = 0
        for notification in retryable:
            await self.notification_repo.update(
                notification.id,
                retry_count=notification.retry_count + 1,
                status=NotificationStatus.RETRYING,
            )
            await self._process_notification(notification)
            retried += 1
        return retried

    def _render_template(self, template: str, variables: dict) -> str:
        result = template
        for key, value in variables.items():
            result = result.replace(f"{{{{{key}}}}}", str(value))
        return result

    def _next_wake_time(self, prefs) -> datetime:
        from datetime import timedelta
        import pytz

        tz = pytz.timezone(prefs.timezone_str or "UTC")
        now = datetime.now(tz)

        if prefs.quiet_hours_end is not None:
            end_hour = prefs.quiet_hours_end
            wake_time = now.replace(hour=end_hour, minute=0, second=0, microsecond=0)
            if wake_time <= now:
                wake_time += timedelta(days=1)
            return wake_time

        return now + timedelta(hours=1)
