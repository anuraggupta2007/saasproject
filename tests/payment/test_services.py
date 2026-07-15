import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone, timedelta

from src.modules.payment.services.payment_service import PaymentService
from src.modules.payment.services.invoice_service import InvoiceService
from src.modules.payment.services.coupon_service import CouponService
from src.modules.payment.services.refund_service import RefundService
from src.modules.payment.services.webhook_service import WebhookService
from src.modules.payment.models.payment import PaymentStatus
from src.modules.payment.models.coupon import CouponType, CouponStatus


@pytest.fixture
def mock_session():
    return AsyncMock()


@pytest.fixture
def payment_service(mock_session):
    return PaymentService(mock_session)


@pytest.fixture
def invoice_service(mock_session):
    return InvoiceService(mock_session)


@pytest.fixture
def coupon_service(mock_session):
    return CouponService(mock_session)


@pytest.fixture
def webhook_service(mock_session):
    return WebhookService(mock_session)


class TestPaymentService:
    @pytest.mark.asyncio
    async def test_create_payment(self, payment_service):
        user_id = uuid.uuid4()

        mock_payment = MagicMock()
        mock_payment.id = uuid.uuid4()
        mock_payment.status = PaymentStatus.PENDING

        payment_service.payment_repo.create = AsyncMock(return_value=mock_payment)
        payment_service.transaction_repo.create_transaction = AsyncMock()

        result = await payment_service.create_payment(
            user_id=user_id,
            amount=99.99,
            currency="USD",
            payment_method="card",
            provider="stripe",
        )

        assert result["success"] is True
        assert "payment_id" in result

    @pytest.mark.asyncio
    async def test_create_payment_idempotency(self, payment_service):
        user_id = uuid.uuid4()
        idempotency_key = "test-key-123"

        mock_payment = MagicMock()
        mock_payment.id = uuid.uuid4()
        mock_payment.status = PaymentStatus.SUCCEEDED

        payment_service.payment_repo.get_by_idempotency_key = AsyncMock(return_value=mock_payment)

        result = await payment_service.create_payment(
            user_id=user_id,
            amount=99.99,
            currency="USD",
            payment_method="card",
            provider="stripe",
            idempotency_key=idempotency_key,
        )

        assert result["success"] is True
        assert result["message"] == "Payment already exists"

    @pytest.mark.asyncio
    async def test_verify_payment(self, payment_service):
        payment_id = uuid.uuid4()

        mock_payment = MagicMock()
        mock_payment.id = payment_id
        mock_payment.status = PaymentStatus.SUCCEEDED
        mock_payment.amount = 99.99
        mock_payment.currency = "USD"

        payment_service.payment_repo.get_by_id = AsyncMock(return_value=mock_payment)

        result = await payment_service.verify_payment(payment_id)

        assert result["valid"] is True
        assert result["payment_id"] == payment_id


class TestInvoiceService:
    @pytest.mark.asyncio
    async def test_create_invoice(self, invoice_service):
        user_id = uuid.uuid4()

        mock_invoice = MagicMock()
        mock_invoice.id = uuid.uuid4()
        mock_invoice.invoice_number = "INV-202401-00001"
        mock_invoice.subtotal = 100.00
        mock_invoice.tax_amount = 10.00
        mock_invoice.total_amount = 110.00

        invoice_service.invoice_repo.generate_invoice_number = AsyncMock(return_value="INV-202401-00001")
        invoice_service.invoice_repo.create = AsyncMock(return_value=mock_invoice)

        invoice = await invoice_service.create_invoice(
            user_id=user_id,
            line_items=[{"description": "Test", "amount": 100.00, "quantity": 1}],
            tax_rate=10,
        )

        assert invoice is not None
        assert invoice.invoice_number == "INV-202401-00001"

    @pytest.mark.asyncio
    async def test_calculate_tax(self, invoice_service):
        result = await invoice_service.calculate_tax(
            amount=100.00,
            tax_rate=10,
            tax_type="vat",
        )

        assert result["subtotal"] == 100.00
        assert result["tax_rate"] == 10
        assert result["tax_amount"] == 10.00
        assert result["total"] == 110.00


class TestCouponService:
    @pytest.mark.asyncio
    async def test_validate_coupon_valid(self, coupon_service):
        mock_coupon = MagicMock()
        mock_coupon.id = uuid.uuid4()
        mock_coupon.status = CouponStatus.ACTIVE
        mock_coupon.coupon_type = CouponType.PERCENTAGE
        mock_coupon.value = 20
        mock_coupon.min_purchase_amount = None
        mock_coupon.starts_at = None
        mock_coupon.expires_at = None

        coupon_service.coupon_repo.validate_coupon = AsyncMock(
            return_value=(mock_coupon, "Valid")
        )

        result = await coupon_service.validate_coupon(
            code="SAVE20",
            user_id=uuid.uuid4(),
            amount=100.00,
        )

        assert result["valid"] is True
        assert result["discount_amount"] == 20.0

    @pytest.mark.asyncio
    async def test_validate_coupon_invalid(self, coupon_service):
        coupon_service.coupon_repo.validate_coupon = AsyncMock(
            return_value=(None, "Coupon not found")
        )

        result = await coupon_service.validate_coupon(
            code="INVALID",
            user_id=uuid.uuid4(),
            amount=100.00,
        )

        assert result["valid"] is False
        assert result["message"] == "Coupon not found"

    def test_calculate_discount_percentage(self, coupon_service):
        mock_coupon = MagicMock()
        mock_coupon.coupon_type.value = "percentage"
        mock_coupon.value = 20
        mock_coupon.min_purchase_amount = None

        from src.modules.payment.models.coupon import CouponType
        mock_coupon.coupon_type = CouponType.PERCENTAGE

        discount = coupon_service.calculate_discount(mock_coupon, 100.00)

        assert discount == 20.0

    def test_calculate_discount_fixed(self, coupon_service):
        mock_coupon = MagicMock()

        from src.modules.payment.models.coupon import CouponType
        mock_coupon.coupon_type = CouponType.FIXED_AMOUNT
        mock_coupon.value = 15
        mock_coupon.min_purchase_amount = None

        discount = coupon_service.calculate_discount(mock_coupon, 100.00)

        assert discount == 15.0


class TestWebhookService:
    @pytest.mark.asyncio
    async def test_process_webhook_duplicate(self, webhook_service):
        mock_event = MagicMock()
        mock_event.id = uuid.uuid4()

        webhook_service.webhook_repo.is_duplicate = AsyncMock(return_value=True)

        result = await webhook_service.process_webhook(
            provider="stripe",
            event_type="payment_intent.succeeded",
            provider_event_id="evt_123",
            payload={},
        )

        assert result["success"] is True
        assert result["message"] == "Duplicate event skipped"
