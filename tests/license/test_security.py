import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone, timedelta

from src.modules.license.security.crypto import LicenseCrypto
from src.modules.license.security.signing import LicenseSigner
from src.modules.license.security.fingerprint import DeviceFingerprint


class TestLicenseCrypto:
    def setup_method(self):
        self.crypto = LicenseCrypto()

    def test_generate_license_key(self):
        key = self.crypto.generate_license_key()

        assert key is not None
        assert len(key) == 35
        assert key.count("-") == 3
        parts = key.split("-")
        assert len(parts) == 4
        for part in parts:
            assert len(part) == 8

    def test_encrypt_decrypt_license_key(self):
        original_key = self.crypto.generate_license_key()
        encrypted = self.crypto.encrypt_license_key(original_key)
        decrypted = self.crypto.decrypt_license_key(encrypted)

        assert encrypted != original_key
        assert decrypted == original_key

    def test_encrypt_decrypt_data(self):
        original_data = "Test data for encryption"
        encrypted = self.crypto.encrypt_data(original_data)
        decrypted = self.crypto.decrypt_data(encrypted)

        assert encrypted != original_data.encode()
        assert decrypted == original_data

    def test_generate_validation_token(self):
        token = self.crypto.generate_validation_token(
            license_id="test-license-id",
            device_fingerprint="test-fingerprint",
            expires_at="2025-12-31T23:59:59Z",
        )

        assert token is not None
        assert len(token) > 0

    def test_validate_token_valid(self):
        token = self.crypto.generate_validation_token(
            license_id="test-license-id",
            device_fingerprint="test-fingerprint",
            expires_at="2025-12-31T23:59:59Z",
        )

        result = self.crypto.validate_token(token)

        assert result is not None
        assert result["license_id"] == "test-license-id"
        assert result["device_fingerprint"] == "test-fingerprint"

    def test_validate_token_invalid(self):
        result = self.crypto.validate_token("invalid-token")
        assert result is None


class TestLicenseSigner:
    def setup_method(self):
        self.signer = LicenseSigner()

    def test_sign_and_verify(self):
        data = "test data to sign"
        signature = self.signer.sign_data(data)

        assert signature is not None
        assert len(signature) > 0

        is_valid = self.signer.verify_signature(data, signature)
        assert is_valid is True

    def test_verify_invalid_signature(self):
        data = "test data"
        is_valid = self.signer.verify_signature(data, "invalid-signature")
        assert is_valid is False

    def test_generate_offline_token(self):
        token = self.signer.generate_offline_token(
            license_id="test-license-id",
            user_id="test-user-id",
            features={"feature1": True},
            expires_in_hours=24,
        )

        assert token is not None
        assert "." in token

    def test_verify_offline_token(self):
        token = self.signer.generate_offline_token(
            license_id="test-license-id",
            user_id="test-user-id",
            features={"feature1": True},
            expires_in_hours=24,
        )

        result = self.signer.verify_offline_token(token)

        assert result is not None
        assert result["license_id"] == "test-license-id"
        assert result["user_id"] == "test-user-id"

    def test_generate_hmac(self):
        data = "test data"
        hmac_value = self.signer.generate_hmac(data)

        assert hmac_value is not None
        assert len(hmac_value) == 64

    def test_verify_hmac(self):
        data = "test data"
        hmac_value = self.signer.generate_hmac(data)

        is_valid = self.signer.verify_hmac(data, hmac_value)
        assert is_valid is True

    def test_verify_hmac_invalid(self):
        is_valid = self.signer.verify_hmac("data", "invalid-hmac")
        assert is_valid is False


class TestDeviceFingerprint:
    def test_generate_fingerprint(self):
        fingerprint = DeviceFingerprint.generate_fingerprint()

        assert fingerprint is not None
        assert len(fingerprint) == 35
        assert fingerprint.count("-") == 3

    def test_generate_simple_fingerprint(self):
        fingerprint = DeviceFingerprint.generate_simple_fingerprint()

        assert fingerprint is not None
        assert len(fingerprint) == 32

    def test_get_device_info(self):
        info = DeviceFingerprint.get_device_info()

        assert "system" in info
        assert "machine" in info
        assert "device_type" in info
        assert info["system"] in ["Windows", "Linux", "Darwin"]

    def test_get_mac_address(self):
        mac = DeviceFingerprint.get_mac_address()

        assert mac is not None
        assert len(mac) == 17
        assert mac.count(":") == 5

    def test_generate_fingerprint_deterministic(self):
        fp1 = DeviceFingerprint.generate_fingerprint(hardware_id="test-hw-id")
        fp2 = DeviceFingerprint.generate_fingerprint(hardware_id="test-hw-id")

        assert fp1 == fp2

    def test_generate_fingerprint_unique(self):
        fp1 = DeviceFingerprint.generate_fingerprint(hardware_id="hw-id-1")
        fp2 = DeviceFingerprint.generate_fingerprint(hardware_id="hw-id-2")

        assert fp1 != fp2
