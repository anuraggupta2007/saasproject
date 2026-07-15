import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.notification.models.notification import Notification, NotificationStatus, NotificationChannel, NotificationPriority
from src.models.base import BaseRepository


class NotificationRepository(BaseRepository[Notification]):
    def __init__(self, session: AsyncSession):
        super().__init__(Notification, session)

    async def get_user_notifications(
        self,
        user_id: uuid.UUID,
        channel: Optional[NotificationChannel] = None,
        status: Optional[NotificationStatus] = None,
        unread_only: bool = False,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Notification], int, int]:
        query = select(Notification).where(Notification.user_id == user_id)

        if channel:
            query = query.where(Notification.channel == channel)
        if status:
            query = query.where(Notification.status == status)
        if unread_only:
            query = query.where(Notification.read_at.is_(None))

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        unread_query = select(func.count()).where(
            and_(
                Notification.user_id == user_id,
                Notification.read_at.is_(None),
            )
        )
        unread_count = (await self.session.execute(unread_query)).scalar() or 0

        query = query.order_by(Notification.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        notifications = list(result.scalars().all())

        return notifications, total, unread_count

    async def get_scheduled_notifications(self) -> list[Notification]:
        now = datetime.now(timezone.utc)
        result = await self.session.execute(
            select(Notification).where(
                and_(
                    Notification.status.in_([NotificationStatus.PENDING, NotificationStatus.QUEUED]),
                    Notification.scheduled_at.isnot(None),
                    Notification.scheduled_at <= now,
                )
            ).order_by(Notification.created_at.asc())
        )
        return list(result.scalars().all())

    async def get_pending_notifications(self, limit: int = 100) -> list[Notification]:
        result = await self.session.execute(
            select(Notification).where(
                Notification.status.in_([NotificationStatus.PENDING, NotificationStatus.QUEUED])
            ).order_by(
                Notification.priority.desc(),
                Notification.created_at.asc()
            ).limit(limit)
        )
        return list(result.scalars().all())

    async def get_retryable_notifications(self) -> list[Notification]:
        result = await self.session.execute(
            select(Notification).where(
                and_(
                    Notification.status == NotificationStatus.RETRYING,
                    Notification.retry_count < Notification.max_retries,
                )
            ).order_by(Notification.created_at.asc())
        )
        return list(result.scalars().all())

    async def mark_as_read(self, notification_ids: list[uuid.UUID]) -> int:
        now = datetime.now(timezone.utc)
        result = await self.session.execute(
            select(Notification).where(Notification.id.in_(notification_ids))
        )
        notifications = list(result.scalars().all())

        for notification in notifications:
            if notification.read_at is None:
                notification.read_at = now

        await self.session.commit()
        return len(notifications)

    async def mark_all_as_read(self, user_id: uuid.UUID) -> int:
        now = datetime.now(timezone.utc)
        result = await self.session.execute(
            select(Notification).where(
                and_(
                    Notification.user_id == user_id,
                    Notification.read_at.is_(None),
                )
            )
        )
        notifications = list(result.scalars().all())

        for notification in notifications:
            notification.read_at = now

        await self.session.commit()
        return len(notifications)

    async def count_by_status(self) -> dict:
        result = await self.session.execute(
            select(Notification.status, func.count()).group_by(Notification.status)
        )
        return {row[0].value: row[1] for row in result.all()}

    async def count_by_channel(self) -> dict:
        result = await self.session.execute(
            select(Notification.channel, func.count()).group_by(Notification.channel)
        )
        return {row[0].value: row[1] for row in result.all()}

    async def get_delivery_stats(self) -> dict:
        sent = await self.session.execute(
            select(func.count()).where(Notification.status == NotificationStatus.SENT)
        )
        delivered = await self.session.execute(
            select(func.count()).where(Notification.status == NotificationStatus.DELIVERED)
        )
        failed = await self.session.execute(
            select(func.count()).where(Notification.status == NotificationStatus.FAILED)
        )

        sent_count = sent.scalar() or 0
        delivered_count = delivered.scalar() or 0
        failed_count = failed.scalar() or 0

        total = sent_count + delivered_count + failed_count
        delivery_rate = (delivered_count / total * 100) if total > 0 else 0

        return {
            "total_sent": sent_count + delivered_count,
            "total_delivered": delivered_count,
            "total_failed": failed_count,
            "delivery_rate": round(delivery_rate, 2),
        }

    async def cleanup_old_notifications(self, days: int = 90) -> int:
        from datetime import timedelta
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)

        result = await self.session.execute(
            select(Notification).where(
                and_(
                    Notification.created_at < cutoff,
                    Notification.status.in_([
                        NotificationStatus.DELIVERED,
                        NotificationStatus.FAILED,
                    ]),
                )
            )
        )
        notifications = list(result.scalars().all())

        for notification in notifications:
            await self.session.delete(notification)

        await self.session.commit()
        return len(notifications)
