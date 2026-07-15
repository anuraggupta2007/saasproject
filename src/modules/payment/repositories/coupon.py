import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.payment.models.coupon import Coupon, CouponUsage, CouponStatus
from src.models.base import BaseRepository


class CouponRepository(BaseRepository[Coupon]):
    def __init__(self, session: AsyncSession):
        super().__init__(Coupon, session)

    async def get_by_code(self, code: str) -> Optional[Coupon]:
        result = await self.session.execute(
            select(Coupon).where(Coupon.code == code.upper())
        )
        return result.scalar_one_or_none()

    async def get_active_coupons(
        self,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Coupon], int]:
        query = select(Coupon).where(Coupon.status == CouponStatus.ACTIVE)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.order_by(Coupon.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        coupons = list(result.scalars().all())

        return coupons, total

    async def validate_coupon(
        self,
        code: str,
        user_id: uuid.UUID,
    ) -> tuple[Optional[Coupon], str]:
        coupon = await self.get_by_code(code)
        if not coupon:
            return None, "Coupon not found"

        if coupon.status != CouponStatus.ACTIVE:
            return None, "Coupon is not active"

        now = datetime.now(timezone.utc)
        if coupon.starts_at and coupon.starts_at > now:
            return None, "Coupon not yet valid"

        if coupon.expires_at and coupon.expires_at < now:
            return None, "Coupon has expired"

        if coupon.max_uses and coupon.used_count >= coupon.max_uses:
            return None, "Coupon usage limit reached"

        usage_count = await self.get_user_usage_count(coupon.id, user_id)
        if usage_count >= coupon.max_uses_per_user:
            return None, "You have already used this coupon"

        return coupon, "Valid"

    async def get_user_usage_count(self, coupon_id: uuid.UUID, user_id: uuid.UUID) -> int:
        result = await self.session.execute(
            select(func.count()).where(
                and_(
                    CouponUsage.coupon_id == coupon_id,
                    CouponUsage.user_id == user_id,
                )
            )
        )
        return result.scalar() or 0

    async def record_usage(
        self,
        coupon_id: uuid.UUID,
        user_id: uuid.UUID,
        payment_id: uuid.UUID,
        discount_amount: float,
    ) -> CouponUsage:
        usage = CouponUsage(
            coupon_id=coupon_id,
            user_id=user_id,
            payment_id=payment_id,
            discount_amount=discount_amount,
        )
        self.session.add(usage)

        coupon = await self.get_by_id(coupon_id)
        if coupon:
            coupon.used_count += 1

        await self.session.commit()
        await self.session.refresh(usage)
        return usage

    async def increment_usage(self, coupon_id: uuid.UUID) -> Optional[Coupon]:
        coupon = await self.get_by_id(coupon_id)
        if coupon:
            coupon.used_count += 1
            await self.session.commit()
            await self.session.refresh(coupon)
        return coupon

    async def deactivate_expired(self) -> int:
        now = datetime.now(timezone.utc)
        result = await self.session.execute(
            select(Coupon).where(
                and_(
                    Coupon.status == CouponStatus.ACTIVE,
                    Coupon.expires_at.isnot(None),
                    Coupon.expires_at < now,
                )
            )
        )
        coupons = list(result.scalars().all())

        for coupon in coupons:
            coupon.status = CouponStatus.EXPIRED

        await self.session.commit()
        return len(coupons)
