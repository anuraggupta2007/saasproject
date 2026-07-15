import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from src.core.logging import get_logger
from src.modules.admin.repositories.admin import SystemEventRepository, AnnouncementRepository
from src.modules.admin.models.admin import SystemEvent, Announcement

logger = get_logger(__name__)


class AdminAuditService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.event_repo = SystemEventRepository(session)

    async def log_admin_action(
        self,
        admin_id: uuid.UUID,
        action: str,
        details: dict = None,
        ip_address: Optional[str] = None,
    ) -> SystemEvent:
        event = SystemEvent(
            event_type="admin_action",
            severity="info",
            source="admin_panel",
            message=f"Admin action: {action}",
            details={
                "admin_id": str(admin_id),
                "action": action,
                **(details or {}),
            },
        )
        event = await self.event_repo.create(event)

        logger.info(
            "admin_action_logged",
            admin_id=str(admin_id),
            action=action,
        )

        return event

    async def log_security_event(
        self,
        event_type: str,
        message: str,
        details: dict = None,
        severity: str = "warning",
    ) -> SystemEvent:
        event = SystemEvent(
            event_type=event_type,
            severity=severity,
            source="security",
            message=message,
            details=details or {},
        )
        return await self.event_repo.create(event)

    async def get_audit_logs(
        self,
        event_type: Optional[str] = None,
        severity: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[SystemEvent], int]:
        return await self.event_repo.get_events(event_type, severity, page=page, page_size=page_size)

    async def resolve_event(
        self,
        event_id: uuid.UUID,
        resolved_by: uuid.UUID,
    ) -> Optional[SystemEvent]:
        return await self.event_repo.resolve_event(event_id, resolved_by)


class AnnouncementService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.announcement_repo = AnnouncementRepository(session)

    async def create_announcement(
        self,
        title: str,
        message: str,
        announcement_type: str = "info",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        target_roles: list[str] = None,
        created_by: Optional[uuid.UUID] = None,
    ) -> Announcement:
        announcement = Announcement(
            title=title,
            message=message,
            announcement_type=announcement_type,
            start_date=start_date,
            end_date=end_date,
            target_roles=target_roles or [],
            created_by=created_by,
        )
        announcement = await self.announcement_repo.create(announcement)

        logger.info(
            "announcement_created",
            announcement_id=str(announcement.id),
            title=title,
        )

        return announcement

    async def get_announcement(self, announcement_id: uuid.UUID) -> Optional[Announcement]:
        return await self.announcement_repo.get_by_id(announcement_id)

    async def list_announcements(
        self,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Announcement], int]:
        return await self.announcement_repo.list_announcements(page, page_size)

    async def get_active_announcements(self) -> list[Announcement]:
        return await self.announcement_repo.get_active_announcements()

    async def deactivate_announcement(self, announcement_id: uuid.UUID) -> Optional[Announcement]:
        return await self.announcement_repo.deactivate_announcement(announcement_id)

    async def broadcast_notification(
        self,
        title: str,
        message: str,
        notification_type: str = "info",
        target_users: Optional[list[uuid.UUID]] = None,
        send_email: bool = False,
    ) -> dict:
        announcement = await self.create_announcement(
            title=title,
            message=message,
            announcement_type=notification_type,
        )

        logger.info(
            "notification_broadcast",
            announcement_id=str(announcement.id),
            target_users=len(target_users) if target_users else "all",
            send_email=send_email,
        )

        return {
            "success": True,
            "announcement_id": announcement.id,
            "message": "Notification broadcasted",
        }
