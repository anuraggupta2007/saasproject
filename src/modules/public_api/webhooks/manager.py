import asyncio
import hashlib
import hmac
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

import aiohttp

from src.modules.public_api.auth import request_signer
from src.modules.performance.cache.redis_cache import cache_manager

logger = logging.getLogger(__name__)


class WebhookManager:
    """Manages webhook delivery with retries and signature verification."""

    RETRY_DELAYS = [10, 30, 60, 300, 900]
    MAX_ATTEMPTS = 5

    async def send_webhook(
        self,
        webhook_id: str,
        url: str,
        event: str,
        payload: dict,
        secret: str,
        delivery_id: str = None,
    ) -> dict:
        timestamp = int(time.time())
        body = json.dumps(payload, default=str)
        signature = request_signer.sign(f"{timestamp}.{body}", secret)

        headers = {
            "Content-Type": "application/json",
            "X-Webhook-Event": event,
            "X-Webhook-Signature": f"sha256={signature}",
            "X-Webhook-Timestamp": str(timestamp),
            "X-Webhook-Delivery-Id": delivery_id or "",
            "User-Agent": "EmailConverter-Webhook/1.0",
        }

        start_time = time.perf_counter()
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    data=body,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as response:
                    duration_ms = (time.perf_counter() - start_time) * 1000
                    response_body = await response.text()

                    result = {
                        "success": 200 <= response.status < 300,
                        "status_code": response.status,
                        "response_body": response_body[:1000],
                        "duration_ms": round(duration_ms, 2),
                    }

                    if result["success"]:
                        logger.info(
                            f"Webhook delivered: event={event}, url={url}, "
                            f"status={response.status}, duration={duration_ms:.0f}ms"
                        )
                    else:
                        logger.warning(
                            f"Webhook delivery failed: event={event}, url={url}, "
                            f"status={response.status}"
                        )
                    return result

        except asyncio.TimeoutError:
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.warning(f"Webhook timeout: event={event}, url={url}")
            return {
                "success": False,
                "status_code": 0,
                "response_body": "Timeout",
                "duration_ms": round(duration_ms, 2),
                "error": "timeout",
            }
        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.error(f"Webhook error: event={event}, url={url}, error={e}")
            return {
                "success": False,
                "status_code": 0,
                "response_body": str(e),
                "duration_ms": round(duration_ms, 2),
                "error": str(e),
            }

    async def deliver_with_retry(
        self,
        webhook_id: str,
        url: str,
        event: str,
        payload: dict,
        secret: str,
        delivery_id: str,
    ) -> dict:
        for attempt in range(self.MAX_ATTEMPTS):
            result = await self.send_webhook(
                webhook_id, url, event, payload, secret, delivery_id
            )
            if result["success"]:
                return {"delivered": True, "attempts": attempt + 1, **result}

            if attempt < self.MAX_ATTEMPTS - 1:
                delay = self.RETRY_DELAYS[min(attempt, len(self.RETRY_DELAYS) - 1)]
                logger.info(
                    f"Webhook retry {attempt + 1}/{self.MAX_ATTEMPTS} "
                    f"for {event} in {delay}s"
                )
                await asyncio.sleep(delay)

        return {
            "delivered": False,
            "attempts": self.MAX_ATTEMPTS,
            "last_status": result.get("status_code"),
            "error": result.get("error", "max_retries_exceeded"),
        }

    def verify_signature(
        self, payload: str, signature: str, secret: str, timestamp: int
    ) -> bool:
        return request_signer.verify_webhook(payload, signature, secret, timestamp)

    async def trigger_event(self, event: str, payload: dict, user_id: str = None):
        from src.db.session import async_session_factory
        from src.modules.public_api.repository import WebhookRepository, WebhookDeliveryRepository

        async with async_session_factory() as session:
            webhook_repo = WebhookRepository(session)
            delivery_repo = WebhookDeliveryRepository(session)

            webhooks = await webhook_repo.get_active_for_event(event)

            for webhook in webhooks:
                if user_id and str(webhook.user_id) != user_id:
                    continue

                delivery = await delivery_repo.create_delivery(
                    webhook_id=webhook.id,
                    event=event,
                    payload=payload,
                    max_attempts=self.MAX_ATTEMPTS,
                )

                result = await self.deliver_with_retry(
                    webhook_id=str(webhook.id),
                    url=webhook.url,
                    event=event,
                    payload=payload,
                    secret=webhook.secret,
                    delivery_id=str(delivery.id),
                )

                status = "delivered" if result["delivered"] else "failed"
                await delivery_repo.update_delivery(
                    delivery_id=delivery.id,
                    status=status,
                    status_code=result.get("last_status"),
                    attempts=result.get("attempts", 1),
                    error_message=result.get("error"),
                )


webhook_manager = WebhookManager()
