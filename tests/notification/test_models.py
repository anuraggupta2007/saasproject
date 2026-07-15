import uuid
import pytest
from datetime import datetime, timezone

from src.modules.notification.models.notification import (
    Notification,
    NotificationChannel,
    NotificationStatus,
    NotificationPriority,
)
from src.modules.notification.models.template import (
    NotificationTemplate,
    TemplateType,
    DeliveryLog,
    UserNotificationPreference,
    ProviderConfig,
)


def test_notification_creation():
    notification = Notification(
        user_id=uuid.uuid4(),
        channel=NotificationChannel.EMAIL,
        status=NotificationStatus.PENDING,
        subject="Test Subject",
        content="Test content",
        recipient="test@example.com",
    )

    assert notification.user_id is not None
    assert notification.channel == NotificationChannel.EMAIL
    assert notification.status == NotificationStatus.PENDING
    assert notification.subject == "Test Subject"


def test_template_creation():
    template = NotificationTemplate(
        name="welcome_email",
        template_type=TemplateType.EMAIL,
        subject="Welcome {{name}}",
        body_text="Hello {{name}}, welcome to our platform!",
        body_html="<h1>Hello {{name}}</h1><p>Welcome to our platform!</p>",
        variables=["name"],
    )

    assert template.name == "welcome_email"
    assert template.template_type == TemplateType.EMAIL
    assert "name" in template.variables


def test_delivery_log_creation():
    log = DeliveryLog(
        notification_id=uuid.uuid4(),
        channel="email",
        provider="sendgrid",
        status="sent",
        provider_message_id="msg_123",
    )

    assert log.channel == "email"
    assert log.provider == "sendgrid"
    assert log.status == "sent"


def test_user_preferences_creation():
    prefs = UserNotificationPreference(
        user_id=uuid.uuid4(),
        email_enabled=True,
        sms_enabled=False,
        push_enabled=True,
        in_app_enabled=True,
        frequency="immediate",
        language="en",
        timezone_str="UTC",
    )

    assert prefs.email_enabled is True
    assert prefs.sms_enabled is False
    assert prefs.frequency == "immediate"


def test_provider_config_creation():
    config = ProviderConfig(
        provider_type="email",
        provider_name="sendgrid",
        config={"api_key": "test-key"},
        is_active=True,
        is_default=True,
        priority=10,
    )

    assert config.provider_type == "email"
    assert config.provider_name == "sendgrid"
    assert config.is_default is True


def test_notification_channel_enum():
    assert NotificationChannel.EMAIL == "email"
    assert NotificationChannel.SMS == "sms"
    assert NotificationChannel.PUSH == "push"
    assert NotificationChannel.IN_APP == "in_app"
    assert NotificationChannel.WEBHOOK == "webhook"


def test_notification_status_enum():
    assert NotificationStatus.PENDING == "pending"
    assert NotificationStatus.QUEUED == "queued"
    assert NotificationStatus.SENT == "sent"
    assert NotificationStatus.DELIVERED == "delivered"
    assert NotificationStatus.FAILED == "failed"


def test_notification_priority_enum():
    assert NotificationPriority.LOW == "low"
    assert NotificationPriority.NORMAL == "normal"
    assert NotificationPriority.HIGH == "high"
    assert NotificationPriority.URGENT == "urgent"


def test_template_type_enum():
    assert TemplateType.EMAIL == "email"
    assert TemplateType.SMS == "sms"
    assert TemplateType.PUSH == "push"
    assert TemplateType.IN_APP == "in_app"
