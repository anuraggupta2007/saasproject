import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

from src.modules.notification.services.notification_service import NotificationService
from src.modules.notification.services.template_service import TemplateService, UserPreferencesService
from src.modules.notification.models.notification import NotificationChannel, NotificationPriority


@pytest.fixture
def mock_session():
    return AsyncMock()


@pytest.fixture
def notification_service(mock_session):
    return NotificationService(mock_session)


@pytest.fixture
def template_service(mock_session):
    return TemplateService(mock_session)


@pytest.fixture
def prefs_service(mock_session):
    return UserPreferencesService(mock_session)


class TestNotificationService:
    @pytest.mark.asyncio
    async def test_send_notification(self, notification_service):
        mock_notification = MagicMock()
        mock_notification.id = uuid.uuid4()
        mock_notification.status = "sent"

        notification_service.prefs_repo.get_or_create = AsyncMock(return_value=MagicMock(
            email_enabled=True,
            sms_enabled=True,
            push_enabled=True,
            in_app_enabled=True,
            quiet_hours_start=None,
            quiet_hours_end=None,
            language="en",
            timezone_str="UTC",
        ))
        notification_service.prefs_repo.is_channel_enabled = AsyncMock(return_value=True)
        notification_service.prefs_repo.is_quiet_hours = AsyncMock(return_value=False)
        notification_service.notification_repo.create = AsyncMock(return_value=mock_notification)
        notification_service._process_notification = AsyncMock(return_value=True)

        notification = await notification_service.send_notification(
            user_id=uuid.uuid4(),
            channel=NotificationChannel.EMAIL,
            content="Test content",
            subject="Test",
            recipient="test@example.com",
        )

        assert notification is not None
        notification_service.notification_repo.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_mark_as_read(self, notification_service):
        notification_service.notification_repo.mark_as_read = AsyncMock(return_value=3)

        count = await notification_service.mark_as_read(
            user_id=uuid.uuid4(),
            notification_ids=[uuid.uuid4(), uuid.uuid4(), uuid.uuid4()],
        )

        assert count == 3

    @pytest.mark.asyncio
    async def test_get_notification_stats(self, notification_service):
        notification_service.notification_repo.count_by_status = AsyncMock(
            return_value={"sent": 100, "failed": 5}
        )
        notification_service.notification_repo.count_by_channel = AsyncMock(
            return_value={"email": 80, "sms": 20}
        )
        notification_service.notification_repo.get_delivery_stats = AsyncMock(
            return_value={"total_sent": 100, "total_delivered": 95, "delivery_rate": 95.0}
        )

        stats = await notification_service.get_notification_stats()

        assert "by_status" in stats
        assert "by_channel" in stats
        assert "delivery_rate" in stats


class TestTemplateService:
    @pytest.mark.asyncio
    async def test_create_template(self, template_service):
        mock_template = MagicMock()
        mock_template.id = uuid.uuid4()
        mock_template.name = "welcome_email"

        template_service.template_repo.create = AsyncMock(return_value=mock_template)

        template = await template_service.create_template(
            name="welcome_email",
            template_type="email",
            body_text="Hello {{name}}",
            subject="Welcome",
        )

        assert template is not None
        template_service.template_repo.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_preview_template(self, template_service):
        mock_template = MagicMock()
        mock_template.subject = "Welcome {{name}}"
        mock_template.body_text = "Hello {{name}}, welcome!"
        mock_template.body_html = "<h1>Hello {{name}}</h1>"

        template_service.template_repo.get_by_name_and_locale = AsyncMock(
            return_value=mock_template
        )

        result = await template_service.preview_template(
            name="welcome_email",
            variables={"name": "John"},
        )

        assert result["subject"] == "Welcome John"
        assert result["body_text"] == "Hello John, welcome!"
        assert "John" in result["body_html"]

    def test_render_template(self, template_service):
        template = "Hello {{name}}, your code is {{code}}"
        variables = {"name": "John", "code": "123456"}

        result = template_service._render(template, variables)

        assert result == "Hello John, your code is 123456"


class TestUserPreferencesService:
    @pytest.mark.asyncio
    async def test_get_preferences(self, prefs_service):
        mock_prefs = MagicMock()
        mock_prefs.user_id = uuid.uuid4()
        mock_prefs.email_enabled = True

        prefs_service.prefs_repo.get_or_create = AsyncMock(return_value=mock_prefs)

        prefs = await prefs_service.get_preferences(uuid.uuid4())

        assert prefs is not None
        assert prefs.email_enabled is True

    @pytest.mark.asyncio
    async def test_update_preferences(self, prefs_service):
        mock_prefs = MagicMock()
        mock_prefs.user_id = uuid.uuid4()
        mock_prefs.email_enabled = False

        prefs_service.prefs_repo.get_or_create = AsyncMock(return_value=mock_prefs)
        prefs_service.session.commit = AsyncMock()

        prefs = await prefs_service.update_preferences(
            user_id=uuid.uuid4(),
            email_enabled=False,
        )

        assert prefs.email_enabled is False
