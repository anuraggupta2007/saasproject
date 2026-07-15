import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_logger
from src.modules.license.models.subscription import Subscription, SubscriptionStatus
from src.modules.license.models.plan import Plan, BillingCycle
from src.modules.license.models.license import License, LicenseType, LicenseStatus
from src.modules.license.models.audit import AuditAction
from src.modules.license.repositories.subscription import SubscriptionRepository
from src.modules.license.repositories.plan import PlanRepository
from src.modules.license.repositories.license import LicenseRepository
from src.modules.license.repositories.audit import AuditLogRepository

logger = get_logger(__name__)


class SubscriptionService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.subscription_repo = SubscriptionRepository(session)
        self.plan_repo = PlanRepository(session)
        self.license_repo = LicenseRepository(session)
        self.audit_repo = AuditLogRepository(session)

    async def create_subscription(
        self,
        user_id: uuid.UUID,
        plan_id: uuid.UUID,
        license_id: uuid.UUID,
        trial_days: Optional[int] = None,
    ) -> dict:
        plan = await self.plan_repo.get_by_id(plan_id)
        if not plan:
            return {
                "success": False,
                "message": "Plan not found",
            }

        license = await self.license_repo.get_by_id(license_id)
        if not license:
            return {
                "success": False,
                "message": "License not found",
            }

        now = datetime.now(timezone.utc)

        if trial_days and trial_days > 0:
            period_start = now
            period_end = now + timedelta(days=trial_days)
            status = SubscriptionStatus.TRIALING
        else:
            period_start = now
            period_end = self._calculate_period_end(now, plan.billing_cycle)
            status = SubscriptionStatus.ACTIVE

        subscription = Subscription(
            user_id=user_id,
            license_id=license_id,
            plan_id=plan_id,
            status=status,
            current_period_start=period_start,
            current_period_end=period_end,
            trial_start=now if trial_days else None,
            trial_end=period_end if trial_days else None,
            payment_status="paid" if not trial_days else "trial",
            grace_period_days=7,
        )

        subscription = await self.subscription_repo.save(subscription)

        await self.audit_repo.log(
            user_id=user_id,
            license_id=license_id,
            action=AuditAction.SUBSCRIPTION_CREATED,
            details={
                "plan_id": str(plan_id),
                "billing_cycle": plan.billing_cycle.value,
                "trial_days": trial_days,
            },
        )

        logger.info(
            "subscription_created",
            subscription_id=str(subscription.id),
            user_id=str(user_id),
            plan=plan.name,
        )

        return {
            "success": True,
            "subscription_id": subscription.id,
            "status": status.value,
            "current_period_end": period_end.isoformat(),
            "message": "Subscription created successfully",
        }

    async def renew_subscription(
        self,
        subscription_id: uuid.UUID,
        extend_days: Optional[int] = None,
        payment_amount: Optional[float] = None,
    ) -> dict:
        subscription = await self.subscription_repo.get_by_id(subscription_id)
        if not subscription:
            return {
                "success": False,
                "message": "Subscription not found",
            }

        plan = await self.plan_repo.get_by_id(subscription.plan_id)
        if not plan:
            return {
                "success": False,
                "message": "Plan not found",
            }

        now = datetime.now(timezone.utc)

        if extend_days:
            new_end = subscription.current_period_end + timedelta(days=extend_days)
        else:
            new_end = self._calculate_period_end(subscription.current_period_end, plan.billing_cycle)

        subscription = await self.subscription_repo.update(
            subscription_id,
            status=SubscriptionStatus.ACTIVE,
            current_period_start=subscription.current_period_end,
            current_period_end=new_end,
            payment_status="paid",
            last_payment_at=now,
            next_payment_at=new_end,
        )

        await self.audit_repo.log(
            user_id=subscription.user_id,
            license_id=subscription.license_id,
            action=AuditAction.SUBSCRIPTION_RENEWED,
            details={
                "new_period_end": new_end.isoformat(),
                "payment_amount": payment_amount,
            },
        )

        return {
            "success": True,
            "new_period_end": new_end.isoformat(),
            "message": "Subscription renewed successfully",
        }

    async def cancel_subscription(
        self,
        subscription_id: uuid.UUID,
        user_id: uuid.UUID,
        reason: str = None,
        cancel_immediately: bool = False,
    ) -> dict:
        subscription = await self.subscription_repo.get_by_id(subscription_id)
        if not subscription or subscription.user_id != user_id:
            return {
                "success": False,
                "message": "Subscription not found",
            }

        now = datetime.now(timezone.utc)

        if cancel_immediately:
            await self.subscription_repo.update_status(
                subscription_id, SubscriptionStatus.CANCELLED
            )
        else:
            await self.subscription_repo.update(
                subscription_id,
                cancel_at=subscription.current_period_end,
            )

        await self.audit_repo.log(
            user_id=user_id,
            license_id=subscription.license_id,
            action=AuditAction.SUBSCRIPTION_CANCELLED,
            details={
                "reason": reason,
                "cancel_immediately": cancel_immediately,
            },
        )

        return {
            "success": True,
            "message": "Subscription cancelled successfully",
            "effective_date": now.isoformat() if cancel_immediately else subscription.current_period_end.isoformat(),
        }

    async def upgrade_subscription(
        self,
        subscription_id: uuid.UUID,
        new_plan_id: uuid.UUID,
        user_id: uuid.UUID,
        prorate: bool = True,
    ) -> dict:
        subscription = await self.subscription_repo.get_by_id(subscription_id)
        if not subscription or subscription.user_id != user_id:
            return {
                "success": False,
                "message": "Subscription not found",
            }

        new_plan = await self.plan_repo.get_by_id(new_plan_id)
        if not new_plan:
            return {
                "success": False,
                "message": "New plan not found",
            }

        now = datetime.now(timezone.utc)

        subscription = await self.subscription_repo.update(
            subscription_id,
            plan_id=new_plan_id,
            current_period_end=self._calculate_period_end(now, new_plan.billing_cycle),
        )

        await self.audit_repo.log(
            user_id=user_id,
            license_id=subscription.license_id,
            action=AuditAction.SUBSCRIPTION_RENEWED,
            details={
                "action": "upgrade",
                "new_plan_id": str(new_plan_id),
                "prorate": prorate,
            },
        )

        return {
            "success": True,
            "new_plan": new_plan.name,
            "message": "Subscription upgraded successfully",
        }

    async def check_past_due(self) -> list[dict]:
        past_due = await self.subscription_repo.get_past_due_subscriptions()

        results = []
        for sub in past_due:
            grace_end = sub.current_period_end + timedelta(days=sub.grace_period_days)
            now = datetime.now(timezone.utc)

            if now > grace_end:
                await self.subscription_repo.update_status(
                    sub.id, SubscriptionStatus.EXPIRED
                )
                results.append({
                    "subscription_id": sub.id,
                    "user_id": sub.user_id,
                    "action": "expired",
                })
            else:
                await self.subscription_repo.update_status(
                    sub.id, SubscriptionStatus.PAST_DUE
                )
                results.append({
                    "subscription_id": sub.id,
                    "user_id": sub.user_id,
                    "action": "past_due",
                    "grace_period_ends": grace_end.isoformat(),
                })

        return results

    async def get_user_subscription(self, user_id: uuid.UUID) -> Optional[Subscription]:
        return await self.subscription_repo.get_by_user(user_id)

    async def list_user_subscriptions(
        self,
        user_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Subscription], int]:
        return await self.subscription_repo.get_user_subscriptions(user_id, page, page_size)

    def _calculate_period_end(
        self,
        start: datetime,
        cycle: BillingCycle,
    ) -> datetime:
        if cycle == BillingCycle.MONTHLY:
            return start + timedelta(days=30)
        elif cycle == BillingCycle.QUARTERLY:
            return start + timedelta(days=90)
        elif cycle == BillingCycle.YEARLY:
            return start + timedelta(days=365)
        elif cycle == BillingCycle.LIFETIME:
            return start + timedelta(days=36500)
        elif cycle == BillingCycle.ENTERPRISE:
            return start + timedelta(days=365)
        return start + timedelta(days=30)
