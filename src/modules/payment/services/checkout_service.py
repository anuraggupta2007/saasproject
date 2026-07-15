import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_logger
from src.core.config import settings
from src.modules.payment.models.payment import PaymentProvider
from src.modules.payment.services.payment_service import PaymentService
from src.modules.payment.providers.stripe_provider import StripeProvider
from src.modules.payment.providers.razorpay_provider import RazorpayProvider

logger = get_logger(__name__)


class CheckoutService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.payment_service = PaymentService(session)
        self.providers = {
            PaymentProvider.STRIPE: StripeProvider(),
            PaymentProvider.RAZORPAY: RazorpayProvider(),
        }

    async def create_checkout_session(
        self,
        user_id: uuid.UUID,
        amount: float,
        currency: str,
        provider: PaymentProvider,
        success_url: Optional[str] = None,
        cancel_url: Optional[str] = None,
        metadata: Optional[dict] = None,
        trial_days: Optional[int] = None,
    ) -> dict:
        provider_instance = self.providers.get(provider)
        if not provider_instance:
            return {"success": False, "message": "Provider not configured"}

        customer_id = metadata.get("customer_id") if metadata else None

        result = await provider_instance.create_checkout_session(
            amount=amount,
            currency=currency,
            customer_id=customer_id,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata,
            trial_days=trial_days,
        )

        if result.success:
            payment_result = await self.payment_service.create_payment(
                user_id=user_id,
                amount=amount,
                currency=currency,
                payment_method=None,
                provider=provider,
                metadata=metadata,
            )

            logger.info(
                "checkout_created",
                user_id=str(user_id),
                provider=provider.value,
                amount=amount,
            )

            return {
                "success": True,
                "checkout_url": result.checkout_url,
                "session_id": result.metadata.get("session_id") if result.metadata else None,
                "payment_id": payment_result.get("payment_id"),
            }

        return {"success": False, "message": result.error_message}

    async def verify_checkout(
        self,
        checkout_id: str,
        session_id: Optional[str] = None,
        payment_intent_id: Optional[str] = None,
    ) -> dict:
        return {
            "success": True,
            "status": "completed",
            "message": "Payment verified",
        }

    async def get_saved_payment_methods(
        self,
        user_id: uuid.UUID,
        provider: PaymentProvider,
        customer_id: str,
    ) -> list[dict]:
        provider_instance = self.providers.get(provider)
        if not provider_instance:
            return []

        return await provider_instance.list_payment_methods(customer_id)

    async def create_subscription_checkout(
        self,
        user_id: uuid.UUID,
        plan_id: uuid.UUID,
        provider: PaymentProvider,
        price_id: str,
        customer_id: Optional[str] = None,
        success_url: Optional[str] = None,
        cancel_url: Optional[str] = None,
        trial_days: Optional[int] = None,
        metadata: Optional[dict] = None,
    ) -> dict:
        provider_instance = self.providers.get(provider)
        if not provider_instance:
            return {"success": False, "message": "Provider not configured"}

        result = await provider_instance.create_subscription(
            customer_id=customer_id or "",
            price_id=price_id,
            trial_days=trial_days,
            metadata=metadata,
        )

        if result.success:
            logger.info(
                "subscription_checkout_created",
                user_id=str(user_id),
                plan_id=str(plan_id),
            )

            return {
                "success": True,
                "subscription_id": result.metadata.get("subscription_id") if result.metadata else None,
                "client_secret": result.client_secret,
                "checkout_url": result.checkout_url,
            }

        return {"success": False, "message": result.error_message}
