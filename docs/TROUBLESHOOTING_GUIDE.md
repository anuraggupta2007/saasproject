# Troubleshooting Guide

Comprehensive troubleshooting guide for common issues in the Email Converter SaaS.

## Table of Contents

- [Database Connection Issues](#database-connection-issues)
- [Redis Connection Issues](#redis-connection-issues)
- [Celery Worker Issues](#celery-worker-issues)
- [File Upload Issues](#file-upload-issues)
- [Conversion Failures](#conversion-failures)
- [Authentication Issues](#authentication-issues)
- [Payment Processing Issues](#payment-processing-issues)
- [Search Indexing Issues](#search-indexing-issues)
- [Performance Degradation](#performance-degradation)
- [Memory Leaks](#memory-leaks)
- [Disk Space Issues](#disk-space-issues)
- [Network Connectivity](#network-connectivity)
- [SSL Certificate Issues](#ssl-certificate-issues)

---

## Database Connection Issues

### Issue: Cannot Connect to Database

**Symptoms:**
```
sqlalchemy.exc.OperationalError: (asyncpg.exceptions.ConnectionDoesNotExistError)
connection was closed
```

**Diagnosis:**
```bash
# Check database pod status
kubectl get pods -n email-converter -l app=postgres
kubectl describe pod <db-pod> -n email-converter

# Check database logs
kubectl logs <db-pod> -n email-converter --tail=50

# Test connectivity
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  python -c "
import asyncio
import asyncpg

async def test():
    try:
        conn = await asyncpg.connect(
            host='email-converter-db',
            port=5432,
            user='email_converter',
            password='your_password',
            database='email_converter'
        )
        print('Connection successful')
        await conn.close()
    except Exception as e:
        print(f'Connection failed: {e}')

asyncio.run(test())
"
```

**Solutions:**
```bash
# 1. Check database service
kubectl get svc -n email-converter

# 2. Restart database
kubectl rollout restart deployment/email-converter-db -n email-converter

# 3. Check connection pool settings
# In config.py
DATABASE_POOL_SIZE = 20
DATABASE_MAX_OVERFLOW = 10
DATABASE_POOL_TIMEOUT = 30

# 4. Add connection pool monitoring
# In database.py
from sqlalchemy import event

@event.listens_for(engine.sync_engine, "checkout")
def receive_checkout(dbapi_conn, connection_rec, connection_proxy):
    logger.info("Connection checked out from pool")
```

### Issue: Too Many Connections

**Symptoms:**
```
FATAL: too many connections for role "email_converter"
```

**Diagnosis:**
```bash
# Check connection count
kubectl exec -it deployment/email-converter-db -n email-converter -- \
  psql -U email_converter -c "
  SELECT count(*), state
  FROM pg_stat_activity
  GROUP BY state;"

# Check connections by application
kubectl exec -it deployment/email-converter-db -n email-converter -- \
  psql -U email_converter -c "
  SELECT application_name, count(*)
  FROM pg_stat_activity
  GROUP BY application_name;"
```

**Solutions:**
```bash
# 1. Kill idle connections
kubectl exec -it deployment/email-converter-db -n email-converter -- \
  psql -U email_converter -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'idle'
  AND query_start < now() - interval '10 minutes';"

# 2. Configure connection pool in application
# In config.py
DATABASE_POOL_SIZE = 20  # Reduce from default
DATABASE_MAX_OVERFLOW = 5
DATABASE_POOL_TIMEOUT = 30
DATABASE_POOL_RECYCLE = 1800

# 3. Increase max connections in PostgreSQL
kubectl exec -it deployment/email-converter-db -n email-converter -- \
  psql -U email_converter -c "ALTER SYSTEM SET max_connections = 300;"
kubectl rollout restart deployment/email-converter-db -n email-converter
```

### Issue: Connection Pool Exhausted

**Symptoms:**
```
sqlalchemy.exc.TimeoutError: QueuePool limit of size 20 overflow 10 reached
```

**Solutions:**
```python
# 1. Increase pool size temporarily
DATABASE_POOL_SIZE = 30
DATABASE_MAX_OVERFLOW = 15

# 2. Add connection pool monitoring
from sqlalchemy import event
from sqlalchemy.pool import Pool

@event.listens_for(Pool, "checkout")
def receive_checkout(dbapi_conn, connection_rec, connection_proxy):
    pool = connection_proxy._pool
    logger.warning(
        "Connection pool checkout",
        checked_out=pool.checkedout(),
        overflow=pool.overflow(),
        size=pool.size(),
    )

# 3. Add connection pool stats endpoint
@app.get("/health/pool")
async def pool_health():
    pool = async_engine.pool
    return {
        "size": pool.size(),
        "checked_in": pool.checkedin(),
        "checked_out": pool.checkedout(),
        "overflow": pool.overflow(),
    }
```

### Issue: Database Replication Lag

**Symptoms:**
```bash
# Read-after-write inconsistencies
# Data not appearing immediately after write
```

**Diagnosis:**
```bash
# Check replication status
kubectl exec -it deployment/email-converter-db -n email-converter -- \
  psql -U email_converter -c "
  SELECT client_addr,
         state,
         sent_lsn,
         write_lsn,
         flush_lsn,
         replay_lsn,
         pg_wal_lsn_diff(sent_lsn, replay_lsn) AS replication_lag_bytes
  FROM pg_stat_replication;"

# Check WAL generation rate
kubectl exec -it deployment/email-converter-db -n email-converter -- \
  psql -U email_converter -c "
  SELECT pg_current_wal_lsn();"
```

**Solutions:**
```bash
# 1. Check network latency between primary and replica
# 2. Increase WAL buffers
kubectl exec -it deployment/email-converter-db -n email-converter -- \
  psql -U email_converter -c "ALTER SYSTEM SET wal_buffers = '32MB';"

# 3. Optimize replication
kubectl exec -it deployment/email-converter-db -n email-converter -- \
  psql -U email_converter -c "ALTER SYSTEM SET max_wal_senders = 10;"

# 4. Use read replicas for read-heavy workloads
# Configure application to route reads to replicas
```

---

## Redis Connection Issues

### Issue: Redis Connection Refused

**Symptoms:**
```
redis.exceptions.ConnectionError: Error connecting to localhost:6379
```

**Diagnosis:**
```bash
# Check Redis pod status
kubectl get pods -n email-converter -l app=redis
kubectl describe pod <redis-pod> -n email-converter

# Check Redis logs
kubectl logs <redis-pod> -n email-converter --tail=50

# Test connectivity
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  python -c "
import redis
try:
    r = redis.Redis(host='email-converter-redis', port=6379)
    r.ping()
    print('Redis connection successful')
except Exception as e:
    print(f'Redis connection failed: {e}')
"
```

**Solutions:**
```bash
# 1. Restart Redis
kubectl rollout restart deployment/email-converter-redis -n email-converter

# 2. Check Redis service
kubectl get svc -n email-converter

# 3. Check Redis configuration
kubectl exec -it <redis-pod> -n email-converter -- \
  redis-cli CONFIG GET requirepass

# 4. Verify password
kubectl exec -it <redis-pod> -n email-converter -- \
  redis-cli -a your_password PING
```

### Issue: Redis Memory High

**Symptoms:**
```
OOM command not allowed when used memory > 'maxmemory'
```

**Diagnosis:**
```bash
# Check memory usage
kubectl exec -it deployment/email-converter-redis -n email-converter -- \
  redis-cli INFO memory

# Check key distribution
kubectl exec -it deployment/email-converter-redis -n email-converter -- \
  redis-cli --bigkeys

# Check eviction policy
kubectl exec -it deployment/email-converter-redis -n email-converter -- \
  redis-cli CONFIG GET maxmemory-policy
```

**Solutions:**
```bash
# 1. Increase maxmemory
kubectl exec -it deployment/email-converter-redis -n email-converter -- \
  redis-cli CONFIG SET maxmemory 4gb

# 2. Change eviction policy
kubectl exec -it deployment/email-converter-redis -n email-converter -- \
  redis-cli CONFIG SET maxmemory-policy allkeys-lru

# 3. Flush expired keys
kubectl exec -it deployment/email-converter-redis -n email-converter -- \
  redis-cli KEYS "*" | xargs redis-cli EXPIRE 0

# 4. Implement key expiration in application
# Set TTL for all cached data
```

### Issue: Redis Slow Queries

**Symptoms:**
```bash
# Application timeouts
# High latency responses
```

**Diagnosis:**
```bash
# Check slow log
kubectl exec -it deployment/email-converter-redis -n email-converter -- \
  redis-cli SLOWLOG GET 10

# Check latency
kubectl exec -it deployment/email-converter-redis -n email-converter -- \
  redis-cli --latency

# Check connected clients
kubectl exec -it deployment/email-converter-redis -n email-converter -- \
  redis-cli CLIENT LIST
```

**Solutions:**
```bash
# 1. Optimize slow commands
# Avoid KEYS * in production, use SCAN instead

# 2. Pipeline commands
# Use redis pipelines to batch commands

# 3. Use connection pooling
# Configure proper connection pool in application

# 4. Check for blocking operations
kubectl exec -it deployment/email-converter-redis -n email-converter -- \
  redis-cli CLIENT LIST | grep -E "(id|addr|cmd|idle)"
```

---

## Celery Worker Issues

### Issue: Celery Worker Not Starting

**Symptoms:**
```
celery -A app.celery_app worker --loglevel=info
[2024-01-15 10:30:00,000: ERROR/MainProcess] Cannot connect to redis://localhost:6379/1
```

**Diagnosis:**
```bash
# Check worker pod status
kubectl get pods -n email-converter -l app=worker
kubectl describe pod <worker-pod> -n email-converter

# Check worker logs
kubectl logs <worker-pod> -n email-converter --tail=100

# Check Redis connectivity from worker
kubectl exec -it <worker-pod> -n email-converter -- \
  python -c "
from app.celery_app import celery_app
inspector = celery_app.control.inspect()
print(inspector.ping())
"
```

**Solutions:**
```bash
# 1. Verify Redis URL
kubectl exec -it <worker-pod> -n email-converter -- \
  env | grep CELERY

# 2. Test Redis connection
kubectl exec -it <worker-pod> -n email-converter -- \
  python -c "
import redis
r = redis.Redis.from_url('redis://email-converter-redis:6379/1')
r.ping()
print('Redis OK')
"

# 3. Restart worker
kubectl rollout restart deployment/email-converter-worker -n email-converter

# 4. Check worker configuration
kubectl exec -it <worker-pod> -n email-converter -- \
  celery -A app.celery_app inspect conf
```

### Issue: Tasks Stuck in Queue

**Symptoms:**
```bash
# Tasks not being processed
# Queue length increasing
```

**Diagnosis:**
```bash
# Check active tasks
kubectl exec -it <worker-pod> -n email-converter -- \
  celery -A app.celery_app inspect active

# Check reserved tasks
kubectl exec -it <worker-pod> -n email-converter -- \
  celery -A app.celery_app inspect reserved

# Check queue length
kubectl exec -it <worker-pod> -n email-converter -- \
  python -c "
from app.celery_app import celery_app
from kombu import Queue
queue = Queue('high_priority')
print(f'Queue length: {queue.qsize()}')
"
```

**Solutions:**
```bash
# 1. Purge stuck tasks
kubectl exec -it <worker-pod> -n email-converter -- \
  celery -A app.celery_app purge

# 2. Restart workers
kubectl rollout restart deployment/email-converter-worker -n email-converter

# 3. Scale workers
kubectl scale deployment email-converter-worker --replicas=5 -n email-converter

# 4. Check for dead letters
kubectl exec -it <worker-pod> -n email-converter -- \
  redis-cli LLEN celery
```

### Issue: High Worker Memory Usage

**Symptoms:**
```bash
# Worker pods being OOM killed
# High memory usage
```

**Diagnosis:**
```bash
# Check worker memory
kubectl top pods -n email-converter -l app=worker

# Check for memory leaks
kubectl exec -it <worker-pod> -n email-converter -- \
  python -c "
import psutil
import os

process = psutil.Process(os.getpid())
print(f'Memory info: {process.memory_info()}')
print(f'Memory percent: {process.memory_percent()}')
"

# Check worker configuration
kubectl exec -it <worker-pod> -n email-converter -- \
  celery -A app.celery_app inspect conf
```

**Solutions:**
```bash
# 1. Limit worker memory
# In deployment.yaml
resources:
  limits:
    memory: 2Gi
  requests:
    memory: 1Gi

# 2. Configure worker to restart after N tasks
# In celery_app.py
celery_app.conf.update(
    worker_max_tasks_per_child=1000,
    worker_max_memory_per_child=200000,  # 200MB
)

# 3. Optimize task memory usage
# - Use streaming for large files
# - Release memory explicitly
# - Use generators instead of lists
```

---

## File Upload Issues

### Issue: Upload Fails with Size Limit

**Symptoms:**
```
413 Request Entity Too Large
```

**Diagnosis:**
```bash
# Check nginx configuration
kubectl exec -it deployment/nginx -n email-converter -- \
  cat /etc/nginx/nginx.conf | grep client_max_body_size

# Check application configuration
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  env | grep MAX_UPLOAD

# Check request size
curl -X POST http://api.example.com/api/v1/uploads \
  -H "Content-Type: multipart/form-data" \
  -F "file=@large_file.bin" \
  -v
```

**Solutions:**
```bash
# 1. Increase nginx body size limit
# In nginx.conf
client_max_body_size 200M;

# 2. Increase application limit
# In config.py
MAX_UPLOAD_SIZE_MB = 200

# 3. Use chunked uploads for large files
curl -X POST http://api.example.com/api/v1/uploads/chunked \
  -H "Content-Type: multipart/form-data" \
  -F "file=@large_file.bin" \
  -F "chunk_number=1" \
  -F "total_chunks=10"
```

### Issue: Upload Timeout

**Symptoms:**
```
timeout of 30000ms exceeded
```

**Diagnosis:**
```bash
# Check upload progress
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  python -c "
import asyncpg
import asyncio

async def check_uploads():
    conn = await asyncpg.connect('postgresql://email_converter:password@localhost/email_converter')
    uploads = await conn.fetch('''
        SELECT id, status, chunks_uploaded, chunks_total
        FROM uploads
        WHERE status = 'uploading'
        ORDER BY created_at DESC
        LIMIT 10
    ''')
    for upload in uploads:
        print(f'{upload[\"id\"]}: {upload[\"status\"]} - {upload[\"chunks_uploaded\"]}/{upload[\"chunks_total\"]}')
    await conn.close()

asyncio.run(check_uploads())
"
```

**Solutions:**
```python
# 1. Increase timeout in application
# In main.py
from fastapi import FastAPI
app = FastAPI()

# Increase timeout for upload endpoints
@app.post("/api/v1/uploads")
async def upload_file(file: UploadFile):
    # Use streaming for large files
    content = await file.read()
    # Process in chunks
    pass

# 2. Use chunked uploads
# Client splits file into chunks
# Each chunk uploaded separately
# Server assembles chunks

# 3. Configure nginx timeout
# In nginx.conf
proxy_read_timeout 600s;
proxy_send_timeout 600s;
```

### Issue: Upload File Corrupted

**Symptoms:**
```
File is corrupted or unreadable
Invalid file format
```

**Diagnosis:**
```bash
# Check file integrity
# Calculate checksum before and after upload
sha256sum original_file.bin
sha256sum uploaded_file.bin

# Check file storage
kubectl exec -it deployment/minio -n email-converter -- \
  mc ls local/email-converter-uploads/

# Check file in database
kubectl exec -it deployment/email-converter-db -n email-converter -- \
  psql -U email_converter -c "
  SELECT id, filename, file_size, checksum
  FROM uploads
  WHERE id = 'upload-id';
  "
```

**Solutions:**
```python
# 1. Verify checksum on upload
async def upload_file(file: UploadFile):
    checksum = hashlib.sha256()
    while chunk := await file.read(8192):
        checksum.update(chunk)
    
    file_hash = checksum.hexdigest()
    
    # Verify against expected hash
    if file_hash != expected_hash:
        raise ValueError("File checksum mismatch")
    
    # Store checksum in database
    upload.checksum = file_hash

# 2. Use chunked uploads with checksum verification
# Verify each chunk's checksum

# 3. Enable storage integrity checks
# In MinIO/S3 configuration
```

---

## Conversion Failures

### Issue: Conversion Task Fails

**Symptoms:**
```
Conversion failed: Invalid input format
Conversion failed: Conversion engine error
```

**Diagnosis:**
```bash
# Check conversion job status
kubectl exec -it deployment/email-converter-db -n email-converter -- \
  psql -U email_converter -c "
  SELECT id, status, error_message, retry_count
  FROM conversion_jobs
  WHERE id = 'job-id';
  "

# Check worker logs
kubectl logs <worker-pod> -n email-converter --tail=100 | grep -i "conversion"

# Check available converters
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  python -c "
from app.modules.conversion.engine import ConversionEngine
engine = ConversionEngine()
print(engine.get_supported_formats())
"
```

**Solutions:**
```bash
# 1. Check input file format
file uploaded_file.bin
# Should show expected format

# 2. Verify conversion engine is working
kubectl exec -it <worker-pod> -n email-converter -- \
  python -c "
from app.modules.conversion.converters.pdf import PDFConverter
converter = PDFConverter()
print(f'Converter available: {converter.is_available()}')
"

# 3. Retry failed job
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  python -c "
import asyncio
from app.modules.conversion.service import ConversionService

async def retry():
    service = ConversionService()
    await service.retry_job('job-id')

asyncio.run(retry())
"

# 4. Check for resource constraints
kubectl top pods -n email-converter -l app=worker
```

### Issue: Conversion Timeout

**Symptoms:**
```
Task timed out after 300 seconds
```

**Diagnosis:**
```bash
# Check conversion duration
kubectl exec -it deployment/email-converter-db -n email-converter -- \
  psql -U email_converter -c "
  SELECT id, status, 
         EXTRACT(EPOCH FROM (completed_at - started_at)) AS duration_seconds
  FROM conversion_jobs
  WHERE id = 'job-id';
  "

# Check worker resources
kubectl top pods -n email-converter -l app=worker
```

**Solutions:**
```python
# 1. Increase task timeout
# In celery_app.py
celery_app.conf.update(
    task_soft_time_limit=600,  # 10 minutes
    task_time_limit=900,       # 15 minutes
)

# 2. Optimize conversion logic
# - Use streaming for large files
# - Process in parallel where possible
# - Optimize memory usage

# 3. Use priority queue
# Move large jobs to high_priority queue

# 4. Scale workers for large files
```

### Issue: Output File Corrupted

**Symptoms:**
```
Output file is corrupted or unreadable
Invalid output format
```

**Diagnosis:**
```bash
# Check output file
kubectl exec -it deployment/minio -n email-converter -- \
  mc ls local/email-converter-processed/

# Download and verify output
kubectl exec -it deployment/minio -n email-converter -- \
  mc cat local/email-converter-processed/output.pdf | file -

# Check conversion logs
kubectl exec -it deployment/email-converter-db -n email-converter -- \
  psql -U email_converter -c "
  SELECT id, status, error_message, metadata
  FROM conversion_jobs
  WHERE id = 'job-id';
  "
```

**Solutions:**
```python
# 1. Verify output file integrity
async def verify_output(file_path: str, expected_format: str):
    # Check file magic bytes
    magic = file_path[:4]
    if expected_format == "pdf" and magic != b'%PDF':
        raise ValueError("Invalid PDF output")
    
    # Check file size
    size = os.path.getsize(file_path)
    if size == 0:
        raise ValueError("Output file is empty")

# 2. Add checksum verification
# Calculate output checksum and store in database

# 3. Use backup conversion engine
# Fallback to different converter if primary fails
```

---

## Authentication Issues

### Issue: Invalid JWT Token

**Symptoms:**
```
401 Unauthorized: Invalid token
401 Unauthorized: Token expired
```

**Diagnosis:**
```bash
# Decode JWT token
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." | base64 -d

# Check token expiration
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo $TOKEN | cut -d. -f2 | base64 -d | jq .exp

# Check JWT secret
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  env | grep JWT_SECRET
```

**Solutions:**
```python
# 1. Verify JWT secret matches
# In config.py
JWT_SECRET_KEY = "your-secret-key"  # Must match across all instances

# 2. Check token expiration
from datetime import datetime, timedelta

def verify_token(token: str):
    payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["JWT_SECRET_KEY"])
    
    if payload["exp"] < datetime.utcnow().timestamp():
        raise TokenExpiredError()
    
    return payload

# 3. Refresh expired token
# Client should use refresh token to get new access token
```

### Issue: OAuth2 Callback Error

**Symptoms:**
```
OAuth callback failed
Invalid state parameter
```

**Diagnosis:**
```bash
# Check OAuth configuration
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  env | grep -E "(GOOGLE|GITHUB)_CLIENT"

# Check callback URL
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  env | grep REDIRECT_URI

# Check OAuth state
kubectl exec -it deployment/email-converter-redis -n email-converter -- \
  redis-cli KEYS "oauth:*"
```

**Solutions:**
```python
# 1. Verify redirect URI matches OAuth provider config
# Google/GitHub OAuth settings must match application config

# 2. Check state parameter storage
async def oauth_callback(code: str, state: str):
    # Verify state parameter
    stored_state = await cache.get(f"oauth:state:{state}")
    if not stored_state:
        raise ValueError("Invalid state parameter")
    
    # Exchange code for token
    token = await exchange_code(code)
    
    # Clean up state
    await cache.delete(f"oauth:state:{state}")
    
    return token

# 3. Increase state expiration time
await cache.set(f"oauth:state:{state}", state, ex=3600)  # 1 hour
```

### Issue: Rate Limiting

**Symptoms:**
```
429 Too Many Requests
Rate limit exceeded
```

**Diagnosis:**
```bash
# Check rate limit configuration
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  env | grep RATE_LIMIT

# Check current usage
kubectl exec -it deployment/email-converter-redis -n email-converter -- \
  redis-cli GET "ratelimit:ip:192.168.1.1:60"

# Check rate limit headers in response
curl -I http://api.example.com/api/v1/resource | grep -i "x-ratelimit"
```

**Solutions:**
```python
# 1. Implement exponential backoff in client
import asyncio
import random

async def make_request_with_retry(url: str, max_retries: int = 3):
    for attempt in range(max_retries):
        response = await client.get(url)
        
        if response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", 1))
            wait_time = retry_after * (2 ** attempt) + random.uniform(0, 1)
            await asyncio.sleep(wait_time)
            continue
        
        return response
    
    raise Exception("Max retries exceeded")

# 2. Adjust rate limits for authenticated users
# In security/rate_limiter.py
RATE_LIMITS = {
    "anonymous": {"per_minute": 10, "per_hour": 100},
    "authenticated": {"per_minute": 60, "per_hour": 1000},
    "premium": {"per_minute": 120, "per_hour": 5000},
}

# 3. Use API key for higher limits
```

---

## Payment Processing Issues

### Issue: Stripe Webhook Not Received

**Symptoms:**
```
Webhook not triggered
Payment not reflected in application
```

**Diagnosis:**
```bash
# Check Stripe webhook logs
# In Stripe Dashboard > Developers > Webhooks

# Check webhook endpoint health
curl -X POST https://api.example.com/api/v1/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{"type": "test"}' \
  -v

# Check application logs
kubectl logs deployment/email-converter-app -n email-converter | grep -i webhook
```

**Solutions:**
```python
# 1. Verify webhook endpoint is accessible
# Check nginx configuration
# Ensure /api/v1/payments/webhook is not rate limited

# 2. Verify Stripe webhook secret
# In config.py
STRIPE_WEBHOOK_SECRET = "whsec_..."

# 3. Implement webhook retry handling
@app.post("/api/v1/payments/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle event
    await handle_stripe_event(event)
    
    return {"status": "success"}

# 4. Check webhook endpoint in Stripe Dashboard
# Ensure endpoint is enabled and has correct URL
```

### Issue: Payment Intent Fails

**Symptoms:**
```
Payment intent creation failed
Card declined
```

**Diagnosis:**
```bash
# Check Stripe API logs
# In Stripe Dashboard > Developers > Logs

# Check payment intent status
kubectl exec -it deployment/email-converter-db -n email-converter -- \
  psql -U email_converter -c "
  SELECT id, status, stripe_payment_id, error_message
  FROM payments
  WHERE id = 'payment-id';
  "

# Check Stripe API key
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  env | grep STRIPE
```

**Solutions:**
```python
# 1. Handle specific Stripe errors
import stripe

async def create_payment_intent(amount: int, currency: str):
    try:
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            automatic_payment_methods={"enabled": True},
        )
        return intent
    except stripe.error.CardError as e:
        # Card declined
        raise PaymentError(f"Card declined: {e.user_message}")
    except stripe.error.InvalidRequestError as e:
        # Invalid parameters
        raise PaymentError(f"Invalid request: {e}")
    except stripe.error.AuthenticationError as e:
        # Authentication failed
        raise PaymentError("Stripe authentication failed")
    except stripe.error.APIConnectionError as e:
        # Network error
        raise PaymentError("Network error communicating with Stripe")

# 2. Implement idempotency
intent = stripe.PaymentIntent.create(
    amount=amount,
    currency=currency,
    idempotency_key=f"payment-{user_id}-{timestamp}",
)

# 3. Handle 3D Secure
if intent.status == "requires_action":
    return {"client_secret": intent.client_secret}
```

### Issue: Subscription Cancellation Not Working

**Symptoms:**
```
Subscription still active after cancellation
Cancellation not reflected in Stripe
```

**Diagnosis:**
```bash
# Check subscription status
kubectl exec -it deployment/email-converter-db -n email-converter -- \
  psql -U email_converter -c "
  SELECT id, status, cancel_at_period_end, stripe_sub_id
  FROM subscriptions
  WHERE id = 'subscription-id';
  "

# Check Stripe subscription
curl https://api.stripe.com/v1/subscriptions/sub_xxx \
  -u sk_test_xxx:
```

**Solutions:**
```python
# 1. Verify cancellation is processed
async def cancel_subscription(subscription_id: UUID):
    subscription = await get_subscription(subscription_id)
    
    # Cancel at period end (Stripe)
    stripe.Subscription.modify(
        subscription.stripe_sub_id,
        cancel_at_period_end=True,
    )
    
    # Update local database
    subscription.cancel_at_period_end = True
    await db.commit()

# 2. Handle immediate cancellation
async def cancel_subscription_immediate(subscription_id: UUID):
    subscription = await get_subscription(subscription_id)
    
    # Cancel immediately (Stripe)
    stripe.Subscription.delete(subscription.stripe_sub_id)
    
    # Update local database
    subscription.status = SubscriptionStatus.CANCELLED
    await db.commit()

# 3. Verify webhook handling
# Ensure customer.subscription.deleted webhook is handled
```

---

## Search Indexing Issues

### Issue: Search Index Not Updating

**Symptoms:**
```
New documents not appearing in search
Search results stale
```

**Diagnosis:**
```bash
# Check search engine status
curl http://localhost:7700/health

# Check index status
curl http://localhost:7700/indexes/documents/stats

# Check indexing queue
kubectl exec -it deployment/email-converter-worker -n email-converter -- \
  celery -A app.celery_app inspect active | grep -i index

# Check application logs
kubectl logs deployment/email-converter-app -n email-converter | grep -i index
```

**Solutions:**
```bash
# 1. Manually trigger indexing
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  python -c "
import asyncio
from app.modules.search.indexer import SearchIndexer

async def index():
    indexer = SearchIndexer()
    await indexer.reindex_all()

asyncio.run(index())
"

# 2. Check indexing tasks
kubectl exec -it deployment/email-converter-worker -n email-converter -- \
  celery -A app.celery_app inspect reserved | grep -i index

# 3. Verify document format
curl http://localhost:7700/indexes/documents/documents?limit=5 | jq .

# 4. Reset index
curl -X DELETE http://localhost:7700/indexes/documents
curl -X POST http://localhost:7700/indexes/documents -H 'Content-Type: application/json' -d '{"primaryKey": "id"}'
```

### Issue: Search Performance Slow

**Symptoms:**
```
Search queries taking > 2 seconds
Timeout errors
```

**Diagnosis:**
```bash
# Check search latency
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:7700/indexes/documents/search?q=test"

# Check index size
curl http://localhost:7700/indexes/documents/stats | jq .numberOfDocuments

# Check system resources
kubectl top pods -n email-converter -l app=search
```

**Solutions:**
```python
# 1. Optimize search queries
# Use filters to narrow results
# Limit returned fields
# Use pagination

# 2. Add search caching
@cache(ttl=300)
async def search_documents(query: str, filters: dict = None):
    return await search_service.search(query, filters)

# 3. Optimize index settings
# In search/indexer.py
settings = {
    "rankingRules": [
        "words",
        "typo",
        "proximity",
        "attribute",
        "sort",
        "exactness",
    ],
    "stopWords": ["the", "a", "an"],
    "synonyms": {},
}
```

---

## Performance Degradation

### Issue: High Response Latency

**Symptoms:**
```
API responses > 2 seconds
Timeout errors
```

**Diagnosis:**
```bash
# Check application metrics
curl http://localhost:8000/metrics | grep http_request_duration

# Check database queries
kubectl exec -it deployment/email-converter-db -n email-converter -- \
  psql -U email_converter -c "
  SELECT query, mean_exec_time, calls
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10;
  "

# Check Redis hit rate
kubectl exec -it deployment/email-converter-redis -n email-converter -- \
  redis-cli INFO stats | grep -E "(keyspace_hits|keyspace_misses)"

# Check worker queue
kubectl exec -it deployment/email-converter-worker -n email-converter -- \
  celery -A app.celery_app inspect active
```

**Solutions:**
```python
# 1. Optimize database queries
# Add indexes for frequently queried columns
# Use select_related/prefetch_related
# Avoid N+1 queries

# 2. Implement caching
# Cache frequent queries
# Use cache invalidation strategies

# 3. Optimize API responses
# Use pagination
# Limit returned fields
# Use response compression

# 4. Scale horizontally
kubectl scale deployment email-converter-app --replicas=5 -n email-converter
```

### Issue: High CPU Usage

**Symptoms:**
```
CPU usage > 90%
Application unresponsive
```

**Diagnosis:**
```bash
# Check CPU usage
kubectl top pods -n email-converter

# Profile application
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  python -c "
import cProfile
import pstats

profiler = cProfile.Profile()
profiler.enable()

# Run some code
# ...

profiler.disable()
stats = pstats.Stats(profiler)
stats.sort_stats('cumulative')
stats.print_stats(20)
"

# Check for infinite loops
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  python -c "
import asyncio
from app.modules.monitoring.service import MonitoringService

async def check():
    service = MonitoringService()
    metrics = await service.get_metrics()
    print(metrics)

asyncio.run(check())
"
```

**Solutions:**
```python
# 1. Optimize CPU-intensive operations
# Move to background tasks
# Use caching
# Optimize algorithms

# 2. Scale horizontally
kubectl scale deployment email-converter-app --replicas=5 -n email-converter

# 3. Increase resource limits
resources:
  limits:
    cpu: "4"
    memory: 4Gi
  requests:
    cpu: "2"
    memory: 2Gi

# 4. Profile and optimize
# Use line_profiler for detailed profiling
# Optimize hot paths
```

---

## Memory Leaks

### Issue: Increasing Memory Usage

**Symptoms:**
```
Memory usage growing over time
OOM kills
```

**Diagnosis:**
```bash
# Check memory usage over time
kubectl top pods -n email-converter -l app=worker --no-headers | \
  awk '{print $3}' | sort -n

# Profile memory usage
kubectl exec -it <worker-pod> -n email-converter -- \
  python -c "
import tracemalloc
tracemalloc.start()

# Run some code
# ...

snapshot = tracemalloc.take_snapshot()
top_stats = snapshot.statistics('lineno')

for stat in top_stats[:10]:
    print(stat)
"

# Check for circular references
kubectl exec -it <worker-pod> -n email-converter -- \
  python -c "
import gc
gc.set_debug(gc.DEBUG_LEAK)
gc.collect()
print(f'Garbage: {len(gc.garbage)}')
"
```

**Solutions:**
```python
# 1. Fix memory leaks
# - Close file handles
# - Close database connections
# - Remove circular references
# - Use weak references

# 2. Limit worker memory
celery_app.conf.update(
    worker_max_memory_per_child=200000,  # 200MB
)

# 3. Implement memory monitoring
import psutil
import os

def check_memory():
    process = psutil.Process(os.getpid())
    memory_mb = process.memory_info().rss / 1024 / 1024
    
    if memory_mb > 500:
        logger.warning(f"High memory usage: {memory_mb}MB")

# 4. Use generators instead of lists
# Process data in streams
# Avoid loading entire datasets into memory
```

---

## Disk Space Issues

### Issue: Disk Space Full

**Symptoms:**
```
No space left on device
Failed to write to disk
```

**Diagnosis:**
```bash
# Check disk usage
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  df -h

# Check upload directory
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  du -sh /app/uploads/*

# Check database size
kubectl exec -it deployment/email-converter-db -n email-converter -- \
  psql -U email_converter -c "
  SELECT pg_size_pretty(pg_database_size('email_converter'));
  "

# Find large files
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  find /app -type f -size +100M -exec ls -lh {} \;
```

**Solutions:**
```bash
# 1. Clean up old uploads
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  find /app/uploads -type f -mtime +30 -delete

# 2. Clean up conversion outputs
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  find /app/outputs -type f -mtime +7 -delete

# 3. Implement automatic cleanup
# In config.py
UPLOAD_RETENTION_DAYS = 30
CONVERSION_RETENTION_DAYS = 7

# 4. Use object storage lifecycle rules
# In MinIO/S3 configuration
mc anonymous set-json /tmp/lifecycle.json local/email-converter-uploads

# 5. Add disk space monitoring
@app.get("/health/disk")
async def disk_health():
    usage = psutil.disk_usage("/")
    return {
        "total": usage.total,
        "used": usage.used,
        "free": usage.free,
        "percent": usage.percent,
    }
```

---

## Network Connectivity

### Issue: Service Unreachable

**Symptoms:**
```
Connection refused
Network unreachable
```

**Diagnosis:**
```bash
# Check service status
kubectl get svc -n email-converter
kubectl get endpoints -n email-converter

# Check network policies
kubectl get networkpolicy -n email-converter

# Test connectivity
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  curl -v http://email-converter-db:5432

# Check DNS resolution
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  nslookup email-converter-redis

# Check pod networking
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  ping email-converter-redis
```

**Solutions:**
```bash
# 1. Check service selectors
kubectl get svc email-converter-redis -n email-converter -o yaml

# 2. Verify pod labels
kubectl get pods -n email-converter -l app=redis

# 3. Check network policies
kubectl describe networkpolicy -n email-converter

# 4. Restart DNS
kubectl rollout restart deployment/coredns -n kube-system

# 5. Check firewall rules
# Ensure ports are open between services
```

### Issue: External API Timeout

**Symptoms:**
```
Connection to external API timed out
Request to Stripe/SMTP failed
```

**Diagnosis:**
```bash
# Test external connectivity
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  curl -v https://api.stripe.com

# Check DNS resolution
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  nslookup api.stripe.com

# Check proxy settings
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  env | grep -i proxy
```

**Solutions:**
```python
# 1. Implement circuit breaker
from circuitbreaker import circuit

@circuit(failure_threshold=5, recovery_timeout=60)
async def call_stripe_api():
    return await stripe.PaymentIntent.create(...)

# 2. Add retry logic with exponential backoff
import asyncio
import random

async def call_with_retry(func, max_retries=3):
    for attempt in range(max_retries):
        try:
            return await func()
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            wait_time = (2 ** attempt) + random.uniform(0, 1)
            await asyncio.sleep(wait_time)

# 3. Set appropriate timeouts
import httpx

async with httpx.AsyncClient(timeout=30.0) as client:
    response = await client.get("https://api.stripe.com")
```

---

## SSL Certificate Issues

### Issue: SSL Certificate Expired

**Symptoms:**
```
SSL certificate has expired
NET::ERR_CERT_DATE_INVALID
```

**Diagnosis:**
```bash
# Check certificate expiry
kubectl get certificate -n email-converter
kubectl describe certificate email-converter-tls -n email-converter

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager --tail=50

# Check certificate secret
kubectl get secret email-converter-tls -n email-converter -o yaml
```

**Solutions:**
```bash
# 1. Force certificate renewal
kubectl delete secret email-converter-tls -n email-converter
kubectl delete certificate email-converter-tls -n email-converter

# 2. Check cert-manager issuer
kubectl get clusterissuer letsencrypt-prod -o yaml

# 3. Manually trigger renewal
kubectl annotate certificate email-converter-tls -n email-converter \
  cert-manager.io/renew-before="now"

# 4. Check ACME challenge
kubectl get challenges -n email-converter
kubectl describe challenge -n email-converter
```

### Issue: SSL Certificate Not Trusted

**Symptoms:**
```
SSL certificate is not trusted
ERR_CERT_AUTHORITY_INVALID
```

**Diagnosis:**
```bash
# Check certificate chain
openssl s_client -connect api.example.com:443 -showcerts

# Check certificate issuer
kubectl get certificate -n email-converter -o jsonpath='{.items[0].status.conditions}'

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager | grep -i error
```

**Solutions:**
```bash
# 1. Ensure using Let's Encrypt production server
# In cluster-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory

# 2. Verify domain validation
# Ensure DNS records are correct
# Ensure HTTP-01 challenge is accessible

# 3. Check certificate chain
kubectl exec -it deployment/nginx -n email-converter -- \
  openssl s_client -connect localhost:443 -showcerts
```

---

## Quick Reference

### Useful Commands

```bash
# Service status
kubectl get pods -n email-converter
kubectl get svc -n email-converter
kubectl get ingress -n email-converter

# Logs
kubectl logs -f deployment/email-converter-app -n email-converter
kubectl logs -f deployment/email-converter-worker -n email-converter

# Debug
kubectl exec -it <pod> -n email-converter -- bash
kubectl port-forward svc/email-converter-app 8000:8000 -n email-converter

# Metrics
curl http://localhost:8000/metrics
curl http://localhost:8000/health

# Database
kubectl exec -it deployment/email-converter-db -n email-converter -- \
  psql -U email_converter

# Redis
kubectl exec -it deployment/email-converter-redis -n email-converter -- \
  redis-cli
```

### Contact Information

| Role | Contact | Response Time |
|------|---------|---------------|
| On-call Engineer | PagerDuty | 15 minutes |
| Database Admin | DBA Team | 1 hour |
| Security Team | Security Slack | 30 minutes |
| Platform Team | Platform Slack | 2 hours |

---

*Last updated: July 2026*
