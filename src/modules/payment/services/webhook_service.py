import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_logger
from src.modules.payment.models.webhook_event import WebhookEvent, WebhookEventStatus
from src.modules.payment.repositories.webhook_event import WebhookEventRepository
from src.modules.payment.services.payment_service import PaymentService
from src.modules.payment.services.invoice_service import InvoiceService

logger = get_logger(__name__)


class WebhookService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.webhook_repo = WebhookEventRepository(session)
        self.payment_service = PaymentService(session)
        self.invoice_service = InvoiceService(session)

    async def process_webhook(
        self,
        provider: str,
        event_type: str,
        provider_event_id: str,
        payload: dict,
        idempotency_key: Optional[str] = None,
    ) -> dict:
        if idempotency_key:
            existing = await self.webhook_repo.get_by_idempotency_key(idempotency_key)
            if existing:
                return {
                    "success": True,
                    "event_id": existing.id,
                    "message": "Event already processed",
                }

        is_duplicate = await self.webhook_repo.is_duplicate(provider_event_id)
        if is_duplicate:
            return {
                "success": True,
                "message": "Duplicate event skipped",
            }

        event = WebhookEvent(
            provider=provider,
            event_type=event_type,
            provider_event_id=provider_event_id,
            payload=payload,
            idempotency_key=idempotency_key,
        )
        event = await self.webhook_repo.create(event)

        try:
            result = await self._handle_webhook_event(provider, event_type, payload)

            await self.webhook_repo.update_status(
                event.id,
                WebhookEventStatus.PROCESSED,
            )

            logger.info(
                "webhook_processed",
                event_id=str(event.id),
                provider=provider,
                event_type=event_type,
            )

            return {
                "success": True,
                "event_id": event.id,
                "message": "Event processed",
                "action_taken": result.get("action"),
            }

        except Exception as e:
            await self.webhook_repo.update_status(
                event.id,
                WebhookEventStatus.FAILED,
                error_message=str(e),
            )

            logger.error(
                "webhook_failed",
                event_id=str(event.id),
                error=str(e),
            )

            return {
                "success": False,
                "event_id": event.id,
                "message": str(e),
            }

    async def _handle_webhook_event(
        self,
        provider: str,
        event_type: str,
        payload: dict,
    ) -> dict:
        if provider == "stripe":
            return await self._handle_stripe_event(event_type, payload)
        elif provider == "razorpay":
            return await self._handle_razorpay_event(event_type, payload)

        return {"action": "unknown_provider"}

    async def _handle_stripe_event(self, event_type: str, payload: dict) -> dict:
        data = payload.get("data", {}).get("object", {})

        if event_type == "payment_intent.succeeded":
            payment_id = data.get("id")
            if payment_id:
                payment = await self.payment_service.payment_repo.get_by_provider_payment_id(payment_id)
                if payment:
                    await self.payment_service.payment_repo.update_status(
                        payment.id,
                        "succeeded",
                        provider_payment_id=payment_id,
                    )
                    return {"action": "payment_succeeded"}

        elif event_type == "payment_intent.payment_failed":
            payment_id = data.get("id")
            if payment_id:
                payment = await self.payment_service.payment_repo.get_by_provider_payment_id(payment_id)
                if payment:
                    await self.payment_service.payment_repo.update_status(
                        payment.id,
                        "failed",
                    )
                    return {"action": "payment_failed"}

        elif event_type == "invoice.paid":
            invoice_id = data.get("id")
            if invoice_id:
                return {"action": "invoice_paid"}

        elif event_type == "invoice.payment_failed":
            invoice_id = data.get("id")
            if invoice_id:
                return {"action": "invoice_payment_failed"}

        elif event_type == "customer.subscription.deleted":
            subscription_id = data.get("id")
            if subscription_id:
                return {"action": "subscription_cancelled"}

        elif event_type == "charge.refunded":
            charge_id = data.get("id")
            if charge_id:
                return {"action": "refund_processed"}

        return {"action": "unhandled_event"}

    async def _handle_razorpay_event(self, event_type: str, payload: dict) -> dict:
        payload_data = payload.get("payload", {})

        if event_type == "payment.captured":
            payment = payload_data.get("payment", {}).get("entity", {})
            payment_id = payment.get("id")
            if payment_id:
                return {"action": "payment_captured"}

        elif event_type == "payment.failed":
            payment = payload_data.get("payment", {}).get("entity", {})
            payment_id = payment.get("id")
            if payment_id:
                return {"action": "payment_failed"}

        elif event_type == "subscription.activated":
            subscription = payload_data.get("subscription", {}).get("entity", {})
            subscription_id = subscription.get("id")
            if subscription_id:
                return {"action": "subscription_activated"}

        elif event_type == "subscription.cancelled":
            subscription = payload_data.get("subscription", {}).get("entity", {})
            subscription_id = subscription.get("id")
            if subscription_id:
                return {"action": "subscription_cancelled"}

        return {"action": "unhandled_event"}

    async def get_pending_webhooks(self, limit: int = 100) -> list[WebhookEvent]:
        return await self.webhook_repo.get_pending_events(limit)

    async def retry_webhook(self, event_id: uuid.UUID) -> dict:
        event = await self.webhook_repo.get_by_id(event_id)
        if not event:
            return {"success": False, "message": "Event not found"}

        if event.retry_count >= event.max_retries:
            return {"success": False, "message": "Max retries exceeded"}

        await self.webhook_repo.update_status(event_id, WebhookEventStatus.PENDING)

        return await self.process_webhook(
            provider=event.provider,
            event_type=event.event_type,
            provider_event_id=event.provider_event_id,
            payload=event.payload,
        )

    async def get_webhook_stats(self) -> dict:
        return await self.webhook_repo.count_by_status()
