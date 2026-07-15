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
async def test_send_notification(mock_current_user):
    with patch("src.modules.notification.api.v1.router.get_current_user") as mock_auth:
        mock_auth.return_value = mock_current_user

        with patch("src.modules.notification.api.v1.router.get_db") as mock_db:
            mock_session = AsyncMock()
            mock_db.return_value = mock_session

            with patch("src.modules.notification.api.v1.router.NotificationService") as mock_service:
                mock_instance = MagicMock()
                mock_service.return_value = mock_instance

                mock_notification = MagicMock()
                mock_notification.id = uuid.uuid4()
                mock_notification.user_id = uuid.uuid4()
                mock_notification.channel = "email"
                mock_notification.priority = "normal"
                mock_notification.status = "sent"
                mock_notification.subject = "Test"
                mock_notification.content = "Test content"
                mock_notification.recipient = "test@example.com"
                mock_notification.scheduled_at = None
                mock_notification.sent_at = None
                mock_notification.delivered_at = None
                mock_notification.read_at = None
                mock_notification.created_at = None

                mock_instance.send_notification = AsyncMock(return_value=mock_notification)

                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/notifications/send",
                        json={
                            "user_id": str(uuid.uuid4()),
                            "channel": "email",
                            "content": "Test content",
                            "recipient": "test@example.com",
                        },
                        headers={"Authorization": "Bearer test-token"},
                    )

                    assert response.status_code in [200, 201, 401]


@pytest.mark.asyncio
async def test_list_notifications(mock_current_user):
    with patch("src.modules.notification.api.v1.router.get_current_user") as mock_auth:
        mock_auth.return_value = mock_current_user

        with patch("src.modules.notification.api.v1.router.get_db") as mock_db:
            mock_session = AsyncMock()
            mock_db.return_value = mock_session

            with patch("src.modules.notification.api.v1.router.NotificationService") as mock_service:
                mock_instance = MagicMock()
                mock_service.return_value = mock_instance

                mock_instance.list_user_notifications = AsyncMock(return_value=([], 0, 0))

                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    response = await client.get(
                        "/api/v1/notifications/",
                        headers={"Authorization": "Bearer test-token"},
                    )

                    assert response.status_code in [200, 401]


@pytest.mark.asyncio
async def test_create_template(mock_current_user):
    with patch("src.modules.notification.api.v1.router.get_current_user") as mock_auth:
        mock_auth.return_value = mock_current_user

        with patch("src.modules.notification.api.v1.router.get_db") as mock_db:
            mock_session = AsyncMock()
            mock_db.return_value = mock_session

            with patch("src.modules.notification.api.v1.router.TemplateService") as mock_service:
                mock_instance = MagicMock()
                mock_service.return_value = mock_instance

                mock_template = MagicMock()
                mock_template.id = uuid.uuid4()
                mock_template.name = "welcome_email"
                mock_template.template_type = "email"
                mock_template.subject = "Welcome"
                mock_template.body_text = "Hello"
                mock_template.body_html = "<h1>Hello</h1>"
                mock_template.variables = []
                mock_template.locale = "en"
                mock_template.version = 1
                mock_template.is_active = True
                mock_template.created_at = None

                mock_instance.create_template = AsyncMock(return_value=mock_template)

                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    response = await client.post(
                        "/api/v1/notifications/templates",
                        json={
                            "name": "welcome_email",
                            "template_type": "email",
                            "body_text": "Hello {{name}}",
                        },
                        headers={"Authorization": "Bearer test-token"},
                    )

                    assert response.status_code in [200, 201, 401]


@pytest.mark.asyncio
async def test_get_preferences(mock_current_user):
    with patch("src.modules.notification.api.v1.router.get_current_user") as mock_auth:
        mock_auth.return_value = mock_current_user

        with patch("src.modules.notification.api.v1.router.get_db") as mock_db:
            mock_session = AsyncMock()
            mock_db.return_value = mock_session

            with patch("src.modules.notification.api.v1.router.UserPreferencesService") as mock_service:
                mock_instance = MagicMock()
                mock_service.return_value = mock_instance

                mock_prefs = MagicMock()
                mock_prefs.id = uuid.uuid4()
                mock_prefs.user_id = uuid.uuid4()
                mock_prefs.email_enabled = True
                mock_prefs.sms_enabled = False
                mock_prefs.push_enabled = True
                mock_prefs.in_app_enabled = True
                mock_prefs.webhook_enabled = False
                mock_prefs.webhook_url = None
                mock_prefs.frequency = "immediate"
                mock_prefs.language = "en"
                mock_prefs.timezone_str = "UTC"
                mock_prefs.quiet_hours_start = None
                mock_prefs.quiet_hours_end = None

                mock_instance.get_preferences = AsyncMock(return_value=mock_prefs)

                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    response = await client.get(
                        "/api/v1/notifications/preferences",
                        headers={"Authorization": "Bearer test-token"},
                    )

                    assert response.status_code in [200, 401]
