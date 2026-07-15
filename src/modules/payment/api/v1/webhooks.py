from fastapi import APIRouter, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.config import settings
from src.core.logging import get_logger
from src.modules.payment.services.webhook_service import WebhookService
from src.modules.payment.providers.stripe_provider import StripeProvider

logger = get_logger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post(
    "/stripe",
    summary="Stripe webhook endpoint",
)
async def stripe_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("stripe-signature", "")

    provider = StripeProvider()

    is_valid = await provider.verify_webhook_signature(
        payload=payload,
        signature=signature,
        secret=settings.STRIPE_WEBHOOK_SECRET,
    )

    if not is_valid:
        logger.warning("stripe_webhook_invalid_signature")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature",
        )

    import json
    event_data = json.loads(payload)

    async for session in get_db():
        service = WebhookService(session)

        result = await service.process_webhook(
            provider="stripe",
            event_type=event_data.get("type", ""),
            provider_event_id=event_data.get("id", ""),
            payload=event_data,
        )

        logger.info(
            "stripe_webhook_processed",
            event_type=event_data.get("type"),
            result=result,
        )

        return {"received": True}

    return {"received": True}


@router.post(
    "/razorpay",
    summary="Razorpay webhook endpoint",
)
async def razorpay_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    from src.modules.payment.providers.razorpay_provider import RazorpayProvider
    provider = RazorpayProvider()

    is_valid = await provider.verify_webhook_signature(
        payload=payload,
        signature=signature,
        secret=settings.RAZORPAY_WEBHOOK_SECRET,
    )

    if not is_valid:
        logger.warning("razorpay_webhook_invalid_signature")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature",
        )

    import json
    event_data = json.loads(payload)

    async for session in get_db():
        service = WebhookService(session)

        result = await service.process_webhook(
            provider="razorpay",
            event_type=event_data.get("event", ""),
            provider_event_id=event_data.get("payload", {}).get("payment", {}).get("entity", {}).get("id", ""),
            payload=event_data,
        )

        logger.info(
            "razorpay_webhook_processed",
            event_type=event_data.get("event"),
            result=result,
        )

        return {"received": True}

    return {"received": True}
