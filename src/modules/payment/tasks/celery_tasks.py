import uuid
import asyncio
from datetime import datetime, timezone

from src.core.celery_app import celery_app
from src.core.database import async_session_factory
from src.core.logging import get_logger

logger = get_logger(__name__)


@celery_app.task(
    bind=True,
    name="payment.process_webhook_retry",
    max_retries=3,
    default_retry_delay=60,
)
def process_webhook_retry(self, event_id: str):
    asyncio.run(_process_webhook_retry_async(event_id))


async def _process_webhook_retry_async(event_id: str):
    async with async_session_factory() as session:
        from src.modules.payment.services.webhook_service import WebhookService

        service = WebhookService(session)
        result = await service.retry_webhook(uuid.UUID(event_id))

        logger.info("webhook_retry_completed", event_id=event_id, result=result)
        return result


@celery_app.task(
    bind=True,
    name="payment.cleanup_pending_webhooks",
)
def cleanup_pending_webhooks(self):
    asyncio.run(_cleanup_pending_webhooks_async())


async def _cleanup_pending_webhooks_async():
    async with async_session_factory() as session:
        from src.modules.payment.services.webhook_service import WebhookService

        service = WebhookService(session)
        pending = await service.get_pending_webhooks(limit=50)

        for event in pending:
            await service.retry_webhook(event.id)

        logger.info("pending_webhooks_processed", count=len(pending))
        return {"processed": len(pending)}


@celery_app.task(
    bind=True,
    name="payment.cleanup_expired_coupons",
)
def cleanup_expired_coupons(self):
    asyncio.run(_cleanup_expired_coupons_async())


async def _cleanup_expired_coupons_async():
    async with async_session_factory() as session:
        from src.modules.payment.services.coupon_service import CouponService

        service = CouponService(session)
        count = await service.cleanup_expired_coupons()

        logger.info("expired_coupons_cleaned", count=count)
        return {"cleaned": count}


@celery_app.task(
    bind=True,
    name="payment.check_overdue_invoices",
)
def check_overdue_invoices(self):
    asyncio.run(_check_overdue_invoices_async())


async def _check_overdue_invoices_async():
    async with async_session_factory() as session:
        from src.modules.payment.services.invoice_service import InvoiceService

        service = InvoiceService(session)
        overdue = await service.get_overdue_invoices()

        for invoice in overdue:
            await service.mark_invoice_overdue(invoice.id)

        logger.info("overdue_invoices_checked", count=len(overdue))
        return {"overdue_count": len(overdue)}


@celery_app.task(
    bind=True,
    name="payment.generate_invoice_pdf",
)
def generate_invoice_pdf(self, invoice_id: str):
    asyncio.run(_generate_invoice_pdf_async(invoice_id))


async def _generate_invoice_pdf_async(invoice_id: str):
    async with async_session_factory() as session:
        from src.modules.payment.services.invoice_service import InvoiceService

        service = InvoiceService(session)
        pdf_url = await service.generate_invoice_pdf(uuid.UUID(invoice_id))

        logger.info("invoice_pdf_generated", invoice_id=invoice_id, pdf_url=pdf_url)
        return {"pdf_url": pdf_url}


@celery_app.task(
    bind=True,
    name="payment.send_payment_notification",
)
def send_payment_notification(self, user_id: str, payment_id: str, event_type: str):
    asyncio.run(_send_payment_notification_async(user_id, payment_id, event_type))


async def _send_payment_notification_async(user_id: str, payment_id: str, event_type: str):
    logger.info(
        "payment_notification_sent",
        user_id=user_id,
        payment_id=payment_id,
        event_type=event_type,
    )
    return {"sent": True}
