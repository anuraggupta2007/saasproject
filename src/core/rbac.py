import uuid
from typing import Annotated

from fastapi import Depends, Header, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.dependencies import get_db
from src.core.exceptions import ForbiddenException, UnauthorizedException
from src.models.base import User
from src.repositories.user import UserRepository
from src.services.auth.token import get_user_id_from_token, decode_token


async def get_current_user(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> User:
    token = None

    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]

    if not token and settings.COOKIE_SECURE:
        token = request.cookies.get(settings.ACCESS_TOKEN_COOKIE_NAME)

    if not token:
        raise UnauthorizedException(detail="Not authenticated")

    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise UnauthorizedException(detail="Invalid token type")
    except Exception:
        raise UnauthorizedException(detail="Invalid token")

    user_id = get_user_id_from_token(token)

    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise UnauthorizedException(detail="User not found")

    if not user.is_active:
        raise UnauthorizedException(detail="User account is disabled")

    if user.is_locked:
        raise UnauthorizedException(detail="User account is locked")

    return user


async def get_current_active_verified_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    if not current_user.is_verified:
        raise ForbiddenException(detail="Email not verified")
    return current_user


def require_role(*role_names: str):
    async def role_checker(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if current_user.is_superuser:
            return current_user

        user_role_names = {role.name for role in current_user.roles}
        if not user_role_names.intersection(set(role_names)):
            raise ForbiddenException(
                detail=f"Required role: {', '.join(role_names)}"
            )
        return current_user
    return role_checker


def require_permission(*permissions: str):
    async def permission_checker(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if current_user.is_superuser:
            return current_user

        user_permissions = current_user.get_permissions()

        for perm in permissions:
            if ":" in perm:
                resource, action = perm.split(":", 1)
                if f"{resource}:{action}" not in user_permissions:
                    if f"{resource}:manage" not in user_permissions:
                        raise ForbiddenException(
                            detail=f"Required permission: {perm}"
                        )
            else:
                has_any = any(
                    p.startswith(f"{perm}:") for p in user_permissions
                )
                if not has_any:
                    raise ForbiddenException(
                        detail=f"Required permission: {perm}"
                    )

        return current_user
    return permission_checker


def require_superuser():
    async def superuser_checker(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if not current_user.is_superuser:
            raise ForbiddenException(detail="Superuser privileges required")
        return current_user
    return superuser_checker


get_current_admin = require_role("admin", "superadmin")


async def get_current_user_optional(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> User | None:
    try:
        return await get_current_user(request, authorization, db)
    except UnauthorizedException:
        return None
