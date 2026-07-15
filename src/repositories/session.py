import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.models.base import UserSession


class SessionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        user_id: uuid.UUID,
        refresh_token_jti: str,
        refresh_token_hash: str,
        expires_at: datetime,
        user_agent: str | None = None,
        ip_address: str | None = None,
        device_info: str | None = None,
    ) -> UserSession:
        session = UserSession(
            user_id=user_id,
            refresh_token_jti=refresh_token_jti,
            refresh_token_hash=refresh_token_hash,
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
            device_info=device_info,
        )
        self.session.add(session)
        await self.session.flush()
        await self.session.refresh(session)
        return session

    async def get_by_jti(self, refresh_token_jti: str) -> UserSession | None:
        result = await self.session.execute(
            select(UserSession).where(
                UserSession.refresh_token_jti == refresh_token_jti,
                UserSession.is_revoked == False,
            )
        )
        return result.scalar_one_or_none()

    async def get_by_hash(self, refresh_token_hash: str) -> UserSession | None:
        result = await self.session.execute(
            select(UserSession).where(
                UserSession.refresh_token_hash == refresh_token_hash,
                UserSession.is_revoked == False,
            )
        )
        return result.scalar_one_or_none()

    async def revoke_token(self, refresh_token_jti: str) -> bool:
        await self.session.execute(
            update(UserSession).where(
                UserSession.refresh_token_jti == refresh_token_jti
            ).values(
                is_revoked=True,
                revoked_at=datetime.now(timezone.utc),
            )
        )
        await self.session.flush()
        return True

    async def revoke_all_user_sessions(self, user_id: uuid.UUID) -> int:
        result = await self.session.execute(
            update(UserSession).where(
                UserSession.user_id == user_id,
                UserSession.is_revoked == False,
            ).values(
                is_revoked=True,
                revoked_at=datetime.now(timezone.utc),
            )
        )
        await self.session.flush()
        return result.rowcount

    async def get_user_sessions(
        self,
        user_id: uuid.UUID,
        include_revoked: bool = False,
    ) -> list[UserSession]:
        query = select(UserSession).where(UserSession.user_id == user_id)
        if not include_revoked:
            query = query.where(UserSession.is_revoked == False)
        query = query.order_by(UserSession.created_at.desc())
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def count_user_sessions(self, user_id: uuid.UUID) -> int:
        result = await self.session.execute(
            select(func.count()).select_from(UserSession).where(
                UserSession.user_id == user_id,
                UserSession.is_revoked == False,
            )
        )
        return result.scalar() or 0

    async def cleanup_old_sessions(self, user_id: uuid.UUID) -> int:
        max_sessions = settings.MAX_SESSIONS_PER_USER
        sessions = await self.get_user_sessions(user_id)

        if len(sessions) <= max_sessions:
            return 0

        sessions_to_revoke = sessions[max_sessions:]
        count = 0
        for session in sessions_to_revoke:
            await self.revoke_token(session.refresh_token_jti)
            count += 1

        return count

    async def revoke_all_except(
        self,
        user_id: uuid.UUID,
        except_jti: str,
    ) -> int:
        result = await self.session.execute(
            update(UserSession).where(
                UserSession.user_id == user_id,
                UserSession.refresh_token_jti != except_jti,
                UserSession.is_revoked == False,
            ).values(
                is_revoked=True,
                revoked_at=datetime.now(timezone.utc),
            )
        )
        await self.session.flush()
        return result.rowcount

    async def cleanup_expired(self) -> int:
        result = await self.session.execute(
            delete(UserSession).where(
                UserSession.expires_at < datetime.now(timezone.utc),
            )
        )
        await self.session.flush()
        return result.rowcount

    async def delete_user_sessions(self, user_id: uuid.UUID) -> int:
        result = await self.session.execute(
            delete(UserSession).where(UserSession.user_id == user_id)
        )
        await self.session.flush()
        return result.rowcount
