import hashlib
from datetime import datetime, timezone, timedelta
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_logger
from src.modules.security.repositories.security import (
    UserSessionRepository,
    TrustedDeviceRepository,
    SecurityEventRepository,
)

logger = get_logger(__name__)

MAX_SESSIONS_PER_USER = 10


class SessionService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.session_repo = UserSessionRepository(session)
        self.device_repo = TrustedDeviceRepository(session)
        self.event_repo = SecurityEventRepository(session)

    def generate_device_fingerprint(self, user_agent: str, ip_address: str) -> str:
        raw = f"{user_agent}:{ip_address}"
        return hashlib.sha256(raw.encode()).hexdigest()

    def parse_user_agent(self, user_agent: str) -> dict:
        ua_lower = user_agent.lower()

        browser = "Unknown"
        if "chrome" in ua_lower and "edg" not in ua_lower:
            browser = "Chrome"
        elif "firefox" in ua_lower:
            browser = "Firefox"
        elif "safari" in ua_lower and "chrome" not in ua_lower:
            browser = "Safari"
        elif "edg" in ua_lower:
            browser = "Edge"

        os_name = "Unknown"
        if "windows" in ua_lower:
            os_name = "Windows"
        elif "mac os" in ua_lower or "macos" in ua_lower:
            os_name = "macOS"
        elif "linux" in ua_lower:
            os_name = "Linux"
        elif "android" in ua_lower:
            os_name = "Android"
        elif "iphone" in ua_lower or "ipad" in ua_lower:
            os_name = "iOS"

        device_type = "desktop"
        if "mobile" in ua_lower or "android" in ua_lower:
            device_type = "mobile"
        elif "tablet" in ua_lower or "ipad" in ua_lower:
            device_type = "tablet"

        return {"browser": browser, "os": os_name, "device_type": device_type}

    async def create_session(
        self,
        user_id: str,
        token_jti: str,
        refresh_token_jti: str,
        ip_address: str,
        user_agent: str,
        device_name: str = None,
    ) -> dict:
        active_count = await self.session_repo.get_active_session_count(user_id)
        if active_count >= MAX_SESSIONS_PER_USER:
            sessions = await self.session_repo.get_active_sessions(user_id)
            if sessions:
                await self.session_repo.revoke_session(sessions[-1].id, "session_limit_exceeded")

        fingerprint = self.generate_device_fingerprint(user_agent, ip_address)
        ua_info = self.parse_user_agent(user_agent)

        session = await self.session_repo.create_session(
            user_id=user_id,
            token_jti=token_jti,
            refresh_token_jti=refresh_token_jti,
            ip_address=ip_address,
            user_agent=user_agent,
            device_fingerprint=fingerprint,
            device_name=device_name or f"{ua_info['browser']} on {ua_info['os']}",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        )

        await self.event_repo.record_event(
            event_type="session_created",
            severity="info",
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details={"session_id": str(session.id), "device": ua_info},
        )

        return {
            "session_id": str(session.id),
            "device_name": session.device_name,
            "device_info": ua_info,
        }

    async def get_active_sessions(self, user_id: str, current_token_jti: str = None) -> list[dict]:
        sessions = await self.session_repo.get_active_sessions(user_id)
        result = []

        for s in sessions:
            result.append({
                "id": str(s.id),
                "device_name": s.device_name,
                "device_type": s.device_type if hasattr(s, "device_type") else None,
                "ip_address": s.ip_address,
                "location_country": s.location_country,
                "location_city": s.location_city,
                "last_activity_at": s.last_activity_at.isoformat(),
                "created_at": s.created_at.isoformat(),
                "is_current": s.token_jti == current_token_jti,
            })

        return result

    async def revoke_session(self, user_id: str, session_id: UUID, reason: str = "user_requested") -> dict:
        session = await self.session_repo.revoke_session(session_id, reason)
        if not session:
            return {"success": False, "message": "Session not found"}

        await self.event_repo.record_event(
            event_type="session_revoked",
            severity="info",
            user_id=user_id,
            details={"session_id": str(session_id), "reason": reason},
        )

        return {"success": True, "message": "Session revoked"}

    async def revoke_all_sessions(self, user_id: str, except_session_id: UUID = None) -> dict:
        count = await self.session_repo.revoke_all_user_sessions(user_id, except_session_id)

        await self.event_repo.record_event(
            event_type="session_revoked",
            severity="info",
            user_id=user_id,
            details={"count": count, "reason": "bulk_revoke"},
        )

        return {"success": True, "revoked_count": count}

    async def add_trusted_device(
        self,
        user_id: str,
        device_fingerprint: str,
        device_name: str,
        device_type: str = None,
        browser: str = None,
        os: str = None,
        ip_address: str = None,
        trust_duration_days: int = 30,
    ) -> dict:
        existing = await self.device_repo.get_by_fingerprint(user_id, device_fingerprint)
        if existing:
            return {"success": True, "device_id": str(existing.id), "message": "Device already trusted"}

        device = await self.device_repo.add_device(
            user_id=user_id,
            device_fingerprint=device_fingerprint,
            device_name=device_name,
            device_type=device_type,
            browser=browser,
            os=os,
            ip_address=ip_address,
            trust_duration_days=trust_duration_days,
        )

        await self.event_repo.record_event(
            event_type="trusted_device_added",
            severity="info",
            user_id=user_id,
            ip_address=ip_address,
            details={"device_id": str(device.id), "device_name": device_name},
        )

        return {"success": True, "device_id": str(device.id)}

    async def is_device_trusted(self, user_id: str, fingerprint: str) -> bool:
        device = await self.device_repo.get_by_fingerprint(user_id, fingerprint)
        return device is not None

    async def get_trusted_devices(self, user_id: str) -> list[dict]:
        devices = await self.device_repo.get_user_devices(user_id)
        return [
            {
                "id": str(d.id),
                "device_name": d.device_name,
                "device_type": d.device_type,
                "browser": d.browser,
                "os": d.os,
                "ip_address": d.ip_address,
                "last_seen_at": d.last_seen_at.isoformat(),
                "trusted_until": d.trusted_until.isoformat(),
                "is_active": d.is_active,
            }
            for d in devices
        ]

    async def revoke_trusted_device(self, user_id: str, device_id: UUID) -> dict:
        device = await self.device_repo.revoke_device(device_id)
        if not device:
            return {"success": False, "message": "Device not found"}

        await self.event_repo.record_event(
            event_type="trusted_device_removed",
            severity="info",
            user_id=user_id,
            details={"device_id": str(device_id)},
        )

        return {"success": True, "message": "Device removed"}
