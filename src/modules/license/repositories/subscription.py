import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.license.models.subscription import Subscription, SubscriptionStatus
from src.models.base import BaseRepository


class SubscriptionRepository(BaseRepository[Subscription]):
    def __init__(self, session: AsyncSession):
        super().__init__(Subscription, session)

    async def get_by_user(self, user_id: uuid.UUID) -> Optional[Subscription]:
        result = await self.session.execute(
            select(Subscription).where(
                and_(
                    Subscription.user_id == user_id,
                    Subscription.status.in_([
                        SubscriptionStatus.ACTIVE,
                        SubscriptionStatus.TRIALING,
                    ]),
                )
            ).order_by(Subscription.created_at.desc())
        )
        return result.scalar_one_or_none()

    async def get_by_license(self, license_id: uuid.UUID) -> Optional[Subscription]:
        result = await self.session.execute(
            select(Subscription).where(Subscription.license_id == license_id)
        )
        return result.scalar_one_or_none()

    async def get_user_subscriptions(
        self,
        user_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Subscription], int]:
        query = select(Subscription).where(Subscription.user_id == user_id)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.order_by(Subscription.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        subscriptions = list(result.scalars().all())

        return subscriptions, total

    async def get_expiring_subscriptions(self, within_days: int = 3) -> list[Subscription]:
        from datetime import timedelta
        cutoff = datetime.now(timezone.utc) + timedelta(days=within_days)

        result = await self.session.execute(
            select(Subscription).where(
                and_(
                    Subscription.status == SubscriptionStatus.ACTIVE,
                    Subscription.current_period_end <= cutoff,
                    Subscription.current_period_end > datetime.now(timezone.utc),
                )
            )
        )
        return list(result.scalars().all())

    async def get_past_due_subscriptions(self) -> list[Subscription]:
        result = await self.session.execute(
            select(Subscription).where(
                and_(
                    Subscription.status == SubscriptionStatus.ACTIVE,
                    Subscription.current_period_end < datetime.now(timezone.utc),
                )
            )
        )
        return list(result.scalars().all())

    async def count_by_status(self) -> dict:
        result = await self.session.execute(
            select(Subscription.status, func.count()).group_by(Subscription.status)
        )
        return {row[0].value: row[1] for row in result.all()}

    async def update_status(
        self,
        subscription_id: uuid.UUID,
        status: SubscriptionStatus,
    ) -> Optional[Subscription]:
        subscription = await self.get_by_id(subscription_id)
        if subscription:
            subscription.status = status
            if status == SubscriptionStatus.CANCELLED:
                subscription.cancelled_at = datetime.now(timezone.utc)
            await self.session.commit()
            await self.session.refresh(subscription)
        return subscription
