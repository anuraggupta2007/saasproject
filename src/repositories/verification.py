import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.models.base import EmailVerification, PasswordReset


class VerificationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_email_verification(
        self,
        user_id: uuid.UUID,
        token_hash: str,
        ip_address: str | None = None,
    ) -> EmailVerification:
        expires_at = datetime.now(timezone.utc) + timedelta(
            hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS
        )
        verification = EmailVerification(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            ip_address=ip_address,
        )
        self.session.add(verification)
        await self.session.flush()
        await self.session.refresh(verification)
        return verification

    async def get_email_verification(self, token_hash: str) -> EmailVerification | None:
        result = await self.session.execute(
            select(EmailVerification).where(
                EmailVerification.token_hash == token_hash,
                EmailVerification.is_used == False,
            )
        )
        return result.scalar_one_or_none()

    async def use_email_verification(self, token_hash: str) -> bool:
        await self.session.execute(
            update(EmailVerification).where(
                EmailVerification.token_hash == token_hash
            ).values(
                is_used=True,
                used_at=datetime.now(timezone.utc),
            )
        )
        await self.session.flush()
        return True

    async def invalidate_user_verifications(self, user_id: uuid.UUID) -> int:
        result = await self.session.execute(
            update(EmailVerification).where(
                EmailVerification.user_id == user_id,
                EmailVerification.is_used == False,
            ).values(is_used=True)
        )
        await self.session.flush()
        return result.rowcount

    async def create_password_reset(
        self,
        user_id: uuid.UUID,
        token_hash: str,
        ip_address: str | None = None,
    ) -> PasswordReset:
        expires_at = datetime.now(timezone.utc) + timedelta(
            hours=settings.PASSWORD_RESET_EXPIRE_HOURS
        )
        reset = PasswordReset(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            ip_address=ip_address,
        )
        self.session.add(reset)
        await self.session.flush()
        await self.session.refresh(reset)
        return reset

    async def get_password_reset(self, token_hash: str) -> PasswordReset | None:
        result = await self.session.execute(
            select(PasswordReset).where(
                PasswordReset.token_hash == token_hash,
                PasswordReset.is_used == False,
            )
        )
        return result.scalar_one_or_none()

    async def use_password_reset(self, token_hash: str) -> bool:
        await self.session.execute(
            update(PasswordReset).where(
                PasswordReset.token_hash == token_hash
            ).values(
                is_used=True,
                used_at=datetime.now(timezone.utc),
            )
        )
        await self.session.flush()
        return True

    async def invalidate_user_resets(self, user_id: uuid.UUID) -> int:
        result = await self.session.execute(
            update(PasswordReset).where(
                PasswordReset.user_id == user_id,
                PasswordReset.is_used == False,
            ).values(is_used=True)
        )
        await self.session.flush()
        return result.rowcount
