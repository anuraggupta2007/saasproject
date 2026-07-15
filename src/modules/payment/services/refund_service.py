import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_logger
from src.modules.payment.models.payment import Payment, PaymentStatus, PaymentProvider
from src.modules.payment.models.refund import Refund, RefundStatus, RefundReason
from src.modules.payment.repositories.payment import PaymentRepository
from src.modules.payment.providers.stripe_provider import StripeProvider
from src.modules.payment.providers.razorpay_provider import RazorpayProvider

logger = get_logger(__name__)


class RefundService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.payment_repo = PaymentRepository(session)
        self.providers = {
            PaymentProvider.STRIPE: StripeProvider(),
            PaymentProvider.RAZORPAY: RazorpayProvider(),
        }

    async def request_refund(
        self,
        user_id: uuid.UUID,
        payment_id: uuid.UUID,
        amount: Optional[float] = None,
        reason: Optional[str] = None,
        description: Optional[str] = None,
    ) -> dict:
        payment = await self.payment_repo.get_by_id(payment_id)
        if not payment:
            return {"success": False, "message": "Payment not found"}

        if payment.user_id != user_id:
            return {"success": False, "message": "Unauthorized"}

        if payment.status != PaymentStatus.SUCCEEDED:
            return {"success": False, "message": "Payment cannot be refunded"}

        refund_amount = amount or float(payment.amount)
        if refund_amount > float(payment.amount):
            return {"success": False, "message": "Refund amount exceeds payment amount"}

        provider = self.providers.get(payment.provider)
        if not provider:
            return {"success": False, "message": "Payment provider not configured"}

        refund_reason = None
        if reason:
            try:
                refund_reason = RefundReason(reason).value
            except ValueError:
                refund_reason = RefundReason.OTHER.value

        refund_result = await provider.create_refund(
            payment_id=payment.provider_payment_id,
            amount=refund_amount,
            reason=refund_reason,
            metadata={"user_id": str(user_id), "description": description},
        )

        if refund_result.success:
            refund = Refund(
                payment_id=payment_id,
                user_id=user_id,
                amount=refund_amount,
                currency=payment.currency,
                status=RefundStatus.SUCCEEDED,
                reason=RefundReason(refund_reason) if refund_reason else None,
                description=description,
                provider_refund_id=refund_result.refund_id,
                processed_at=datetime.now(timezone.utc),
            )
            self.session.add(refund)
            await self.session.commit()
            await self.session.refresh(refund)

            if refund_amount == float(payment.amount):
                await self.payment_repo.update_status(payment_id, PaymentStatus.REFUNDED)
            else:
                await self.payment_repo.update_status(payment_id, PaymentStatus.PARTIALLY_REFUNDED)

            logger.info(
                "refund_processed",
                refund_id=str(refund.id),
                payment_id=str(payment_id),
                amount=refund_amount,
            )

            return {
                "success": True,
                "refund_id": refund.id,
                "amount": refund_amount,
                "status": "succeeded",
            }

        logger.error(
            "refund_failed",
            payment_id=str(payment_id),
            error=refund_result.error_message,
        )

        return {"success": False, "message": refund_result.error_message}

    async def get_refund(self, refund_id: uuid.UUID) -> Optional[Refund]:
        from sqlalchemy import select
        result = await self.session.execute(
            select(Refund).where(Refund.id == refund_id)
        )
        return result.scalar_one_or_none()

    async def list_user_refunds(
        self,
        user_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Refund], int]:
        from sqlalchemy import select, func

        query = select(Refund).where(Refund.user_id == user_id)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.order_by(Refund.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        refunds = list(result.scalars().all())

        return refunds, total

    async def get_payment_refunds(self, payment_id: uuid.UUID) -> list[Refund]:
        from sqlalchemy import select

        result = await self.session.execute(
            select(Refund).where(Refund.payment_id == payment_id)
        )
        return list(result.scalars().all())
