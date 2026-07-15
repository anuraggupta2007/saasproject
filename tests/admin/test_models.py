import uuid
import pytest
from datetime import datetime, timezone

from src.modules.admin.models.admin import (
    AdminUser,
    AdminRole,
    AdminPermission,
    SystemEvent,
    DashboardMetric,
    Announcement,
)


def test_admin_user_creation():
    admin = AdminUser(
        user_id=uuid.uuid4(),
        role=AdminRole.ADMIN,
        permissions=["users.read", "users.suspend"],
        ip_allowlist=["192.168.1.1"],
    )

    assert admin.user_id is not None
    assert admin.role == AdminRole.ADMIN
    assert "users.read" in admin.permissions
    assert "192.168.1.1" in admin.ip_allowlist
    assert admin.is_active is True


def test_admin_permission_creation():
    permission = AdminPermission(
        name="users.read",
        description="Read user data",
        resource="users",
        action="read",
    )

    assert permission.name == "users.read"
    assert permission.resource == "users"
    assert permission.action == "read"


def test_system_event_creation():
    event = SystemEvent(
        event_type="admin_action",
        severity="info",
        source="admin_panel",
        message="User suspended",
        details={"user_id": "123"},
    )

    assert event.event_type == "admin_action"
    assert event.severity == "info"
    assert event.resolved is False


def test_dashboard_metric_creation():
    metric = DashboardMetric(
        metric_name="daily_conversions",
        metric_value=150,
        metric_data={"success_rate": 95.5},
    )

    assert metric.metric_name == "daily_conversions"
    assert metric.metric_value == 150


def test_announcement_creation():
    announcement = Announcement(
        title="System Maintenance",
        message="Scheduled maintenance on Sunday",
        announcement_type="maintenance",
        is_active=True,
        target_roles=["all"],
    )

    assert announcement.title == "System Maintenance"
    assert announcement.announcement_type == "maintenance"
    assert announcement.is_active is True


def test_admin_role_enum():
    assert AdminRole.SUPER_ADMIN == "super_admin"
    assert AdminRole.ADMIN == "admin"
    assert AdminRole.SUPPORT == "support"
    assert AdminRole.FINANCE == "finance"
    assert AdminRole.READ_ONLY == "read_only"


def test_admin_role_permissions():
    roles = {
        AdminRole.SUPER_ADMIN: ["all"],
        AdminRole.ADMIN: ["users.read", "users.write", "conversions.read"],
        AdminRole.SUPPORT: ["users.read", "conversions.read", "support.write"],
        AdminRole.FINANCE: ["payments.read", "invoices.read"],
        AdminRole.READ_ONLY: ["*.read"],
    }

    assert len(roles) == 5
    assert AdminRole.SUPER_ADMIN in roles
