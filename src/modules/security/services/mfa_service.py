import secrets
import hmac
import hashlib
import pyotp
import qrcode
import io
import base64
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.datetime_utils import ensure_utc
from src.core.logging import get_logger
from src.modules.security.repositories.security import MFASecretRepository
from src.modules.security.services.encryption_service import EncryptionService

logger = get_logger(__name__)

MFA_LOCKOUT_ATTEMPTS = 5
MFA_LOCKOUT_MINUTES = 15


class MFAService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = MFASecretRepository(session)
        self.encryption = EncryptionService()

    def generate_secret(self) -> str:
        return pyotp.random_base32()

    def get_totp_uri(self, secret: str, email: str, issuer: str = "EmailConverter") -> str:
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(name=email, issuer_name=issuer)

    def generate_qr_code(self, uri: str) -> str:
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(uri)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)

        return base64.b64encode(buffer.getvalue()).decode()

    def verify_totp(self, secret: str, code: str) -> bool:
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=1)

    def generate_backup_codes(self, count: int = 10) -> list[str]:
        return [secrets.token_hex(4).upper() for _ in range(count)]

    async def setup_mfa(self, user_id: str, email: str) -> dict:
        existing = await self.repo.get_by_user(user_id)
        if existing and existing.enabled:
            return {"success": False, "message": "MFA already enabled"}

        secret = self.generate_secret()
        uri = self.get_totp_uri(secret, email)
        qr_code = self.generate_qr_code(uri)
        backup_codes = self.generate_backup_codes()

        import hashlib
        backup_codes_hash = hashlib.sha256("|".join(sorted(backup_codes)).encode()).hexdigest()

        secret_bytes = self.encryption.encrypt_sensitive_field(secret)
        backup_bytes = self.encryption.encrypt_sensitive_field(backup_codes_hash)

        if existing:
            existing.secret_encrypted = secret_bytes
            existing.backup_codes_encrypted = backup_bytes
            existing.enabled = False
            existing.failed_attempts = 0
            await self.session.commit()
        else:
            await self.repo.create_secret(
                user_id=user_id,
                method="totp",
                secret_encrypted=secret_bytes,
                backup_codes_encrypted=backup_bytes,
            )

        logger.info("mfa_setup_initiated", extra={"user_id": user_id})

        return {
            "success": True,
            "secret": secret,
            "qr_code_url": f"data:image/png;base64,{qr_code}",
            "backup_codes": backup_codes,
            "message": "Scan the QR code with your authenticator app, then verify with a code",
        }

    async def verify_and_enable(self, user_id: str, code: str) -> dict:
        mfa = await self.repo.get_by_user(user_id)
        if not mfa:
            return {"success": False, "message": "MFA not set up"}

        if mfa.locked_until and ensure_utc(mfa.locked_until) > datetime.now(timezone.utc):
            remaining = (mfa.locked_until - datetime.now(timezone.utc)).seconds // 60
            return {"success": False, "message": f"MFA locked. Try again in {remaining} minutes"}

        secret = self.encryption.decrypt_sensitive_field(mfa.secret_encrypted)

        if self.verify_totp(secret, code):
            await self.repo.enable_mfa(user_id)
            mfa.failed_attempts = 0
            mfa.locked_until = None
            await self.session.commit()

            logger.info("mfa_enabled", extra={"user_id": user_id})
            return {"success": True, "message": "MFA enabled successfully"}
        else:
            mfa.failed_attempts += 1
            if mfa.failed_attempts >= MFA_LOCKOUT_ATTEMPTS:
                mfa.locked_until = datetime.now(timezone.utc) + timedelta(minutes=MFA_LOCKOUT_MINUTES)
                logger.warning("mfa_locked", extra={"user_id": user_id, "attempts": mfa.failed_attempts})
            await self.session.commit()

            remaining = MFA_LOCKOUT_ATTEMPTS - mfa.failed_attempts
            return {"success": False, "message": f"Invalid code. {remaining} attempts remaining"}

    async def verify_code(self, user_id: str, code: str) -> dict:
        mfa = await self.repo.get_by_user(user_id)
        if not mfa or not mfa.enabled:
            return {"success": False, "message": "MFA not enabled"}

        if mfa.locked_until and ensure_utc(mfa.locked_until) > datetime.now(timezone.utc):
            return {"success": False, "message": "MFA locked due to too many failed attempts"}

        secret = self.encryption.decrypt_sensitive_field(mfa.secret_encrypted)

        if self.verify_totp(secret, code):
            mfa.failed_attempts = 0
            mfa.locked_until = None
            mfa.last_used_at = datetime.now(timezone.utc)
            await self.session.commit()
            return {"success": True, "message": "MFA verified"}
        else:
            mfa.failed_attempts += 1
            if mfa.failed_attempts >= MFA_LOCKOUT_ATTEMPTS:
                mfa.locked_until = datetime.now(timezone.utc) + timedelta(minutes=MFA_LOCKOUT_MINUTES)
            await self.session.commit()

            return {"success": False, "message": "Invalid MFA code"}

    async def verify_backup_code(self, user_id: str, code: str) -> dict:
        mfa = await self.repo.get_by_user(user_id)
        if not mfa or not mfa.enabled:
            return {"success": False, "message": "MFA not enabled"}

        code_upper = code.upper()
        code_hash = hashlib.sha256(code_upper.encode()).hexdigest()

        stored_data = self.encryption.decrypt_sensitive_field(mfa.backup_codes_encrypted) if mfa.backup_codes_encrypted else ""
        if hmac.compare_digest(code_hash, stored_data):
            mfa.last_used_at = datetime.now(timezone.utc)
            await self.session.commit()
            return {"success": True, "message": "Backup code verified"}

        return {"success": False, "message": "Invalid backup code"}

    async def disable_mfa(self, user_id: str, code: str) -> dict:
        verify_result = await self.verify_code(user_id, code)
        if not verify_result["success"]:
            return verify_result

        await self.repo.disable_mfa(user_id)
        logger.info("mfa_disabled", extra={"user_id": user_id})
        return {"success": True, "message": "MFA disabled"}

    async def get_mfa_status(self, user_id: str) -> dict:
        mfa = await self.repo.get_by_user(user_id)
        if not mfa:
            return {"enabled": False, "method": None, "verified": False}

        return {
            "enabled": mfa.enabled,
            "method": mfa.method if mfa.enabled else None,
            "verified": mfa.enabled and mfa.verified_at is not None,
            "last_used_at": mfa.last_used_at.isoformat() if mfa.last_used_at else None,
        }
