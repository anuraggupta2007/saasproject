# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-07-08

### Added — Authentication Module
- JWT-based authentication with access and refresh token rotation
- OAuth 2.0 integration for Google and Microsoft login
- Multi-Factor Authentication (MFA) with TOTP support
- Password reset flow with secure token generation
- Session management with configurable expiry and revocation
- Account lockout after configurable failed login attempts
- Role-Based Access Control (RBAC) with admin, user, and viewer roles
- API key authentication for programmatic access
- Login audit logging with IP, user agent, and timestamp

### Added — File Upload Module
- Chunked file upload support for large email archives (>100MB)
- Resumable upload with client-side offset tracking
- Virus scanning integration (ClamAV) on all uploaded files
- Storage abstraction layer supporting local filesystem, S3, and GCS
- MIME type validation before processing
- Duplicate upload detection via content hashing
- Upload progress tracking with WebSocket updates
- Temporary file cleanup with configurable TTL

### Added — MIME Processing Module
- RFC 5322 email parsing with full header extraction
- MIME multipart decomposition (mixed, alternative, related)
- Attachment extraction with original filenames and content types
- Embedded image extraction and base64 decoding
- Email thread reconstruction via In-Reply-To / References headers
- HTML-to-text fallback for plain text extraction
- Header normalization for non-standard encodings
- MIME boundary detection for malformed messages

### Added — Conversion Engine Module
- Email-to-PDF conversion with faithful rendering of HTML content
- EML-to-PST conversion for Microsoft Outlook compatibility
- MBOX file extraction with per-message processing
- Batch conversion with parallel worker processing
- Custom PDF templates with company branding support
- Attachment inclusion/exclusion options in converted output
- Conversion queue with priority support (urgent, normal, low)
- Progress tracking and status reporting for long-running conversions

### Added — License Management Module
- License key generation with cryptographic signing
- License activation and deactivation workflows
- Tier-based feature gating (Free, Pro, Enterprise)
- License expiry handling with grace period
- Usage-based license metering (conversions, API calls)
- License transfer between accounts
- Bulk license generation for enterprise customers
- License audit trail with activation/deactivation history

### Added — Payment & Billing Module
- Stripe integration for subscription management
- Three-tier pricing: Free (100 conversions/mo), Pro ($29/mo, 5000), Enterprise (custom)
- Usage metering with real-time quota tracking
- Automatic invoice generation and email delivery
- Webhook handling for payment events (succeeded, failed, refunded)
- Promo code and discount support
- Tax calculation with Stripe Tax integration
- Payment method management (add, update, delete)
- Dunning management for failed payments

### Added — Admin Dashboard Module
- User management with search, filter, and bulk operations
- System health overview with real-time metrics
- Tenant management for multi-tenant administration
- Configuration management with environment-specific overrides
- Audit log viewer with filtering and export
- Conversion job monitor with status and error details
- License management dashboard with usage analytics
- Billing overview with revenue metrics

### Added — Notifications Module
- Email notifications via SMTP and Amazon SES
- In-app notification center with read/unread state
- Webhook notifications for external integrations
- Push notifications via Firebase Cloud Messaging (FCM)
- Notification templates with variable interpolation
- Notification preferences per user (email, in-app, push)
- Notification batching to prevent spam
- Delivery status tracking and retry logic

### Added — Analytics Module
- Conversion metrics tracking (count, duration, success rate)
- User activity logging with session tracking
- API usage analytics per tenant
- Storage usage tracking per account
- Custom event tracking for business metrics
- Report generation with CSV and PDF export
- Dashboard widgets with configurable time ranges
- Data retention policies with automatic cleanup

### Added — Monitoring Module
- Prometheus metrics endpoint with application and system metrics
- Grafana dashboards for infrastructure and application monitoring
- Alert rules for error rate, latency, and resource utilization
- PagerDuty integration for on-call alerting
- Distributed tracing with OpenTelemetry
- Health check endpoints (liveness, readiness, startup)
- Structured logging with correlation IDs
- Log aggregation pipeline (ELK/Loki)

### Added — Security Hardening Module
- Rate limiting with configurable limits per endpoint and per user
- CORS policy management with origin allowlisting
- Content Security Policy (CSP) headers
- Input validation and sanitization on all API endpoints
- SQL injection prevention via parameterized queries
- XSS protection with output encoding
- CSRF protection for state-changing operations
- Request size limits and timeout configuration
- Security headers (HSTS, X-Frame-Options, X-Content-Type-Options)

### Added — Search & Indexing Module
- Full-text search across email content and metadata
- Elasticsearch integration with index management
- Search indexing pipeline with async document updates
- Faceted search support (date range, sender, has attachments)
- Search result highlighting with snippet extraction
- Index optimization with custom analyzers
- Search analytics and query logging
- Bulk reindexing capability

### Added — API Gateway & Multi-Tenant Module
- Tenant isolation with data partitioning
- API key management with per-tenant rate limits
- Request routing with path-based and header-based routing
- Usage quotas per tenant with configurable overage policies
- Tenant-specific configuration overrides
- Cross-tenant request blocking (security)
- API versioning support (URL and header-based)
- Request/response logging per tenant

### Added — Public API & SDK Module
- RESTful API with OpenAPI 3.0 specification
- API documentation with interactive Swagger UI
- SDK generation for 6 languages (Node.js, Python, Go, Java, Ruby, C#)
- SDK published to npm, PyPI, Go modules, Maven, RubyGems, NuGet
- API rate limiting with retry-after headers
- Pagination support (cursor-based and offset-based)
- Bulk API operations for batch processing
- Webhook subscription management API

### Changed
- All modules use consistent error response format: `{ error: { code, message, details } }`
- Authentication tokens now use RS256 signing instead of HS256
- File uploads now stream to storage instead of buffering to disk
- Database queries use prepared statements across all modules
- Logging format standardized to JSON structured logs
- All timestamps normalized to ISO 8601 UTC

### Fixed
- Email parser now correctly handles malformed MIME boundaries
- PDF conversion no longer strips inline images from HTML emails
- OAuth callback now properly validates state parameter
- Token refresh now uses atomic compare-and-swap to prevent race conditions
- File upload resume now correctly handles network interruptions
- Search indexing now processes emails in correct chronological order
- API rate limiter now correctly counts requests per-tenant, not globally
- Audit log now includes tenant context in all entries
- Webhook retries now use exponential backoff with jitter
- Database connection pool now properly releases connections on error

### Security
- Implemented AES-256-GCM encryption for MFA secrets at rest
- Added constant-time comparison for OAuth state and webhook signature validation
- Enforced HTTPS-only cookies with Secure and HttpOnly flags
- Added input validation on all API endpoints to prevent injection attacks
- Implemented CORS policy with explicit origin allowlisting
- Added Content Security Policy headers to prevent XSS
- Rate limiting applied globally and per-tenant to prevent abuse
- Virus scanning mandatory for all file uploads
- API keys hashed with bcrypt before storage
- Audit logging for all authentication and authorization events

### Deprecated
- `POST /api/v1/auth/login` — Use `POST /api/v1/auth/sessions` instead (will be removed in v1.5.0)
- `GET /api/v1/conversions?status=all` — Use `GET /api/v1/conversions` with status filter parameter (will be removed in v1.5.0)
- HS256 JWT signing — Use RS256 (migration guide in docs) (will be removed in v1.3.0)
- `x-api-key` header authentication — Use `Authorization: Bearer` with API tokens (will be removed in v2.0.0)

### Removed
- Legacy v1 beta API endpoints (`/beta/*`) — deprecated since 2025-12-01
- File-based session storage — sessions now require Redis or database
- Synchronous conversion endpoint (`POST /api/v1/convert/sync`) — use async with polling or webhooks

---

## [1.0.0-rc.1] - 2026-06-15

### Fixed
- Race condition in concurrent file uploads to same tenant
- Memory leak in long-running conversion workers
- Incorrect timestamp in audit log entries

### Security
- Patched dependency vulnerability in `jsonwebtoken` (CVE-2026-XXXXX)

---

## [1.0.0-beta.2] - 2026-05-01

### Added
- Bulk license generation API endpoint
- Webhook retry logic with exponential backoff
- Search result highlighting

### Fixed
- OAuth token refresh failing silently
- MBOX parser crash on empty messages
- Dashboard chart rendering on Safari

---

## [1.0.0-beta.1] - 2026-03-15

### Added
- Initial beta release with all 14 backend modules
- 6 SDK packages (Node.js, Python, Go, Java, Ruby, C#)
- CLI tool for batch conversions
- Docker and Kubernetes deployment support
- CI/CD pipeline with automated testing
- Monitoring with Prometheus and Grafana

### Known Issues
- Security middleware not registered in production build
- BaseRepository pattern not enforced across all modules
- OAuth state validation not implemented
- MFA secrets stored in plaintext

---

## [1.0.0-alpha.1] - 2026-02-01

### Added
- Core conversion engine (EML → PDF)
- Authentication with JWT
- Basic file upload
- Database schema and migrations
- Initial API endpoints

### Known Issues
- Limited to single-tenant deployment
- No billing integration
- No search functionality
- Performance not optimized
