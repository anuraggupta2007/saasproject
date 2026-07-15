# Database Corruption Recovery Runbook

## Severity: Critical
## Response Time: < 30 minutes
## Owner: DBA / SRE Team

---

## Detection

**Alerts:**
- `PostgresCorruptionDetected`
- `PostgresChecksumMismatch`
- `PostgresRecoveryMode`

**Symptoms:**
- Application errors referencing data corruption
- Checksum verification failures
- Unexpected NULL values in non-nullable columns
- Constraint violation errors
- pg_dump failures

---

## Step 1: Immediate Containment (0-5 minutes)

### 1.1 Stop Application Writes

```bash
# Scale down API to stop writes
kubectl scale deploy/api --replicas=0 -n email-converter

# Verify no new connections
psql -h $PGHOST -U $PGUSER -d postgres \
  -c "SELECT pid, usename, application_name, state
      FROM pg_stat_activity
      WHERE datname = 'email_converter' AND state = 'active';"
```

### 1.2 Terminate Active Connections

```bash
psql -h $PGHOST -U $PGUSER -d postgres \
  -c "SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = 'email_converter'
      AND pid <> pg_backend_pid();"
```

### 1.3 Create Emergency Snapshot

```bash
# Safety backup before any recovery
pg_dump -h $PGHOST -U $PGUSER -d email_converter \
  -F c -f /tmp/emergency-$(date +%Y%m%dT%H%M%SZ).dump

# This preserves the corrupted state for analysis
```

---

## Step 2: Assessment (5-15 minutes)

### 2.1 Identify Corruption Scope

```bash
# Check for corruption in all tables
psql -h $PGHOST -U $PGUSER -d email_converter \
  -c "SELECT schemaname, relname, n_live_tup, last_vacuum, last_autovacuum
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC;"

# Run pg_dump to identify corrupt tables
pg_dump -h $PGHOST -U $PGUSER -d email_converter \
  --data-only --no-owner 2>&1 | grep -i "error\|corrupt\|invalid"

# Check PostgreSQL logs
kubectl logs statefulset/postgresql -n email-converter --tail=1000 | \
  grep -i "corrupt\|error\|invalid\|fatal"
```

### 2.2 Determine Corruption Type

| Type | Symptoms | Recovery Method |
|------|----------|-----------------|
| **Logical** | Invalid data, constraint violations | PITR to point before corruption |
| **Physical** | Checksum failures, I/O errors | Full restore from backup |
| **Index** | Slow queries, missing indexes | REINDEX or restore |
| **WAL** | Replication issues | Full restore |

---

## Step 3: Recovery (15-60 minutes)

### Option A: Point-in-Time Recovery (Preferred)

```bash
# Find the last clean backup before corruption
ls -la /backups/postgres/full/ | grep "full.sql.gz"

# Determine when corruption started
# Check application logs for first error timestamp

# Perform PITR
bash infrastructure/backup/scripts/postgres-restore.sh \
  /backups/postgres/full/LATEST_BACKUP.sql.gz \
  pitr \
  "2026-01-15T10:00:00Z"  # Time before corruption
```

### Option B: Full Restore

```bash
# Find latest clean backup
LATEST=$(ls -t /backups/postgres/full/*_full.sql.gz | head -1)

# Verify backup integrity
sha256sum -c "${LATEST}.sha256"
gzip -t "$LATEST"

# Perform full restore
bash infrastructure/backup/scripts/postgres-restore.sh \
  "$LATEST" full
```

### Option C: Cross-Region Restore

```bash
# If local backups are compromised
bash infrastructure/backup/scripts/disaster-recovery.sh recover-db cross-region
```

---

## Step 4: Validation (5-10 minutes)

### 4.1 Verify Data Integrity

```bash
# Check table row counts
psql -h $PGHOST -U $PGUSER -d email_converter \
  -c "SELECT relname, n_live_tup
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC
      LIMIT 10;"

# Verify critical tables
psql -h $PGHOST -U $PGUSER -d email_converter \
  -c "SELECT COUNT(*) as users FROM users;"
  -c "SELECT COUNT(*) as conversions FROM conversions;"
  -c "SELECT COUNT(*) as payments FROM payments;"
```

### 4.2 Test Application Connectivity

```bash
# Scale up API
kubectl scale deploy/api --replicas=3 -n email-converter

# Test health endpoint
curl -f https://api.example.com/health || echo "Health check failed"

# Test critical endpoints
curl -f https://api.example.com/api/v1/auth/me || echo "Auth check failed"
```

### 4.3 Verify Backup Jobs

```bash
# Trigger a test backup
kubectl create job --from=cronjob/postgres-backup test-backup-$(date +%s) -n email-converter

# Monitor job
kubectl get jobs -n email-converter -w
```

---

## Step 5: Post-Recovery

### 5.1 Root Cause Analysis

- [ ] Identify what caused the corruption
- [ ] Check for hardware issues
- [ ] Review recent schema changes
- [ ] Analyze application logs
- [ ] Check for malicious activity

### 5.2 Preventive Measures

- [ ] Enable pg_dump checksums
- [ ] Increase backup frequency
- [ ] Add corruption monitoring
- [ ] Review access controls
- [ ] Update runbook based on findings

### 5.3 Communication

- [ ] Update status page
- [ ] Notify affected customers
- [ ] Document in incident log
- [ ] Schedule post-mortem

---

## Rollback Plan

If recovery fails:

```bash
# Restore from emergency snapshot
pg_restore -h $PGHOST -U $PGUSER -d email_converter \
  /tmp/emergency-*.dump

# Or restore from pre-corruption backup
bash infrastructure/backup/scripts/postgres-restore.sh \
  /backups/postgres/full/PRE_CORRUPTION_BACKUP.sql.gz full
```

---

## Contacts

| Role | Name | Contact |
|------|------|---------|
| Primary DBA | [Name] | [Phone] |
| SRE On-Call | [Name] | [Phone] |
| Engineering Lead | [Name] | [Phone] |
