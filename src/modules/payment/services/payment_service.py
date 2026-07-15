import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_logger
from src.modules.payment.models.payment import Payment, PaymentStatus, PaymentMethod, PaymentProvider
from src.modules.payment.models.transaction import TransactionType
from src.modules.payment.repositories.payment import PaymentRepository
from src.modules.payment.repositories.transaction import TransactionRepository
from src.modules.payment.providers.stripe_provider import StripeProvider
from src.modules.payment.providers.razorpay_provider import RazorpayProvider

logger = get_logger(__name__)


class PaymentService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.payment_repo = PaymentRepository(session)
        self.transaction_repo = TransactionRepository(session)
        self.providers = {
            PaymentProvider.STRIPE: StripeProvider(),
            PaymentProvider.RAZORPAY: RazorpayProvider(),
        }

    def get_provider(self, provider: PaymentProvider):
        return self.providers.get(provider)

    async def create_payment(
        self,
        user_id: uuid.UUID,
        amount: float,
        currency: str,
        payment_method: PaymentMethod,
        provider: PaymentProvider,
        subscription_id: Optional[uuid.UUID] = None,
        invoice_id: Optional[uuid.UUID] = None,
        description: Optional[str] = None,
        metadata: Optional[dict] = None,
        idempotency_key: Optional[str] = None,
    ) -> dict:
        if idempotency_key:
            existing = await self.payment_repo.get_by_idempotency_key(idempotency_key)
            if existing:
                return {
                    "success": True,
                    "payment_id": existing.id,
                    "status": existing.status.value,
                    "message": "Payment already exists",
                }

        payment = Payment(
            user_id=user_id,
            amount=amount,
            currency=currency,
            payment_method=payment_method,
            provider=provider,
            subscription_id=subscription_id,
            invoice_id=invoice_id,
            description=description,
            metadata_json=metadata or {},
            idempotency_key=idempotency_key,
        )

        payment = await self.payment_repo.create(payment)

        await self.transaction_repo.create_transaction(
            payment_id=payment.id,
            user_id=user_id,
            transaction_type=TransactionType.CHARGE,
            amount=amount,
            currency=currency,
            description=description,
        )

        logger.info(
            "payment_created",
            payment_id=str(payment.id),
            user_id=str(user_id),
            amount=amount,
            currency=currency,
        )

        return {
            "success": True,
            "payment_id": payment.id,
            "status": payment.status.value,
        }

    async def process_payment(
        self,
        payment_id: uuid.UUID,
        customer_id: Optional[str] = None,
    ) -> dict:
        payment = await self.payment_repo.get_by_id(payment_id)
        if not payment:
            return {"success": False, "message": "Payment not found"}

        provider = self.get_provider(payment.provider)
        if not provider:
            return {"success": False, "message": "Payment provider not configured"}

        await self.payment_repo.update_status(payment_id, PaymentStatus.PROCESSING)

        result = await provider.create_payment_intent(
            amount=float(payment.amount),
            currency=payment.currency,
            customer_id=customer_id,
            metadata=payment.metadata_json,
        )

        if result.success:
            await self.payment_repo.update_status(
                payment_id,
                PaymentStatus.SUCCEEDED,
                provider_payment_id=result.payment_id,
            )

            logger.info("payment_succeeded", payment_id=str(payment_id))
        else:
            await self.payment_repo.update_status(
                payment_id,
                PaymentStatus.FAILED,
            )
            payment.failure_reason = result.error_message
            await self.session.commit()

            logger.error("payment_failed", payment_id=str(payment_id), error=result.error_message)

        return {
            "success": result.success,
            "payment_id": payment.id,
            "status": payment.status.value,
            "client_secret": result.client_secret,
            "error_message": result.error_message,
        }

    async def verify_payment(
        self,
        payment_id: uuid.UUID,
        provider_payment_id: Optional[str] = None,
    ) -> dict:
        payment = await self.payment_repo.get_by_id(payment_id)
        if not payment:
            return {"valid": False, "message": "Payment not found"}

        if payment.status == PaymentStatus.SUCCEEDED:
            return {
                "valid": True,
                "payment_id": payment.id,
                "amount": float(payment.amount),
                "currency": payment.currency,
            }

        if provider_payment_id:
            provider = self.get_provider(payment.provider)
            if provider:
                result = await provider.confirm_payment(provider_payment_id)
                if result.success:
                    await self.payment_repo.update_status(
                        payment_id,
                        PaymentStatus.SUCCEEDED,
                        provider_payment_id=provider_payment_id,
                    )
                    return {"valid": True, "payment_id": payment.id}

        return {"valid": False, "message": "Payment not verified"}

    async def get_payment(self, payment_id: uuid.UUID) -> Optional[Payment]:
        return await self.payment_repo.get_by_id(payment_id)

    async def list_user_payments(
        self,
        user_id: uuid.UUID,
        status: Optional[PaymentStatus] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Payment], int]:
        return await self.payment_repo.get_user_payments(
            user_id, status=status, page=page, page_size=page_size
        )

    async def get_user_payment_history(
        self,
        user_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Payment], int]:
        return await self.payment_repo.get_user_payments(user_id, page=page, page_size=page_size)

    async def get_payment_stats(self, user_id: Optional[uuid.UUID] = None) -> dict:
        status_counts = await self.payment_repo.count_by_status(user_id)
        return {
            "total": sum(status_counts.values()),
            "by_status": status_counts,
        }
