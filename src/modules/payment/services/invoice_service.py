import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_logger
from src.modules.payment.models.invoice import Invoice, InvoiceStatus
from src.modules.payment.repositories.invoice import InvoiceRepository

logger = get_logger(__name__)


class InvoiceService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.invoice_repo = InvoiceRepository(session)

    async def create_invoice(
        self,
        user_id: uuid.UUID,
        line_items: list[dict],
        tax_rate: float = 0,
        discount_amount: float = 0,
        currency: str = "USD",
        billing_address: Optional[dict] = None,
        notes: Optional[str] = None,
        subscription_id: Optional[uuid.UUID] = None,
        period_start: Optional[datetime] = None,
        period_end: Optional[datetime] = None,
    ) -> Invoice:
        subtotal = sum(item.get("amount", 0) * item.get("quantity", 1) for item in line_items)
        tax_amount = subtotal * (tax_rate / 100)
        total_amount = subtotal + tax_amount - discount_amount

        invoice_number = await self.invoice_repo.generate_invoice_number()

        invoice = Invoice(
            user_id=user_id,
            invoice_number=invoice_number,
            status=InvoiceStatus.PENDING,
            subtotal=subtotal,
            tax_amount=tax_amount,
            tax_rate=tax_rate,
            discount_amount=discount_amount,
            total_amount=total_amount,
            currency=currency,
            billing_address=billing_address,
            line_items=line_items,
            notes=notes,
            subscription_id=subscription_id,
            period_start=period_start,
            period_end=period_end,
        )

        invoice = await self.invoice_repo.create(invoice)

        logger.info(
            "invoice_created",
            invoice_id=str(invoice.id),
            invoice_number=invoice_number,
            total=total_amount,
        )

        return invoice

    async def get_invoice(self, invoice_id: uuid.UUID) -> Optional[Invoice]:
        return await self.invoice_repo.get_by_id(invoice_id)

    async def get_invoice_by_number(self, invoice_number: str) -> Optional[Invoice]:
        return await self.invoice_repo.get_by_invoice_number(invoice_number)

    async def list_user_invoices(
        self,
        user_id: uuid.UUID,
        status: Optional[InvoiceStatus] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Invoice], int]:
        return await self.invoice_repo.get_user_invoices(
            user_id, status=status, page=page, page_size=page_size
        )

    async def mark_invoice_paid(
        self,
        invoice_id: uuid.UUID,
        payment_id: Optional[uuid.UUID] = None,
    ) -> Optional[Invoice]:
        invoice = await self.invoice_repo.update_status(
            invoice_id,
            InvoiceStatus.PAID,
            paid_at=datetime.now(timezone.utc),
        )

        if invoice and payment_id:
            invoice.payment_id = payment_id
            await self.session.commit()

        if invoice:
            logger.info("invoice_paid", invoice_id=str(invoice_id))

        return invoice

    async def mark_invoice_overdue(self, invoice_id: uuid.UUID) -> Optional[Invoice]:
        return await self.invoice_repo.update_status(invoice_id, InvoiceStatus.OVERDUE)

    async def cancel_invoice(self, invoice_id: uuid.UUID) -> Optional[Invoice]:
        return await self.invoice_repo.update_status(invoice_id, InvoiceStatus.CANCELLED)

    async def generate_invoice_pdf(self, invoice_id: uuid.UUID) -> Optional[str]:
        invoice = await self.invoice_repo.get_by_id(invoice_id)
        if not invoice:
            return None

        pdf_url = f"/api/v1/payment/invoices/{invoice_id}/pdf"
        return pdf_url

    async def get_overdue_invoices(self) -> list[Invoice]:
        return await self.invoice_repo.get_overdue_invoices()

    async def calculate_tax(
        self,
        amount: float,
        tax_rate: float,
        tax_type: str = "vat",
    ) -> dict:
        tax_amount = amount * (tax_rate / 100)
        total = amount + tax_amount

        return {
            "subtotal": amount,
            "tax_rate": tax_rate,
            "tax_amount": tax_amount,
            "tax_type": tax_type,
            "total": total,
        }

    async def get_invoice_stats(self, user_id: Optional[uuid.UUID] = None) -> dict:
        status_counts = await self.invoice_repo.count_by_status(user_id)
        return {
            "total": sum(status_counts.values()),
            "by_status": status_counts,
        }
