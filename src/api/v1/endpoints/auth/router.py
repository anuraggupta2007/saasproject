import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.cookies import set_auth_cookies, clear_auth_cookies
from src.core.dependencies import get_db
from src.core.rbac import (
    get_current_user,
    get_current_active_verified_user,
    get_current_user_optional,
    require_superuser,
)
from src.models.base import User
from src.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    RegisterResponse,
    RefreshTokenRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    VerifyEmailRequest,
    OAuthCallbackRequest,
    OAuthAuthorizeResponse,
    SessionResponse,
)
from src.schemas.user import UserResponse, UserWithRoles, UserWithPermissions, UserUpdate
from src.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(
    request: Request,
    response: Response,
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> RegisterResponse:
    service = AuthService(db)
    result = await service.register(
        email=body.email,
        password=body.password,
        full_name=body.full_name,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()

    register_response = RegisterResponse(**result)
    set_auth_cookies(response, result["access_token"], result["refresh_token"], result["expires_in"])

    return register_response


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    response: Response,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    service = AuthService(db)
    result = await service.login(
        email=body.email,
        password=body.password,
        remember_me=body.remember_me,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()

    token_response = TokenResponse(**result)
    set_auth_cookies(response, result["access_token"], result["refresh_token"], result["expires_in"])

    return token_response


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    body: RefreshTokenRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = AuthService(db)
    await service.logout(
        body.refresh_token,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()

    clear_auth_cookies(response)

    return {"message": "Successfully logged out"}


@router.post("/logout-all")
async def logout_all_devices(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = AuthService(db)
    count = await service.logout_all_devices(current_user.id)
    await db.commit()

    clear_auth_cookies(response)

    return {"message": f"Logged out from {count} sessions"}


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(
    request: Request,
    response: Response,
    body: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    service = AuthService(db)
    result = await service.refresh_tokens(
        body.refresh_token,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()

    token_response = TokenResponse(**result)
    set_auth_cookies(response, result["access_token"], result["refresh_token"], result["expires_in"])

    return token_response


@router.post("/verify-email")
async def verify_email(
    request: Request,
    body: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = AuthService(db)
    await service.verify_email(
        body.token,
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    return {"message": "Email verified successfully"}


@router.post("/resend-verification")
async def resend_verification(
    request: Request,
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = AuthService(db)
    await service.resend_verification(
        body.email,
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    return {"message": "If the email exists, a verification link has been sent"}


@router.post("/forgot-password")
async def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = AuthService(db)
    await service.forgot_password(
        body.email,
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/reset-password")
async def reset_password(
    request: Request,
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = AuthService(db)
    await service.reset_password(
        body.token,
        body.new_password,
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    return {"message": "Password reset successfully"}


@router.post("/change-password")
async def change_password(
    request: Request,
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_verified_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = AuthService(db)
    await service.change_password(
        current_user.id,
        body.current_password,
        body.new_password,
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    return {"message": "Password changed successfully"}


@router.get("/me", response_model=UserWithPermissions)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_verified_user),
) -> UserWithPermissions:
    user_data = UserWithPermissions.model_validate(current_user)
    user_data.permissions = list(current_user.get_permissions())
    return user_data


@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    body: UserUpdate,
    current_user: User = Depends(get_current_active_verified_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    from src.repositories.user import UserRepository

    user_repo = UserRepository(db)
    updated_user = await user_repo.update(
        current_user.id,
        **body.model_dump(exclude_unset=True),
    )
    await db.commit()
    return UserResponse.model_validate(updated_user)


@router.get("/sessions")
async def get_user_sessions(
    current_user: User = Depends(get_current_active_verified_user),
    db: AsyncSession = Depends(get_db),
) -> list[SessionResponse]:
    service = AuthService(db)
    sessions = await service.get_sessions(current_user.id)
    return [SessionResponse(**s) for s in sessions]


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_active_verified_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = AuthService(db)
    success = await service.revoke_session(current_user.id, session_id)
    if not success:
        from src.core.exceptions import NotFoundException
        raise NotFoundException(detail="Session not found")
    await db.commit()
    return {"message": "Session revoked"}


@router.get("/oauth/{provider}/authorize", response_model=OAuthAuthorizeResponse)
async def oauth_authorize(
    provider: str,
) -> OAuthAuthorizeResponse:
    from src.services.oauth import oauth_service

    if provider not in ("google", "microsoft"):
        from src.core.exceptions import BadRequestException
        raise BadRequestException(detail=f"Unsupported provider: {provider}")

    state = oauth_service.generate_state()

    if provider == "google":
        url = oauth_service.get_google_authorize_url(state)
    else:
        url = oauth_service.get_microsoft_authorize_url(state)

    return OAuthAuthorizeResponse(url=url, state=state)


@router.get("/oauth/{provider}/callback")
async def oauth_callback_get(
    request: Request,
    response: Response,
    provider: str,
    code: str,
    state: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    from fastapi.responses import RedirectResponse
    from src.core.exceptions import BadRequestException

    frontend_url = settings.FRONTEND_URL or "http://localhost:3000"

    if provider not in ("google", "microsoft"):
        return RedirectResponse(url=f"{frontend_url}/login?error=unsupported_provider")

    try:
        service = AuthService(db)
        result = await service.oauth_login(
            provider,
            code,
            user_agent=request.headers.get("user-agent"),
            ip_address=request.client.host if request.client else None,
        )
        await db.commit()

        redirect_response = RedirectResponse(url=f"{frontend_url}/dashboard")
        set_auth_cookies(redirect_response, result["access_token"], result["refresh_token"], result["expires_in"])
        return redirect_response
    except Exception as e:
        return RedirectResponse(url=f"{frontend_url}/login?error=oauth_failed")


@router.post("/oauth/{provider}/callback", response_model=TokenResponse)
async def oauth_callback(
    request: Request,
    response: Response,
    provider: str,
    body: OAuthCallbackRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    if provider not in ("google", "microsoft"):
        from src.core.exceptions import BadRequestException
        raise BadRequestException(detail=f"Unsupported provider: {provider}")

    service = AuthService(db)
    result = await service.oauth_login(
        provider,
        body.code,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()

    token_response = TokenResponse(**result)
    set_auth_cookies(response, result["access_token"], result["refresh_token"], result["expires_in"])

    return token_response


@router.get("/admin/users", dependencies=[Depends(require_superuser())])
async def list_users(
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    is_active: bool | None = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    from src.repositories.user import UserRepository

    user_repo = UserRepository(db)
    skip = (page - 1) * page_size
    users, total = await user_repo.list_users(
        skip=skip,
        limit=page_size,
        search=search,
        is_active=is_active,
    )

    return {
        "users": [UserResponse.model_validate(u) for u in users],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
    }
