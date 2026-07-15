# Architecture Document

Technical architecture documentation for the Email Converter SaaS project.

## Table of Contents

- [System Overview](#system-overview)
- [Clean Architecture Layers](#clean-architecture-layers)
- [Module Breakdown](#module-breakdown)
- [Data Flow Diagrams](#data-flow-diagrams)
- [Database Schema](#database-schema)
- [API Versioning Strategy](#api-versioning-strategy)
- [Event-Driven Architecture](#event-driven-architecture)
- [Caching Strategy](#caching-strategy)
- [Security Architecture](#security-architecture)
- [Multi-Tenant Architecture](#multi-tenant-architecture)
- [Infrastructure Architecture](#infrastructure-architecture)

---

## System Overview

### High-Level Architecture

```
                                    ┌─────────────────┐
                                    │   CDN/CloudFlare │
                                    └────────┬────────┘
                                             │
┌────────────────────────────────────────────┼────────────────────────────────────────────┐
│                              Ingress Layer (Nginx)                                      │
│                    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐              │
│                    │  Rate Limit  │   │   SSL/TLS    │   │   Routing    │              │
│                    └──────┬───────┘   └──────┬───────┘   └──────┬───────┘              │
│                           │                  │                  │                       │
└───────────────────────────┼──────────────────┼──────────────────┼───────────────────────┘
                            │                  │                  │
┌───────────────────────────┼──────────────────┼──────────────────┼───────────────────────┐
│                    API Gateway Layer                                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Auth      │  │   Rate      │  │   Request   │  │   Response  │  │   Circuit   │ │
│  │ Middleware  │  │   Limiter   │  │   Validator │  │   Formatter │  │   Breaker   │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         └────────────────┴────────────────┴────────────────┴────────────────┘         │
└───────────────────────────────────────────────┬───────────────────────────────────────┘
                                                │
┌───────────────────────────────────────────────┼───────────────────────────────────────┐
│              Application Layer (FastAPI)                                                │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              API Routes (v1, v2)                                │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │                           Pydantic Schemas / DTOs                               │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │                        Service Layer (Business Logic)                           │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │  │
│  │  │   Auth   │ │  Upload  │ │  Mime    │ │Conversion│ │  License │            │  │
│  │  │ Service  │ │ Service  │ │ Service  │ │ Service  │ │ Service  │            │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘            │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │  │
│  │  │ Payment  │ │  Admin   │ │Notifica- │ │Analytics │ │Monitoring│            │  │
│  │  │ Service  │ │ Service  │ │tion Svc  │ │ Service  │ │ Service  │            │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘            │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │  │
│  │  │ Security │ │  Search  │ │ Gateway  │ │Performan-│ │Public API│            │  │
│  │  │ Service  │ │ Service  │ │ Service  │ │ce Svc    │ │ Service  │            │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘            │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │                         Domain Layer (Models/Entities)                          │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────┬───────────────────────────────────────┘
                                                │
┌───────────────────────────────────────────────┼───────────────────────────────────────┐
│                    Infrastructure Layer                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │PostgreSQL│  │  Redis   │  │  MinIO/  │  │ Celery   │  │ External │               │
│  │  (SQLA)  │  │ (Cache)  │  │  S3      │  │ (Queue)  │  │ APIs     │               │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘               │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Clean Architecture Layers

### Layer Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    Presentation Layer                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  API Routes  │  Schemas  │  Serializers  │  Validators   │  │
│  └───────────────────────────────────────────────────────────┘  │
│  - FastAPI route handlers                                       │
│  - Request/Response models (Pydantic v2)                        │
│  - Input validation and serialization                           │
│  - HTTP status codes and error responses                        │
├─────────────────────────────────────────────────────────────────┤
│                    Business Layer                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Services  │  Use Cases  │  Domain Events  │  Policies   │  │
│  └───────────────────────────────────────────────────────────┘  │
│  - Business logic and rules                                     │
│  - Orchestration of domain objects                              │
│  - Transaction management                                       │
│  - Event publishing                                             │
├─────────────────────────────────────────────────────────────────┤
│                    Domain Layer                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Entities  │  Value Objects  │  Aggregates  │  Interfaces │  │
│  └───────────────────────────────────────────────────────────┘  │
│  - Core business entities                                       │
│  - Domain models (SQLAlchemy)                                   │
│  - Repository interfaces                                        │
│  - Domain exceptions                                            │
├─────────────────────────────────────────────────────────────────┤
│                  Infrastructure Layer                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Database  │  Cache  │  Storage  │  External APIs  │  MQ  │  │
│  └───────────────────────────────────────────────────────────┘  │
│  - Repository implementations                                   │
│  - Cache adapters                                               │
│  - File storage adapters                                        │
│  - External service clients                                     │
│  - Message queue publishers                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Dependency Rule

Dependencies flow inward only. Outer layers depend on inner layers, never the reverse.

```
Presentation → Business → Domain ← Infrastructure
                            ↑          │
                            └──────────┘
```

- **Domain** has no dependencies on other layers
- **Business** depends only on Domain
- **Presentation** depends on Business and Domain
- **Infrastructure** implements interfaces defined in Domain

---

## Module Breakdown

### 1. Auth Module

```
auth/
├── models.py          # User, Role, Permission, Session, APIKey
├── schemas.py         # AuthRequest, TokenResponse, UserCreate
├── service.py         # AuthService (login, register, refresh, revoke)
├── router.py          # /api/v1/auth/*
├── dependencies.py    # get_current_user, require_role, require_permission
├── jwt.py             # JWT token creation and verification
├── oauth.py           # OAuth2 provider integration
├── password.py        # Password hashing and verification
└── tests/
```

**Responsibilities:**
- User registration and authentication
- JWT token management (access + refresh)
- OAuth2 integration (Google, GitHub)
- Role-based access control (RBAC)
- Session management
- API key management

### 2. Uploads Module

```
uploads/
├── models.py          # Upload, UploadChunk
├── schemas.py         # UploadCreate, UploadResponse, ChunkUpload
├── service.py         # UploadService (create, chunk, complete, abort)
├── router.py          # /api/v1/uploads/*
├── validators.py      # File size, type, and content validation
├── chunking.py        # Chunked upload logic
├── storage.py         # Storage adapter interface
└── tests/
```

**Responsibilities:**
- File upload handling (single and chunked)
- File validation (size, type, content)
- Upload progress tracking
- Upload resume and abort
- Temporary file management

### 3. MIME Module

```
mime/
├── service.py         # MimeService (detect, validate, classify)
├── detector.py        # MIME type detection (magic bytes, extension)
├── validator.py       # MIME type validation against whitelist
├── classifier.py      # Content classification (email, document, image)
└── constants.py       # MIME type mappings and classifications
```

**Responsibilities:**
- MIME type detection from file content
- MIME type validation against allowed types
- Content classification for routing
- File type sanitization

### 4. Conversion Module

```
conversion/
├── models.py          # ConversionJob, ConversionTask, ConversionLog
├── schemas.py         # ConversionCreate, ConversionResponse, ConversionStatus
├── service.py         # ConversionService (create, monitor, cancel, retry)
├── engine.py          # ConversionEngine (orchestrates converters)
├── converters/        # Individual format converters
│   ├── base.py        # BaseConverter interface
│   ├── pdf.py         # PDF converter
│   ├── image.py       # Image converter
│   ├── email.py       # Email converter (EML, MSG, MBOX)
│   ├── document.py    # Document converter (DOCX, RTF, TXT)
│   └── archive.py     # Archive converter (ZIP, TAR)
├── tasks.py           # Celery tasks for async processing
├── router.py          # /api/v1/conversions/*
└── tests/
```

**Responsibilities:**
- Conversion job creation and management
- Format detection and routing
- Async conversion via Celery
- Progress tracking and reporting
- Error handling and retry logic

### 5. License Module

```
license/
├── models.py          # License, LicenseFeature, LicenseUsage
├── schemas.py         # LicenseCreate, LicenseValidate, LicenseFeature
├── service.py         # LicenseService (create, validate, check, consume)
├── guard.py           # FeatureGuard (decorator for feature gating)
├── validator.py       # License key validation logic
└── constants.py       # License tiers and features
```

**Responsibilities:**
- License key generation and management
- Feature gating based on license tier
- Usage tracking and limits
- License validation and verification
- Trial management

### 6. Payment Module

```
payment/
├── models.py          # Subscription, Payment, Invoice, Webhook
├── schemas.py         # SubscriptionCreate, PaymentIntent, InvoiceResponse
├── service.py         # PaymentService (subscribe, cancel, invoice)
├── stripe_client.py   # Stripe API client wrapper
├── webhooks.py        # Stripe webhook handlers
├── invoices.py        # Invoice generation and management
├── proration.py       # Proration calculations
└── tests/
```

**Responsibilities:**
- Subscription lifecycle management
- Payment processing via Stripe
- Invoice generation and delivery
- Webhook handling for payment events
- Proration for plan changes

### 7. Admin Module

```
admin/
├── models.py          # AdminAuditLog
├── schemas.py         # AdminUserUpdate, SystemStats, AuditLog
├── service.py         # AdminService (user mgmt, system ops, reporting)
├── router.py          # /api/v1/admin/*
├── guards.py          # Admin role verification
└── reports.py         # System reports and analytics
```

**Responsibilities:**
- User management (list, suspend, delete)
- System configuration
- Audit logging
- System health monitoring
- Administrative reports

### 8. Notification Module

```
notification/
├── models.py          # Notification, NotificationPreference
├── schemas.py         # NotificationCreate, NotificationResponse
├── service.py         # NotificationService (send, schedule, preferences)
├── channels/          # Notification channels
│   ├── base.py        # BaseChannel interface
│   ├── email.py       # Email channel (SMTP)
│   ├── in_app.py      # In-app notification channel
│   ├── webhook.py     # Webhook notification channel
│   └── push.py        # Push notification channel
├── templates/         # Notification templates
│   ├── welcome.html
│   ├── conversion_complete.html
│   └── payment_receipt.html
└── router.py          # /api/v1/notifications/*
```

**Responsibilities:**
- Multi-channel notification delivery
- Notification templates
- User preference management
- Scheduled notifications
- Delivery tracking

### 9. Analytics Module

```
analytics/
├── models.py          # Event, Metric, Report
├── schemas.py         # EventCreate, MetricQuery, ReportResponse
├── service.py         # AnalyticsService (track, query, report)
├── collector.py       # Event collection and buffering
├── aggregator.py      # Metric aggregation
├── reporter.py        # Report generation
└── exporters.py       # Data export (CSV, JSON)
```

**Responsibilities:**
- Event tracking and collection
- Metric aggregation and storage
- Report generation
- Data export capabilities
- Usage analytics

### 10. Monitoring Module

```
monitoring/
├── models.py          # HealthCheck, Incident, Alert
├── schemas.py         # HealthResponse, AlertCreate
├── service.py         # MonitoringService (health, alert, incident)
├── health.py          # Health check endpoints
├── metrics.py         # Prometheus metrics collection
├── alerts.py          # Alert management
└── incidents.py       # Incident tracking
```

**Responsibilities:**
- Health check endpoints
- Prometheus metrics export
- Alert rule management
- Incident tracking
- Uptime monitoring

### 11. Security Module

```
security/
├── models.py          # AuditLog, RateLimit, SecurityEvent
├── schemas.py         # AuditLogCreate, RateLimitCheck
├── service.py         # SecurityService (audit, rate limit, scan)
├── rate_limiter.py    # Rate limiting middleware
├── sanitizer.py       # Input sanitization
├── auditor.py         # Audit logging
├── scanner.py         # File content scanning
└── encryption.py      # Data encryption utilities
```

**Responsibilities:**
- Rate limiting and throttling
- Input sanitization and validation
- Audit logging
- File content scanning (malware)
- Data encryption at rest and in transit

### 12. Search Module

```
search/
├── models.py          # SearchIndex, SearchQuery
├── schemas.py         # SearchRequest, SearchResult
├── service.py         # SearchService (index, search, suggest)
├── indexer.py         # Document indexing
├── query.py           # Query builder and parser
├── suggester.py       # Search suggestions/autocomplete
└── engines/           # Search engine adapters
    ├── meilisearch.py
    └── elasticsearch.py
```

**Responsibilities:**
- Full-text search indexing
- Query parsing and execution
- Search suggestions/autocomplete
- Faceted search
- Search analytics

### 13. Gateway Module

```
gateway/
├── middleware.py       # GatewayMiddleware (routing, throttling)
├── router.py          # API router configuration
├── throttler.py       # Request throttling
├── transformer.py     # Request/response transformation
├── aggregator.py      # Response aggregation
└── circuit_breaker.py # Circuit breaker pattern
```

 **Responsibilities:**
- API request routing
- Request/response transformation
- Response aggregation
- Circuit breaker for external services
- API versioning support

### 14. Performance Module

```
performance/
├── cache.py           # CacheManager (L1 memory + L2 Redis)
├── profiler.py        # Performance profiling
├── optimizer.py       # Query and code optimization
├── prefetch.py        # Data prefetching
├── compression.py     # Response compression
└── metrics.py         # Performance metrics collection
```

**Responsibilities:**
- Multi-level caching (memory + Redis)
- Performance profiling and monitoring
- Query optimization
- Response compression
- Performance metrics collection

### 15. Public API Module

```
public_api/
├── models.py          # APIKey, RateLimit
├── schemas.py         # APIKeyCreate, RateLimitResponse
├── service.py         # PublicAPIService (key mgmt, rate limit)
├── router.py          # /api/v1/public/*
├── auth.py            # API key authentication
├── docs.py            # API documentation generation
└── sdk/               # SDK generation
    ├── python.py
    ├── javascript.py
    └── go.py
```

**Responsibilities:**
- Public API key management
- Rate limiting for public API
- API documentation generation
- SDK generation for multiple languages
- Usage tracking

---

## Data Flow Diagrams

### File Conversion Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  Client  │────▶│  Upload  │────▶│  MIME   │────▶│Conversion│────▶│ Storage │
│          │     │ Service  │     │Service  │     │ Service  │     │ Service │
└─────────┘     └─────────┘     └─────────┘     └─────────┘     └─────────┘
     │               │               │               │               │
     │  POST /uploads│               │               │               │
     │──────────────▶│               │               │               │
     │               │ Validate file │               │               │
     │               │──────────────▶│               │               │
     │               │               │ Detect MIME   │               │
     │               │               │──────────────▶│               │
     │               │               │               │               │
     │               │               │  Create Job   │               │
     │               │               │──────────────▶│               │
     │               │               │               │               │
     │               │               │               │  Queue Task   │
     │               │               │               │──────────────▶│
     │               │               │               │               │
     │               │               │               │  Celery Worker│
     │               │               │               │  processes    │
     │               │               │               │               │
     │               │               │               │  Store result │
     │               │               │               │──────────────▶│
     │               │               │               │               │
     │◀──────────────│◀──────────────│◀──────────────│◀──────────────│
     │  Return job ID│               │               │               │
```

### Authentication Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  Client  │────▶│  Auth   │────▶│  User   │────▶│  JWT    │
│          │     │ Service  │     │ Service  │     │ Service  │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
     │               │               │               │
     │  POST /login  │               │               │
     │──────────────▶│               │               │
     │               │ Validate creds│               │
     │               │──────────────▶│               │
     │               │               │               │
     │               │  User exists? │               │
     │               │◀──────────────│               │
     │               │               │               │
     │               │  Verify pass  │               │
     │               │──────────────▶│               │
     │               │               │               │
     │               │  Generate JWT │               │
     │               │──────────────▶│──────────────▶│
     │               │               │               │
     │               │◀──────────────│◀──────────────│
     │               │  Return token │               │
     │               │               │               │
     │◀──────────────│               │               │
     │  Access Token │               │               │
```

### Payment Processing Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  Client  │────▶│ Payment │────▶│ Stripe  │────▶│ Webhook │────▶│License  │
│          │     │ Service  │     │ Client  │     │ Handler │     │ Service  │
└─────────┘     └─────────┘     └─────────┘     └─────────┘     └─────────┘
     │               │               │               │               │
     │  POST /sub    │               │               │               │
     │──────────────▶│               │               │               │
     │               │ Create sub    │               │               │
     │               │──────────────▶│               │               │
     │               │               │               │               │
     │               │  Return       │               │               │
     │               │  client_secret│               │               │
     │◀──────────────│◀──────────────│               │               │
     │               │               │               │               │
     │  Confirm      │               │               │               │
     │  payment      │               │               │               │
     │──────────────▶│──────────────▶│               │               │
     │               │               │               │               │
     │               │               │  payment.     │               │
     │               │               │  succeeded    │               │
     │               │               │──────────────▶│               │
     │               │               │               │               │
     │               │               │               │  Activate     │
     │               │               │               │  license      │
     │               │               │               │──────────────▶│
     │               │               │               │               │
     │               │               │               │  Send email   │
     │               │               │               │──────────────▶│
     │               │               │               │               │
     │◀──────────────────────────────────────────────────────────────│
     │  Subscription active                                         │
```

### Search Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  Client  │────▶│ Search  │────▶│ Indexer │────▶│ Search  │
│          │     │ Service  │     │         │     │ Engine  │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
     │               │               │               │
     │  GET /search  │               │               │
     │  ?q=keyword   │               │               │
     │──────────────▶│               │               │
     │               │ Build query   │               │
     │               │──────────────▶│──────────────▶│
     │               │               │               │
     │               │               │  Execute      │
     │               │               │  search       │
     │               │               │◀──────────────│
     │               │               │               │
     │               │◀──────────────│               │
     │               │  Results      │               │
     │               │               │               │
     │◀──────────────│               │               │
     │  Search       │               │               │
     │  results      │               │               │
     │               │               │               │
     │  POST /search │               │               │
     │  /index       │               │               │
     │──────────────▶│──────────────▶│               │
     │               │               │  Index doc    │
     │               │               │──────────────▶│
     │◀──────────────│               │               │
     │  Indexed      │               │               │
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────────┐         ┌─────────────────────┐
│        users         │         │        roles         │
├─────────────────────┤         ├─────────────────────┤
│ id (PK, UUID)       │◄───┐   │ id (PK, UUID)       │
│ email (unique)      │    │   │ name (unique)       │
│ username (unique)   │    │   │ description          │
│ hashed_password      │    │   │ created_at           │
│ is_active            │    │   │ updated_at           │
│ is_verified          │    │   └──────────┬──────────┘
│ avatar_url           │    │              │
│ created_at           │    │   ┌──────────┴──────────┐
│ updated_at           │    │   │   user_roles         │
│ last_login_at        │    │   ├─────────────────────┤
│ login_count          │    │   │ user_id (FK, UUID)   │
└─────────┬────────────┘    │   │ role_id (FK, UUID)   │
          │                 │   │ created_at           │
          │                 │   └─────────────────────┘
          │                 │
          │                 │   ┌─────────────────────┐
          │                 │   │    permissions       │
          │                 │   ├─────────────────────┤
          │                 │   │ id (PK, UUID)       │
          │                 │   │ name (unique)       │
          │                 │   │ resource            │
          │                 │   │ action              │
          │                 │   │ description          │
          │                 │   └──────────┬──────────┘
          │                 │              │
          │                 │   ┌──────────┴──────────┐
          │                 │   │   role_permissions   │
          │                 │   ├─────────────────────┤
          │                 │   │ role_id (FK, UUID)   │
          │                 │   │ permission_id (FK)   │
          │                 │   │ created_at           │
          │                 │   └─────────────────────┘
          │                 │
          │                 │   ┌─────────────────────┐
          │                 │   │      sessions        │
          │                 │   ├─────────────────────┤
          │                 └──▶│ id (PK, UUID)       │
          │                     │ user_id (FK, UUID)   │
          │                     │ refresh_token (hash) │
          │                     │ user_agent           │
          │                     │ ip_address           │
          │                     │ expires_at           │
          │                     │ created_at           │
          │                     │ is_revoked           │
          │                     └─────────────────────┘
          │
          │                     ┌─────────────────────┐
          │                     │      api_keys        │
          │                     ├─────────────────────┤
          └────────────────────▶│ id (PK, UUID)       │
                                │ user_id (FK, UUID)   │
                                │ name                 │
                                │ key_hash (unique)    │
                                │ prefix               │
                                │ permissions          │
                                │ rate_limit           │
                                │ is_active            │
                                │ last_used_at         │
                                │ expires_at           │
                                │ created_at           │
                                └─────────────────────┘

┌─────────────────────┐         ┌─────────────────────┐
│   conversion_jobs   │         │       uploads        │
├─────────────────────┤         ├─────────────────────┤
│ id (PK, UUID)       │◄────────│ id (PK, UUID)       │
│ user_id (FK, UUID)  │         │ user_id (FK, UUID)   │
│ status (enum)        │         │ filename             │
│ input_format         │         │ original_filename    │
│ output_format        │         │ mime_type            │
│ input_file_path      │         │ file_size            │
│ output_file_path     │         │ storage_path         │
│ file_size            │         │ checksum             │
│ started_at           │         │ status (enum)        │
│ completed_at         │         │ chunks_total         │
│ error_message        │         │ chunks_uploaded      │
│ progress (0-100)     │         │ conversion_job_id    │
│ created_at           │         │ created_at           │
│ updated_at           │         │ updated_at           │
│ retry_count          │         │ expires_at           │
│ max_retries          │         └─────────────────────┘
│ priority             │
│ metadata (JSON)      │         ┌─────────────────────┐
└─────────────────────┘         │  conversion_tasks    │
                                ├─────────────────────┤
                                │ id (PK, UUID)       │
                                │ job_id (FK, UUID)   │
                                │ status (enum)        │
                                │ worker_id            │
                                │ started_at           │
                                │ completed_at         │
                                │ error_message        │
                                │ retry_count          │
                                │ created_at           │
                                └─────────────────────┘

┌─────────────────────┐         ┌─────────────────────┐
│     licenses         │         │    subscriptions     │
├─────────────────────┤         ├─────────────────────┤
│ id (PK, UUID)       │         │ id (PK, UUID)       │
│ user_id (FK, UUID)  │         │ user_id (FK, UUID)   │
│ key (unique)         │         │ license_id (FK)      │
│ tier (enum)          │         │ stripe_sub_id        │
│ status (enum)        │         │ status (enum)        │
│ features (JSON)      │         │ current_period_start │
│ max_uploads/month    │         │ current_period_end   │
│ max_file_size_mb     │         │ cancel_at_period_end │
│ max_conversions/day  │         │ trial_end            │
│ expires_at           │         │ created_at           │
│ created_at           │         │ updated_at           │
│ updated_at           │         └─────────────────────┘
│ activated_at         │
│ is_trial             │         ┌─────────────────────┐
└─────────────────────┘         │      payments        │
                                ├─────────────────────┤
                                │ id (PK, UUID)       │
                                │ user_id (FK, UUID)   │
                                │ subscription_id (FK) │
                                │ stripe_payment_id    │
                                │ amount               │
                                │ currency             │
                                │ status (enum)        │
                                │ payment_method       │
                                │ receipt_url          │
                                │ created_at           │
                                └─────────────────────┘

┌─────────────────────┐         ┌─────────────────────┐
│     webhooks         │         │   notifications      │
├─────────────────────┤         ├─────────────────────┤
│ id (PK, UUID)       │         │ id (PK, UUID)       │
│ user_id (FK, UUID)  │         │ user_id (FK, UUID)   │
│ url                  │         │ type (enum)          │
│ events (JSON array)  │         │ title                │
│ secret               │         │ message              │
│ is_active            │         │ data (JSON)          │
│ last_triggered_at    │         │ is_read              │
│ failure_count        │         │ channel (enum)       │
│ created_at           │         │ sent_at              │
│ updated_at           │         │ created_at           │
└─────────────────────┘         └─────────────────────┘

┌─────────────────────┐         ┌─────────────────────┐
│    audit_logs        │         │   analytics_events   │
├─────────────────────┤         ├─────────────────────┤
│ id (PK, UUID)       │         │ id (PK, UUID)       │
│ user_id (FK, UUID)  │         │ user_id (FK, UUID)   │
│ action               │         │ event_type           │
│ resource_type        │         │ resource_type        │
│ resource_id          │         │ resource_id          │
│ details (JSON)       │         │ properties (JSON)    │
│ ip_address           │         │ ip_address           │
│ user_agent           │         │ user_agent           │
│ created_at           │         │ session_id           │
└─────────────────────┘         │ created_at           │
                                └─────────────────────┘
```

### Enumerations

```python
# Status enums
class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RETRYING = "retrying"

class UploadStatus(str, Enum):
    INITIATED = "initiated"
    UPLOADING = "uploading"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"

class LicenseTier(str, Enum):
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"

class LicenseStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"

class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELLED = "cancelled"
    TRIALING = "trialing"
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    REFUNDED = "refunded"
    DISPUTED = "disputed"

class NotificationChannel(str, Enum):
    EMAIL = "email"
    IN_APP = "in_app"
    WEBHOOK = "webhook"
    PUSH = "push"

class NotificationType(str, Enum):
    CONVERSION_COMPLETE = "conversion_complete"
    PAYMENT_RECEIVED = "payment_received"
    SUBSCRIPTION_UPDATED = "subscription_updated"
    SECURITY_ALERT = "security_alert"
    SYSTEM_MAINTENANCE = "system_maintenance"
```

---

## API Versioning Strategy

### Versioning Approach

- **URL-based versioning**: `/api/v1/`, `/api/v2/`
- **Backward compatibility**: Minimum 6 months support for old versions
- **Deprecation headers**: `Deprecation`, `Sunset`, `Link`

### Version Lifecycle

```
v1 (Current)  ──────────────────────────────────────────────────►
                    │                                   │
v2 (Beta)     ────────────────►───────────────────────►──────────►
                    │
v3 (Planned)  ────────►

Timeline:
- v1: Stable, fully supported
- v2: Beta, new features, breaking changes from v1
- v3: Planned, future architecture
```

### Response Headers

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-API-Version: v1
Deprecation: true
Sunset: Sat, 01 Jan 2027 00:00:00 GMT
Link: <https://api.yourdomain.com/api/v2/resource>; rel="successor-version"
```

---

## Event-Driven Architecture

### Celery Task Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Celery Architecture                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐      │
│  │ Producer │────▶│  Broker  │────▶│  Worker  │────▶│ Backend  │      │
│  │ (API)    │     │ (Redis)  │     │ (Celery) │     │ (Redis)  │      │
│  └──────────┘     └──────────┘     └──────────┘     └──────────┘      │
│                                                                         │
│  Tasks:                                                                 │
│  ├── conversion.tasks.process_conversion      (Priority: high)         │
│  ├── conversion.tasks.generate_thumbnail      (Priority: low)          │
│  ├── notification.tasks.send_email            (Priority: medium)       │
│  ├── notification.tasks.send_webhook          (Priority: medium)       │
│  ├── analytics.tasks.track_event              (Priority: low)          │
│  ├── analytics.tasks.aggregate_metrics        (Priority: low)          │
│  ├── payment.tasks.process_webhook            (Priority: high)         │
│  ├── payment.tasks.send_invoice               (Priority: medium)       │
│  ├── upload.tasks.cleanup_expired             (Priority: low)          │
│  └── monitoring.tasks.check_health            (Priority: low)          │
│                                                                         │
│  Queues:                                                                │
│  ├── high_priority   (conversion, payment webhooks)                    │
│  ├── default         (general tasks)                                    │
│  ├── low_priority    (analytics, monitoring)                           │
│  └── scheduled       (periodic tasks via beat)                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Event Types

```python
# Domain Events
class EventType(str, Enum):
    # User events
    USER_CREATED = "user.created"
    USER_UPDATED = "user.updated"
    USER_DELETED = "user.deleted"
    USER_LOGIN = "user.login"
    USER_LOGOUT = "user.logout"
    
    # Upload events
    UPLOAD_STARTED = "upload.started"
    UPLOAD_COMPLETED = "upload.completed"
    UPLOAD_FAILED = "upload.failed"
    
    # Conversion events
    CONVERSION_STARTED = "conversion.started"
    CONVERSION_COMPLETED = "conversion.completed"
    CONVERSION_FAILED = "conversion.failed"
    CONVERSION_CANCELLED = "conversion.cancelled"
    
    # Payment events
    SUBSCRIPTION_CREATED = "subscription.created"
    SUBSCRIPTION_UPDATED = "subscription.updated"
    SUBSCRIPTION_CANCELLED = "subscription.cancelled"
    PAYMENT_SUCCEEDED = "payment.succeeded"
    PAYMENT_FAILED = "payment.failed"
    
    # License events
    LICENSE_ACTIVATED = "license.activated"
    LICENSE_EXPIRED = "license.expired"
    LICENSE_SUSPENDED = "license.suspended"
```

### Task Configuration

```python
# celery_app.py
from celery import Celery
from kombu import Exchange, Queue

celery_app = Celery("email_converter")

celery_app.conf.update(
    broker_url="redis://localhost:6379/1",
    result_backend="redis://localhost:6379/2",
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "app.modules.conversion.tasks.*": {"queue": "high_priority"},
        "app.modules.payment.tasks.*": {"queue": "high_priority"},
        "app.modules.notification.tasks.*": {"queue": "default"},
        "app.modules.analytics.tasks.*": {"queue": "low_priority"},
        "app.modules.monitoring.tasks.*": {"queue": "low_priority"},
    },
    task_queues=(
        Queue("high_priority", Exchange("high_priority"), routing_key="high"),
        Queue("default", Exchange("default"), routing_key="default"),
        Queue("low_priority", Exchange("low_priority"), routing_key="low"),
    ),
    beat_schedule={
        "cleanup-expired-uploads": {
            "task": "app.modules.upload.tasks.cleanup_expired",
            "schedule": 3600.0,  # Every hour
        },
        "aggregate-analytics": {
            "task": "app.modules.analytics.tasks.aggregate_metrics",
            "schedule": 300.0,  # Every 5 minutes
        },
        "check-health": {
            "task": "app.modules.monitoring.tasks.check_health",
            "schedule": 60.0,  # Every minute
        },
    },
)
```

---

## Caching Strategy

### Multi-Level Cache Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Caching Strategy (L1 + L2)                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        L1 Cache (Memory)                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │   │
│  │  │   LRU Cache  │  │  TTL Cache   │  │  Custom Cache│         │   │
│  │  │  (1000 items)│  │  (5 min TTL) │  │  (per route) │         │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘         │   │
│  │                                                                 │   │
│  │  Hit Rate: ~60%  │  Latency: <1ms  │  Eviction: LRU          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        L2 Cache (Redis)                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │   │
│  │  │  String Cache│  │  Hash Cache  │  │  Sorted Set  │         │   │
│  │  │  (JSON)      │  │  (Objects)   │  │  (Leaderboard)│        │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘         │   │
│  │                                                                 │   │
│  │  Hit Rate: ~30%  │  Latency: ~2ms  │  Eviction: allkeys-lru   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     Database (PostgreSQL)                       │   │
│  │  Hit Rate: ~10%  │  Latency: ~10ms                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Cache Keys Strategy

```python
# Cache key patterns
CACHE_KEYS = {
    # User cache
    "user:id:{user_id}": {"ttl": 300, "level": "L1+L2"},
    "user:email:{email}": {"ttl": 300, "level": "L2"},
    "user:permissions:{user_id}": {"ttl": 600, "level": "L2"},
    
    # Session cache
    "session:{session_id}": {"ttl": 1800, "level": "L2"},
    "session:user:{user_id}": {"ttl": 1800, "level": "L2"},
    
    # Conversion cache
    "conversion:job:{job_id}": {"ttl": 60, "level": "L1"},
    "conversion:user:{user_id}:list": {"ttl": 30, "level": "L1"},
    
    # License cache
    "license:key:{license_key}": {"ttl": 3600, "level": "L2"},
    "license:features:{user_id}": {"ttl": 3600, "level": "L2"},
    
    # Search cache
    "search:query:{query_hash}": {"ttl": 300, "level": "L2"},
    "search:suggestions:{prefix}": {"ttl": 600, "level": "L2"},
    
    # Analytics cache
    "analytics:metrics:{metric}:{period}": {"ttl": 300, "level": "L2"},
    "analytics:user:{user_id}:stats": {"ttl": 300, "level": "L2"},
    
    # Rate limit
    "ratelimit:{identifier}:{window}": {"ttl": 60, "level": "L2"},
}
```

### Cache Invalidation

```python
# Invalidation strategies
class CacheInvalidation:
    """Cache invalidation patterns."""
    
    @staticmethod
    async def invalidate_user(user_id: UUID):
        """Invalidate all user-related caches."""
        patterns = [
            f"user:id:{user_id}",
            f"user:permissions:{user_id}",
            f"session:user:{user_id}",
            f"license:features:{user_id}",
            f"analytics:user:{user_id}:stats",
        ]
        await cache.delete_many(patterns)
    
    @staticmethod
    async def invalidate_conversion(job_id: UUID):
        """Invalidate conversion-related caches."""
        patterns = [
            f"conversion:job:{job_id}",
            "conversion:user:*:list",
        ]
        await cache.delete_many(patterns)
    
    @staticmethod
    async def invalidate_pattern(pattern: str):
        """Invalidate all caches matching pattern."""
        keys = await cache.keys(pattern)
        if keys:
            await cache.delete_many(keys)
```

---

## Security Architecture

### Security Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Security Architecture                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Layer 1: Network Security                                              │
│  ├── DDoS protection (CloudFlare/AWS Shield)                           │
│  ├── WAF (Web Application Firewall)                                     │
│  ├── IP whitelisting (admin endpoints)                                  │
│  └── Network policies (Kubernetes)                                      │
│                                                                         │
│  Layer 2: Transport Security                                            │
│  ├── TLS 1.3 (HTTPS)                                                   │
│  ├── HSTS headers                                                       │
│  ├── Certificate pinning (mobile)                                       │
│  └── Secure WebSocket (WSS)                                             │
│                                                                         │
│  Layer 3: Application Security                                          │
│  ├── Authentication (JWT + OAuth2)                                      │
│  ├── Authorization (RBAC)                                               │
│  ├── Rate limiting (per user/IP/endpoint)                               │
│  ├── Input validation (Pydantic)                                        │
│  ├── Output encoding                                                    │
│  └── CSRF protection                                                    │
│                                                                         │
│  Layer 4: Data Security                                                 │
│  ├── Encryption at rest (AES-256)                                       │
│  ├── Encryption in transit (TLS)                                        │
│  ├── Password hashing (bcrypt)                                          │
│  ├── API key hashing (SHA-256)                                          │
│  └── PII data masking                                                   │
│                                                                         │
│  Layer 5: Monitoring & Response                                         │
│  ├── Security event logging                                             │
│  ├── Intrusion detection                                                │
│  ├── Anomaly detection                                                  │
│  └── Incident response                                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Authentication Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  Client  │────▶│  Rate   │────▶│  Auth   │────▶│  JWT    │
│          │     │ Limiter │     │  Check  │     │ Verify  │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
     │               │               │               │
     │  Request      │               │               │
     │──────────────▶│               │               │
     │               │ Allow?        │               │
     │◀──────────────│               │               │
     │               │               │               │
     │  + Bearer     │               │               │
     │──────────────▶│──────────────▶│               │
     │               │               │ Token valid?  │
     │               │               │──────────────▶│
     │               │               │               │
     │               │               │  Valid         │
     │               │               │◀──────────────│
     │               │               │               │
     │               │               │  User context │
     │               │               │──────────────▶│
     │               │               │               │
     │               │               │◀──────────────│
     │               │               │               │
     │◀──────────────────────────────│               │
     │  Response                      │               │
```

### Authorization Matrix

```
┌──────────────────────┬────────┬──────────┬──────────────┬───────────┐
│       Resource       │  Free  │ Starter  │ Professional │ Enterprise│
├──────────────────────┼────────┼──────────┼──────────────┼───────────┤
│ File Upload          │  10/mo │  100/mo  │   1,000/mo   │ Unlimited │
│ File Size            │  10 MB │  50 MB   │    100 MB    │   500 MB  │
│ Conversions/day      │   5    │   50     │     500      │ Unlimited │
│ Format Support       │ Basic  │ Standard │   Premium    │  All      │
│ API Access           │   No   │   Yes    │     Yes      │   Yes     │
│ Webhooks             │   No   │   No     │     Yes      │   Yes     │
│ Priority Support     │   No   │   No     │     Yes      │   Yes     │
│ Custom Branding      │   No   │   No     │     No       │   Yes     │
│ SLA                  │   No   │   99%    │    99.9%     │  99.99%   │
└──────────────────────┴────────┴──────────┴──────────────┴───────────┘
```

---

## Multi-Tenant Architecture

### Tenant Isolation

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Multi-Tenant Architecture                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Strategy: Shared Database, Separate Schemas                           │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     PostgreSQL Database                         │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │   │
│  │  │ public   │  │ tenant_a │  │ tenant_b │  │ tenant_c │      │   │
│  │  │ schema   │  │ schema   │  │ schema   │  │ schema   │      │   │
│  │  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤      │   │
│  │  │ users    │  │ users    │  │ users    │  │ users    │      │   │
│  │  │ roles    │  │ roles    │  │ roles    │  │ roles    │      │   │
│  │  │ plans    │  │ uploads  │  │ uploads  │  │ uploads  │      │   │
│  │  │ licenses │  │ convs    │  │ convs    │  │ convs    │      │   │
│  │  └──────────┘  │ billing  │  │ billing  │  │ billing  │      │   │
│  │                └──────────┘  └──────────┘  └──────────┘      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Tenant Context:                                                        │
│  ├── X-Tenant-ID header                                                 │
│  ├── JWT claims (tenant_id)                                             │
│  └── Subdomain (tenant.yourdomain.com)                                  │
│                                                                         │
│  Isolation Points:                                                      │
│  ├── Database (schema per tenant)                                       │
│  ├── Cache (key prefix per tenant)                                      │
│  ├── Storage (folder per tenant)                                        │
│  └── Queue (queue per tenant for critical tasks)                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tenant Context Middleware

```python
# middleware/tenant.py
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Extract tenant from header, JWT, or subdomain
        tenant_id = self._extract_tenant(request)
        
        if tenant_id:
            # Set tenant context
            request.state.tenant_id = tenant_id
            
            # Set database search path
            await self._set_schema(tenant_id)
        
        response = await call_next(request)
        return response
    
    def _extract_tenant(self, request: Request) -> str | None:
        # Check header first
        tenant_id = request.headers.get("X-Tenant-ID")
        if tenant_id:
            return tenant_id
        
        # Check JWT claims
        if hasattr(request.state, "user"):
            return request.state.user.tenant_id
        
        # Check subdomain
        host = request.headers.get("host", "")
        if "." in host:
            subdomain = host.split(".")[0]
            if subdomain != "api":
                return subdomain
        
        return None
```

---

## Infrastructure Architecture

### Production Infrastructure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Infrastructure Architecture                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        CDN (CloudFlare)                         │   │
│  │  ├── Static asset caching                                       │   │
│  │  ├── DDoS protection                                            │   │
│  │  ├── SSL/TLS termination                                        │   │
│  │  └── Rate limiting                                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   Load Balancer (AWS ALB)                       │   │
│  │  ├── SSL/TLS termination                                        │   │
│  │  ├── Path-based routing                                         │   │
│  │  ├── Health checks                                              │   │
│  │  └── Auto-scaling integration                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   Kubernetes Cluster (EKS)                      │   │
│  │  ┌───────────────────────────────────────────────────────────┐  │   │
│  │  │  Namespace: email-converter                                │  │   │
│  │  │  ├── Deployment: app (3-10 replicas)                       │  │   │
│  │  │  ├── Deployment: worker (2-5 replicas)                     │  │   │
│  │  │  ├── Deployment: beat (1 replica)                          │  │   │
│  │  │  ├── HPA: auto-scaling based on CPU/memory                 │  │   │
│  │  │  ├── PDB: min 1 available during disruptions               │  │   │
│  │  │  └── NetworkPolicy: restricted traffic                     │  │   │
│  │  └───────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Data Layer                                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │   │
│  │  │PostgreSQL│  │  Redis   │  │  S3/MinIO │  │ Elastic- │      │   │
│  │  │ (RDS)    │  │(ElastiC) │  │           │  │ search   │      │   │
│  │  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤      │   │
│  │  │ Multi-AZ │  │ Cluster  │  │ Versioned│  │ 3 nodes  │      │   │
│  │  │ Read     │  │ Mode     │  │ Lifecycle│  │ Cluster  │      │   │
│  │  │ Replicas │  │ Sentinel │  │ Rules    │  │          │      │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Monitoring Stack                              │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │   │
│  │  │Prometheus│  │ Grafana  │  │  Loki    │  │ Alert-   │      │   │
│  │  │          │  │          │  │          │  │ manager  │      │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Resource Allocation

| Component | CPU Request | CPU Limit | Memory Request | Memory Limit |
|-----------|-------------|-----------|----------------|--------------|
| App | 1 | 2 | 1Gi | 2Gi |
| Worker | 1 | 2 | 1Gi | 2Gi |
| Beat | 0.5 | 1 | 512Mi | 1Gi |
| PostgreSQL | 2 | 4 | 4Gi | 8Gi |
| Redis | 1 | 2 | 2Gi | 4Gi |
| Elasticsearch | 2 | 4 | 4Gi | 8Gi |

---

*Last updated: July 2026*
