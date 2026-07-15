"""
Shared pytest configuration.

`src.core.config.Settings` requires SECRET_KEY and LICENSE_ENCRYPTION_KEY to be
set (and at least 16 characters) before it can be instantiated, which happens
at import time via `src.core.config.get_settings()`. CI supplies these as real
environment variables; for local `pytest` runs we set safe test-only defaults
here, before any `src.*` module gets imported, so the suite works out of the
box. `setdefault` is used so real environment variables (e.g. from CI) always
take precedence.
"""

import os

os.environ.setdefault("APP_ENV", "testing")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-local-runs-min-32-chars!!")
os.environ.setdefault("LICENSE_ENCRYPTION_KEY", "test-license-key-for-local-runs-min-32-chars!!")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test.db")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")

# Import every ORM model module up front so SQLAlchemy's mapper registry is
# fully populated no matter which test file pytest happens to collect
# first. See src/models/registry.py for details.
import src.models.registry  # noqa: E402, F401
