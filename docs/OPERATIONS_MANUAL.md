# Operations Manual

Daily operations, monitoring, and maintenance guide for the Email Converter SaaS.

## Table of Contents

- [Daily Operations Checklist](#daily-operations-checklist)
- [Monitoring Dashboards](#monitoring-dashboards)
- [Alerting Rules](#alerting-rules)
- [Log Management](#log-management)
- [Incident Response Procedures](#incident-response-procedures)
- [Capacity Planning](#capacity-planning)
- [Cost Optimization](#cost-optimization)
- [Security Operations](#security-operations)
- [Backup Verification](#backup-verification)
- [Disaster Recovery Drills](#disaster-recovery-drills)
- [Performance Tuning](#performance-tuning)
- [Database Maintenance](#database-maintenance)
- [Redis Maintenance](#redis-maintenance)
- [Celery Worker Management](#celery-worker-management)

---

## Daily Operations Checklist

### Morning Checklist (09:00 UTC)

```bash
#!/bin/bash
# scripts/daily_check.sh

echo "=== Daily Operations Check ==="
echo "Date: $(date -u)"

# 1. Service Health
echo -e "\n--- Service Health ---"
kubectl get pods -n email-converter
kubectl get ingress -n email-converter

# 2. Database Health
echo -e "\n--- Database Health ---"
kubectl exec -it deployment/email-converter-db -n email-converter -- \
  psql -U email_converter -c "SELECT version();"
kubectl exec -it deployment/email-converter-db -n email-converter -- \
  psql -U email-converter -c "SELECT count(*) FROM pg_stat_activity;"

# 3. Redis Health
echo -e "\n--- Redis Health ---"
kubectl exec -it deployment/email-converter-redis -n email-converter -- \
  redis-cli ping
kubectl exec -it deployment/email-converter-redis -n email-converter -- \
  redis-cli info memory

# 4. Celery Workers
echo -e "\n--- Celery Workers ---"
kubectl exec -it deployment/email-converter-worker -n email-converter -- \
  celery -A app.celery_app inspect active

# 5. Disk Space
echo -e "\n--- Disk Space ---"
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  df -h /app/uploads

# 6. Error Logs
echo -e "\n--- Recent Errors ---"
kubectl logs deployment/email-converter-app -n email-converter --tail=100 | \
  grep -i "error\|exception\|critical"

echo -e "\n=== Check Complete ==="
```

### Afternoon Checklist (14:00 UTC)

```bash
# 1. Conversion Queue Status
kubectl exec -it deployment/email-converter-worker -n email-converter -- \
  celery -A app.celery_app inspect reserved

# 2. Memory Usage
kubectl top pods -n email-converter

# 3. Network Connectivity
curl -s http://email-converter-app:8000/health | jq .

# 4. SSL Certificate Expiry
kubectl get certificate -n email-converter

# 5. Backup Status
aws s3 ls s3://email-converter-backups/postgres/ --recursive | tail -5
```

### End of Day Checklist (18:00 UTC)

```bash
# 1. Daily Metrics Summary
curl -s "http://prometheus:9090/api/v1/query?query=sum(rate(http_requests_total[24h]))" | jq .

# 2. Error Rate
curl -s "http://prometheus:9090/api/v1/query?query=sum(rate(http_requests_total{status=~'5..'}[24h]))/sum(rate(http_requests_total[24h]))" | jq .

# 3. Active Users
curl -s "http://prometheus:9090/api/v1/query?query=count(active_users)" | jq .

# 4. Conversions Completed
curl -s "http://prometheus:9090/api/v1/query?query=sum(conversions_completed_total)" | jq .

# 5. Pending Alerts
curl -s "http://alertmanager:9093/api/v2/alerts" | jq '.[] | .labels.alertname'
```

---

## Monitoring Dashboards

### Grafana Dashboard URLs

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| Overview | http://grafana:3000/d/overview | High-level system metrics |
| API Performance | http://grafana:3000/d/api-perf | Request latency, throughput |
| Database | http://grafana:3000/d/database | PostgreSQL metrics |
| Redis | http://grafana:3000/d/redis | Redis cache metrics |
| Celery | http://grafana:3000/d/celery | Task queue metrics |
| Business | http://grafana:3000/d/business | User activity, conversions |
| Security | http://grafana:3000/d/security | Auth failures, rate limits |
| Infrastructure | http://grafana:3000/d/infra | CPU, memory, disk, network |

### Key Metrics to Monitor

#### Application Metrics

```yaml
# HTTP Request Metrics
http_requests_total: Total HTTP requests
http_request_duration_seconds: Request latency histogram
http_requests_in_progress: Current active requests
http_request_size_bytes: Request body size
http_response_size_bytes: Response body size

# Error Metrics
http_requests_total{status=~"5.."}: 5xx errors
http_requests_total{status=~"4.."}: 4xx errors
http_request_duration_seconds{quantile="0.95"}: p95 latency

# Business Metrics
conversions_completed_total: Total conversions
conversions_failed_total: Failed conversions
uploads_completed_total: Total uploads
active_users: Currently active users
subscription_total: Active subscriptions
```

#### Database Metrics

```yaml
# Connection Metrics
pg_stat_activity_count: Active connections
pg_stat_database_numbackends: Total connections
pg_settings_max_connections: Max connections

# Performance Metrics
pg_stat_database_tup_fetched: Rows fetched
pg_stat_database_tup_inserted: Rows inserted
pg_stat_database_tup_updated: Rows updated
pg_stat_database_tup_deleted: Rows deleted
pg_stat_database_blks_read: Blocks read
pg_stat_database_blks_hit: Blocks hit (cache)
pg_stat_database_xact_commit: Committed transactions
pg_stat_database_xact_rollback: Rolled back transactions

# Query Metrics
pg_stat_activity_max_tx_duration: Longest running transaction
pg_stat_user_tables_seq_scan: Sequential scans (bad if high)
pg_stat_user_tables_idx_scan: Index scans
```

#### Redis Metrics

```yaml
# Memory Metrics
redis_memory_used_bytes: Used memory
redis_memory_max_bytes: Max memory
redis_memory_fragmentation_ratio: Memory fragmentation

# Performance Metrics
redis_connected_clients: Connected clients
redis_commands_processed_total: Commands processed
redis_commands_duration_seconds_total: Command duration
redis_keyspace_hits_total: Cache hits
redis_keyspace_misses_total: Cache misses

# Persistence Metrics
redis_rdb_last_save_timestamp: Last RDB save
redis_aof_rewrite_in_progress: AOF rewrite in progress
```

#### Celery Metrics

```yaml
# Queue Metrics
celery_queue_length: Queue length
celery_queue_messages_total: Total messages in queue

# Worker Metrics
celery_workers_total: Active workers
celery_worker_busy: Busy workers
celery_worker_cpu_usage: Worker CPU usage
celery_worker_memory_usage: Worker memory usage

# Task Metrics
celery_task_total: Total tasks
celery_task_succeeded_total: Successful tasks
celery_task_failed_total: Failed tasks
celery_task_retried_total: Retried tasks
celery_task_runtime_seconds: Task runtime
```

---

## Alerting Rules

### 13 Critical Alerts

```yaml
# monitoring/alerts.yml
groups:
  - name: critical
    rules:
      # 1. Service Down
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.instance }} is down"
          description: "{{ $labels.job }} has been down for more than 1 minute"

      # 2. High Error Rate
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) /
          sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # 3. High Latency
      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API latency"
          description: "p95 latency is {{ $value }}s"

      # 4. Database Connection Pool Exhausted
      - alert: DatabaseConnectionPoolExhausted
        expr: pg_stat_activity_count > 180
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool nearly exhausted"
          description: "{{ $value }} active connections (max: 200)"

      # 5. Database Replication Lag
      - alert: DatabaseReplicationLag
        expr: pg_replication_lag > 30
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Database replication lag detected"
          description: "Replication lag is {{ $value }}s"

      # 6. Redis Memory High
      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis memory usage high"
          description: "Redis memory usage is {{ $value | humanizePercentage }}"

      # 7. Redis High Eviction
      - alert: RedisHighEviction
        expr: rate(redis_evicted_keys_total[5m]) > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High Redis eviction rate"
          description: "Redis is evicting {{ $value }} keys/sec"

      # 8. Celery Queue Backlog
      - alert: CeleryQueueBacklog
        expr: celery_queue_length > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Celery queue backlog"
          description: "Queue {{ $labels.queue }} has {{ $value }} pending tasks"

      # 9. Celery Task Failure Rate
      - alert: CeleryTaskFailureRate
        expr: |
          rate(celery_task_failed_total[5m]) /
          rate(celery_task_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High Celery task failure rate"
          description: "Task failure rate is {{ $value | humanizePercentage }}"

      # 10. Disk Space Low
      - alert: DiskSpaceLow
        expr: node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Disk space low"
          description: "{{ $labels.mountpoint }} has {{ $value | humanizePercentage }} free"

      # 11. SSL Certificate Expiring
      - alert: SSLCertificateExpiring
        expr: |
          (cert_expiry_timestamp - time()) / 86400 < 30
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "SSL certificate expiring soon"
          description: "Certificate expires in {{ $value }} days"

      # 12. High CPU Usage
      - alert: HighCPUUsage
        expr: |
          100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is {{ $value }}%"

      # 13. High Memory Usage
      - alert: HighMemoryUsage
        expr: |
          (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 > 85
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value }}%"
```

---

## Log Management

### Loki Configuration

```yaml
# monitoring/loki.yml
auth_enabled: false

server:
  http_listen_port: 3100

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: "2024-01-01"
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  max_query_length: 721h
  max_query_parallelism: 32

chunk_store_config:
  chunk_cache_config:
    embedded_cache:
      enabled: true
      max_size_mb: 100

analytics:
  reporting_enabled: false
```

### Log Queries

```logql
# Find all errors
{job="email-converter"} |= "error" | logfmt | level="error"

# Find specific service errors
{job="email-converter", app="conversion"} |= "failed"

# Find slow requests
{job="email-converter"} | logfmt | duration > 2s

# Find authentication failures
{job="email-converter"} |= "authentication failed" | json

# Aggregate error rates
sum(rate({job="email-converter"} |= "error" [5m])) by (app)

# Find pod crashes
{job="email-converter"} | logfmt | level="fatal"
```

### Log Rotation

```bash
# /etc/logrotate.d/email-converter
/var/log/email-converter/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 root adm
    sharedscripts
    postrotate
        [ -f /var/run/syslogd.pid ] && kill -USR1 $(cat /var/run/syslogd.pid)
    endscript
}
```

---

## Incident Response Procedures

### Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| SEV1 | Complete outage | 15 minutes | Immediate |
| SEV2 | Major feature broken | 30 minutes | 1 hour |
| SEV3 | Minor feature broken | 2 hours | 4 hours |
| SEV4 | Cosmetic issue | 24 hours | 1 week |

### Incident Response Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Incident Response Workflow                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. DETECT                                                              │
│     ├── Monitoring alert triggered                                      │
│     ├── User report received                                            │
│     ├── Automated health check failed                                   │
│     └── Log anomaly detected                                           │
│                                                                         │
│  2. TRIAGE                                                              │
│     ├── Assess severity (SEV1-4)                                        │
│     ├── Identify affected services                                      │
│     ├── Check error logs                                                │
│     └── Determine impact scope                                          │
│                                                                         │
│  3. RESPOND                                                             │
│     ├── Create incident channel (#incident-XXXX)                        │
│     ├── Assign incident commander                                       │
│     ├── Begin investigation                                             │
│     └── Communicate status                                               │
│                                                                         │
│  4. RESOLVE                                                             │
│     ├── Implement fix                                                   │
│     ├── Verify resolution                                               │
│     ├── Monitor for recurrence                                          │
│     └── Close incident                                                  │
│                                                                         │
│  5. REVIEW                                                              │
│     ├── Conduct post-mortem                                             │
│     ├── Document lessons learned                                        │
│     ├── Create action items                                             │
│     └── Update runbooks                                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Common Incident Runbooks

#### Service Down Runbook

```bash
# 1. Check pod status
kubectl get pods -n email-converter
kubectl describe pod <pod-name> -n email-converter

# 2. Check logs
kubectl logs <pod-name> -n email-converter --tail=100
kubectl logs <pod-name> -n email-converter --previous

# 3. Check resource usage
kubectl top pods -n email-converter
kubectl top nodes

# 4. Check events
kubectl get events -n email-converter --sort-by='.lastTimestamp'

# 5. Restart if needed
kubectl rollout restart deployment/<deployment-name> -n email-converter

# 6. Scale up if needed
kubectl scale deployment/<deployment-name> --replicas=<N> -n email-converter
```

#### Database Down Runbook

```bash
# 1. Check database pod
kubectl get pods -n email-converter -l app=postgres
kubectl describe pod <db-pod> -n email-converter

# 2. Check database logs
kubectl logs <db-pod> -n email-converter --tail=100

# 3. Check connections
kubectl exec -it <db-pod> -n email-converter -- \
  psql -U email_converter -c "SELECT count(*) FROM pg_stat_activity;"

# 4. Check disk space
kubectl exec -it <db-pod> -n email-converter -- df -h

# 5. Restart if needed
kubectl rollout restart deployment/email-converter-db -n email-converter

# 6. Check replication (if using replicas)
kubectl exec -it <db-pod> -n email-converter -- \
  psql -U email_converter -c "SELECT * FROM pg_stat_replication;"
```

#### High Error Rate Runbook

```bash
# 1. Identify error source
curl -s "http://prometheus:9090/api/v1/query?query=sum(rate(http_requests_total{status=~'5..'}[5m])) by (path)" | jq .

# 2. Check application logs
kubectl logs deployment/email-converter-app -n email-converter | grep -i "error"

# 3. Check database connectivity
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  python -c "import asyncpg; print('DB OK')"

# 4. Check Redis connectivity
kubectl exec -it deployment/email-converter-app -n email-converter -- \
  python -c "import redis; r = redis.Redis(); r.ping(); print('Redis OK')"

# 5. Check Celery workers
kubectl exec -it deployment/email-converter-worker -n email-converter -- \
  celery -A app.celery_app inspect active

# 6. Rollback if needed
kubectl rollout undo deployment/email-converter-app -n email-converter
```

---

## Capacity Planning

### Resource Usage Tracking

```bash
#!/bin/bash
# scripts/capacity_report.sh

echo "=== Capacity Report ==="
echo "Date: $(date -u)"

# CPU Usage
echo -e "\n--- CPU Usage ---"
kubectl top nodes
kubectl top pods -n email-converter

# Memory Usage
echo -e "\n--- Memory Usage ---"
kubectl exec -it deployment/email-converter-db -n email-converter -- \
  psql -U email_converter -c "SELECT pg_size_pretty(pg_database_size('email_converter'));"

# Disk Usage
echo -e "\n--- Disk Usage ---"
kubectl exec -it deployment/email-converter-db -n email-converter -- df -h
kubectl exec -it deployment/email-converter-redis -n email-converter -- redis-cli info memory

# Connection Pool
echo -e "\n--- Connection Pool ---"
kubectl exec -it deployment/email-converter-db -n email-converter -- \
  psql -U email_converter -c "SELECT count(*) FROM pg_stat_activity;"

# Queue Length
echo -e "\n--- Queue Length ---"
kubectl exec -it deployment/email-converter-worker -n email-converter -- \
  celery -A app.celery_app inspect active
```

### Scaling Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| CPU | > 70% | > 90% | Scale horizontally |
| Memory | > 80% | > 95% | Scale vertically |
| DB Connections | > 150 | > 180 | Increase pool size |
| DB Size | > 80% | > 90% | Add storage/archive |
| Redis Memory | > 70% | > 85% | Increase maxmemory |
| Queue Length | > 500 | > 1000 | Add workers |
| Disk | > 70% | > 85% | Cleanup/add storage |

---

## Cost Optimization

### Resource Right-Sizing

```bash
# Analyze resource usage
kubectl top pods -n email-converter --sort-by=cpu
kubectl top pods -n email-converter --sort-by=memory

# Check CPU throttling
kubectl exec -it <pod> -n email-converter -- cat /sys/fs/cgroup/cpu/cpu.stat

# Check memory pressure
kubectl exec -it <pod> -n email-converter -- cat /sys/fs/cgroup/memory/memory.stat
```

### Cost Reduction Strategies

1. **Auto-scaling**: Use HPA to scale based on actual load
2. **Spot Instances**: Use spot instances for non-critical workloads
3. **Reserved Instances**: Reserved capacity for predictable workloads
4. **Storage Lifecycle**: Move old data to cheaper storage tiers
5. **Cache Optimization**: Increase cache hit rate to reduce DB load
6. **Query Optimization**: Optimize slow queries to reduce CPU usage
7. **Connection Pooling**: Use PgBouncer to reduce connection overhead

---

## Security Operations

### Security Monitoring

```bash
# Check authentication failures
kubectl logs deployment/email-converter-app -n email-converter | \
  grep "authentication failed" | tail -20

# Check rate limiting
kubectl logs deployment/email-converter-app -n email-converter | \
  grep "rate limit" | tail -20

# Check suspicious activity
kubectl logs deployment/email-converter-app -n email-converter | \
  grep -E "(unauthorized|forbidden|suspicious)" | tail -20
```

### Security Checklist

- [ ] SSL certificates valid and not expiring soon
- [ ] No failed login attempts in last 24h > 100
- [ ] Rate limiting active and configured correctly
- [ ] Audit logs enabled and being collected
- [ ] File uploads scanned for malware
- [ ] API keys rotated regularly
- [ ] Database backups encrypted
- [ ] Secrets not in logs or code
- [ ] Network policies enforced
- [ ] Container images scanned for vulnerabilities

### Vulnerability Scanning

```bash
# Scan container images
trivy image email-converter:latest

# Scan Kubernetes cluster
kube-bench run

# Scan for secrets in code
trufflehog filesystem .
```

---

## Backup Verification

### Backup Verification Script

```bash
#!/bin/bash
# scripts/verify_backups.sh

set -euo pipefail

echo "=== Backup Verification ==="
echo "Date: $(date -u)"

# 1. Check latest database backup
echo -e "\n--- Database Backup ---"
LATEST_BACKUP=$(aws s3 ls s3://email-converter-backups/postgres/ --recursive | sort | tail -1 | awk '{print $4}')
echo "Latest backup: ${LATEST_BACKUP}"

# Download and verify
aws s3 cp "s3://email-converter-backups/postgres/${LATEST_BACKUP}" /tmp/test_backup.sql.gz
pg_restore --list /tmp/test_backup.sql.gz > /dev/null 2>&1
echo "Database backup verified: OK"

# 2. Check Redis backup
echo -e "\n--- Redis Backup ---"
LATEST_REDIS=$(aws s3 ls s3://email-converter-backups/redis/ --recursive | sort | tail -1 | awk '{print $4}')
echo "Latest Redis backup: ${LATEST_REDIS}"

# 3. Check S3 sync
echo -e "\n--- S3 Sync Status ---"
aws s3 sync s3://email-converter-storage s3://email-converter-backups/storage --dryrun

# 4. Test restore (on staging)
echo -e "\n--- Restore Test ---"
# This should be run on staging environment
# pg_restore -h staging-db -U email_converter -d email_converter_test /tmp/test_backup.sql.gz

echo -e "\n=== Verification Complete ==="
```

### Backup Schedule

| Backup Type | Frequency | Retention | Storage |
|-------------|-----------|-----------|---------|
| Database Full | Every 6 hours | 30 days | S3 |
| Database WAL | Continuous | 7 days | S3 |
| Redis RDB | Every hour | 7 days | S3 |
| S3 Sync | Daily | 90 days | S3 (cross-region) |
| Application Config | On change | 30 days | Git |

---

## Disaster Recovery Drills

### DR Drill Schedule

| Drill Type | Frequency | Duration | Scope |
|------------|-----------|----------|-------|
| Backup Restore Test | Monthly | 2 hours | Database |
| Full DR Failover | Quarterly | 4 hours | All systems |
| Chaos Engineering | Monthly | 2 hours | Random failures |
| Tabletop Exercise | Quarterly | 1 hour | Team |

### DR Drill Procedure

```bash
#!/bin/bash
# scripts/dr_drill.sh

set -euo pipefail

echo "=== DR Drill ==="
echo "Date: $(date -u)"

# 1. Create test environment
echo -e "\n--- Creating test environment ---"
kubectl create namespace dr-test
helm install email-converter-dr ./k8s/helm/email-converter \
  -n dr-test -f values-dr-test.yaml

# 2. Restore database backup
echo -e "\n--- Restoring database ---"
LATEST_BACKUP=$(aws s3 ls s3://email-converter-backups/postgres/ --recursive | sort | tail -1 | awk '{print $4}')
aws s3 cp "s3://email-converter-backups/postgres/${LATEST_BACKUP}" /tmp/dr_backup.sql.gz
kubectl exec -it deployment/email-converter-db -n dr-test -- \
  pg_restore -U email_converter -d email_converter /tmp/dr_backup.sql.gz

# 3. Verify data integrity
echo -e "\n--- Verifying data ---"
kubectl exec -it deployment/email-converter-db -n dr-test -- \
  psql -U email_converter -c "SELECT count(*) FROM users;"

# 4. Run smoke tests
echo -e "\n--- Running smoke tests ---"
kubectl exec -it deployment/email-converter-app -n dr-test -- \
  python -m pytest tests/smoke/ -v

# 5. Cleanup
echo -e "\n--- Cleanup ---"
kubectl delete namespace dr-test

echo -e "\n=== DR Drill Complete ==="
```

---

## Performance Tuning

### Application Performance

```python
# Performance monitoring middleware
import time
import structlog
from prometheus_client import Histogram

REQUEST_DURATION = Histogram(
    'http_request_duration_seconds',
    'Request duration in seconds',
    ['method', 'endpoint', 'status_code'],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

async def performance_middleware(request, call_next):
    start = time.perf_counter()
    
    response = await call_next(request)
    
    duration = time.perf_counter() - start
    REQUEST_DURATION.labels(
        method=request.method,
        endpoint=request.url.path,
        status_code=response.status_code
    ).observe(duration)
    
    return response
```

### Database Performance

```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Find missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
AND n_distinct > 100
AND correlation < 0.1;

-- Check table bloat
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
```

### Redis Performance

```bash
# Check slow log
redis-cli slowlog get 10

# Check memory usage
redis-cli info memory

# Check key distribution
redis-cli --bigkeys

# Check hit rate
redis-cli info stats | grep -E "(keyspace_hits|keyspace_misses)"
```

---

## Database Maintenance

### Weekly Maintenance Tasks

```bash
#!/bin/bash
# scripts/db_maintenance.sh

set -euo pipefail

echo "=== Database Maintenance ==="

# 1. Vacuum analyze
echo -e "\n--- Vacuum Analyze ---"
kubectl exec -it deployment/email-converter-db -n email-converter -- \
  psql -U email_converter -c "VACUUM (VERBOSE, ANALYZE);"

# 2. Update statistics
echo -e "\n--- Update Statistics ---"
kubectl exec -it deployment/email-converter-db -n email-converter -- \
  psql -U email_converter -c "ANALYZE;"

# 3. Check index usage
echo -e "\n--- Index Usage ---"
kubectl exec -it deployment/email-converter-db -n email-converter -- \
  psql -U email_converter -c "
  SELECT indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
  FROM pg_stat_user_indexes
  ORDER BY idx_scan DESC;"

# 4. Check table bloat
echo -e "\n--- Table Bloat ---"
kubectl exec -it deployment/email-converter-db -n email-converter -- \
  psql -U email_converter -c "
  SELECT schemaname, tablename,
         pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;"

# 5. Reindex if needed
echo -e "\n--- Reindex ---"
kubectl exec -it deployment/email-converter-db -n email-converter -- \
  psql -U email_converter -c "REINDEX SCHEMA public;"

echo -e "\n=== Maintenance Complete ==="
```

### Database Monitoring Queries

```sql
-- Connection count by state
SELECT state, count(*)
FROM pg_stat_activity
GROUP BY state;

-- Long running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

-- Table statistics
SELECT schemaname, relname, n_tup_ins, n_tup_upd, n_tup_del
FROM pg_stat_user_tables
ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC;

-- Index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## Redis Maintenance

### Redis Maintenance Tasks

```bash
#!/bin/bash
# scripts/redis_maintenance.sh

set -euo pipefail

echo "=== Redis Maintenance ==="

# 1. Check memory usage
echo -e "\n--- Memory Usage ---"
kubectl exec -it deployment/email-converter-redis -n email-converter -- \
  redis-cli info memory

# 2. Check key distribution
echo -e "\n--- Key Distribution ---"
kubectl exec -it deployment/email-converter-redis -n email-converter -- \
  redis-cli --bigkeys

# 3. Check slow log
echo -e "\n--- Slow Log ---"
kubectl exec -it deployment/email-converter-redis -n email-converter -- \
  redis-cli slowlog get 10

# 4. Check hit rate
echo -e "\n--- Hit Rate ---"
kubectl exec -it deployment/email-converter-redis -n email-converter -- \
  redis-cli info stats | grep -E "(keyspace_hits|keyspace_misses)"

# 5. Check connected clients
echo -e "\n--- Connected Clients ---"
kubectl exec -it deployment/email-converter-redis -n email-converter -- \
  redis-cli info clients

# 6. Check replication
echo -e "\n--- Replication ---"
kubectl exec -it deployment/email-converter-redis -n email-converter -- \
  redis-cli info replication

echo -e "\n=== Maintenance Complete ==="
```

---

## Celery Worker Management

### Worker Management Commands

```bash
# Check active workers
celery -A app.celery_app inspect active

# Check registered tasks
celery -A app.celery_app inspect registered

# Check queue lengths
celery -A app.celery_app inspect reserved

# Check worker stats
celery -A app.celery_app inspect stats

# Purge all tasks
celery -A app.celery_app purge

# Restart workers
kubectl rollout restart deployment/email-converter-worker -n email-converter

# Scale workers
kubectl scale deployment email-converter-worker --replicas=5 -n email-converter
```

### Worker Health Monitoring

```python
# monitoring/celery_health.py
from celery import current_app
from app.celery_app import celery_app

def get_worker_status():
    inspector = celery_app.control.inspect()
    
    active = inspector.active()
    scheduled = inspector.scheduled()
    reserved = inspector.reserved()
    
    return {
        "active_tasks": sum(len(tasks) for tasks in active.values()) if active else 0,
        "scheduled_tasks": sum(len(tasks) for tasks in scheduled.values()) if scheduled else 0,
        "reserved_tasks": sum(len(tasks) for tasks in reserved.values()) if reserved else 0,
        "workers": list(active.keys()) if active else [],
    }
```

### Task Queue Management

```python
# Utility to monitor and manage queues
from kombu import Connection, Queue

def get_queue_lengths():
    with Connection("redis://localhost:6379/1") as conn:
        queues = [
            Queue("high_priority"),
            Queue("default"),
            Queue("low_priority"),
        ]
        
        return {
            queue.name: queue.qsize()
            for queue in queues
        }
```

---

*Last updated: July 2026*
