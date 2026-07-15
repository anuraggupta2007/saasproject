import razorpay
from typing import Optional
import hashlib
import hmac

from src.core.config import settings
from src.core.logging import get_logger
from src.modules.payment.providers.base import (
    PaymentProviderBase,
    PaymentResult,
    RefundResult,
    CustomerResult,
)

logger = get_logger(__name__)


class RazorpayProvider(PaymentProviderBase):
    def __init__(self):
        self.client = razorpay.Client(auth=(
            settings.RAZORPAY_KEY_ID,
            settings.RAZORPAY_KEY_SECRET,
        ))
        self.webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET

    async def create_customer(
        self,
        email: str,
        name: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> CustomerResult:
        try:
            contact_data = {
                "email": email,
            }
            if name:
                contact_data["name"] = name
            if metadata:
                contact_data["notes"] = metadata

            customer = self.client.customer.create(contact_data)

            logger.info("razorpay_customer_created", customer_id=customer["id"])

            return CustomerResult(
                success=True,
                customer_id=customer["id"],
                email=email,
            )
        except Exception as e:
            logger.error("razorpay_customer_error", error=str(e))
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
            order_data = {
                "amount": int(amount * 100),
                "currency": currency.upper(),
                "receipt": metadata.get("receipt") if metadata else None,
            }

            if metadata:
                order_data["notes"] = metadata

            order = self.client.order.create(order_data)

            logger.info("razorpay_order_created", order_id=order["id"])

            return PaymentResult(
                success=True,
                payment_id=order["id"],
                status="pending",
                checkout_url=f"{settings.FRONTEND_URL}/payment/razorpay?order_id={order['id']}",
                metadata={"order_id": order["id"]},
            )
        except Exception as e:
            logger.error("razorpay_checkout_error", error=str(e))
            return PaymentResult(success=False, error_message=str(e))

    async def create_subscription(
        self,
        customer_id: str,
        price_id: str,
        trial_days: Optional[int] = None,
        metadata: Optional[dict] = None,
    ) -> PaymentResult:
        try:
            plan = self.client.plan.create({
                "amount": int(float(price_id) * 100),
                "currency": "INR",
                "interval": 1,
                "interval_unit": "month",
            })

            subscription_data = {
                "plan_id": plan["id"],
                "customer_id": customer_id,
            }

            if trial_days:
                subscription_data["trial_days"] = trial_days
            if metadata:
                subscription_data["notes"] = metadata

            subscription = self.client.subscription.create(subscription_data)

            logger.info("razorpay_subscription_created", subscription_id=subscription["id"])

            return PaymentResult(
                success=True,
                payment_id=subscription["id"],
                status="pending",
                metadata={"subscription_id": subscription["id"]},
            )
        except Exception as e:
            logger.error("razorpay_subscription_error", error=str(e))
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
            order_data = {
                "amount": int(amount * 100),
                "currency": currency.upper(),
            }

            if metadata:
                order_data["notes"] = metadata

            order = self.client.order.create(order_data)

            return PaymentResult(
                success=True,
                payment_id=order["id"],
                status="created",
                client_secret=order["id"],
            )
        except Exception as e:
            logger.error("razorpay_intent_error", error=str(e))
            return PaymentResult(success=False, error_message=str(e))

    async def confirm_payment(
        self,
        payment_intent_id: str,
        payment_method_id: Optional[str] = None,
    ) -> PaymentResult:
        try:
            payment = self.client.payment.fetch(payment_intent_id)

            return PaymentResult(
                success=payment["status"] == "captured",
                payment_id=payment["id"],
                status=payment["status"],
            )
        except Exception as e:
            logger.error("razorpay_confirm_error", error=str(e))
            return PaymentResult(success=False, error_message=str(e))

    async def create_refund(
        self,
        payment_id: str,
        amount: Optional[float] = None,
        reason: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> RefundResult:
        try:
            refund_data = {}

            if amount:
                refund_data["amount"] = int(amount * 100)
            if reason:
                refund_data["notes"] = {"reason": reason}
            if metadata:
                refund_data["notes"] = {**(refund_data.get("notes", {})), **metadata}

            refund = self.client.payment.refund(payment_id, refund_data)

            logger.info("razorpay_refund_created", refund_id=refund["id"])

            return RefundResult(
                success=True,
                refund_id=refund["id"],
                status=refund["status"],
                amount=refund.get("amount", 0) / 100,
            )
        except Exception as e:
            logger.error("razorpay_refund_error", error=str(e))
            return RefundResult(success=False, error_message=str(e))

    async def cancel_subscription(
        self,
        subscription_id: str,
        immediate: bool = False,
    ) -> bool:
        try:
            if immediate:
                self.client.subscription.cancel(subscription_id)
            else:
                self.client.subscription.update(subscription_id, {
                    "status": "cancelled",
                })

            logger.info("razorpay_subscription_cancelled", subscription_id=subscription_id)
            return True
        except Exception as e:
            logger.error("razorpay_cancel_error", error=str(e))
            return False

    async def retrieve_subscription(
        self,
        subscription_id: str,
    ) -> Optional[dict]:
        try:
            subscription = self.client.subscription.fetch(subscription_id)
            return {
                "id": subscription["id"],
                "status": subscription["status"],
                "current_period_end": subscription.get("current_end"),
            }
        except Exception as e:
            logger.error("razorpay_retrieve_sub_error", error=str(e))
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
            invoice_data = {
                "type": "invoice",
                "customer_id": customer_id,
            }

            invoice = self.client.invoice.create(invoice_data)

            self.client.invoice.create_invoice_item({
                "invoice_id": invoice["id"],
                "customer_id": customer_id,
                "amount": int(amount * 100),
                "currency": currency.upper(),
                "description": description,
            })

            finalized_invoice = self.client.invoice.edit(invoice["id"])

            logger.info("razorpay_invoice_created", invoice_id=finalized_invoice["id"])

            return PaymentResult(
                success=True,
                payment_id=finalized_invoice["id"],
                status="pending",
                metadata={"invoice_id": finalized_invoice["id"]},
            )
        except Exception as e:
            logger.error("razorpay_invoice_error", error=str(e))
            return PaymentResult(success=False, error_message=str(e))

    async def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str,
        secret: str,
    ) -> bool:
        try:
            expected_signature = hmac.new(
                secret.encode(),
                payload,
                hashlib.sha256
            ).hexdigest()

            return hmac.compare_digest(expected_signature, signature)
        except Exception:
            return False

    async def get_payment_method(
        self,
        payment_method_id: str,
    ) -> Optional[dict]:
        try:
            method = self.client.payment.fetch(payment_method_id)
            return {
                "id": method["id"],
                "type": method.get("method"),
                "status": method["status"],
            }
        except Exception as e:
            logger.error("razorpay_get_pm_error", error=str(e))
            return None

    async def list_payment_methods(
        self,
        customer_id: str,
    ) -> list[dict]:
        try:
            tokens = self.client.customer.fetch_tokens(customer_id)
            return [
                {
                    "id": token["id"],
                    "type": token.get("method"),
                    "status": "active",
                }
                for token in tokens.get("items", [])
            ]
        except Exception as e:
            logger.error("razorpay_list_pm_error", error=str(e))
            return []
