import stripe
from typing import Optional

from src.core.config import settings
from src.core.logging import get_logger
from src.modules.payment.providers.base import (
    PaymentProviderBase,
    PaymentResult,
    RefundResult,
    CustomerResult,
)

logger = get_logger(__name__)


class StripeProvider(PaymentProviderBase):
    def __init__(self):
        stripe.api_key = settings.STRIPE_SECRET_KEY
        self.webhook_secret = settings.STRIPE_WEBHOOK_SECRET

    async def create_customer(
        self,
        email: str,
        name: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> CustomerResult:
        try:
            customer_data = {"email": email}
            if name:
                customer_data["name"] = name
            if metadata:
                customer_data["metadata"] = metadata

            customer = stripe.Customer.create(**customer_data)

            logger.info("stripe_customer_created", customer_id=customer.id)

            return CustomerResult(
                success=True,
                customer_id=customer.id,
                email=customer.email,
            )
        except stripe.StripeError as e:
            logger.error("stripe_customer_error", error=str(e))
            return CustomerResult(success=False, error_message=str(e))

    async def create_checkout_session(
        self,
        amount: float,
        currency: str,
        customer_id: Optional[str] = None,
        success_url: Optional[str] = None,
        cancel_url: Optional[str] = None,
        metadata: Optional[dict] = None,
        trial_days: Optional[int] = None,
    ) -> PaymentResult:
        try:
            session_data = {
                "mode": "payment",
                "payment_method_types": ["card"],
                "line_items": [
                    {
                        "price_data": {
                            "currency": currency.lower(),
                            "product_data": {"name": "Payment"},
                            "unit_amount": int(amount * 100),
                        },
                        "quantity": 1,
                    }
                ],
                "success_url": success_url or f"{settings.FRONTEND_URL}/payment/success",
                "cancel_url": cancel_url or f"{settings.FRONTEND_URL}/payment/cancel",
            }

            if customer_id:
                session_data["customer"] = customer_id
            if metadata:
                session_data["metadata"] = metadata
            if trial_days:
                session_data["subscription_data"] = {
                    "trial_period_days": trial_days,
                }

            session = stripe.checkout.Session.create(**session_data)

            logger.info("stripe_checkout_created", session_id=session.id)

            return PaymentResult(
                success=True,
                payment_id=session.id,
                status="pending",
                checkout_url=session.url,
                metadata={"session_id": session.id},
            )
        except stripe.StripeError as e:
            logger.error("stripe_checkout_error", error=str(e))
            return PaymentResult(success=False, error_message=str(e))

    async def create_subscription(
        self,
        customer_id: str,
        price_id: str,
        trial_days: Optional[int] = None,
        metadata: Optional[dict] = None,
    ) -> PaymentResult:
        try:
            subscription_data = {
                "customer": customer_id,
                "items": [{"price": price_id}],
                "payment_behavior": "default_incomplete",
                "expand": ["latest_invoice.payment_intent"],
            }

            if trial_days:
                subscription_data["trial_period_days"] = trial_days
            if metadata:
                subscription_data["metadata"] = metadata

            subscription = stripe.Subscription.create(**subscription_data)

            client_secret = None
            if subscription.latest_invoice and hasattr(subscription.latest_invoice, 'payment_intent'):
                client_secret = subscription.latest_invoice.payment_intent.client_secret

            logger.info("stripe_subscription_created", subscription_id=subscription.id)

            return PaymentResult(
                success=True,
                payment_id=subscription.id,
                status="pending",
                client_secret=client_secret,
                metadata={"subscription_id": subscription.id},
            )
        except stripe.StripeError as e:
            logger.error("stripe_subscription_error", error=str(e))
            return PaymentResult(success=False, error_message=str(e))

    async def create_payment_intent(
        self,
        amount: float,
        currency: str,
        customer_id: Optional[str] = None,
        payment_method_id: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> PaymentResult:
        try:
            intent_data = {
                "amount": int(amount * 100),
                "currency": currency.lower(),
            }

            if customer_id:
                intent_data["customer"] = customer_id
            if payment_method_id:
                intent_data["payment_method"] = payment_method_id
                intent_data["confirm"] = True
            if metadata:
                intent_data["metadata"] = metadata

            intent = stripe.PaymentIntent.create(**intent_data)

            logger.info("stripe_intent_created", intent_id=intent.id)

            return PaymentResult(
                success=True,
                payment_id=intent.id,
                status=intent.status,
                client_secret=intent.client_secret,
            )
        except stripe.StripeError as e:
            logger.error("stripe_intent_error", error=str(e))
            return PaymentResult(success=False, error_message=str(e))

    async def confirm_payment(
        self,
        payment_intent_id: str,
        payment_method_id: Optional[str] = None,
    ) -> PaymentResult:
        try:
            confirm_data = {}
            if payment_method_id:
                confirm_data["payment_method"] = payment_method_id

            intent = stripe.PaymentIntent.confirm(payment_intent_id, **confirm_data)

            return PaymentResult(
                success=intent.status == "succeeded",
                payment_id=intent.id,
                status=intent.status,
                client_secret=intent.client_secret,
            )
        except stripe.StripeError as e:
            logger.error("stripe_confirm_error", error=str(e))
            return PaymentResult(success=False, error_message=str(e))

    async def create_refund(
        self,
        payment_id: str,
        amount: Optional[float] = None,
        reason: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> RefundResult:
        try:
            refund_data = {"payment_intent": payment_id}

            if amount:
                refund_data["amount"] = int(amount * 100)
            if reason:
                refund_data["reason"] = reason
            if metadata:
                refund_data["metadata"] = metadata

            refund = stripe.Refund.create(**refund_data)

            logger.info("stripe_refund_created", refund_id=refund.id)

            return RefundResult(
                success=True,
                refund_id=refund.id,
                status=refund.status,
                amount=refund.amount / 100,
            )
        except stripe.StripeError as e:
            logger.error("stripe_refund_error", error=str(e))
            return RefundResult(success=False, error_message=str(e))

    async def cancel_subscription(
        self,
        subscription_id: str,
        immediate: bool = False,
    ) -> bool:
        try:
            if immediate:
                stripe.Subscription.delete(subscription_id)
            else:
                stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True,
                )

            logger.info("stripe_subscription_cancelled", subscription_id=subscription_id)
            return True
        except stripe.StripeError as e:
            logger.error("stripe_cancel_error", error=str(e))
            return False

    async def retrieve_subscription(
        self,
        subscription_id: str,
    ) -> Optional[dict]:
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            return {
                "id": subscription.id,
                "status": subscription.status,
                "current_period_end": subscription.current_period_end,
                "cancel_at_period_end": subscription.cancel_at_period_end,
            }
        except stripe.StripeError as e:
            logger.error("stripe_retrieve_sub_error", error=str(e))
            return None

    async def create_invoice(
        self,
        customer_id: str,
        amount: float,
        currency: str,
        description: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> PaymentResult:
        try:
            invoice = stripe.Invoice.create(
                customer=customer_id,
                auto_advance=True,
            )

            stripe.InvoiceItem.create(
                customer=customer_id,
                amount=int(amount * 100),
                currency=currency.lower(),
                description=description,
                invoice=invoice.id,
            )

            finalized_invoice = stripe.Invoice.finalize_invoice(invoice.id)

            logger.info("stripe_invoice_created", invoice_id=finalized_invoice.id)

            return PaymentResult(
                success=True,
                payment_id=finalized_invoice.id,
                status="pending",
                metadata={"invoice_id": finalized_invoice.id},
            )
        except stripe.StripeError as e:
            logger.error("stripe_invoice_error", error=str(e))
            return PaymentResult(success=False, error_message=str(e))

    async def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str,
        secret: str,
    ) -> bool:
        try:
            stripe.Webhook.construct_event(payload, signature, secret)
            return True
        except (stripe.error.SignatureVerificationError, ValueError):
            return False

    async def get_payment_method(
        self,
        payment_method_id: str,
    ) -> Optional[dict]:
        try:
            pm = stripe.PaymentMethod.retrieve(payment_method_id)
            return {
                "id": pm.id,
                "type": pm.type,
                "card": {
                    "brand": pm.card.brand,
                    "last4": pm.card.last4,
                    "exp_month": pm.card.exp_month,
                    "exp_year": pm.card.exp_year,
                } if pm.card else None,
            }
        except stripe.StripeError as e:
            logger.error("stripe_get_pm_error", error=str(e))
            return None

    async def list_payment_methods(
        self,
        customer_id: str,
    ) -> list[dict]:
        try:
            methods = stripe.PaymentMethod.list(
                customer=customer_id,
                type="card",
            )

            return [
                {
                    "id": pm.id,
                    "type": pm.type,
                    "brand": pm.card.brand if pm.card else None,
                    "last4": pm.card.last4 if pm.card else None,
                    "exp_month": pm.card.exp_month if pm.card else None,
                    "exp_year": pm.card.exp_year if pm.card else None,
                }
                for pm in methods.data
            ]
        except stripe.StripeError as e:
            logger.error("stripe_list_pm_error", error=str(e))
            return []
