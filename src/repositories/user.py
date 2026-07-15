import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.exceptions import NotFoundException
from src.models.base import User, UserSession, user_roles


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, user_id: uuid.UUID, include_deleted: bool = False) -> User | None:
        query = select(User).where(User.id == user_id)
        if not include_deleted:
            query = query.where(User.is_deleted == False)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str, include_deleted: bool = False) -> User | None:
        query = select(User).where(User.email == email)
        if not include_deleted:
            query = query.where(User.is_deleted == False)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_oauth(self, provider: str, oauth_id: str) -> User | None:
        result = await self.session.execute(
            select(User).where(
                User.oauth_provider == provider,
                User.oauth_id == oauth_id,
                User.is_deleted == False,
            )
        )
        return result.scalar_one_or_none()

    async def create(self, user: User) -> User:
        self.session.add(user)
        await self.session.flush()
        await self.session.refresh(user)
        return user

    async def update(self, user_id: uuid.UUID, **kwargs) -> User | None:
        kwargs["updated_at"] = datetime.now(timezone.utc)
        await self.session.execute(
            update(User).where(User.id == user_id).values(**kwargs)
        )
        await self.session.flush()
        return await self.get_by_id(user_id)

    async def soft_delete(self, user_id: uuid.UUID) -> bool:
        user = await self.get_by_id(user_id)
        if user:
            user.is_deleted = True
            user.deleted_at = datetime.now(timezone.utc)
            user.is_active = False
            await self.session.flush()
            return True
        return False

    async def hard_delete(self, user_id: uuid.UUID) -> bool:
        result = await self.session.execute(
            delete(User).where(User.id == user_id)
        )
        await self.session.flush()
        return result.rowcount > 0

    async def list_users(
        self,
        skip: int = 0,
        limit: int = 100,
        search: str | None = None,
        is_active: bool | None = None,
    ) -> tuple[list[User], int]:
        query = select(User).where(User.is_deleted == False)

        if search:
            search_filter = f"%{search}%"
            query = query.where(
                (User.email.ilike(search_filter)) |
                (User.full_name.ilike(search_filter))
            )

        if is_active is not None:
            query = query.where(User.is_active == is_active)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.offset(skip).limit(limit).order_by(User.created_at.desc())
        result = await self.session.execute(query)
        users = list(result.scalars().all())

        return users, total

    async def increment_failed_login(self, user_id: uuid.UUID) -> None:
        user = await self.get_by_id(user_id)
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
            await self.session.flush()

    async def reset_failed_login(self, user_id: uuid.UUID) -> None:
        await self.session.execute(
            update(User).where(User.id == user_id).values(
                failed_login_attempts=0,
                locked_until=None,
            )
        )
        await self.session.flush()

    async def update_last_login(self, user_id: uuid.UUID, ip_address: str | None = None) -> None:
        await self.session.execute(
            update(User).where(User.id == user_id).values(
                last_login=datetime.now(timezone.utc),
                last_login_ip=ip_address,
            )
        )
        await self.session.flush()

    async def assign_role(self, user_id: uuid.UUID, role_id: uuid.UUID) -> None:
        await self.session.execute(
            user_roles.insert().values(user_id=user_id, role_id=role_id)
        )
        await self.session.flush()

    async def remove_role(self, user_id: uuid.UUID, role_id: uuid.UUID) -> None:
        await self.session.execute(
            delete(user_roles).where(
                user_roles.c.user_id == user_id,
                user_roles.c.role_id == role_id,
            )
        )
        await self.session.flush()

    async def get_user_roles(self, user_id: uuid.UUID) -> list[uuid.UUID]:
        result = await self.session.execute(
            select(user_roles.c.role_id).where(user_roles.c.user_id == user_id)
        )
        return [row[0] for row in result.all()]
