import secrets
import hashlib
from datetime import datetime, timezone, timedelta
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.datetime_utils import ensure_utc
from src.core.logging import get_logger
from src.modules.security.repositories.security import APIKeyRepository, SecurityEventRepository

logger = get_logger(__name__)


class APIKeyService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = APIKeyRepository(session)
        self.event_repo = SecurityEventRepository(session)

    def generate_api_key(self) -> tuple[str, str, str]:
        raw_key = f"ec_{secrets.token_urlsafe(32)}"
        key_prefix = raw_key[:8]
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        return raw_key, key_prefix, key_hash

    async def create_api_key(
        self,
        user_id: str,
        name: str,
        scopes: list[str] = None,
        rate_limit: int = 1000,
        daily_quota: int = 10000,
        expires_in_days: int = None,
    ) -> dict:
        raw_key, key_prefix, key_hash = self.generate_api_key()

        expires_at = None
        if expires_in_days:
            expires_at = datetime.now(timezone.utc) + timedelta(days=expires_in_days)

        api_key = await self.repo.create_api_key(
            user_id=user_id,
            name=name,
            key_prefix=key_prefix,
            key_hash=key_hash,
            scopes=scopes or [],
            rate_limit=rate_limit,
            daily_quota=daily_quota,
            expires_at=expires_at,
        )

        await self.event_repo.record_event(
            event_type="api_key_created",
            severity="info",
            user_id=user_id,
            details={"key_id": str(api_key.id), "name": name},
        )

        logger.info("api_key_created", extra={"user_id": user_id, "key_name": name})

        return {
            "api_key": raw_key,
            "key_id": str(api_key.id),
            "name": name,
            "message": "API key created. Store it securely - it won't be shown again.",
        }

    async def validate_api_key(self, api_key: str) -> dict | None:
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()

        key = await self.repo.get_by_key_hash(key_hash)
        if not key:
            return None

        if not key.is_active:
            return None

        if key.expires_at and ensure_utc(key.expires_at) < datetime.now(timezone.utc):
            return None

        await self.repo.update_last_used(key.id)

        return {
            "user_id": key.user_id,
            "key_id": str(key.id),
            "name": key.name,
            "scopes": key.scopes,
            "rate_limit": key.rate_limit,
            "daily_quota": key.daily_quota,
        }

    async def revoke_api_key(self, user_id: str, key_id: UUID) -> dict:
        key = await self.repo.revoke_api_key(key_id)
        if not key:
            return {"success": False, "message": "API key not found"}

        await self.event_repo.record_event(
            event_type="api_key_revoked",
            severity="info",
            user_id=user_id,
            details={"key_id": str(key_id), "name": key.name},
        )

        logger.info("api_key_revoked", extra={"user_id": user_id, "key_id": str(key_id)})
        return {"success": True, "message": "API key revoked"}

    async def get_user_api_keys(self, user_id: str) -> list[dict]:
        keys = await self.repo.get_user_api_keys(user_id)
        return [
            {
                "id": str(k.id),
                "name": k.name,
                "key_prefix": k.key_prefix,
                "scopes": k.scopes,
                "rate_limit": k.rate_limit,
                "daily_quota": k.daily_quota,
                "is_active": k.is_active,
                "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
                "expires_at": k.expires_at.isoformat() if k.expires_at else None,
                "created_at": k.created_at.isoformat(),
            }
            for k in keys
        ]
