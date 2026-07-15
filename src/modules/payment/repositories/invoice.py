import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.payment.models.invoice import Invoice, InvoiceStatus
from src.models.base import BaseRepository


class InvoiceRepository(BaseRepository[Invoice]):
    def __init__(self, session: AsyncSession):
        super().__init__(Invoice, session)

    async def get_by_invoice_number(self, invoice_number: str) -> Optional[Invoice]:
        result = await self.session.execute(
            select(Invoice).where(Invoice.invoice_number == invoice_number)
        )
        return result.scalar_one_or_none()

    async def get_user_invoices(
        self,
        user_id: uuid.UUID,
        status: Optional[InvoiceStatus] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Invoice], int]:
        query = select(Invoice).where(Invoice.user_id == user_id)

        if status:
            query = query.where(Invoice.status == status)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.order_by(Invoice.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        invoices = list(result.scalars().all())

        return invoices, total

    async def generate_invoice_number(self) -> str:
        now = datetime.now(timezone.utc)
        prefix = f"INV-{now.strftime('%Y%m')}"

        result = await self.session.execute(
            select(func.count()).where(
                Invoice.invoice_number.like(f"{prefix}%")
            )
        )
        count = (result.scalar() or 0) + 1

        return f"{prefix}-{count:05d}"

    async def update_status(
        self,
        invoice_id: uuid.UUID,
        status: InvoiceStatus,
        paid_at: Optional[datetime] = None,
    ) -> Optional[Invoice]:
        invoice = await self.get_by_id(invoice_id)
        if invoice:
            invoice.status = status
            if status == InvoiceStatus.PAID and paid_at:
                invoice.paid_at = paid_at
            await self.session.commit()
            await self.session.refresh(invoice)
        return invoice

    async def count_by_status(self, user_id: Optional[uuid.UUID] = None) -> dict:
        query = select(Invoice.status, func.count()).group_by(Invoice.status)
        if user_id:
            query = query.where(Invoice.user_id == user_id)

        result = await self.session.execute(query)
        return {row[0].value: row[1] for row in result.all()}

    async def get_overdue_invoices(self) -> list[Invoice]:
        from datetime import timedelta
        cutoff = datetime.now(timezone.utc) - timedelta(days=30)

        result = await self.session.execute(
            select(Invoice).where(
                and_(
                    Invoice.status == InvoiceStatus.PENDING,
                    Invoice.due_date < cutoff,
                )
            )
        )
        return list(result.scalars().all())
