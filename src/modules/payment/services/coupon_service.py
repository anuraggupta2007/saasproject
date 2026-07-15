import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_logger
from src.modules.payment.models.coupon import Coupon, CouponStatus
from src.modules.payment.repositories.coupon import CouponRepository

logger = get_logger(__name__)


class CouponService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.coupon_repo = CouponRepository(session)

    async def create_coupon(
        self,
        code: str,
        name: str,
        coupon_type: str,
        value: float,
        description: Optional[str] = None,
        currency: str = "USD",
        max_uses: Optional[int] = None,
        max_uses_per_user: int = 1,
        min_purchase_amount: Optional[float] = None,
        applicable_plans: Optional[list] = None,
        starts_at: Optional[datetime] = None,
        expires_at: Optional[datetime] = None,
    ) -> Coupon:
        coupon = Coupon(
            code=code.upper(),
            name=name,
            description=description,
            coupon_type=coupon_type,
            value=value,
            currency=currency,
            max_uses=max_uses,
            max_uses_per_user=max_uses_per_user,
            min_purchase_amount=min_purchase_amount,
            applicable_plans=applicable_plans or [],
            starts_at=starts_at,
            expires_at=expires_at,
        )

        coupon = await self.coupon_repo.create(coupon)

        logger.info(
            "coupon_created",
            coupon_id=str(coupon.id),
            code=coupon.code,
        )

        return coupon

    async def get_coupon(self, coupon_id: uuid.UUID) -> Optional[Coupon]:
        return await self.coupon_repo.get_by_id(coupon_id)

    async def get_coupon_by_code(self, code: str) -> Optional[Coupon]:
        return await self.coupon_repo.get_by_code(code)

    async def validate_coupon(
        self,
        code: str,
        user_id: uuid.UUID,
        amount: Optional[float] = None,
        plan_id: Optional[uuid.UUID] = None,
    ) -> dict:
        coupon, message = await self.coupon_repo.validate_coupon(code, user_id)

        if not coupon:
            return {
                "valid": False,
                "message": message,
            }

        discount_amount = self.calculate_discount(coupon, amount or 0)
        final_amount = max(0, (amount or 0) - discount_amount)

        return {
            "valid": True,
            "coupon_id": coupon.id,
            "coupon_type": coupon.coupon_type.value,
            "discount_amount": discount_amount,
            "final_amount": final_amount,
            "message": "Coupon is valid",
        }

    async def apply_coupon(
        self,
        code: str,
        user_id: uuid.UUID,
        payment_id: uuid.UUID,
        amount: float,
    ) -> dict:
        validation = await self.validate_coupon(code, user_id, amount)

        if not validation["valid"]:
            return validation

        coupon_id = validation["coupon_id"]
        discount_amount = validation["discount_amount"]

        await self.coupon_repo.record_usage(
            coupon_id=coupon_id,
            user_id=user_id,
            payment_id=payment_id,
            discount_amount=discount_amount,
        )

        logger.info(
            "coupon_applied",
            coupon_id=str(coupon_id),
            user_id=str(user_id),
            discount=discount_amount,
        )

        return {
            "success": True,
            "coupon_id": coupon_id,
            "discount_amount": discount_amount,
            "final_amount": amount - discount_amount,
        }

    async def update_coupon(
        self,
        coupon_id: uuid.UUID,
        **kwargs,
    ) -> Optional[Coupon]:
        return await self.coupon_repo.update(coupon_id, **kwargs)

    async def deactivate_coupon(self, coupon_id: uuid.UUID) -> Optional[Coupon]:
        return await self.coupon_repo.update(coupon_id, status=CouponStatus.INACTIVE)

    async def list_coupons(
        self,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Coupon], int]:
        return await self.coupon_repo.get_active_coupons(page, page_size)

    async def cleanup_expired_coupons(self) -> int:
        return await self.coupon_repo.deactivate_expired()

    def calculate_discount(self, coupon: Coupon, amount: float) -> float:
        from src.modules.payment.models.coupon import CouponType

        if coupon.min_purchase_amount and amount < coupon.min_purchase_amount:
            return 0

        if coupon.coupon_type == CouponType.PERCENTAGE:
            return amount * (coupon.value / 100)
        elif coupon.coupon_type == CouponType.FIXED_AMOUNT:
            return min(coupon.value, amount)
        elif coupon.coupon_type == CouponType.FREE_TRIAL:
            return 0

        return 0
