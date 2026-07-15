import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt

from src.core.config import settings
from src.core.exceptions import UnauthorizedException


def create_access_token(
    user_id: uuid.UUID,
    claims: dict[str, Any] | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))

    payload = {
        "sub": str(user_id),
        "exp": expire,
        "iat": now,
        "type": "access",
    }

    if claims:
        payload.update(claims)

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(
    user_id: uuid.UUID,
    expires_delta: timedelta | None = None,
) -> tuple[str, str, datetime]:
    now = datetime.now(timezone.utc)
    jti = str(uuid.uuid4())
    expire = now + (expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))

    payload = {
        "sub": str(user_id),
        "exp": expire,
        "iat": now,
        "jti": jti,
        "type": "refresh",
    }

    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, jti, expire


def decode_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError as e:
        raise UnauthorizedException(detail=f"Invalid token: {str(e)}")


def get_user_id_from_token(token: str) -> uuid.UUID:
    payload = decode_token(token)
    user_id = payload.get("sub")
    if user_id is None:
        raise UnauthorizedException(detail="Invalid token payload")
    try:
        return uuid.UUID(user_id)
    except ValueError:
        raise UnauthorizedException(detail="Invalid user ID in token")


def get_token_type(token: str) -> str:
    payload = decode_token(token)
    token_type = payload.get("type")
    if token_type is None:
        raise UnauthorizedException(detail="Invalid token type")
    return token_type


def get_token_jti(token: str) -> str:
    payload = decode_token(token)
    jti = payload.get("jti")
    if jti is None:
        raise UnauthorizedException(detail="Invalid token JTI")
    return jti


def is_token_expired(token: str) -> bool:
    try:
        payload = decode_token(token)
        exp = payload.get("exp")
        if exp is None:
            return True
        expire_time = datetime.fromtimestamp(exp, tz=timezone.utc)
        return datetime.now(timezone.utc) > expire_time
    except Exception:
        return True
