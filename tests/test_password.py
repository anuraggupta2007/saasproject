import pytest

from src.services.auth.password import (
    hash_password,
    verify_password,
    needs_rehash,
    generate_token,
    hash_token,
    verify_token,
)


class TestPasswordHashing:
    def test_hash_password_returns_argon2_hash(self):
        password = "TestPassword123!"
        hashed = hash_password(password)
        assert hashed != password
        assert "$argon2" in hashed

    def test_verify_password_correct(self):
        password = "TestPassword123!"
        hashed = hash_password(password)
        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        password = "TestPassword123!"
        hashed = hash_password(password)
        assert verify_password("WrongPassword", hashed) is False

    def test_needs_rehash_returns_false_for_new_hash(self):
        password = "TestPassword123!"
        hashed = hash_password(password)
        assert needs_rehash(hashed) is False

    def test_different_hashes_for_same_password(self):
        password = "TestPassword123!"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        assert hash1 != hash2
        assert verify_password(password, hash1)
        assert verify_password(password, hash2)

    def test_empty_password(self):
        password = ""
        hashed = hash_password(password)
        assert verify_password(password, hashed) is True

    def test_unicode_password(self):
        password = "Pässwörd123!"
        hashed = hash_password(password)
        assert verify_password(password, hashed) is True

    def test_long_password(self):
        password = "A" * 1000 + "1!"
        hashed = hash_password(password)
        assert verify_password(password, hashed) is True


class TestTokenOperations:
    def test_generate_token_returns_urlsafe_string(self):
        token = generate_token()
        assert isinstance(token, str)
        assert len(token) > 20

    def test_generate_unique_tokens(self):
        token1 = generate_token()
        token2 = generate_token()
        assert token1 != token2

    def test_hash_token_returns_sha256(self):
        token = generate_token()
        hashed = hash_token(token)
        assert isinstance(hashed, str)
        assert len(hashed) == 64

    def test_verify_token_correct(self):
        token = generate_token()
        hashed = hash_token(token)
        assert verify_token(token, hashed) is True

    def test_verify_token_incorrect(self):
        token = generate_token()
        hashed = hash_token(token)
        assert verify_token("wrong_token", hashed) is False

    def test_hash_token_deterministic(self):
        token = "test_token_123"
        hash1 = hash_token(token)
        hash2 = hash_token(token)
        assert hash1 == hash2
