from __future__ import annotations

import hashlib
import hmac
import time
from datetime import datetime
from typing import Any, Optional
from urllib.parse import urljoin
from uuid import UUID

import httpx

from .exceptions import (
    AuthenticationError,
    EmailConverterError,
    NotFoundError,
    RateLimitError,
    ServerError,
    ValidationError,
)
from .models import (
    Conversion,
    ConversionListResponse,
    ConversionStatus,
    RateLimitStatus,
    SearchResponse,
    SearchResult,
    Upload,
    UploadResponse,
    UserProfile,
    Webhook,
    WebhookDelivery,
)


class EmailConverterClient:
    """Python SDK client for the Email Converter Public API."""

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.emailconverter.com",
        timeout: float = 30.0,
        max_retries: int = 3,
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        self._client = httpx.Client(
            base_url=self.base_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "X-API-Version": "1",
            },
            timeout=self.timeout,
        )

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    def close(self):
        self._client.close()

    def _request(
        self,
        method: str,
        path: str,
        json: Optional[dict] = None,
        params: Optional[dict] = None,
        files: Optional[dict] = None,
    ) -> dict:
        for attempt in range(self.max_retries + 1):
            try:
                response = self._client.request(
                    method, path, json=json, params=params, files=files
                )
                if response.status_code == 401:
                    raise AuthenticationError("Invalid API key")
                if response.status_code == 404:
                    raise NotFoundError(f"Resource not found: {path}")
                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", 60))
                    raise RateLimitError(
                        f"Rate limit exceeded", retry_after=retry_after
                    )
                if response.status_code >= 500:
                    if attempt < self.max_retries:
                        time.sleep(2 ** attempt)
                        continue
                    raise ServerError(f"Server error: {response.status_code}")
                if response.status_code >= 400:
                    raise ValidationError(
                        f"Validation error: {response.text}", status_code=response.status_code
                    )
                return response.json()
            except httpx.RequestError as e:
                if attempt < self.max_retries:
                    time.sleep(2 ** attempt)
                    continue
                raise EmailConverterError(f"Request failed: {e}")

    def _make_url(self, path: str) -> str:
        return f"{self.base_url}{path}"

    # =========================================================================
    # User Endpoints
    # =========================================================================

    def get_profile(self) -> UserProfile:
        data = self._request("GET", "/api/public/v1/users/me")
        return UserProfile(**data)

    def get_usage(self, period: str = "current") -> dict:
        return self._request("GET", "/api/public/v1/users/me/usage", params={"period": period})

    def get_subscription(self) -> dict:
        return self._request("GET", "/api/public/v1/users/me/subscription")

    # =========================================================================
    # API Key Endpoints
    # =========================================================================

    def create_api_key(
        self,
        name: str,
        scopes: list[str],
        expires_in_days: Optional[int] = None,
        metadata: Optional[dict] = None,
    ) -> dict:
        body = {"name": name, "scopes": scopes}
        if expires_in_days is not None:
            body["expires_in_days"] = expires_in_days
        if metadata:
            body["metadata"] = metadata
        return self._request("POST", "/api/public/v1/auth/keys", json=body)

    def list_api_keys(self) -> list[dict]:
        return self._request("GET", "/api/public/v1/auth/keys")

    def rotate_api_key(self, key_id: str) -> dict:
        return self._request("POST", f"/api/public/v1/auth/keys/{key_id}/rotate")

    def revoke_api_key(self, key_id: str) -> dict:
        return self._request("DELETE", f"/api/public/v1/auth/keys/{key_id}")

    # =========================================================================
    # Upload Endpoints
    # =========================================================================

    def create_upload(self, filename: str, file_size: int) -> Upload:
        data = self._request(
            "POST",
            "/api/public/v1/uploads",
            json={"filename": filename, "file_size": file_size},
        )
        return Upload(**data)

    def get_upload(self, upload_id: str) -> Upload:
        data = self._request("GET", f"/api/public/v1/uploads/{upload_id}")
        return Upload(**data)

    def upload_chunk(self, upload_id: str, chunk_number: int, data: bytes) -> dict:
        return self._request(
            "POST",
            f"/api/public/v1/uploads/{upload_id}/chunks",
            files={"data": (f"chunk_{chunk_number}", data)},
            params={"chunk_number": chunk_number},
        )

    def upload_file(self, upload_id: str, file_path: str, chunk_size: int = 8 * 1024 * 1024) -> dict:
        results = []
        with open(file_path, "rb") as f:
            chunk_num = 1
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                result = self.upload_chunk(upload_id, chunk_num, chunk)
                results.append(result)
                chunk_num += 1
        return {"chunks_uploaded": len(results), "upload_id": upload_id}

    def delete_upload(self, upload_id: str) -> dict:
        return self._request("DELETE", f"/api/public/v1/uploads/{upload_id}")

    # =========================================================================
    # Conversion Endpoints
    # =========================================================================

    def create_conversion(
        self,
        upload_id: str,
        target_format: str,
        options: Optional[dict] = None,
    ) -> Conversion:
        body = {"upload_id": upload_id, "target_format": target_format}
        if options:
            body["options"] = options
        data = self._request("POST", "/api/public/v1/conversions", json=body)
        return Conversion(**data)

    def get_conversion(self, conversion_id: str) -> Conversion:
        data = self._request("GET", f"/api/public/v1/conversions/{conversion_id}")
        return Conversion(**data)

    def list_conversions(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
    ) -> ConversionListResponse:
        params: dict[str, Any] = {"page": page, "page_size": page_size}
        if status:
            params["status"] = status
        data = self._request("GET", "/api/public/v1/conversions", params=params)
        items = [Conversion(**item) for item in data.get("items", [])]
        return ConversionListResponse(
            items=items,
            total=data["total"],
            page=data["page"],
            page_size=data["page_size"],
            has_more=data["has_more"],
        )

    def cancel_conversion(self, conversion_id: str) -> dict:
        return self._request("POST", f"/api/public/v1/conversions/{conversion_id}/cancel")

    def download_conversion(self, conversion_id: str) -> dict:
        return self._request("GET", f"/api/public/v1/conversions/{conversion_id}/download")

    def convert_and_wait(
        self,
        upload_id: str,
        target_format: str,
        poll_interval: float = 2.0,
        max_wait: float = 300.0,
    ) -> Conversion:
        conversion = self.create_conversion(upload_id, target_format)
        elapsed = 0.0
        while elapsed < max_wait:
            conversion = self.get_conversion(conversion.id)
            if conversion.status in (ConversionStatus.COMPLETED, ConversionStatus.FAILED):
                return conversion
            time.sleep(poll_interval)
            elapsed += poll_interval
        raise EmailConverterError("Conversion timed out")

    # =========================================================================
    # Search Endpoints
    # =========================================================================

    def search(
        self,
        query: str,
        page: int = 1,
        page_size: int = 20,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        sender: Optional[str] = None,
        has_attachment: Optional[bool] = None,
    ) -> SearchResponse:
        body: dict[str, Any] = {"query": query, "page": page, "page_size": page_size}
        if date_from:
            body["date_from"] = date_from
        if date_to:
            body["date_to"] = date_to
        if sender:
            body["sender"] = sender
        if has_attachment is not None:
            body["has_attachment"] = has_attachment
        data = self._request("POST", "/api/public/v1/search", json=body)
        results = [SearchResult(**r) for r in data.get("results", [])]
        return SearchResponse(
            query=data["query"],
            total_results=data["total_results"],
            page=data["page"],
            page_size=data["page_size"],
            results=results,
            took_ms=data["took_ms"],
        )

    def search_suggestions(self, query: str, limit: int = 10) -> list[str]:
        data = self._request(
            "GET", "/api/public/v1/search/suggestions", params={"q": query, "limit": limit}
        )
        return data.get("suggestions", [])

    # =========================================================================
    # Webhook Endpoints
    # =========================================================================

    def create_webhook(
        self,
        url: str,
        events: list[str],
        description: Optional[str] = None,
        secret: Optional[str] = None,
    ) -> Webhook:
        body: dict[str, Any] = {"url": url, "events": events}
        if description:
            body["description"] = description
        if secret:
            body["secret"] = secret
        data = self._request("POST", "/api/public/v1/webhooks", json=body)
        return Webhook(**data)

    def list_webhooks(self) -> list[Webhook]:
        data = self._request("GET", "/api/public/v1/webhooks")
        return [Webhook(**wh) for wh in data]

    def get_webhook(self, webhook_id: str) -> Webhook:
        data = self._request("GET", f"/api/public/v1/webhooks/{webhook_id}")
        return Webhook(**data)

    def delete_webhook(self, webhook_id: str) -> dict:
        return self._request("DELETE", f"/api/public/v1/webhooks/{webhook_id}")

    def test_webhook(self, webhook_id: str) -> dict:
        return self._request("POST", f"/api/public/v1/webhooks/{webhook_id}/test")

    def list_webhook_deliveries(
        self, webhook_id: str, limit: int = 50
    ) -> list[WebhookDelivery]:
        data = self._request(
            "GET",
            f"/api/public/v1/webhooks/{webhook_id}/deliveries",
            params={"limit": limit},
        )
        return [WebhookDelivery(**d) for d in data]

    @staticmethod
    def verify_webhook_signature(
        payload: bytes, signature: str, secret: str
    ) -> bool:
        expected = hmac.new(
            secret.encode(), payload, hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    # =========================================================================
    # Rate Limit Endpoints
    # =========================================================================

    def get_rate_limit_status(self) -> RateLimitStatus:
        data = self._request("GET", "/api/public/v1/rate-limit/status")
        return RateLimitStatus(**data)

    def list_tiers(self) -> list[dict]:
        return self._request("GET", "/api/public/v1/tiers")

    # =========================================================================
    # Health Endpoints
    # =========================================================================

    def health_check(self) -> dict:
        return self._request("GET", "/api/public/v1/health")

    # =========================================================================
    # OAuth2 Token Exchange
    # =========================================================================

    @classmethod
    def get_oauth_token(
        cls,
        client_id: str,
        client_secret: str,
        base_url: str = "https://api.emailconverter.com",
        scope: Optional[str] = None,
    ) -> dict:
        with httpx.Client(base_url=base_url) as client:
            body: dict[str, str] = {
                "grant_type": "client_credentials",
                "client_id": client_id,
                "client_secret": client_secret,
            }
            if scope:
                body["scope"] = scope
            response = client.post("/api/public/v1/auth/oauth/token", json=body)
            response.raise_for_status()
            return response.json()
