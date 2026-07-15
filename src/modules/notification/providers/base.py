from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class MessageResult:
    success: bool
    message_id: Optional[str] = None
    status: str = "pending"
    error_message: Optional[str] = None
    metadata: Optional[dict] = None


class EmailProviderBase(ABC):
    @abstractmethod
    async def send_email(
        self,
        to: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
        reply_to: Optional[str] = None,
        attachments: Optional[list] = None,
        metadata: Optional[dict] = None,
    ) -> MessageResult:
        pass

    @abstractmethod
    async def send_bulk(
        self,
        recipients: list[dict],
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
        from_email: Optional[str] = None,
    ) -> list[MessageResult]:
        pass

    @abstractmethod
    async def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str,
        secret: str,
    ) -> bool:
        pass

    @abstractmethod
    async def get_delivery_status(
        self,
        message_id: str,
    ) -> Optional[dict]:
        pass


class SMSProviderBase(ABC):
    @abstractmethod
    async def send_sms(
        self,
        to: str,
        message: str,
        from_number: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> MessageResult:
        pass

    @abstractmethod
    async def send_bulk(
        self,
        recipients: list[dict],
        message: str,
        from_number: Optional[str] = None,
    ) -> list[MessageResult]:
        pass

    @abstractmethod
    async def get_delivery_status(
        self,
        message_id: str,
    ) -> Optional[dict]:
        pass


class PushProviderBase(ABC):
    @abstractmethod
    async def send_push(
        self,
        device_tokens: list[str],
        title: str,
        body: str,
        data: Optional[dict] = None,
        image_url: Optional[str] = None,
    ) -> MessageResult:
        pass

    @abstractmethod
    async def send_bulk(
        self,
        device_tokens: list[str],
        title: str,
        body: str,
        data: Optional[dict] = None,
    ) -> list[MessageResult]:
        pass

    @abstractmethod
    async def register_device(
        self,
        user_id: str,
        device_token: str,
        platform: str,
    ) -> bool:
        pass

    @abstractmethod
    async def unregister_device(
        self,
        device_token: str,
    ) -> bool:
        pass
