import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
import secrets

import httpx

from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger(__name__)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

MICROSOFT_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
MICROSOFT_USERINFO_URL = "https://graph.microsoft.com/v1.0/me"


class OAuthService:
    def __init__(self):
        self._http_client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        await self._http_client.aclose()

    def generate_state(self) -> str:
        return secrets.token_urlsafe(32)

    def get_google_authorize_url(self, state: str) -> str:
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "offline",
            "prompt": "consent",
        }
        return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"

    async def get_google_user_info(self, code: str) -> dict | None:
        try:
            token_response = await self._http_client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
            )
            token_response.raise_for_status()
            token_data = token_response.json()

            user_response = await self._http_client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
            )
            user_response.raise_for_status()
            user_data = user_response.json()

            return {
                "provider": "google",
                "id": user_data.get("id"),
                "email": user_data.get("email"),
                "name": user_data.get("name"),
                "picture": user_data.get("picture"),
                "verified_email": user_data.get("verified_email", False),
            }
        except Exception as e:
            logger.error("google_oauth_failed", error=str(e))
            return None

    def get_microsoft_authorize_url(self, state: str) -> str:
        params = {
            "client_id": settings.MICROSOFT_CLIENT_ID,
            "redirect_uri": settings.MICROSOFT_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
        }
        return f"{MICROSOFT_AUTH_URL}?{urlencode(params)}"

    async def get_microsoft_user_info(self, code: str) -> dict | None:
        try:
            token_response = await self._http_client.post(
                MICROSOFT_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": settings.MICROSOFT_CLIENT_ID,
                    "client_secret": settings.MICROSOFT_CLIENT_SECRET,
                    "redirect_uri": settings.MICROSOFT_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
            )
            token_response.raise_for_status()
            token_data = token_response.json()

            user_response = await self._http_client.get(
                MICROSOFT_USERINFO_URL,
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
            )
            user_response.raise_for_status()
            user_data = user_response.json()

            return {
                "provider": "microsoft",
                "id": user_data.get("id"),
                "email": user_data.get("mail") or user_data.get("userPrincipalName"),
                "name": user_data.get("displayName"),
                "picture": None,
                "verified_email": True,
            }
        except Exception as e:
            logger.error("microsoft_oauth_failed", error=str(e))
            return None

    async def get_user_info(self, provider: str, code: str) -> dict | None:
        if provider == "google":
            return await self.get_google_user_info(code)
        elif provider == "microsoft":
            return await self.get_microsoft_user_info(code)
        else:
            logger.error("unsupported_oauth_provider", provider=provider)
            return None


oauth_service = OAuthService()
