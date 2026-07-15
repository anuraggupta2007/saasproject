import os
import base64
import hashlib
import secrets
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from typing import Optional

from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger(__name__)


class LicenseCrypto:
    def __init__(self):
        self._fernet = None
        self._aes_key = None

    def _get_fernet(self) -> Fernet:
        if self._fernet is None:
            key = settings.LICENSE_ENCRYPTION_KEY.encode()
            fernet_key = base64.urlsafe_b64encode(
                hashlib.sha256(key).digest()
            )
            self._fernet = Fernet(fernet_key)
        return self._fernet

    def _get_aes_key(self) -> bytes:
        if self._aes_key is None:
            self._aes_key = hashlib.sha256(
                settings.LICENSE_ENCRYPTION_KEY.encode()
            ).digest()
        return self._aes_key

    def generate_license_key(self) -> str:
        parts = []
        for _ in range(4):
            part = secrets.token_hex(4).upper()
            parts.append(part)
        return "-".join(parts)

    def encrypt_license_key(self, license_key: str) -> str:
        fernet = self._get_fernet()
        encrypted = fernet.encrypt(license_key.encode())
        return base64.urlsafe_b64encode(encrypted).decode()

    def decrypt_license_key(self, encrypted_key: str) -> str:
        fernet = self._get_fernet()
        decrypted = fernet.decrypt(base64.urlsafe_b64decode(encrypted_key.encode()))
        return decrypted.decode()

    def encrypt_data(self, data: str) -> bytes:
        aes_key = self._get_aes_key()
        aesgcm = AESGCM(aes_key)
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, data.encode(), None)
        return nonce + ciphertext

    def decrypt_data(self, encrypted_data: bytes) -> str:
        aes_key = self._get_aes_key()
        aesgcm = AESGCM(aes_key)
        nonce = encrypted_data[:12]
        ciphertext = encrypted_data[12:]
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext.decode()

    def generate_validation_token(
        self,
        license_id: str,
        device_fingerprint: str,
        expires_at: str,
    ) -> str:
        payload = f"{license_id}:{device_fingerprint}:{expires_at}"
        signature = hashlib.sha256(
            (payload + settings.SECRET_KEY).encode()
        ).hexdigest()
        token = base64.urlsafe_b64encode(
            f"{payload}:{signature}".encode()
        ).decode()
        return token

    def validate_token(self, token: str) -> Optional[dict]:
        try:
            decoded = base64.urlsafe_b64decode(token.encode()).decode()
            parts = decoded.rsplit(":", 1)
            if len(parts) != 2:
                return None

            payload, signature = parts
            expected_signature = hashlib.sha256(
                (payload + settings.SECRET_KEY).encode()
            ).hexdigest()

            if signature != expected_signature:
                logger.warning("Invalid validation token signature")
                return None

            payload_parts = payload.split(":", 2)
            if len(payload_parts) != 3:
                return None

            return {
                "license_id": payload_parts[0],
                "device_fingerprint": payload_parts[1],
                "expires_at": payload_parts[2],
            }
        except Exception as e:
            logger.error(f"Token validation error: {e}")
            return None


license_crypto = LicenseCrypto()
