import hashlib
import hmac
import time
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization
import base64

from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger(__name__)


class LicenseSigner:
    def __init__(self):
        self._private_key = None
        self._public_key = None

    def _get_keys(self):
        if self._private_key is None:
            key_seed = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
            self._private_key = ed25519.Ed25519PrivateKey.from_private_bytes(key_seed)
            self._public_key = self._private_key.public_key()

    def sign_data(self, data: str) -> str:
        self._get_keys()
        signature = self._private_key.sign(data.encode())
        return base64.urlsafe_b64encode(signature).decode()

    def verify_signature(self, data: str, signature: str) -> bool:
        try:
            self._get_keys()
            self._public_key.verify(
                base64.urlsafe_b64decode(signature.encode()),
                data.encode()
            )
            return True
        except Exception as e:
            logger.warning(f"Signature verification failed: {e}")
            return False

    def generate_offline_token(
        self,
        license_id: str,
        user_id: str,
        features: dict,
        expires_in_hours: int = 24,
    ) -> str:
        self._get_keys()

        payload = {
            "license_id": license_id,
            "user_id": user_id,
            "features": features,
            "iat": int(time.time()),
            "exp": int(time.time()) + (expires_in_hours * 3600),
            "jti": secrets.token_hex(16),
        }

        payload_str = f"{payload['license_id']}:{payload['user_id']}:{payload['exp']}:{payload['jti']}"
        signature = self._private_key.sign(payload_str.encode())

        token_data = f"{base64.urlsafe_b64encode(payload_str.encode()).decode()}.{base64.urlsafe_b64encode(signature).decode()}"
        return token_data

    def verify_offline_token(self, token: str) -> Optional[dict]:
        try:
            self._get_keys()

            parts = token.split(".")
            if len(parts) != 2:
                return None

            payload_b64, signature_b64 = parts
            payload_str = base64.urlsafe_b64decode(payload_b64.encode()).decode()
            signature = base64.urlsafe_b64decode(signature_b64.encode())

            self._public_key.verify(signature, payload_str.encode())

            payload_parts = payload_str.split(":")
            if len(payload_parts) != 4:
                return None

            exp = int(payload_parts[2])
            if exp < int(time.time()):
                logger.warning("Offline token expired")
                return None

            return {
                "license_id": payload_parts[0],
                "user_id": payload_parts[1],
                "expires_at": payload_parts[2],
                "jti": payload_parts[3],
            }
        except Exception as e:
            logger.error(f"Offline token verification failed: {e}")
            return None

    def generate_hmac(self, data: str) -> str:
        return hmac.new(
            settings.SECRET_KEY.encode(),
            data.encode(),
            hashlib.sha256
        ).hexdigest()

    def verify_hmac(self, data: str, expected_hmac: str) -> bool:
        actual_hmac = self.generate_hmac(data)
        return hmac.compare_digest(actual_hmac, expected_hmac)


license_signer = LicenseSigner()
