from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    APP_NAME: str = "Email Converter SaaS"
    APP_VERSION: str = "0.1.0"
    APP_ENV: Literal["development", "testing", "staging", "production"] = "development"
    DEBUG: bool = False

    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 1

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/email_converter"
    REDIS_URL: str = "redis://localhost:6379/0"

    SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    REFRESH_TOKEN_EXPIRE_REMEMBER_ME_DAYS: int = 30
    MAX_SESSIONS_PER_USER: int = 10
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    COOKIE_SECURE: bool = False
    COOKIE_HTTPONLY: bool = True
    COOKIE_SAMESITE: Literal["lax", "strict", "none"] = "lax"
    COOKIE_DOMAIN: str | None = None
    ACCESS_TOKEN_COOKIE_NAME: str = "access_token"
    REFRESH_TOKEN_COOKIE_NAME: str = "refresh_token"

    EMAIL_VERIFICATION_EXPIRE_HOURS: int = 24
    PASSWORD_RESET_EXPIRE_HOURS: int = 1
    FRONTEND_URL: str = "http://localhost:3000"

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@emailconverter.com"
    SMTP_TLS: bool = True

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/oauth/google/callback"

    MICROSOFT_CLIENT_ID: str = ""
    MICROSOFT_CLIENT_SECRET: str = ""
    MICROSOFT_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/oauth/microsoft/callback"

    RATE_LIMIT_AUTH_ATTEMPTS: int = 5
    RATE_LIMIT_AUTH_WINDOW_SECONDS: int = 300

    STORAGE_PROVIDER: Literal["local", "s3", "minio"] = "local"
    STORAGE_LOCAL_PATH: str = "./uploads"
    STORAGE_BUCKET: str = "email-converter-uploads"
    STORAGE_REGION: str = "us-east-1"
    STORAGE_ENDPOINT: str | None = None
    STORAGE_ACCESS_KEY: str | None = None
    STORAGE_SECRET_KEY: str | None = None

    MINIO_ENDPOINT: str | None = None
    MINIO_ACCESS_KEY: str | None = None
    MINIO_SECRET_KEY: str | None = None
    MINIO_BUCKET: str = "email-converter-uploads"
    MINIO_SECURE: bool = False

    CDN_BASE_URL: str | None = None

    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    LICENSE_ENCRYPTION_KEY: str = ""
    LICENSE_TOKEN_EXPIRY_HOURS: int = 24
    LICENSE_OFFLINE_TOKEN_EXPIRY_HOURS: int = 72

    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    SENDGRID_API_KEY: str = ""
    SENDGRID_FROM_EMAIL: str = ""

    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""

    SENTRY_DSN: str = ""
    SENTRY_ENVIRONMENT: str = "production"
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1

    OTEL_EXPORTER_OTLP_ENDPOINT: str = "localhost:4317"
    OTEL_SERVICE_NAME: str = "email-converter"

    HEALTH_CHECK_INTERVAL_SECONDS: int = 60
    ALERT_EVALUATION_INTERVAL_SECONDS: int = 300
    METRICS_COLLECTION_INTERVAL_SECONDS: int = 60

    MAX_UPLOAD_SIZE_MB: int = 10240
    CHUNK_SIZE_MB: int = 8

    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION_MINUTES: int = 30
    PASSWORD_EXPIRY_DAYS: int = 90
    PASSWORD_HISTORY_SIZE: int = 5

    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_ENDPOINT: int = 30
    DAILY_API_QUOTA: int = 10000

    MFA_LOCKOUT_ATTEMPTS: int = 5
    MFA_LOCKOUT_MINUTES: int = 15

    ELASTICSEARCH_URL: str = "http://localhost:9200"
    OPENSEARCH_URL: str = "http://localhost:9200"
    SEARCH_INDEX_NAME: str = "email_converter"
    SEARCH_CACHE_TTL: int = 300
    SEARCH_MAX_RESULTS: int = 10000

    PUBLIC_API_KEY_PREFIX: str = "ec_live_"
    PUBLIC_API_KEY_LENGTH: int = 48
    PUBLIC_API_KEY_HASH_ALGORITHM: str = "sha256"
    PUBLIC_API_RATE_LIMIT_FREE: int = 10
    PUBLIC_API_RATE_LIMIT_STARTER: int = 60
    PUBLIC_API_RATE_LIMIT_PRO: int = 300
    PUBLIC_API_RATE_LIMIT_ENTERPRISE: int = 1000
    PUBLIC_API_WEBHOOK_MAX_RETRIES: int = 5
    PUBLIC_API_WEBHOOK_RETRY_DELAY_BASE: int = 30

    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    LOG_FORMAT: Literal["json", "console"] = "json"

    @field_validator("SECRET_KEY", "LICENSE_ENCRYPTION_KEY")
    @classmethod
    def validate_secret_keys(cls, v: str) -> str:
        if not v or len(v) < 16:
            raise ValueError("Secret keys must be at least 16 characters. Set via environment variables.")
        return v

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    @property
    def is_development(self) -> bool:
        return self.APP_ENV == "development"

    @property
    def cookie_settings(self) -> dict:
        return {
            "secure": self.COOKIE_SECURE,
            "httponly": self.COOKIE_HTTPONLY,
            "samesite": self.COOKIE_SAMESITE,
            "domain": self.COOKIE_DOMAIN,
        }


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
