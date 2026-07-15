from datetime import datetime, timezone, timedelta
from uuid import UUID
from sqlalchemy import select, func, delete, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.base import BaseRepository
from src.modules.security.models.security import (
    SecuritySession,
    APIKey,
    SecurityEvent,
    TrustedDevice,
    MFASecret,
    AuditLog,
    PasswordHistory,
    RateLimitEntry,
    MagicLink,
    LoginAttempt,
    SessionStatus,
)


class UserSessionRepository(BaseRepository[SecuritySession]):
    def __init__(self, session: AsyncSession):
        super().__init__(SecuritySession, session)

    async def create_session(
        self,
        user_id,
        token_jti,
        refresh_token_jti=None,
        ip_address=None,
        user_agent=None,
        device_fingerprint=None,
        device_name=None,
        location_country=None,
        location_city=None,
        expires_at=None,
    ) -> SecuritySession:
        session = SecuritySession(
            user_id=str(user_id),
            token_jti=token_jti,
            refresh_token_jti=refresh_token_jti,
            ip_address=ip_address,
            user_agent=user_agent,
            device_fingerprint=device_fingerprint,
            device_name=device_name,
            location_country=location_country,
            location_city=location_city,
            expires_at=expires_at or (datetime.now(timezone.utc) + timedelta(hours=24)),
        )
        self.session.add(session)
        await self.session.commit()
        return session

    async def get_by_token_jti(self, jti: str) -> SecuritySession | None:
        result = await self.session.execute(
            select(SecuritySession).where(SecuritySession.token_jti == jti)
        )
        return result.scalar_one_or_none()

    async def get_active_sessions(self, user_id: str) -> list[SecuritySession]:
        result = await self.session.execute(
            select(SecuritySession).where(
                and_(
                    SecuritySession.user_id == user_id,
                    SecuritySession.status == SessionStatus.ACTIVE.value,
                    SecuritySession.expires_at > datetime.now(timezone.utc),
                )
            ).order_by(SecuritySession.last_activity_at.desc())
        )
        return list(result.scalars().all())

    async def get_active_session_count(self, user_id: str) -> int:
        result = await self.session.execute(
            select(func.count()).where(
                and_(
                    SecuritySession.user_id == user_id,
                    SecuritySession.status == SessionStatus.ACTIVE.value,
                    SecuritySession.expires_at > datetime.now(timezone.utc),
                )
            )
        )
        return result.scalar() or 0

    async def revoke_session(self, session_id: UUID, reason: str = "user_requested") -> SecuritySession | None:
        session = await self.get_by_id(session_id)
        if session:
            session.status = SessionStatus.REVOKED.value
            session.revoked_at = datetime.now(timezone.utc)
            session.revoke_reason = reason
            await self.session.commit()
        return session

    async def revoke_all_user_sessions(self, user_id: str, except_session_id: UUID = None) -> int:
        query = update(SecuritySession).where(
            and_(
                SecuritySession.user_id == user_id,
                SecuritySession.status == SessionStatus.ACTIVE.value,
            )
        ).values(
            status=SessionStatus.REVOKED.value,
            revoked_at=datetime.now(timezone.utc),
            revoke_reason="bulk_revoke",
        )
        if except_session_id:
            query = query.where(SecuritySession.id != except_session_id)
        result = await self.session.execute(query)
        await self.session.commit()
        return result.rowcount

    async def cleanup_expired_sessions(self) -> int:
        result = await self.session.execute(
            delete(SecuritySession).where(
                and_(
                    SecuritySession.status != SessionStatus.ACTIVE.value,
                    SecuritySession.expires_at < datetime.now(timezone.utc) - timedelta(days=30),
                )
            )
        )
        await self.session.commit()
        return result.rowcount

    async def update_last_activity(self, session_id: UUID):
        session = await self.get_by_id(session_id)
        if session:
            session.last_activity_at = datetime.now(timezone.utc)
            await self.session.commit()


from sqlalchemy import update


class APIKeyRepository(BaseRepository[APIKey]):
    def __init__(self, session: AsyncSession):
        super().__init__(APIKey, session)

    async def create_api_key(
        self,
        user_id,
        name,
        key_prefix,
        key_hash,
        scopes=None,
        rate_limit=1000,
        daily_quota=10000,
        expires_at=None,
    ) -> APIKey:
        api_key = APIKey(
            user_id=str(user_id),
            name=name,
            key_prefix=key_prefix,
            key_hash=key_hash,
            scopes=scopes or [],
            rate_limit=rate_limit,
            daily_quota=daily_quota,
            expires_at=expires_at,
        )
        self.session.add(api_key)
        await self.session.commit()
        return api_key

    async def get_by_key_hash(self, key_hash: str) -> APIKey | None:
        result = await self.session.execute(
            select(APIKey).where(APIKey.key_hash == key_hash)
        )
        return result.scalar_one_or_none()

    async def get_user_api_keys(self, user_id: str) -> list[APIKey]:
        result = await self.session.execute(
            select(APIKey).where(
                and_(APIKey.user_id == user_id, APIKey.is_active == True)
            ).order_by(APIKey.created_at.desc())
        )
        return list(result.scalars().all())

    async def revoke_api_key(self, key_id: UUID) -> APIKey | None:
        key = await self.get_by_id(key_id)
        if key:
            key.is_active = False
            await self.session.commit()
        return key

    async def update_last_used(self, key_id: UUID):
        key = await self.get_by_id(key_id)
        if key:
            key.last_used_at = datetime.now(timezone.utc)
            await self.session.commit()


class SecurityEventRepository(BaseRepository[SecurityEvent]):
    def __init__(self, session: AsyncSession):
        super().__init__(SecurityEvent, session)

    async def record_event(
        self,
        event_type,
        severity,
        user_id=None,
        ip_address=None,
        user_agent=None,
        resource=None,
        details=None,
        blocked=False,
        correlation_id=None,
    ) -> SecurityEvent:
        event = SecurityEvent(
            user_id=str(user_id) if user_id else None,
            event_type=event_type,
            severity=severity,
            ip_address=ip_address,
            user_agent=user_agent,
            resource=resource,
            details=details or {},
            blocked=blocked,
            correlation_id=correlation_id,
        )
        self.session.add(event)
        await self.session.commit()
        return event

    async def get_user_events(
        self, user_id: str, event_type: str = None, hours: int = 24, page: int = 1, page_size: int = 20
    ) -> tuple[list[SecurityEvent], int]:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        query = select(SecurityEvent).where(
            and_(SecurityEvent.user_id == user_id, SecurityEvent.created_at >= cutoff)
        )
        if event_type:
            query = query.where(SecurityEvent.event_type == event_type)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.order_by(SecurityEvent.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        return list(result.scalars().all()), total

    async def get_recent_events(self, hours: int = 24, event_type: str = None) -> list[SecurityEvent]:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        query = select(SecurityEvent).where(SecurityEvent.created_at >= cutoff)
        if event_type:
            query = query.where(SecurityEvent.event_type == event_type)
        query = query.order_by(SecurityEvent.created_at.desc()).limit(100)
        result = await self.session.execute(query)
        return list(result.scalars().all())


class TrustedDeviceRepository(BaseRepository[TrustedDevice]):
    def __init__(self, session: AsyncSession):
        super().__init__(TrustedDevice, session)

    async def add_device(
        self, user_id, device_fingerprint, device_name=None, device_type=None,
        browser=None, os=None, ip_address=None, trust_duration_days=30,
    ) -> TrustedDevice:
        device = TrustedDevice(
            user_id=str(user_id),
            device_fingerprint=device_fingerprint,
            device_name=device_name,
            device_type=device_type,
            browser=browser,
            os=os,
            ip_address=ip_address,
            trusted_until=datetime.now(timezone.utc) + timedelta(days=trust_duration_days),
        )
        self.session.add(device)
        await self.session.commit()
        return device

    async def get_user_devices(self, user_id: str) -> list[TrustedDevice]:
        result = await self.session.execute(
            select(TrustedDevice).where(
                and_(
                    TrustedDevice.user_id == user_id,
                    TrustedDevice.is_active == True,
                    TrustedDevice.trusted_until > datetime.now(timezone.utc),
                )
            ).order_by(TrustedDevice.last_seen_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_fingerprint(self, user_id: str, fingerprint: str) -> TrustedDevice | None:
        result = await self.session.execute(
            select(TrustedDevice).where(
                and_(
                    TrustedDevice.user_id == user_id,
                    TrustedDevice.device_fingerprint == fingerprint,
                    TrustedDevice.is_active == True,
                )
            )
        )
        return result.scalar_one_or_none()

    async def revoke_device(self, device_id: UUID) -> TrustedDevice | None:
        device = await self.get_by_id(device_id)
        if device:
            device.is_active = False
            await self.session.commit()
        return device

    async def update_last_seen(self, device_id: UUID):
        device = await self.get_by_id(device_id)
        if device:
            device.last_seen_at = datetime.now(timezone.utc)
            await self.session.commit()


class MFASecretRepository(BaseRepository[MFASecret]):
    def __init__(self, session: AsyncSession):
        super().__init__(MFASecret, session)

    async def create_secret(self, user_id, method, secret_encrypted, backup_codes_encrypted=None) -> MFASecret:
        mfa = MFASecret(
            user_id=str(user_id),
            method=method,
            secret_encrypted=secret_encrypted,
            backup_codes_encrypted=backup_codes_encrypted,
        )
        self.session.add(mfa)
        await self.session.commit()
        return mfa

    async def get_by_user(self, user_id: str) -> MFASecret | None:
        result = await self.session.execute(
            select(MFASecret).where(MFASecret.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def enable_mfa(self, user_id: str):
        mfa = await self.get_by_user(user_id)
        if mfa:
            mfa.enabled = True
            mfa.verified_at = datetime.now(timezone.utc)
            await self.session.commit()

    async def disable_mfa(self, user_id: str):
        mfa = await self.get_by_user(user_id)
        if mfa:
            mfa.enabled = False
            await self.session.commit()


class AuditLogRepository(BaseRepository[AuditLog]):
    def __init__(self, session: AsyncSession):
        super().__init__(AuditLog, session)

    async def log_action(
        self, action, resource_type, user_id=None, resource_id=None,
        changes=None, ip_address=None, user_agent=None, status="success",
    ) -> AuditLog:
        log = AuditLog(
            user_id=str(user_id) if user_id else None,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            changes=changes or {},
            ip_address=ip_address,
            user_agent=user_agent,
            status=status,
        )
        self.session.add(log)
        await self.session.commit()
        return log

    async def get_user_logs(
        self, user_id: str, action: str = None, page: int = 1, page_size: int = 20
    ) -> tuple[list[AuditLog], int]:
        query = select(AuditLog).where(AuditLog.user_id == user_id)
        if action:
            query = query.where(AuditLog.action == action)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.order_by(AuditLog.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        return list(result.scalars().all()), total

    async def get_resource_logs(
        self, resource_type: str, resource_id: str
    ) -> list[AuditLog]:
        result = await self.session.execute(
            select(AuditLog).where(
                and_(AuditLog.resource_type == resource_type, AuditLog.resource_id == resource_id)
            ).order_by(AuditLog.created_at.desc())
        )
        return list(result.scalars().all())


class PasswordHistoryRepository(BaseRepository[PasswordHistory]):
    def __init__(self, session: AsyncSession):
        super().__init__(PasswordHistory, session)

    async def add_password(self, user_id: str, password_hash: str):
        entry = PasswordHistory(user_id=user_id, password_hash=password_hash)
        self.session.add(entry)
        await self.session.commit()

    async def get_user_passwords(self, user_id: str, limit: int = 5) -> list[PasswordHistory]:
        result = await self.session.execute(
            select(PasswordHistory)
            .where(PasswordHistory.user_id == user_id)
            .order_by(PasswordHistory.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def is_password_used(self, user_id: str, password_hash: str) -> bool:
        result = await self.session.execute(
            select(func.count()).where(
                and_(PasswordHistory.user_id == user_id, PasswordHistory.password_hash == password_hash)
            )
        )
        return (result.scalar() or 0) > 0


class RateLimitRepository(BaseRepository[RateLimitEntry]):
    def __init__(self, session: AsyncSession):
        super().__init__(RateLimitEntry, session)

    async def increment(self, key: str, window: str, ttl_seconds: int = 60) -> int:
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(seconds=ttl_seconds)

        result = await self.session.execute(
            select(RateLimitEntry).where(
                and_(RateLimitEntry.key == key, RateLimitEntry.window == window)
            )
        )
        entry = result.scalar_one_or_none()

        if entry:
            if entry.expires_at > now:
                entry.count += 1
                await self.session.commit()
                return entry.count
            else:
                entry.count = 1
                entry.expires_at = expires_at
                await self.session.commit()
                return 1
        else:
            entry = RateLimitEntry(key=key, window=window, count=1, expires_at=expires_at)
            self.session.add(entry)
            await self.session.commit()
            return 1

    async def get_count(self, key: str, window: str) -> int:
        result = await self.session.execute(
            select(RateLimitEntry).where(
                and_(
                    RateLimitEntry.key == key,
                    RateLimitEntry.window == window,
                    RateLimitEntry.expires_at > datetime.now(timezone.utc),
                )
            )
        )
        entry = result.scalar_one_or_none()
        return entry.count if entry else 0

    async def cleanup_expired(self) -> int:
        result = await self.session.execute(
            delete(RateLimitEntry).where(RateLimitEntry.expires_at < datetime.now(timezone.utc))
        )
        await self.session.commit()
        return result.rowcount


class MagicLinkRepository(BaseRepository[MagicLink]):
    def __init__(self, session: AsyncSession):
        super().__init__(MagicLink, session)

    async def create_link(self, user_id, token_hash, email, ip_address=None, expires_in_minutes=15) -> MagicLink:
        link = MagicLink(
            user_id=str(user_id),
            token_hash=token_hash,
            email=email,
            ip_address=ip_address,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=expires_in_minutes),
        )
        self.session.add(link)
        await self.session.commit()
        return link

    async def get_by_token_hash(self, token_hash: str) -> MagicLink | None:
        result = await self.session.execute(
            select(MagicLink).where(
                and_(MagicLink.token_hash == token_hash, MagicLink.used == False)
            )
        )
        return result.scalar_one_or_none()

    async def mark_used(self, link_id: UUID):
        link = await self.get_by_id(link_id)
        if link:
            link.used = True
            link.used_at = datetime.now(timezone.utc)
            await self.session.commit()


class LoginAttemptRepository(BaseRepository[LoginAttempt]):
    def __init__(self, session: AsyncSession):
        super().__init__(LoginAttempt, session)

    async def record_attempt(
        self, email, ip_address, success, user_agent=None, failure_reason=None, metadata=None
    ) -> LoginAttempt:
        attempt = LoginAttempt(
            email=email,
            ip_address=ip_address,
            success=success,
            user_agent=user_agent,
            failure_reason=failure_reason,
            metadata_=metadata or {},
        )
        self.session.add(attempt)
        await self.session.commit()
        return attempt

    async def get_recent_failures(self, email: str, ip_address: str, minutes: int = 15) -> int:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes)
        result = await self.session.execute(
            select(func.count()).where(
                and_(
                    LoginAttempt.email == email,
                    LoginAttempt.ip_address == ip_address,
                    LoginAttempt.success == False,
                    LoginAttempt.created_at >= cutoff,
                )
            )
        )
        return result.scalar() or 0

    async def get_user_failed_attempts(self, email: str, minutes: int = 15) -> int:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes)
        result = await self.session.execute(
            select(func.count()).where(
                and_(
                    LoginAttempt.email == email,
                    LoginAttempt.success == False,
                    LoginAttempt.created_at >= cutoff,
                )
            )
        )
        return result.scalar() or 0
