import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from src.core.logging import get_logger
from src.modules.admin.models.admin import AdminUser, AdminRole
from src.modules.admin.repositories.admin import AdminUserRepository
from src.models.base import User

logger = get_logger(__name__)


class AdminUserService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.admin_repo = AdminUserRepository(session)

    async def create_admin(
        self,
        user_id: uuid.UUID,
        role: AdminRole,
        permissions: list[str] = None,
        ip_allowlist: list[str] = None,
    ) -> AdminUser:
        admin = AdminUser(
            user_id=user_id,
            role=role,
            permissions=permissions or [],
            ip_allowlist=ip_allowlist or [],
        )
        admin = await self.admin_repo.create(admin)

        logger.info("admin_created", admin_id=str(admin.id), role=role.value)
        return admin

    async def get_admin(self, admin_id: uuid.UUID) -> Optional[AdminUser]:
        return await self.admin_repo.get_by_id(admin_id)

    async def get_admin_by_user_id(self, user_id: uuid.UUID) -> Optional[AdminUser]:
        return await self.admin_repo.get_by_user_id(user_id)

    async def update_admin(
        self,
        admin_id: uuid.UUID,
        **kwargs,
    ) -> Optional[AdminUser]:
        return await self.admin_repo.update(admin_id, **kwargs)

    async def deactivate_admin(self, admin_id: uuid.UUID) -> Optional[AdminUser]:
        return await self.admin_repo.update(admin_id, is_active=False)

    async def list_admins(
        self,
        role: Optional[AdminRole] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[AdminUser], int]:
        return await self.admin_repo.list_admins(role, page, page_size)

    async def check_permission(
        self,
        user_id: uuid.UUID,
        permission: str,
    ) -> bool:
        admin = await self.admin_repo.get_by_user_id(user_id)
        if not admin or not admin.is_active:
            return False

        if admin.role == AdminRole.SUPER_ADMIN:
            return True

        return permission in admin.permissions

    async def search_users(
        self,
        query: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[User], int]:
        q = select(User)
        if query:
            q = q.where(
                User.email.ilike(f"%{query}%") |
                User.full_name.ilike(f"%{query}%")
            )

        count_q = select(func.count()).select_from(q.subquery())
        total = (await self.session.execute(count_q)).scalar() or 0

        q = q.order_by(User.created_at.desc())
        q = q.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(q)
        users = list(result.scalars().all())

        return users, total

    async def get_user_details(self, user_id: uuid.UUID) -> Optional[User]:
        result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def suspend_user(self, user_id: uuid.UUID) -> bool:
        user = await self.get_user_details(user_id)
        if user:
            user.is_active = False
            await self.session.commit()
            logger.info("user_suspended", user_id=str(user_id))
            return True
        return False

    async def reactivate_user(self, user_id: uuid.UUID) -> bool:
        user = await self.get_user_details(user_id)
        if user:
            user.is_active = True
            await self.session.commit()
            logger.info("user_reactivated", user_id=str(user_id))
            return True
        return False

    async def delete_user(self, user_id: uuid.UUID) -> bool:
        user = await self.get_user_details(user_id)
        if user:
            await self.session.delete(user)
            await self.session.commit()
            logger.info("user_deleted", user_id=str(user_id))
            return True
        return False

    async def assign_role(self, user_id: uuid.UUID, role: str) -> bool:
        user = await self.get_user_details(user_id)
        if user:
            user.role = role
            await self.session.commit()
            logger.info("user_role_assigned", user_id=str(user_id), role=role)
            return True
        return False
