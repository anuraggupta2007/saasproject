import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.payment.models.payment import Payment, PaymentStatus, PaymentProvider
from src.models.base import BaseRepository


class PaymentRepository(BaseRepository[Payment]):
    def __init__(self, session: AsyncSession):
        super().__init__(Payment, session)

    async def get_by_provider_payment_id(self, provider_payment_id: str) -> Optional[Payment]:
        result = await self.session.execute(
            select(Payment).where(Payment.provider_payment_id == provider_payment_id)
        )
        return result.scalar_one_or_none()

    async def get_by_idempotency_key(self, idempotency_key: str) -> Optional[Payment]:
        result = await self.session.execute(
            select(Payment).where(Payment.idempotency_key == idempotency_key)
        )
        return result.scalar_one_or_none()

    async def get_user_payments(
        self,
        user_id: uuid.UUID,
        status: Optional[PaymentStatus] = None,
        provider: Optional[PaymentProvider] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Payment], int]:
        query = select(Payment).where(Payment.user_id == user_id)

        if status:
            query = query.where(Payment.status == status)
        if provider:
            query = query.where(Payment.provider == provider)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.order_by(Payment.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        payments = list(result.scalars().all())

        return payments, total

    async def get_successful_payments(self, user_id: uuid.UUID) -> list[Payment]:
        result = await self.session.execute(
            select(Payment).where(
                and_(
                    Payment.user_id == user_id,
                    Payment.status == PaymentStatus.SUCCEEDED,
                )
            ).order_by(Payment.created_at.desc())
        )
        return list(result.scalars().all())

    async def count_by_status(self, user_id: Optional[uuid.UUID] = None) -> dict:
        query = select(Payment.status, func.count()).group_by(Payment.status)
        if user_id:
            query = query.where(Payment.user_id == user_id)

        result = await self.session.execute(query)
        return {row[0].value: row[1] for row in result.all()}

    async def get_total_revenue(self, start_date: Optional[datetime] = None) -> float:
        query = select(func.sum(Payment.amount)).where(
            Payment.status == PaymentStatus.SUCCEEDED
        )
        if start_date:
            query = query.where(Payment.created_at >= start_date)

        result = await self.session.execute(query)
        return float(result.scalar() or 0)

    async def update_status(
        self,
        payment_id: uuid.UUID,
        status: PaymentStatus,
        provider_payment_id: Optional[str] = None,
    ) -> Optional[Payment]:
        payment = await self.get_by_id(payment_id)
        if payment:
            payment.status = status
            if status == PaymentStatus.SUCCEEDED:
                payment.paid_at = datetime.now(timezone.utc)
            elif status == PaymentStatus.FAILED:
                payment.failed_at = datetime.now(timezone.utc)
            if provider_payment_id:
                payment.provider_payment_id = provider_payment_id
            await self.session.commit()
            await self.session.refresh(payment)
        return payment
