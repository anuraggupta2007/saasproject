import re
import hmac
import secrets
from datetime import datetime, timezone, timedelta
from argon2 import PasswordHasher, exceptions as argon2_exceptions
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.logging import get_logger
from src.modules.security.repositories.security import (
    PasswordHistoryRepository,
    LoginAttemptRepository,
)

logger = get_logger(__name__)

ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
    salt_len=16,
)

MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 30
PASSWORD_HISTORY_SIZE = 5
PASSWORD_EXPIRY_DAYS = 90


class PasswordService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.history_repo = PasswordHistoryRepository(session)
        self.login_repo = LoginAttemptRepository(session)

    def hash_password(self, password: str) -> str:
        return ph.hash(password)

    def verify_password(self, password: str, password_hash: str) -> bool:
        try:
            ph.verify(password_hash, password)
            return True
        except argon2_exceptions.VerifyMismatchError:
            return False
        except argon2_exceptions.InvalidHashError:
            return False

    def check_needs_rehash(self, password_hash: str) -> bool:
        return ph.check_needs_rehash(password_hash)

    def validate_password_strength(self, password: str) -> dict:
        errors = []
        score = 0

        if len(password) >= 12:
            score += 1
        else:
            errors.append("Password must be at least 12 characters long")

        if len(password) >= 16:
            score += 1

        if re.search(r"[A-Z]", password):
            score += 1
        else:
            errors.append("Password must contain at least one uppercase letter")

        if re.search(r"[a-z]", password):
            score += 1
        else:
            errors.append("Password must contain at least one lowercase letter")

        if re.search(r"\d", password):
            score += 1
        else:
            errors.append("Password must contain at least one digit")

        if re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            score += 1
        else:
            errors.append("Password must contain at least one special character")

        if not re.search(r"(.)\1{2,}", password):
            score += 1
        else:
            errors.append("Password must not contain 3+ consecutive identical characters")

        common_patterns = [
            r"password", r"123456", r"qwerty", r"abc123", r"letmein",
            r"admin", r"welcome", r"monkey", r"dragon", r"master",
        ]
        for pattern in common_patterns:
            if re.search(pattern, password, re.IGNORECASE):
                errors.append("Password contains a common pattern")
                score = max(0, score - 2)
                break

        return {
            "score": min(score, 5),
            "feedback": errors,
            "is_valid": len(errors) == 0 and score >= 4,
        }

    async def check_password_history(self, user_id: str, new_password: str) -> bool:
        history = await self.history_repo.get_user_passwords(user_id, PASSWORD_HISTORY_SIZE)
        for entry in history:
            if self.verify_password(new_password, entry.password_hash):
                return False
        return True

    async def change_password(self, user_id: str, current_password: str, new_password: str, current_hash: str) -> dict:
        if not self.verify_password(current_password, current_hash):
            return {"success": False, "message": "Current password is incorrect"}

        validation = self.validate_password_strength(new_password)
        if not validation["is_valid"]:
            return {"success": False, "message": "New password too weak", "errors": validation["feedback"]}

        if not await self.check_password_history(user_id, new_password):
            return {"success": False, "message": "Password was recently used"}

        new_hash = self.hash_password(new_password)
        await self.history_repo.add_password(user_id, new_hash)

        logger.info("password_changed", extra={"user_id": user_id})

        return {"success": True, "message": "Password changed successfully", "new_hash": new_hash}

    async def check_account_lockout(self, email: str, ip_address: str) -> dict:
        failures = await self.login_repo.get_user_failed_attempts(email, LOCKOUT_DURATION_MINUTES)

        if failures >= MAX_LOGIN_ATTEMPTS:
            return {
                "locked": True,
                "locked_until": (datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_DURATION_MINUTES)).isoformat(),
                "failed_attempts": failures,
                "max_attempts": MAX_LOGIN_ATTEMPTS,
            }

        return {
            "locked": False,
            "failed_attempts": failures,
            "max_attempts": MAX_LOGIN_ATTEMPTS,
        }

    async def record_login_attempt(
        self, email: str, ip_address: str, success: bool, user_agent: str = None
    ) -> dict:
        await self.login_repo.record_attempt(
            email=email,
            ip_address=ip_address,
            success=success,
            user_agent=user_agent,
            failure_reason=None if success else "invalid_credentials",
        )

        if not success:
            failures = await self.login_repo.get_user_failed_attempts(email, LOCKOUT_DURATION_MINUTES)
            if failures >= MAX_LOGIN_ATTEMPTS:
                logger.warning(
                    "account_locked",
                    extra={"email": email, "ip_address": ip_address, "failures": failures},
                )
                return {"locked": True, "failures": failures}

        return {"locked": False}

    def generate_backup_codes(self, count: int = 10) -> list[str]:
        return [secrets.token_hex(4).upper() for _ in range(count)]

    def hash_backup_codes(self, codes: list[str]) -> str:
        import hashlib
        combined = "|".join(sorted(codes))
        return hashlib.sha256(combined.encode()).hexdigest()

    def verify_backup_code(self, code: str, codes_hash: str) -> bool:
        import hashlib
        code_upper = code.upper()
        test_hash = hashlib.sha256(code_upper.encode()).hexdigest()
        return hmac.compare_digest(test_hash, codes_hash)
