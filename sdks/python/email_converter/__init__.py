from .client import EmailConverterClient
from .exceptions import (
    EmailConverterError,
    AuthenticationError,
    RateLimitError,
    ValidationError,
    WebhookError,
)

__version__ = "1.0.0"

__all__ = [
    "EmailConverterClient",
    "EmailConverterError",
    "AuthenticationError",
    "RateLimitError",
    "ValidationError",
    "WebhookError",
]
