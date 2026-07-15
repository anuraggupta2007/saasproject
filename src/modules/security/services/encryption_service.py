import os
import base64
import hashlib
import hmac
import secrets
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger(__name__)


class EncryptionService:
    def __init__(self):
        self._fernet = None

    def _get_fernet(self, key: str = None) -> Fernet:
        if key:
            key_bytes = key.encode() if isinstance(key, str) else key
        else:
            key_bytes = settings.SECRET_KEY.encode()

        salt = hashlib.sha256(settings.SECRET_KEY.encode()).digest()[:16]
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=600000,
        )
        derived_key = base64.urlsafe_b64encode(kdf.derive(key_bytes))
        return Fernet(derived_key)

    def encrypt(self, data: str, key: str = None) -> bytes:
        fernet = self._get_fernet(key)
        return fernet.encrypt(data.encode())

    def decrypt(self, encrypted_data: bytes, key: str = None) -> str:
        fernet = self._get_fernet(key)
        return fernet.decrypt(encrypted_data).decode()

    def encrypt_dict(self, data: dict, key: str = None) -> bytes:
        import json
        return self.encrypt(json.dumps(data), key)

    def decrypt_dict(self, encrypted_data: bytes, key: str = None) -> dict:
        import json
        return json.loads(self.decrypt(encrypted_data, key))

    def hash_api_key(self, api_key: str) -> str:
        return hashlib.sha256(api_key.encode()).hexdigest()

    def generate_secure_token(self, length: int = 32) -> str:
        return base64.urlsafe_b64encode(os.urandom(length)).decode()

    def sign_data(self, data: str) -> str:
        import hmac
        return hmac.new(
            settings.SECRET_KEY.encode(),
            data.encode(),
            hashlib.sha256,
        ).hexdigest()

    def verify_signature(self, data: str, signature: str) -> bool:
        expected = self.sign_data(data)
        return hmac.compare_digest(expected, signature)

    def encrypt_sensitive_field(self, value: str) -> bytes:
        return self.encrypt(value, key=f"{settings.SECRET_KEY}:sensitive")

    def decrypt_sensitive_field(self, encrypted_value: bytes) -> str:
        return self.decrypt(encrypted_value, key=f"{settings.SECRET_KEY}:sensitive")
