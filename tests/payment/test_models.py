import uuid
import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from src.modules.payment.models.payment import Payment, PaymentStatus, PaymentMethod, PaymentProvider
from src.modules.payment.models.transaction import Transaction, TransactionType, TransactionStatus
from src.modules.payment.models.invoice import Invoice, InvoiceStatus
from src.modules.payment.models.coupon import Coupon, CouponUsage, CouponType, CouponStatus
from src.modules.payment.models.refund import Refund, RefundStatus, RefundReason
from src.modules.payment.models.webhook_event import WebhookEvent, WebhookEventStatus
from src.modules.payment.models.billing_address import BillingAddress


def test_payment_creation():
    payment = Payment(
        user_id=uuid.uuid4(),
        amount=Decimal("99.99"),
        currency="USD",
        status=PaymentStatus.PENDING,
        payment_method=PaymentMethod.CARD,
        provider=PaymentProvider.STRIPE,
    )

    assert payment.user_id is not None
    assert payment.amount == Decimal("99.99")
    assert payment.currency == "USD"
    assert payment.status == PaymentStatus.PENDING
    assert payment.provider == PaymentProvider.STRIPE


def test_transaction_creation():
    transaction = Transaction(
        payment_id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        type=TransactionType.CHARGE,
        status=TransactionStatus.COMPLETED,
        amount=Decimal("99.99"),
        currency="USD",
    )

    assert transaction.type == TransactionType.CHARGE
    assert transaction.status == TransactionStatus.COMPLETED


def test_invoice_creation():
    invoice = Invoice(
        user_id=uuid.uuid4(),
        invoice_number="INV-202401-00001",
        status=InvoiceStatus.PENDING,
        subtotal=Decimal("100.00"),
        tax_amount=Decimal("10.00"),
        total_amount=Decimal("110.00"),
        currency="USD",
    )

    assert invoice.invoice_number == "INV-202401-00001"
    assert invoice.subtotal == Decimal("100.00")
    assert invoice.tax_amount == Decimal("10.00")
    assert invoice.total_amount == Decimal("110.00")


def test_coupon_creation():
    coupon = Coupon(
        code="SAVE20",
        name="20% Off",
        coupon_type=CouponType.PERCENTAGE,
        value=Decimal("20"),
        max_uses=100,
    )

    assert coupon.code == "SAVE20"
    assert coupon.coupon_type == CouponType.PERCENTAGE
    assert coupon.value == Decimal("20")


def test_refund_creation():
    refund = Refund(
        payment_id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        amount=Decimal("50.00"),
        currency="USD",
        status=RefundStatus.PENDING,
        reason=RefundReason.REQUESTED_BY_CUSTOMER,
    )

    assert refund.amount == Decimal("50.00")
    assert refund.reason == RefundReason.REQUESTED_BY_CUSTOMER


def test_webhook_event_creation():
    event = WebhookEvent(
        provider="stripe",
        event_type="payment_intent.succeeded",
        provider_event_id="evt_123",
        payload={"type": "payment_intent.succeeded"},
        status=WebhookEventStatus.PENDING,
    )

    assert event.provider == "stripe"
    assert event.event_type == "payment_intent.succeeded"
    assert event.status == WebhookEventStatus.PENDING


def test_billing_address_creation():
    address = BillingAddress(
        user_id=uuid.uuid4(),
        line1="123 Main St",
        city="New York",
        state="NY",
        postal_code="10001",
        country="US",
    )

    assert address.line1 == "123 Main St"
    assert address.city == "New York"
    assert address.country == "US"


def test_payment_status_enum():
    assert PaymentStatus.PENDING == "pending"
    assert PaymentStatus.SUCCEEDED == "succeeded"
    assert PaymentStatus.FAILED == "failed"
    assert PaymentStatus.REFUNDED == "refunded"


def test_coupon_type_enum():
    assert CouponType.PERCENTAGE == "percentage"
    assert CouponType.FIXED_AMOUNT == "fixed_amount"
    assert CouponType.FREE_TRIAL == "free_trial"


def test_invoice_status_enum():
    assert InvoiceStatus.DRAFT == "draft"
    assert InvoiceStatus.PENDING == "pending"
    assert InvoiceStatus.PAID == "paid"
    assert InvoiceStatus.OVERDUE == "overdue"
