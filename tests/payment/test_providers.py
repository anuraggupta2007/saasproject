import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from src.modules.payment.providers.stripe_provider import StripeProvider
from src.modules.payment.providers.razorpay_provider import RazorpayProvider


class TestStripeProvider:
    def setup_method(self):
        self.provider = StripeProvider()

    @pytest.mark.asyncio
    async def test_create_customer(self):
        with patch("stripe.Customer.create") as mock_create:
            mock_create.return_value = MagicMock(
                id="cus_123",
                email="test@example.com",
            )

            result = await self.provider.create_customer(
                email="test@example.com",
                name="Test User",
            )

            assert result.success is True
            assert result.customer_id == "cus_123"

    @pytest.mark.asyncio
    async def test_create_checkout_session(self):
        with patch("stripe.checkout.Session.create") as mock_create:
            mock_create.return_value = MagicMock(
                id="cs_123",
                url="https://checkout.stripe.com/123",
            )

            result = await self.provider.create_checkout_session(
                amount=99.99,
                currency="USD",
            )

            assert result.success is True
            assert result.checkout_url == "https://checkout.stripe.com/123"

    @pytest.mark.asyncio
    async def test_create_refund(self):
        with patch("stripe.Refund.create") as mock_create:
            mock_create.return_value = MagicMock(
                id="re_123",
                status="succeeded",
                amount=5000,
            )

            result = await self.provider.create_refund(
                payment_id="pi_123",
                amount=50.00,
            )

            assert result.success is True
            assert result.refund_id == "re_123"

    @pytest.mark.asyncio
    async def test_cancel_subscription(self):
        with patch("stripe.Subscription.modify") as mock_modify:
            mock_modify.return_value = MagicMock()

            result = await self.provider.cancel_subscription(
                subscription_id="sub_123",
                immediate=False,
            )

            assert result is True

    @pytest.mark.asyncio
    async def test_verify_webhook_signature(self):
        with patch("stripe.Webhook.construct_event") as mock_construct:
            mock_construct.return_value = MagicMock()

            result = await self.provider.verify_webhook_signature(
                payload=b"test",
                signature="test_sig",
                secret="test_secret",
            )

            assert result is True


class TestRazorpayProvider:
    def setup_method(self):
        self.provider = RazorpayProvider()

    @pytest.mark.asyncio
    async def test_create_customer(self):
        with patch.object(self.provider.client.customer, "create") as mock_create:
            mock_create.return_value = {"id": "cnt_123"}

            result = await self.provider.create_customer(
                email="test@example.com",
                name="Test User",
            )

            assert result.success is True
            assert result.customer_id == "cnt_123"

    @pytest.mark.asyncio
    async def test_create_checkout_session(self):
        with patch.object(self.provider.client.order, "create") as mock_create:
            mock_create.return_value = {"id": "order_123"}

            result = await self.provider.create_checkout_session(
                amount=99.99,
                currency="INR",
            )

            assert result.success is True
            assert result.payment_id == "order_123"

    @pytest.mark.asyncio
    async def test_create_refund(self):
        with patch.object(self.provider.client.payment, "refund") as mock_refund:
            mock_refund.return_value = {
                "id": "rfnd_123",
                "status": "processed",
                "amount": 5000,
            }

            result = await self.provider.create_refund(
                payment_id="pay_123",
                amount=50.00,
            )

            assert result.success is True
            assert result.refund_id == "rfnd_123"

    @pytest.mark.asyncio
    async def test_cancel_subscription(self):
        with patch.object(self.provider.client.subscription, "cancel") as mock_cancel:
            mock_cancel.return_value = MagicMock()

            result = await self.provider.cancel_subscription(
                subscription_id="sub_123",
                immediate=True,
            )

            assert result is True
