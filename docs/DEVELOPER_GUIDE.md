# Developer Guide

Complete developer guide for the Email Converter SaaS project.

## Table of Contents

- [Project Setup](#project-setup)
- [Architecture Overview](#architecture-overview)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Database Migrations](#database-migrations)
- [Environment Variables](#environment-variables)
- [Docker Development](#docker-development)
- [Debugging Tips](#debugging-tips)

---

## Project Setup

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.13+ | Runtime |
| Poetry | 1.7+ | Dependency management |
| PostgreSQL | 16+ | Primary database |
| Redis | 7+ | Caching & message broker |
| Docker | 24+ | Containerization |
| Docker Compose | v2.20+ | Local orchestration |
| Node.js | 20+ | Frontend (if applicable) |

### Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-org/email-converter.git
cd email-converter

# Copy environment variables
cp .env.example .env

# Install dependencies
poetry install

# Activate virtual environment
poetry shell

# Verify installation
python --version  # Should show Python 3.13
```

### Database Setup

```bash
# Start PostgreSQL (via Docker or local)
docker run -d \
  --name email-converter-db \
  -e POSTGRES_USER=email_converter \
  -e POSTGRES_PASSWORD=dev_password \
  -e POSTGRES_DB=email_converter \
  -p 5432:5432 \
  postgres:16-alpine

# Run migrations
alembic upgrade head

# Seed initial data (optional)
python scripts/seed_data.py
```

### Start Development

```bash
# Start all services
docker compose -f docker-compose.dev.yml up -d

# Or start individually
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Start Celery worker
celery -A app.celery_app worker --loglevel=info --concurrency=4

# Start Celery beat (scheduler)
celery -A app.celery_app beat --loglevel=info
```

---

## Architecture Overview

The project is built on **Clean Architecture** with 14 domain modules:

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│              (API Routes, Schemas, Serializers)              │
├─────────────────────────────────────────────────────────────┤
│                     Business Layer                           │
│          (Services, Use Cases, Business Logic)               │
├─────────────────────────────────────────────────────────────┤
│                     Domain Layer                             │
│        (Models, Value Objects, Domain Events)                │
├─────────────────────────────────────────────────────────────┤
│                   Infrastructure Layer                       │
│    (Database, Cache, File Storage, External APIs)            │
└─────────────────────────────────────────────────────────────┘
```

### Module Map

| Module | Purpose | Key Files |
|--------|---------|-----------|
| **auth** | Authentication, authorization, JWT, OAuth2 | `auth/service.py`, `auth/router.py`, `auth/models.py` |
| **uploads** | File upload, validation, chunked uploads | `uploads/service.py`, `uploads/router.py`, `uploads/models.py` |
| **mime** | MIME type detection, content-type validation | `mime/service.py`, `mime/validator.py` |
| **conversion** | File conversion engine, format handling | `conversion/service.py`, `conversion/engine.py`, `conversion/tasks.py` |
| **license** | License key management, feature gating | `license/service.py`, `license/models.py`, `license/guard.py` |
| **payment** | Stripe integration, subscriptions, invoicing | `payment/service.py`, `payment/stripe_client.py`, `payment/webhooks.py` |
| **admin** | Admin dashboard, user management, system ops | `admin/router.py`, `admin/service.py` |
| **notification** | Email, in-app, webhook notifications | `notification/service.py`, `notification/channels.py` |
| **analytics** | Usage tracking, reporting, metrics | `analytics/service.py`, `analytics/collector.py` |
| **monitoring** | Health checks, uptime, error tracking | `monitoring/service.py`, `monitoring/health.py` |
| **security** | Rate limiting, input sanitization, audit logs | `security/service.py`, `security/rate_limiter.py` |
| **search** | Full-text search, indexing, Elasticsearch/Meilisearch | `search/service.py`, `search/indexer.py` |
| **gateway** | API gateway, request routing, throttling | `gateway/middleware.py`, `gateway/router.py` |
| **performance** | Caching, optimization, profiling | `performance/cache.py`, `performance/profiler.py` |
| **public_api** | Public API endpoints, SDK generation | `public_api/router.py`, `public_api/schemas.py` |

### Key Dependencies

```
# Core
fastapi>=0.110.0
uvicorn[standard]>=0.27.0
pydantic>=2.6.0
pydantic-settings>=2.1.0

# Database
sqlalchemy[asyncio]>=2.0.25
asyncpg>=0.29.0
alembic>=1.13.0

# Cache & Queue
redis[hiredis]>=5.0.0
celery[redis]>=5.3.0
kombu>=5.3.0

# Security
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
python-multipart>=0.0.6

# File Handling
python-magic>=0.4.27
aiofiles>=23.2.1

# Monitoring
prometheus-client>=0.19.0
structlog>=24.1.0
sentry-sdk[fastapi]>=1.40.0
```

---

## Development Workflow

### Branch Strategy

```
main          ──────────────────────────────────────────►
              │                                           │
develop       ──────►───►───►───►───►───►───►───►────────►
              │         │                   │
feature/*     ──►───────┘                   └──────►──────►
              │
hotfix/*      ─────────►────────────────────────────────►
```

- **main**: Production-ready code
- **develop**: Integration branch
- **feature/\***: New features
- **hotfix/\***: Critical production fixes

### Commit Convention

```
feat(auth): add OAuth2 Google login
fix(uploads): handle large file chunking
docs(api): update endpoint documentation
refactor(conversion): extract PDF engine
test(payment): add Stripe webhook tests
chore(deps): update dependencies
```

### Code Review Checklist

- [ ] Tests pass (`make test`)
- [ ] Linting passes (`make lint`)
- [ ] Type checking passes (`make typecheck`)
- [ ] No hardcoded secrets
- [ ] Database migrations are reversible
- [ ] API changes are backward compatible
- [ ] Documentation updated

---

## Coding Standards

### Python Style

```python
# Use type hints everywhere
async def get_user(user_id: UUID) -> User:
    ...

# Use Pydantic v2 for schemas
class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    email: EmailStr
    created_at: datetime

# Use async/await for I/O operations
async def process_upload(upload: Upload) -> ConversionJob:
    async with get_db() as db:
        result = await db.execute(select(Upload).where(Upload.id == upload.id))
        return result.scalar_one()

# Use dataclasses for internal value objects
@dataclass(frozen=True)
class FileMetadata:
    filename: str
    size: int
    mime_type: str
    checksum: str
```

### Project Structure

```
app/
├── __init__.py
├── main.py                    # FastAPI app factory
├── config.py                  # Settings (pydantic-settings)
├── dependencies.py            # Dependency injection
├── celery_app.py              # Celery configuration
│
├── modules/
│   ├── __init__.py
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── models.py          # SQLAlchemy models
│   │   ├── schemas.py         # Pydantic schemas
│   │   ├── service.py         # Business logic
│   │   ├── router.py          # API routes
│   │   ├── dependencies.py    # Module-specific deps
│   │   └── tests/
│   │       ├── __init__.py
│   │       ├── test_service.py
│   │       ├── test_router.py
│   │       └── conftest.py
│   │
│   ├── uploads/
│   │   └── ... (same structure)
│   │
│   └── ... (14 modules total)
│
├── core/
│   ├── __init__.py
│   ├── database.py            # SQLAlchemy engine & session
│   ├── cache.py               # Redis client
│   ├── storage.py             # File storage abstraction
│   ├── exceptions.py          # Custom exceptions
│   └── middleware.py          # FastAPI middleware
│
├── shared/
│   ├── __init__.py
│   ├── types.py               # Shared type definitions
│   ├── utils.py               # Utility functions
│   └── constants.py           # Application constants
│
└── migrations/
    ├── env.py
    ├── script.py.mako
    └── versions/
        └── 001_initial.py
```

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Classes | PascalCase | `UserService`, `ConversionJob` |
| Functions | snake_case | `get_user_by_email`, `process_upload` |
| Variables | snake_case | `user_id`, `file_size` |
| Constants | UPPER_SNAKE | `MAX_FILE_SIZE`, `DEFAULT_TIMEOUT` |
| Private | _prefix | `_validate_mime_type` |
| Database tables | snake_case, plural | `users`, `conversion_jobs` |
| API routes | kebab-case | `/api/v1/conversion-jobs` |
| Environment | UPPER_SNAKE | `DATABASE_URL`, `REDIS_URL` |

---

## Testing Guidelines

### Test Structure

```
tests/
├── conftest.py                # Global fixtures
├── unit/
│   ├── test_auth_service.py
│   ├── test_upload_validation.py
│   └── ...
├── integration/
│   ├── test_database.py
│   ├── test_redis.py
│   └── ...
└── e2e/
    ├── test_api_flows.py
    └── ...
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html --cov-report=term

# Run specific module tests
pytest tests/unit/test_auth_service.py

# Run by marker
pytest -m "not slow"
pytest -m "integration"

# Run with verbose output
pytest -v --tb=short

# Run parallel (with pytest-xdist)
pytest -n auto
```

### Writing Tests

```python
import pytest
from uuid import uuid4
from unittest.mock import AsyncMock, patch

from app.modules.auth.service import AuthService
from app.modules.auth.schemas import UserCreate

# Unit Test Example
class TestAuthService:
    @pytest.fixture
    def mock_db(self):
        return AsyncMock()
    
    @pytest.fixture
    def service(self, mock_db):
        return AuthService(db=mock_db)
    
    async def test_create_user(self, service, mock_db):
        user_data = UserCreate(
            email="test@example.com",
            password="secure_password123"
        )
        
        result = await service.create_user(user_data)
        
        assert result.email == "test@example.com"
        mock_db.add.assert_called_once()
        mock_db.flush.assert_called_once()

# Integration Test Example
@pytest.mark.integration
class TestUserDatabase:
    async def test_create_and_retrieve_user(self, db_session):
        user = User(email="test@example.com", hashed_password="hash")
        db_session.add(user)
        await db_session.commit()
        
        result = await db_session.execute(
            select(User).where(User.email == "test@example.com")
        )
        retrieved = result.scalar_one()
        
        assert retrieved.id == user.id

# E2E Test Example
@pytest.mark.e2e
class TestAuthFlow:
    async def test_register_login_flow(self, client):
        # Register
        response = await client.post("/api/v1/auth/register", json={
            "email": "new@example.com",
            "password": "secure_password123"
        })
        assert response.status_code == 201
        
        # Login
        response = await client.post("/api/v1/auth/login", json={
            "email": "new@example.com",
            "password": "secure_password123"
        })
        assert response.status_code == 200
        assert "access_token" in response.json()
```

### Test Fixtures

```python
# tests/conftest.py
import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from app.main import create_app
from app.core.database import Base, get_db

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def engine():
    engine = create_async_engine("postgresql+asyncpg://test:test@localhost/test_db")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture
async def db_session(engine):
    async with AsyncSession(engine) as session:
        yield session
        await session.rollback()

@pytest.fixture
async def client(db_session):
    app = create_app()
    
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
```

---

## Database Migrations

### Creating Migrations

```bash
# Auto-generate migration from model changes
alembic revision --autogenerate -m "add user avatar column"

# Create empty migration for manual changes
alembic revision -m "add custom index"

# Generate migration with specific head
alembic revision --autogenerate -m "description" --head heads
```

### Migration Best Practices

```python
"""add user avatar column

Revision ID: abc123
Revises: def456
Create Date: 2024-01-15 10:30:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'abc123'
down_revision = 'def456'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Always wrap in batch for SQLite compatibility
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(
            sa.Column('avatar_url', sa.String(500), nullable=True)
        )
        batch_op.create_index(
            'ix_users_avatar_url',
            ['avatar_url'],
            unique=False
        )


def downgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_index('ix_users_avatar_url')
        batch_op.drop_column('avatar_url')
```

### Migration Commands

```bash
# Check current migration version
alembic current

# View migration history
alembic history --verbose

# Upgrade to specific version
alembic upgrade abc123

# Downgrade one step
alembic downgrade -1

# Stamp database without running migrations
alembic stamp head

# Generate SQL without executing
alembic upgrade head --sql
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# ===== Application =====
APP_NAME="Email Converter"
APP_ENV=development
APP_DEBUG=true
APP_SECRET_KEY=change-me-in-production-use-openssl-rand-hex-32
APP_ALLOWED_HOSTS=localhost,127.0.0.1

# ===== Server =====
HOST=0.0.0.0
PORT=8000
WORKERS=4
LOG_LEVEL=INFO

# ===== Database =====
DATABASE_URL=postgresql+asyncpg://email_converter:dev_password@localhost:5432/email_converter
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10
DATABASE_ECHO=false

# ===== Redis =====
REDIS_URL=redis://localhost:6379/0
REDIS_MAX_CONNECTIONS=50

# ===== Celery =====
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2
CELERY_CONCURRENCY=4
CELERY_MAX_TASKS_PER_CHILD=1000

# ===== Authentication =====
JWT_SECRET_KEY=change-me-use-openssl-rand-hex-32
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# OAuth2
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=http://localhost:8000/api/v1/auth/github/callback

# ===== File Storage =====
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=100
CHUNK_SIZE_MB=10

# MinIO / S3
S3_ENDPOINT_URL=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET_NAME=email-converter
S3_REGION=us-east-1

# ===== Payment =====
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_API_VERSION=2024-01-01

# ===== Email =====
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@example.com
SMTP_TLS=true

# ===== Search =====
SEARCH_ENGINE=meilisearch
MEILISEARCH_URL=http://localhost:7700
MEILISEARCH_API_KEY=
ELASTICSEARCH_URL=http://localhost:9200

# ===== Monitoring =====
SENTRY_DSN=
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090

# ===== Security =====
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000
CORS_ORIGINS=http://localhost:3000
CSRF_SECRET_KEY=change-me

# ===== License =====
LICENSE_KEY=
LICENSE_API_URL=
```

---

## Docker Development

### docker-compose.dev.yml

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "8000:8000"
    volumes:
      - .:/app
      - ./uploads:/app/uploads
    env_file:
      - .env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: email_converter
      POSTGRES_PASSWORD: dev_password
      POSTGRES_DB: email_converter
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U email_converter"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  worker:
    build:
      context: .
      dockerfile: Dockerfile.dev
    env_file:
      - .env
    depends_on:
      - redis
      - db
    command: celery -A app.celery_app worker --loglevel=info --concurrency=4

  beat:
    build:
      context: .
      dockerfile: Dockerfile.dev
    env_file:
      - .env
    depends_on:
      - redis
    command: celery -A app.celery_app beat --loglevel=info

  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"

  mailhog:
    image: mailhog/mailhog:latest
    ports:
      - "1025:1025"
      - "8025:8025"

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### Build and Run

```bash
# Build dev image
docker compose -f docker-compose.dev.yml build

# Start all services
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose -f docker-compose.dev.yml logs -f app

# Run migrations inside container
docker compose -f docker-compose.dev.yml exec app alembic upgrade head

# Access service shell
docker compose -f docker-compose.dev.yml exec app bash

# Stop all services
docker compose -f docker-compose.dev.yml down

# Stop and remove volumes (fresh start)
docker compose -f docker-compose.dev.yml down -v
```

---

## Debugging Tips

### IDE Configuration

**VS Code (launch.json)**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "FastAPI",
      "type": "debugpy",
      "request": "launch",
      "module": "uvicorn",
      "args": ["app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
      "envFile": "${workspaceFolder}/.env",
      "console": "integratedTerminal"
    },
    {
      "name": "Celery Worker",
      "type": "debugpy",
      "request": "launch",
      "module": "celery",
      "args": ["-A", "app.celery_app", "worker", "--loglevel=info"],
      "envFile": "${workspaceFolder}/.env",
      "console": "integratedTerminal"
    },
    {
      "name": "Pytest",
      "type": "debugpy",
      "request": "launch",
      "module": "pytest",
      "args": ["-v", "--tb=short"],
      "envFile": "${workspaceFolder}/.env",
      "console": "integratedTerminal"
    }
  ]
}
```

### Common Debug Scenarios

**Database Query Debugging**

```python
# Enable SQL logging in development
import logging
logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)

# Or use echo in engine
engine = create_async_engine(DATABASE_URL, echo=True)

# Print generated SQL
from sqlalchemy import inspect
print(stmt.compile(compile_kwargs={"literal_binds": True}))
```

**Redis Debugging**

```python
import redis.asyncio as redis

async def debug_redis():
    r = redis.from_url("redis://localhost:6379/0")
    
    # Check connection
    await r.ping()
    
    # List all keys
    keys = await r.keys("*")
    print(f"Keys: {keys}")
    
    # Get cache stats
    info = await r.info("stats")
    print(f"Cache hits: {info['keyspace_hits']}")
    print(f"Cache misses: {info['keyspace_misses']}")
    
    await r.close()
```

**Celery Task Debugging**

```python
# Inspect active tasks
from app.celery_app import celery_app

inspector = celery_app.control.inspect()
print("Active tasks:", inspector.active())
print("Scheduled tasks:", inspector.scheduled())
print("Reserved tasks:", inspector.reserved())

# Retry a task manually
from app.modules.conversion.tasks import process_conversion
process_conversion.delay(job_id="specific-job-id")

# Check task result
result = AsyncResult("task-id", app=celery_app)
print(f"Status: {result.status}")
print(f"Result: {result.result}")
```

**Request Debugging Middleware**

```python
import time
import structlog

logger = structlog.get_logger()

async def debug_middleware(request, call_next):
    start = time.perf_counter()
    
    logger.info(
        "request_started",
        method=request.method,
        path=request.url.path,
        client=request.client.host,
    )
    
    response = await call_next(request)
    
    duration = time.perf_counter() - start
    logger.info(
        "request_completed",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=round(duration * 1000, 2),
    )
    
    return response
```

### Profiling

```python
# CPU profiling
import cProfile
import pstats

def profile_endpoint():
    profiler = cProfile.Profile()
    profiler.enable()
    
    # ... code to profile ...
    
    profiler.disable()
    stats = pstats.Stats(profiler)
    stats.sort_stats("cumulative")
    stats.print_stats(20)

# Memory profiling
from memory_profiler import profile

@profile
def memory_intensive_function():
    # ... code to monitor ...
    pass

# Async profiling
import yappi

yappi.set_clock_type("wall")
yappi.start()

# ... async code ...

yappi.stop()
threads = yappi.get_thread_stats()
for thread in threads:
    print(f"Thread {thread.id}: {thread.ttot:.2f}s")
```

### Health Check Endpoints

```bash
# Application health
curl http://localhost:8000/health

# Detailed health
curl http://localhost:8000/health/detailed

# Readiness (for K8s)
curl http://localhost:8000/ready

# Liveness (for K8s)
curl http://localhost:8000/live
```

---

## Quick Reference

### Useful Commands

```bash
# Make targets (if using Makefile)
make dev              # Start development environment
make test             # Run all tests
make test-cov         # Run tests with coverage
make lint             # Run linting
make format           # Format code
make typecheck        # Run type checking
make migrate          # Run database migrations
make migration-new    # Create new migration
make shell            # Open Python shell
make celery-flower    # Start Celery Flower dashboard
```

### Useful Links

| Service | URL |
|---------|-----|
| API Docs (Swagger) | http://localhost:8000/docs |
| API Docs (ReDoc) | http://localhost:8000/redoc |
| Health Check | http://localhost:8000/health |
| MinIO Console | http://localhost:9001 |
| MailHog | http://localhost:8025 |
| Flower (Celery) | http://localhost:5555 |

---

*Last updated: July 2026*
