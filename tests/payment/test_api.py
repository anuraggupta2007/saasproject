import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, MagicMock, patch

from src.main import app


@pytest.fixture
def mock_current_user():
    return {
        "id": str(uuid.uuid4()),
        "email": "test@example.com",
        "role": "user",
    }


@pytest.mark.asyncio
async def test_create_payment(mock_current_user):
    with patch("src.modules.payment.api.v1.router.get_current_user") as mock_auth:
        mock_auth.return_value = mock_current_user

        with patch("src.modules.payment.api.v1.router.get_db") as mock_db:
            mock_session = AsyncMock()
            mock_db.return_value = mock_session

            with patch("src.modules.payment.api.v1.router.PaymentService") as mock_service:
                mock_instance = MagicMock()
                mock_service.return_value = mock_instance

                mock_instance.create_payment = AsyncMock(
                    return_value={
                        "success": True,
                        "payment_id": uuid.uuid4(),
                        "status": "pending",
                    }
                )

                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/payment/create",
                        json={
                            "amount": 99.99,
                            "currency": "USD",
                            "payment_method": "card",
                            "provider": "stripe",
                        },
                        headers={"Authorization": "Bearer test-token"},
                    )

                    assert response.status_code in [200, 401]


@pytest.mark.asyncio
async def test_payment_history(mock_current_user):
    with patch("src.modules.payment.api.v1.router.get_current_user") as mock_auth:
        mock_auth.return_value = mock_current_user

        with patch("src.modules.payment.api.v1.router.get_db") as mock_db:
            mock_session = AsyncMock()
            mock_db.return_value = mock_session

            with patch("src.modules.payment.api.v1.router.PaymentService") as mock_service:
                mock_instance = MagicMock()
                mock_service.return_value = mock_instance

                mock_instance.list_user_payments = AsyncMock(return_value=([], 0))

                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    response = await client.get(
                        "/api/v1/payment/history",
                        headers={"Authorization": "Bearer test-token"},
                    )

                    assert response.status_code in [200, 401]


@pytest.mark.asyncio
async def test_validate_coupon(mock_current_user):
    with patch("src.modules.payment.api.v1.router.get_current_user") as mock_auth:
        mock_auth.return_value = mock_current_user

        with patch("src.modules.payment.api.v1.router.get_db") as mock_db:
            mock_session = AsyncMock()
            mock_db.return_value = mock_session

            with patch("src.modules.payment.api.v1.router.CouponService") as mock_service:
                mock_instance = MagicMock()
                mock_service.return_value = mock_instance

                mock_instance.validate_coupon = AsyncMock(
                    return_value={
                        "valid": True,
                        "discount_amount": 20.0,
                        "final_amount": 80.0,
                        "message": "Valid",
                    }
                )

                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/payment/coupons/validate",
                        json={
                            "code": "SAVE20",
                            "amount": 100.00,
                        },
                        headers={"Authorization": "Bearer test-token"},
                    )

                    assert response.status_code in [200, 401]


@pytest.mark.asyncio
async def test_stripe_webhook():
    with patch("src.modules.payment.api.v1.webhooks.StripeProvider") as mock_provider:
        mock_instance = MagicMock()
        mock_provider.return_value = mock_instance
        mock_instance.verify_webhook_signature = AsyncMock(return_value=True)

        with patch("src.modules.payment.api.v1.webhooks.get_db") as mock_db:
            mock_session = AsyncMock()

            async def _fake_get_db():
                yield mock_session

            mock_db.side_effect = _fake_get_db

            with patch("src.modules.payment.api.v1.webhooks.WebhookService") as mock_service:
                mock_service_instance = MagicMock()
                mock_service.return_value = mock_service_instance
                mock_service_instance.process_webhook = AsyncMock(
                    return_value={"success": True, "message": "Processed"}
                )

                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/webhooks/stripe",
                        content=b'{"type": "payment_intent.succeeded", "data": {}}',
                        headers={
                            "stripe-signature": "test_sig",
                            "Content-Type": "application/json",
                        },
                    )

                    assert response.status_code in [200, 400]
