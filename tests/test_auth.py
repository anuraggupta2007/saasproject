import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from src.core.config import settings
from src.core.dependencies import get_db
from src.db.session import Base
from src.main import app
from src.models.base import User, Role, UserSession, EmailVerification, PasswordReset
from src.services.auth.password import hash_password, verify_password
from src.services.auth.token import create_access_token, create_refresh_token, decode_token


TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_auth.db"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine):
    session_factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture(scope="function")
async def client(db_engine):
    session_factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_role(db_session):
    role = Role(
        name="user",
        description="Default user role",
        is_default=True,
        is_system=True,
    )
    db_session.add(role)
    await db_session.commit()
    return role


@pytest_asyncio.fixture
async def test_admin_role(db_session):
    role = Role(
        name="admin",
        description="Administrator role",
        is_default=False,
        is_system=True,
    )
    db_session.add(role)
    await db_session.commit()
    return role


@pytest_asyncio.fixture
async def test_user(db_session, test_role):
    user = User(
        email="test@example.com",
        hashed_password=hash_password("TestPassword123!"),
        full_name="Test User",
        is_active=True,
        is_verified=True,
        password_changed_at=datetime.now(timezone.utc),
    )
    db_session.add(user)
    await db_session.commit()

    from src.models.base import user_roles
    await db_session.execute(
        user_roles.insert().values(user_id=user.id, role_id=test_role.id)
    )
    await db_session.commit()

    return user


@pytest_asyncio.fixture
async def test_unverified_user(db_session, test_role):
    user = User(
        email="unverified@example.com",
        hashed_password=hash_password("TestPassword123!"),
        full_name="Unverified User",
        is_active=True,
        is_verified=False,
        password_changed_at=datetime.now(timezone.utc),
    )
    db_session.add(user)
    await db_session.commit()
    return user


class TestPasswordHashing:
    def test_hash_password(self):
        password = "TestPassword123!"
        hashed = hash_password(password)
        assert hashed != password
        assert verify_password(password, hashed)

    def test_verify_wrong_password(self):
        password = "TestPassword123!"
        hashed = hash_password(password)
        assert not verify_password("WrongPassword", hashed)

    def test_different_hashes(self):
        password = "TestPassword123!"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        assert hash1 != hash2
        assert verify_password(password, hash1)
        assert verify_password(password, hash2)


class TestToken:
    def test_create_access_token(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        decoded = decode_token(token)
        assert decoded["sub"] == str(user_id)
        assert decoded["type"] == "access"

    def test_create_refresh_token(self):
        user_id = uuid.uuid4()
        token, jti, expires_at = create_refresh_token(user_id)
        decoded = decode_token(token)
        assert decoded["sub"] == str(user_id)
        assert decoded["type"] == "refresh"
        assert decoded["jti"] == jti
        assert expires_at > datetime.now(timezone.utc)

    def test_token_expiry(self):
        user_id = uuid.uuid4()
        expires_delta = timedelta(seconds=-1)
        token = create_access_token(user_id, expires_delta=expires_delta)
        from src.core.exceptions import UnauthorizedException
        with pytest.raises(UnauthorizedException):
            decode_token(token)


class TestRegistration:
    @pytest.mark.asyncio
    async def test_register_success(self, client, test_role):
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "new@example.com",
                "password": "StrongPass123!",
                "full_name": "New User",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["email"] == "new@example.com"

    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client, test_user, test_role):
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
                "password": "TestPassword123!",
            },
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_register_weak_password(self, client, test_role):
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "weak@example.com",
                "password": "weak",
            },
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_invalid_email(self, client, test_role):
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "not-an-email",
                "password": "TestPassword123!",
            },
        )
        assert response.status_code == 422


class TestLogin:
    @pytest.mark.asyncio
    async def test_login_success(self, client, test_user):
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "TestPassword123!",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client, test_user):
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "WrongPassword123!",
            },
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client):
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "TestPassword123!",
            },
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_remember_me(self, client, test_user):
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "TestPassword123!",
                "remember_me": True,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data


class TestTokenRefresh:
    @pytest.mark.asyncio
    async def test_refresh_success(self, client, test_user):
        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "TestPassword123!",
            },
        )
        refresh_token = login_response.json()["refresh_token"]

        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    @pytest.mark.asyncio
    async def test_refresh_invalid_token(self, client):
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid_token"},
        )
        assert response.status_code == 401


class TestLogout:
    @pytest.mark.asyncio
    async def test_logout_success(self, client, test_user):
        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "TestPassword123!",
            },
        )
        tokens = login_response.json()

        response = await client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": tokens["refresh_token"]},
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_logout_all_devices(self, client, test_user):
        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "TestPassword123!",
            },
        )
        tokens = login_response.json()

        response = await client.post(
            "/api/v1/auth/logout-all",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        assert response.status_code == 200


class TestPasswordReset:
    @pytest.mark.asyncio
    async def test_forgot_password(self, client, test_user):
        response = await client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "test@example.com"},
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_forgot_password_nonexistent_email(self, client):
        response = await client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "nonexistent@example.com"},
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_reset_password_invalid_token(self, client):
        response = await client.post(
            "/api/v1/auth/reset-password",
            json={
                "token": "invalid_token",
                "new_password": "NewPassword123!",
            },
        )
        assert response.status_code == 400


class TestEmailVerification:
    @pytest.mark.asyncio
    async def test_verify_email_invalid_token(self, client):
        response = await client.post(
            "/api/v1/auth/verify-email",
            json={"token": "invalid_token"},
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_resend_verification(self, client, test_unverified_user):
        response = await client.post(
            "/api/v1/auth/resend-verification",
            json={"email": "unverified@example.com"},
        )
        assert response.status_code == 200


class TestUserProfile:
    @pytest.mark.asyncio
    async def test_get_profile(self, client, test_user):
        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "TestPassword123!",
            },
        )
        access_token = login_response.json()["access_token"]

        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert "permissions" in data

    @pytest.mark.asyncio
    async def test_update_profile(self, client, test_user):
        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "TestPassword123!",
            },
        )
        access_token = login_response.json()["access_token"]

        response = await client.put(
            "/api/v1/auth/me",
            json={"full_name": "Updated Name"},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Updated Name"


class TestSessions:
    @pytest.mark.asyncio
    async def test_get_sessions(self, client, test_user):
        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "TestPassword123!",
            },
        )
        access_token = login_response.json()["access_token"]

        response = await client.get(
            "/api/v1/auth/sessions",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0


class TestProtectedRoutes:
    @pytest.mark.asyncio
    async def test_access_without_token(self, client):
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_access_with_invalid_token(self, client):
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid_token"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_access_with_expired_token(self, client):
        user_id = uuid.uuid4()
        from datetime import timedelta
        token = create_access_token(user_id, expires_delta=timedelta(seconds=-1))
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 401
