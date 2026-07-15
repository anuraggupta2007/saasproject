import uuid
from pathlib import Path
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.dependencies import get_db
from src.core.exceptions import ForbiddenException, BadRequestException
from src.models.base import User
from src.repositories.user import UserRepository


class UploadSecurity:
    @staticmethod
    def validate_path(path: str) -> str:
        normalized = Path(path).parts

        if ".." in normalized:
            raise BadRequestException(detail="Invalid path: contains traversal")

        if path.startswith("/"):
            raise BadRequestException(detail="Invalid path: absolute path")

        return str(Path(path).normalize())

    @staticmethod
    def validate_filename(filename: str) -> str:
        dangerous_chars = set('<>:"/\\|?*\x00-\x1f')
        sanitized = "".join(
            c for c in filename if c not in dangerous_chars
        )

        if not sanitized:
            raise BadRequestException(detail="Invalid filename")

        if len(sanitized) > 255:
            sanitized = sanitized[:255]

        return sanitized

    @staticmethod
    def check_upload_permission(user: User) -> bool:
        if not user.is_active:
            raise ForbiddenException(detail="Account is disabled")

        if not user.is_verified:
            raise ForbiddenException(detail="Email not verified")

        return True


class UploadRateLimiter:
    def __init__(self):
        self.max_uploads_per_minute = 10
        self.max_uploads_per_hour = 100
        self.max_uploads_per_day = 1000

    async def check_rate_limit(
        self,
        user_id: uuid.UUID,
        redis_client,
    ) -> bool:
        minute_key = f"upload_rate:{user_id}:minute"
        hour_key = f"upload_rate:{user_id}:hour"
        day_key = f"upload_rate:{user_id}:day"

        minute_count = await redis_client.incr(minute_key)
        if minute_count == 1:
            await redis_client.expire(minute_key, 60)

        hour_count = await redis_client.incr(hour_key)
        if hour_count == 1:
            await redis_client.expire(hour_key, 3600)

        day_count = await redis_client.incr(day_key)
        if day_count == 1:
            await redis_client.expire(day_key, 86400)

        if minute_count > self.max_uploads_per_minute:
            raise ForbiddenException(
                detail="Rate limit exceeded: too many uploads per minute"
            )

        if hour_count > self.max_uploads_per_hour:
            raise ForbiddenException(
                detail="Rate limit exceeded: too many uploads per hour"
            )

        if day_count > self.max_uploads_per_day:
            raise ForbiddenException(
                detail="Rate limit exceeded: too many uploads per day"
            )

        return True


upload_rate_limiter = UploadRateLimiter()


async def get_upload_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    from src.core.rbac import get_current_user
    user = await get_current_user(request, db=db)
    UploadSecurity.check_upload_permission(user)
    return user
