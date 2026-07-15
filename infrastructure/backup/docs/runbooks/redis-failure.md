# Redis Failure Recovery Runbook

## Severity: Medium
## Response Time: < 15 minutes
## Owner: SRE Team

---

## Detection

**Alerts:**
- `RedisDown`
- `RedisHighMemory`
- `RedisConnectionFailures`
- `RedisReplicationLag`

**Symptoms:**
- Application session errors
- Rate limiting failures
- Cache misses increasing
- Celery task failures

---

## Step 1: Assessment (0-5 minutes)

### 1.1 Check Redis Status

```bash
# Check Redis pod status
kubectl get pods -n email-converter -l app.kubernetes.io/name=redis

# Check Redis logs
kubectl logs statefulset/redis -n email-converter --tail=100

# Test connectivity
redis-cli -h redis -p 6379 -a $REDIS_PASSWORD ping
```

### 1.2 Check Data Size

```bash
# Check memory usage
redis-cli -h redis -p 6379 -a $REDIS_PASSWORD INFO memory | grep used_memory_human

# Check key count
redis-cli -h redis -p 6379 -a $REDIS_PASSWORD DBSIZE
```

---

## Step 2: Recovery Options (5-15 minutes)

### Option A: Restart Redis (Quick Fix)

```bash
# Restart Redis pod
kubectl rollout restart statefulset/redis -n email-converter

# Wait for ready
kubectl rollout status statefulset/redis -n email-converter --timeout=60s

# Verify
redis-cli -h redis -p 6379 -a $REDIS_PASSWORD ping
```

### Option B: Restore from RDB Backup

```bash
# Find latest RDB backup
LATEST_RDB=$(ls -t /backups/redis/rdb/*.rdb.gz | head -1)

# Stop Redis
kubectl scale statefulset/redis --replicas=0 -n email-converter

# Restore RDB file
bash infrastructure/backup/scripts/redis-restore.sh rdb "$LATEST_RDB"

# Start Redis
kubectl scale statefulset/redis --replicas=1 -n email-converter

# Verify data
redis-cli -h redis -p 6379 -a $REDIS_PASSWORD DBSIZE
```

### Option C: Restore from AOF Backup

```bash
# Find latest AOF backup
LATEST_AOF=$(ls -t /backups/redis/aof/*.aof.gz | head -1)

# Stop Redis
kubectl scale statefulset/redis --replicas=0 -n email-converter

# Restore AOF file
bash infrastructure/backup/scripts/redis-restore.sh aof "$LATEST_AOF"

# Start Redis with AOF enabled
kubectl scale statefulset/redis --replicas=1 -n email-converter

# Verify
redis-cli -h redis -p 6379 -a $REDIS_PASSWORD ping
```

---

## Step 3: Validation (5-10 minutes)

### 3.1 Verify Data Integrity

```bash
# Check key count
redis-cli -h redis -p 6379 -a $REDIS_PASSWORD DBSIZE

# Check specific keys
redis-cli -h redis -p 6379 -a $REDIS_PASSWORD KEYS "session:*" | wc -l
redis-cli -h redis -p 6379 -a $REDIS_PASSWORD KEYS "cache:*" | wc -l

# Check memory usage
redis-cli -h redis -p 6379 -a $REDIS_PASSWORD INFO memory | grep used_memory_human
```

### 3.2 Test Application

```bash
# Test session creation
curl -X POST https://api.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# Test rate limiting
for i in $(seq 1 10); do
  curl -s -o /dev/null -w "%{http_code}" https://api.example.com/api/v1/health
done
```

---

## Step 4: Post-Recovery

### 4.1 Root Cause Analysis

- [ ] Check Redis logs for errors
- [ ] Review memory usage patterns
- [ ] Check for connection leaks
- [ ] Verify persistence configuration
- [ ] Review replication status

### 4.2 Preventive Measures

- [ ] Enable AOF persistence
- [ ] Configure memory limits
- [ ] Set up Redis replication
- [ ] Add Redis monitoring alerts
- [ ] Increase backup frequency

---

## Contacts

| Role | Name | Contact |
|------|------|---------|
| SRE On-Call | [Name] | [Phone] |
| Redis Admin | [Name] | [Phone] |
