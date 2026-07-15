# Email Converter Public API Documentation

## Overview

The Email Converter Public API provides programmatic access to convert email files between formats (MBOX, PST, EML, PDF, HTML, MSG) with full search, webhook, and batch processing capabilities.

**Base URL:** `https://api.emailconverter.com`

## Authentication

### API Key (Recommended)

Include your API key in the `Authorization` header:

```bash
curl -H "Authorization: Bearer ec_live_your_api_key_here" \
     https://api.emailconverter.com/api/public/v1/users/me
```

### OAuth2 Client Credentials

```bash
curl -X POST https://api.emailconverter.com/api/public/v1/auth/oauth/token \
     -H "Content-Type: application/json" \
     -d '{
       "grant_type": "client_credentials",
       "client_id": "your_client_id",
       "client_secret": "your_client_secret",
       "scope": "read write"
     }'
```

## Rate Limits

| Tier        | Requests/Min | Requests/Hour | Requests/Day | Burst |
|-------------|-------------|---------------|--------------|-------|
| Free        | 10          | 200           | 1,000        | 20    |
| Starter     | 60          | 2,000         | 10,000       | 120   |
| Pro         | 300         | 10,000        | 50,000       | 600   |
| Enterprise  | 1,000       | 50,000        | 1,000,000    | 2,000 |

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: UTC epoch time when limits reset

## Endpoints

### Authentication

| Method | Endpoint                        | Description           |
|--------|---------------------------------|-----------------------|
| POST   | `/api/public/v1/auth/keys`      | Create API key        |
| GET    | `/api/public/v1/auth/keys`      | List API keys         |
| POST   | `/api/public/v1/auth/keys/{id}/rotate` | Rotate API key  |
| DELETE | `/api/public/v1/auth/keys/{id}` | Revoke API key        |
| POST   | `/api/public/v1/auth/oauth/token` | OAuth2 token        |

### Users

| Method | Endpoint                              | Description              |
|--------|---------------------------------------|--------------------------|
| GET    | `/api/public/v1/users/me`             | Get user profile         |
| GET    | `/api/public/v1/users/me/usage`       | Get usage statistics     |
| GET    | `/api/public/v1/users/me/subscription`| Get subscription details |

### Uploads

| Method | Endpoint                           | Description              |
|--------|------------------------------------|--------------------------|
| POST   | `/api/public/v1/uploads`           | Create upload session    |
| GET    | `/api/public/v1/uploads/{id}`      | Get upload status        |
| POST   | `/api/public/v1/uploads/{id}/chunks`| Upload chunk            |
| DELETE | `/api/public/v1/uploads/{id}`      | Delete upload            |

### Conversions

| Method | Endpoint                                   | Description              |
|--------|--------------------------------------------|--------------------------|
| POST   | `/api/public/v1/conversions`               | Start conversion         |
| GET    | `/api/public/v1/conversions/{id}`          | Get conversion status    |
| GET    | `/api/public/v1/conversions`               | List conversions         |
| POST   | `/api/public/v1/conversions/{id}/cancel`   | Cancel conversion        |
| GET    | `/api/public/v1/conversions/{id}/download` | Get download URL         |

### Search

| Method | Endpoint                              | Description              |
|--------|---------------------------------------|--------------------------|
| POST   | `/api/public/v1/search`               | Search emails            |
| GET    | `/api/public/v1/search/suggestions`   | Get search suggestions   |

### Webhooks

| Method | Endpoint                                  | Description              |
|--------|-------------------------------------------|--------------------------|
| POST   | `/api/public/v1/webhooks`                 | Create webhook           |
| GET    | `/api/public/v1/webhooks`                 | List webhooks            |
| GET    | `/api/public/v1/webhooks/{id}`            | Get webhook              |
| DELETE | `/api/public/v1/webhooks/{id}`            | Delete webhook           |
| POST   | `/api/public/v1/webhooks/{id}/test`       | Test webhook             |
| GET    | `/api/public/v1/webhooks/{id}/deliveries` | List deliveries          |

### Rate Limits

| Method | Endpoint                            | Description              |
|--------|-------------------------------------|--------------------------|
| GET    | `/api/public/v1/rate-limit/status`  | Get rate limit status    |
| GET    | `/api/public/v1/tiers`              | List available tiers     |

### Health

| Method | Endpoint                   | Description       |
|--------|----------------------------|-------------------|
| GET    | `/api/public/v1/health`    | Health check      |

## Webhook Events

| Event                      | Description                    |
|----------------------------|--------------------------------|
| `conversion.completed`     | Conversion finished            |
| `conversion.failed`        | Conversion failed              |
| `upload.completed`         | Upload completed               |
| `upload.failed`            | Upload failed                  |
| `subscription.updated`     | Subscription changed           |
| `payment.completed`        | Payment processed              |
| `payment.failed`           | Payment failed                 |

### Webhook Payload

```json
{
  "id": "evt_abc123",
  "event_type": "conversion.completed",
  "data": {
    "conversion_id": "conv_xyz789",
    "status": "completed",
    "download_url": "https://storage.example.com/..."
  },
  "created_at": "2026-01-01T00:00:00Z"
}
```

### Webhook Signature Verification

All webhook requests include an `X-Webhook-Signature` header with an HMAC-SHA256 signature:

```python
import hmac
import hashlib

def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
```

### Retry Policy

Failed webhook deliveries (non-2xx response) are retried with exponential backoff:

| Attempt | Delay     |
|---------|-----------|
| 1       | 30 sec    |
| 2       | 2 min     |
| 3       | 10 min    |
| 4       | 1 hour    |
| 5       | 1 hour    |

Maximum 5 delivery attempts per event.

## SDKs

Official SDKs are available for:

- **Python**: `pip install email-converter-sdk`
- **JavaScript/TypeScript**: `npm install email-converter-sdk`
- **Java**: Maven/Gradle dependency
- **Go**: `go get github.com/emailconverter/sdk-go`
- **C#**: NuGet package
- **PHP**: Composer package

## CLI

```bash
# Health check
python cli/email_converter_cli.py --api-key ec_live_xxx health

# Upload file
python cli/email_converter_cli.py --api-key ec_live_xxx upload myfile.mbox

# Convert
python cli/email_converter_cli.py --api-key ec_live_xxx convert <upload_id> pdf

# Search
python cli/email_converter_cli.py --api-key ec_live_xxx search "from:alice@example.com"
```

## Error Codes

| Code  | Description                    |
|-------|--------------------------------|
| 400   | Bad request / validation error |
| 401   | Authentication required        |
| 403   | Insufficient permissions       |
| 404   | Resource not found             |
| 409   | Resource conflict              |
| 429   | Rate limit exceeded            |
| 500   | Internal server error          |
| 503   | Service temporarily unavailable|
