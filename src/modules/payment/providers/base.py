from abc import ABC, abstractmethod
from typing import Optional, Any
from dataclasses import dataclass


@dataclass
class PaymentResult:
    success: bool
    payment_id: Optional[str] = None
    status: str = "pending"
    client_secret: Optional[str] = None
    checkout_url: Optional[str] = None
    error_message: Optional[str] = None
    metadata: Optional[dict] = None


@dataclass
class RefundResult:
    success: bool
    refund_id: Optional[str] = None
    status: str = "pending"
    amount: Optional[float] = None
    error_message: Optional[str] = None


@dataclass
class CustomerResult:
    success: bool
    customer_id: Optional[str] = None
    email: Optional[str] = None
    error_message: Optional[str] = None


class PaymentProviderBase(ABC):
    @abstractmethod
    async def create_customer(
        self,
        email: str,
        name: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> CustomerResult:
        pass

    @abstractmethod
    async def create_checkout_session(
        self,
        amount: float,
        currency: str,
        customer_id: Optional[str] = None,
        success_url: Optional[str] = None,
        cancel_url: Optional[str] = None,
        metadata: Optional[dict] = None,
        trial_days: Optional[int] = None,
    ) -> PaymentResult:
        pass

    @abstractmethod
    async def create_subscription(
        self,
        customer_id: str,
        price_id: str,
        trial_days: Optional[int] = None,
        metadata: Optional[dict] = None,
    ) -> PaymentResult:
        pass

    @abstractmethod
    async def create_payment_intent(
        self,
        amount: float,
        currency: str,
        customer_id: Optional[str] = None,
        payment_method_id: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> PaymentResult:
        pass

    @abstractmethod
    async def confirm_payment(
        self,
        payment_intent_id: str,
        payment_method_id: Optional[str] = None,
    ) -> PaymentResult:
        pass

    @abstractmethod
    async def create_refund(
        self,
        payment_id: str,
        amount: Optional[float] = None,
        reason: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> RefundResult:
        pass

    @abstractmethod
    async def cancel_subscription(
        self,
        subscription_id: str,
        immediate: bool = False,
    ) -> bool:
        pass

    @abstractmethod
    async def retrieve_subscription(
        self,
        subscription_id: str,
    ) -> Optional[dict]:
        pass

    @abstractmethod
    async def create_invoice(
        self,
        customer_id: str,
        amount: float,
        currency: str,
        description: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> PaymentResult:
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
    async def get_payment_method(
        self,
        payment_method_id: str,
    ) -> Optional[dict]:
        pass

    @abstractmethod
    async def list_payment_methods(
        self,
        customer_id: str,
    ) -> list[dict]:
        pass
