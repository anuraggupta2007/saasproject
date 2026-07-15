import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.datetime_utils import ensure_utc
from src.core.exceptions import (
    BadRequestException,
    ConflictException,
    NotFoundException,
    UnauthorizedException,
)
from src.core.logging import get_logger
from src.models.base import User, Role, AuditLog, user_roles
from src.repositories.user import UserRepository
from src.repositories.session import SessionRepository
from src.repositories.verification import VerificationRepository
from src.services.auth.password import (
    hash_password,
    verify_password,
    needs_rehash,
    generate_token,
    hash_token,
    verify_token,
)
from src.services.auth.token import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_token_jti,
)
from src.services.email import email_service

logger = get_logger(__name__)


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)
        self.session_repo = SessionRepository(session)
        self.verification_repo = VerificationRepository(session)

    async def register(
        self,
        email: str,
        password: str,
        full_name: str | None = None,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> dict:
        existing_user = await self.user_repo.get_by_email(email)
        if existing_user:
            raise ConflictException(detail="Email already registered")

        user = User(
            email=email.lower().strip(),
            hashed_password=hash_password(password),
            full_name=full_name,
            is_active=True,
            is_verified=False,
            password_changed_at=datetime.now(timezone.utc),
        )
        user = await self.user_repo.create(user)

        default_role = await self._get_default_role()
        if default_role:
            await self.user_repo.assign_role(user.id, default_role.id)

        token = generate_token()
        token_hash = hash_token(token)
        await self.verification_repo.create_email_verification(
            user.id, token_hash, ip_address
        )

        try:
            await email_service.send_verification_email(user.id, user.email, token)
        except Exception as e:
            logger.warning("verification_email_failed", user_id=str(user.id), error=str(e))

        result = await self._create_tokens(
            user, user_agent, ip_address, remember_me=False
        )
        result["user"] = user

        await self._log_audit(user.id, "register", "user", str(user.id), ip_address, user_agent)

        logger.info("user_registered", user_id=str(user.id), email=email)

        return result

    async def login(
        self,
        email: str,
        password: str,
        remember_me: bool = False,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> dict:
        user = await self.user_repo.get_by_email(email.lower().strip())

        if not user:
            logger.warning("login_failed_invalid_email", email=email)
            raise UnauthorizedException(detail="Invalid email or password")

        if not user.hashed_password:
            raise UnauthorizedException(detail="Invalid email or password")

        if user.is_locked:
            logger.warning("login_failed_locked_account", user_id=str(user.id))
            raise UnauthorizedException(
                detail="Account is locked. Please try again later."
            )

        if not verify_password(password, user.hashed_password):
            await self.user_repo.increment_failed_login(user.id)
            logger.warning("login_failed_invalid_password", user_id=str(user.id))
            raise UnauthorizedException(detail="Invalid email or password")

        if not user.is_active:
            raise UnauthorizedException(detail="Account is disabled")

        await self.user_repo.reset_failed_login(user.id)

        if needs_rehash(user.hashed_password):
            await self.user_repo.update(
                user.id, hashed_password=hash_password(password)
            )

        result = await self._create_tokens(
            user, user_agent, ip_address, remember_me
        )

        await self.user_repo.update_last_login(user.id, ip_address)

        await self._log_audit(user.id, "login", "user", str(user.id), ip_address, user_agent)

        logger.info("user_logged_in", user_id=str(user.id), email=email)

        return result

    async def logout(
        self,
        refresh_token: str,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> bool:
        token_hash = hash_token(refresh_token)
        session = await self.session_repo.get_by_hash(token_hash)

        if not session:
            raise NotFoundException(detail="Session not found")

        await self.session_repo.revoke_token(session.refresh_token_jti)

        await self._log_audit(
            session.user_id, "logout", "session", str(session.id), ip_address, user_agent
        )

        logger.info("user_logged_out", user_id=str(session.user_id))
        return True

    async def logout_all_devices(self, user_id: uuid.UUID) -> int:
        count = await self.session_repo.revoke_all_user_sessions(user_id)

        await self._log_audit(user_id, "logout_all", "session", None)

        logger.info("user_logged_out_all_devices", user_id=str(user_id), sessions_revoked=count)
        return count

    async def refresh_tokens(
        self,
        refresh_token: str,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> dict:
        token_hash = hash_token(refresh_token)
        session = await self.session_repo.get_by_hash(token_hash)

        if not session:
            raise UnauthorizedException(detail="Invalid refresh token")

        if ensure_utc(session.expires_at) < datetime.now(timezone.utc):
            await self.session_repo.revoke_token(session.refresh_token_jti)
            raise UnauthorizedException(detail="Refresh token expired")

        user = await self.user_repo.get_by_id(session.user_id)
        if not user or not user.is_active:
            raise UnauthorizedException(detail="User not found or inactive")

        await self.session_repo.revoke_token(session.refresh_token_jti)

        result = await self._create_tokens(
            user, user_agent, ip_address, remember_me=False
        )

        return result

    async def verify_email(self, token: str, ip_address: str | None = None) -> bool:
        token_hash = hash_token(token)
        verification = await self.verification_repo.get_email_verification(token_hash)

        if not verification:
            raise BadRequestException(detail="Invalid or expired verification token")

        if ensure_utc(verification.expires_at) < datetime.now(timezone.utc):
            raise BadRequestException(detail="Verification token expired")

        await self.user_repo.update(verification.user_id, is_verified=True)
        await self.verification_repo.use_email_verification(token_hash)

        await self._log_audit(
            verification.user_id, "verify_email", "user", str(verification.user_id), ip_address
        )

        logger.info("email_verified", user_id=str(verification.user_id))
        return True

    async def resend_verification(
        self,
        email: str,
        ip_address: str | None = None,
    ) -> bool:
        user = await self.user_repo.get_by_email(email.lower().strip())
        if not user:
            return True

        if user.is_verified:
            return True

        await self.verification_repo.invalidate_user_verifications(user.id)

        token = generate_token()
        token_hash = hash_token(token)
        await self.verification_repo.create_email_verification(
            user.id, token_hash, ip_address
        )

        await email_service.send_verification_email(user.id, user.email, token)

        logger.info("verification_resent", user_id=str(user.id))
        return True

    async def forgot_password(
        self,
        email: str,
        ip_address: str | None = None,
    ) -> bool:
        user = await self.user_repo.get_by_email(email.lower().strip())
        if not user:
            return True

        await self.verification_repo.invalidate_user_resets(user.id)

        token = generate_token()
        token_hash = hash_token(token)
        await self.verification_repo.create_password_reset(
            user.id, token_hash, ip_address
        )

        await email_service.send_password_reset_email(user.id, user.email, token)

        await self._log_audit(user.id, "forgot_password", "user", str(user.id), ip_address)

        logger.info("password_reset_requested", user_id=str(user.id))
        return True

    async def reset_password(
        self,
        token: str,
        new_password: str,
        ip_address: str | None = None,
    ) -> bool:
        token_hash = hash_token(token)
        reset = await self.verification_repo.get_password_reset(token_hash)

        if not reset:
            raise BadRequestException(detail="Invalid or expired reset token")

        if ensure_utc(reset.expires_at) < datetime.now(timezone.utc):
            raise BadRequestException(detail="Reset token expired")

        user = await self.user_repo.get_by_id(reset.user_id)
        if not user:
            raise NotFoundException(detail="User not found")

        await self.user_repo.update(
            reset.user_id,
            hashed_password=hash_password(new_password),
            password_changed_at=datetime.now(timezone.utc),
        )
        await self.verification_repo.use_password_reset(token_hash)
        await self.session_repo.revoke_all_user_sessions(reset.user_id)

        await self._log_audit(
            reset.user_id, "reset_password", "user", str(reset.user_id), ip_address
        )

        logger.info("password_reset", user_id=str(reset.user_id))
        return True

    async def change_password(
        self,
        user_id: uuid.UUID,
        current_password: str,
        new_password: str,
        ip_address: str | None = None,
    ) -> bool:
        user = await self.user_repo.get_by_id(user_id)
        if not user or not user.hashed_password:
            raise NotFoundException(detail="User not found")

        if not verify_password(current_password, user.hashed_password):
            raise UnauthorizedException(detail="Current password is incorrect")

        await self.user_repo.update(
            user.id,
            hashed_password=hash_password(new_password),
            password_changed_at=datetime.now(timezone.utc),
        )
        await self.session_repo.revoke_all_user_sessions(user.id)

        await self._log_audit(user.id, "change_password", "user", str(user.id), ip_address)

        logger.info("password_changed", user_id=str(user.id))
        return True

    async def oauth_login(
        self,
        provider: str,
        code: str,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> dict:
        from src.services.oauth import oauth_service

        user_info = await oauth_service.get_user_info(provider, code)
        if not user_info:
            raise BadRequestException(
                detail="Failed to get user info from OAuth provider"
            )

        email = user_info.get("email")
        if not email:
            raise BadRequestException(detail="Email not found in OAuth response")

        user = await self.user_repo.get_by_oauth(provider, user_info["id"])

        if not user:
            user = await self.user_repo.get_by_email(email.lower().strip())

        if user:
            if user.oauth_provider and user.oauth_provider != provider:
                raise ConflictException(
                    detail="Email already registered with different authentication method"
                )

            if not user.oauth_provider:
                await self.user_repo.update(
                    user.id,
                    oauth_provider=provider,
                    oauth_id=user_info["id"],
                    is_verified=True,
                )
        else:
            user = User(
                email=email.lower().strip(),
                full_name=user_info.get("name"),
                avatar_url=user_info.get("picture"),
                oauth_provider=provider,
                oauth_id=user_info["id"],
                is_verified=user_info.get("verified_email", True),
                is_active=True,
                password_changed_at=datetime.now(timezone.utc),
            )
            user = await self.user_repo.create(user)

            default_role = await self._get_default_role()
            if default_role:
                await self.user_repo.assign_role(user.id, default_role.id)

        result = await self._create_tokens(
            user, user_agent, ip_address, remember_me=False
        )

        await self.user_repo.update_last_login(user.id, ip_address)

        await self._log_audit(
            user.id, "oauth_login", "user", str(user.id), ip_address, user_agent,
            details={"provider": provider}
        )

        logger.info("oauth_login", user_id=str(user.id), provider=provider)

        return result

    async def get_sessions(
        self,
        user_id: uuid.UUID,
        current_session_jti: str | None = None,
    ) -> list[dict]:
        sessions = await self.session_repo.get_user_sessions(user_id)

        result = []
        for session in sessions:
            result.append({
                "id": str(session.id),
                "device_info": session.device_info,
                "ip_address": session.ip_address,
                "user_agent": session.user_agent,
                "created_at": session.created_at.isoformat(),
                "expires_at": session.expires_at.isoformat(),
                "last_used_at": session.last_used_at.isoformat() if session.last_used_at else None,
                "is_current": session.refresh_token_jti == current_session_jti,
            })

        return result

    async def revoke_session(
        self,
        user_id: uuid.UUID,
        session_id: uuid.UUID,
    ) -> bool:
        sessions = await self.session_repo.get_user_sessions(user_id)
        for session in sessions:
            if session.id == session_id:
                await self.session_repo.revoke_token(session.refresh_token_jti)
                return True
        return False

    async def _create_tokens(
        self,
        user: User,
        user_agent: str | None = None,
        ip_address: str | None = None,
        remember_me: bool = False,
    ) -> dict:
        expires_delta = (
            timedelta(days=settings.REFRESH_TOKEN_EXPIRE_REMEMBER_ME_DAYS)
            if remember_me
            else None
        )

        access_token = create_access_token(user.id)
        refresh_token, jti, expires_at = create_refresh_token(user.id, expires_delta)

        token_hash = hash_token(refresh_token)

        await self.session_repo.cleanup_old_sessions(user.id)

        await self.session_repo.create(
            user_id=user.id,
            refresh_token_jti=jti,
            refresh_token_hash=token_hash,
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )

        user_data = {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "is_verified": user.is_verified,
        }

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": user_data,
        }

    async def _get_default_role(self) -> Role | None:
        from sqlalchemy import select
        result = await self.session.execute(
            select(Role).where(Role.is_default == True, Role.is_deleted == False)
        )
        return result.scalar_one_or_none()

    async def _log_audit(
        self,
        user_id: uuid.UUID | None,
        action: str,
        resource: str,
        resource_id: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
        details: dict | None = None,
    ) -> None:
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            resource=resource,
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details,
        )
        self.session.add(audit_log)
        await self.session.flush()
