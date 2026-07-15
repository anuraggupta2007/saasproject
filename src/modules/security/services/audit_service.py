from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_logger
from src.modules.security.repositories.security import AuditLogRepository, SecurityEventRepository

logger = get_logger(__name__)


class AuditService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.audit_repo = AuditLogRepository(session)
        self.event_repo = SecurityEventRepository(session)

    async def log(
        self,
        action: str,
        resource_type: str,
        user_id: str = None,
        resource_id: str = None,
        changes: dict = None,
        ip_address: str = None,
        user_agent: str = None,
        status: str = "success",
    ):
        await self.audit_repo.log_action(
            action=action,
            resource_type=resource_type,
            user_id=user_id,
            resource_id=resource_id,
            changes=changes,
            ip_address=ip_address,
            user_agent=user_agent,
            status=status,
        )

    async def log_login(self, user_id: str, ip_address: str, user_agent: str, success: bool):
        event_type = "login_success" if success else "login_failed"
        severity = "info" if success else "warning"

        await self.event_repo.record_event(
            event_type=event_type,
            severity=severity,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details={"success": success},
        )

        await self.audit_repo.log_action(
            action="login",
            resource_type="user",
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            status="success" if success else "failure",
        )

    async def log_permission_change(
        self, admin_id: str, target_user_id: str, changes: dict, ip_address: str
    ):
        await self.event_repo.record_event(
            event_type="permission_changed",
            severity="warning",
            user_id=admin_id,
            ip_address=ip_address,
            details={"target_user": target_user_id, "changes": changes},
        )

        await self.audit_repo.log_action(
            action="update",
            resource_type="user_permissions",
            user_id=admin_id,
            resource_id=target_user_id,
            changes=changes,
            ip_address=ip_address,
        )

    async def log_license_event(
        self, user_id: str, action: str, details: dict, ip_address: str = None
    ):
        await self.event_repo.record_event(
            event_type=f"license_{action}",
            severity="info",
            user_id=user_id,
            ip_address=ip_address,
            details=details,
        )

        await self.audit_repo.log_action(
            action=action,
            resource_type="license",
            user_id=user_id,
            changes=details,
            ip_address=ip_address,
        )

    async def log_payment_event(
        self, user_id: str, action: str, details: dict, ip_address: str = None
    ):
        await self.event_repo.record_event(
            event_type=f"payment_{action}",
            severity="info",
            user_id=user_id,
            ip_address=ip_address,
            details=details,
        )

        await self.audit_repo.log_action(
            action=action,
            resource_type="payment",
            user_id=user_id,
            changes=details,
            ip_address=ip_address,
        )

    async def log_file_access(
        self, user_id: str, action: str, file_id: str, ip_address: str = None
    ):
        await self.audit_repo.log_action(
            action=action,
            resource_type="file",
            user_id=user_id,
            resource_id=file_id,
            ip_address=ip_address,
        )

    async def log_admin_action(
        self, admin_id: str, action: str, resource_type: str,
        resource_id: str = None, changes: dict = None, ip_address: str = None
    ):
        await self.event_repo.record_event(
            event_type="admin_action",
            severity="warning",
            user_id=admin_id,
            ip_address=ip_address,
            details={"action": action, "resource_type": resource_type, "changes": changes},
        )

        await self.audit_repo.log_action(
            action="admin_action",
            resource_type=resource_type,
            user_id=admin_id,
            resource_id=resource_id,
            changes=changes,
            ip_address=ip_address,
        )

    async def log_security_violation(
        self, violation_type: str, user_id: str = None, ip_address: str = None, details: dict = None
    ):
        await self.event_repo.record_event(
            event_type="security_violation",
            severity="critical",
            user_id=user_id,
            ip_address=ip_address,
            details={"violation_type": violation_type, **(details or {})},
            blocked=True,
        )

    async def get_user_audit_logs(
        self, user_id: str, action: str = None, page: int = 1, page_size: int = 20
    ) -> tuple:
        return await self.audit_repo.get_user_logs(user_id, action, page, page_size)

    async def get_resource_audit_logs(self, resource_type: str, resource_id: str) -> list:
        return await self.audit_repo.get_resource_logs(resource_type, resource_id)
