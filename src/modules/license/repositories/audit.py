import uuid
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.license.models.audit import AuditLog, AuditAction, AuditSeverity
from src.models.base import BaseRepository


class AuditLogRepository(BaseRepository[AuditLog]):
    def __init__(self, session: AsyncSession):
        super().__init__(AuditLog, session)

    async def log(
        self,
        action: AuditAction,
        user_id: Optional[uuid.UUID] = None,
        license_id: Optional[uuid.UUID] = None,
        severity: AuditSeverity = AuditSeverity.INFO,
        details: dict = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        audit_log = AuditLog(
            user_id=user_id,
            license_id=license_id,
            action=action,
            severity=severity,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.session.add(audit_log)
        await self.session.commit()
        await self.session.refresh(audit_log)
        return audit_log

    async def get_user_logs(
        self,
        user_id: uuid.UUID,
        action: Optional[AuditAction] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[AuditLog], int]:
        query = select(AuditLog).where(AuditLog.user_id == user_id)

        if action:
            query = query.where(AuditLog.action == action)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.order_by(AuditLog.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        logs = list(result.scalars().all())

        return logs, total

    async def get_license_logs(
        self,
        license_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[AuditLog], int]:
        query = select(AuditLog).where(AuditLog.license_id == license_id)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.order_by(AuditLog.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        logs = list(result.scalars().all())

        return logs, total

    async def get_recent_logs(
        self,
        limit: int = 100,
    ) -> list[AuditLog]:
        result = await self.session.execute(
            select(AuditLog)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def count_by_action(self) -> dict:
        result = await self.session.execute(
            select(AuditLog.action, func.count()).group_by(AuditLog.action)
        )
        return {row[0].value: row[1] for row in result.all()}
