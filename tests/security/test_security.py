import pytest
from src.modules.security.models.security import (
    SessionStatus,
    MFAMethod,
    SecurityEventType,
    AuditAction,
)
from src.modules.security.services.password_service import PasswordService
from src.modules.security.services.validation_service import InputValidationService
from src.modules.security.services.encryption_service import EncryptionService
from src.modules.security.schemas.security import (
    SessionResponse,
    APIKeyCreateRequest,
    SecurityEventCreateRequest,
    MFAVerifyRequest,
    PasswordChangeRequest,
    SecuritySettingsResponse,
)


class TestModels:
    def test_session_status_values(self):
        assert SessionStatus.ACTIVE.value == "active"
        assert SessionStatus.EXPIRED.value == "expired"
        assert SessionStatus.REVOKED.value == "revoked"

    def test_mfa_method_values(self):
        assert MFAMethod.TOTP.value == "totp"
        assert MFAMethod.EMAIL.value == "email"

    def test_security_event_type_values(self):
        assert SecurityEventType.LOGIN_SUCCESS.value == "login_success"
        assert SecurityEventType.LOGIN_FAILED.value == "login_failed"
        assert SecurityEventType.MFA_ENABLED.value == "mfa_enabled"

    def test_audit_action_values(self):
        assert AuditAction.CREATE.value == "create"
        assert AuditAction.DELETE.value == "delete"


class TestPasswordService:
    def test_hash_password(self):
        service = PasswordService.__new__(PasswordService)
        hashed = service.hash_password("TestPassword123!")
        assert hashed != "TestPassword123!"
        assert "$argon2" in hashed

    def test_verify_password_success(self):
        service = PasswordService.__new__(PasswordService)
        hashed = service.hash_password("TestPassword123!")
        assert service.verify_password("TestPassword123!", hashed) is True

    def test_verify_password_failure(self):
        service = PasswordService.__new__(PasswordService)
        hashed = service.hash_password("TestPassword123!")
        assert service.verify_password("WrongPassword!", hashed) is False

    def test_validate_password_strength_weak(self):
        service = PasswordService.__new__(PasswordService)
        result = service.validate_password_strength("weak")
        assert result["is_valid"] is False
        assert result["score"] < 4

    def test_validate_password_strength_strong(self):
        service = PasswordService.__new__(PasswordService)
        result = service.validate_password_strength("C0mpl3x!P@ssw0rd#2024")
        assert result["is_valid"] is True
        assert result["score"] >= 4

    def test_validate_password_no_repeated_chars(self):
        service = PasswordService.__new__(PasswordService)
        result = service.validate_password_strength("aaaBBB111!@#")
        assert any("consecutive" in f.lower() for f in result["feedback"])


class TestValidationService:
    def test_sql_injection_detection(self):
        service = InputValidationService()
        result = service.check_sql_injection("'; DROP TABLE users; --")
        assert result["safe"] is False

    def test_sql_injection_safe_input(self):
        service = InputValidationService()
        result = service.check_sql_injection("hello world")
        assert result["safe"] is True

    def test_xss_detection(self):
        service = InputValidationService()
        result = service.check_xss("<script>alert('xss')</script>")
        assert result["safe"] is False

    def test_xss_safe_input(self):
        service = InputValidationService()
        result = service.check_xss("Hello World")
        assert result["safe"] is True

    def test_path_traversal_detection(self):
        service = InputValidationService()
        result = service.check_path_traversal("../../../etc/passwd")
        assert result["safe"] is False

    def test_ssrf_detection(self):
        service = InputValidationService()
        result = service.check_ssrf("http://169.254.169.254/latest/meta-data/")
        assert result["safe"] is False

    def test_header_injection_detection(self):
        service = InputValidationService()
        result = service.check_header_injection("value\r\nX-Injected: header")
        assert result["safe"] is False

    def test_sanitize_string(self):
        service = InputValidationService()
        result = service.sanitize_string("<script>alert('xss')</script>")
        assert "<script>" not in result
        assert "&lt;script&gt;" in result

    def test_validate_url(self):
        service = InputValidationService()
        result = service.validate_url("https://example.com")
        assert result["valid"] is True

    def test_validate_url_ssrf(self):
        service = InputValidationService()
        result = service.validate_url("http://127.0.0.1/admin")
        assert result["valid"] is False


class TestEncryptionService:
    def test_encrypt_decrypt(self):
        service = EncryptionService()
        original = "sensitive data"
        encrypted = service.encrypt(original)
        decrypted = service.decrypt(encrypted)
        assert decrypted == original

    def test_encrypt_dict(self):
        service = EncryptionService()
        original = {"key": "value", "nested": {"a": 1}}
        encrypted = service.encrypt_dict(original)
        decrypted = service.decrypt_dict(encrypted)
        assert decrypted == original

    def test_hash_api_key(self):
        service = EncryptionService()
        key = "ec_test123456789"
        hashed = service.hash_api_key(key)
        assert len(hashed) == 64
        assert hashed != key

    def test_generate_secure_token(self):
        service = EncryptionService()
        token = service.generate_secure_token()
        assert len(token) > 0
        assert token != service.generate_secure_token()

    def test_sign_verify(self):
        service = EncryptionService()
        data = "test data"
        signature = service.sign_data(data)
        assert service.verify_signature(data, signature) is True
        assert service.verify_signature("wrong data", signature) is False


class TestSchemas:
    def test_api_key_create_request(self):
        request = APIKeyCreateRequest(name="Test Key", scopes=["read", "write"])
        assert request.name == "Test Key"
        assert "read" in request.scopes

    def test_security_event_create_request(self):
        request = SecurityEventCreateRequest(
            event_type="login_success", severity="info"
        )
        assert request.event_type == "login_success"

    def test_mfa_verify_request(self):
        request = MFAVerifyRequest(code="123456")
        assert request.code == "123456"

    def test_password_change_request(self):
        request = PasswordChangeRequest(
            current_password="old",
            new_password="newpassword123",
            confirm_password="newpassword123",
        )
        assert request.new_password == "newpassword123"

    def test_security_settings_response(self):
        response = SecuritySettingsResponse(
            mfa_enabled=False,
            trusted_devices_count=0,
            active_sessions_count=1,
            api_keys_count=0,
        )
        assert response.mfa_enabled is False
