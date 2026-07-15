# Backup Schedule

## Email Converter SaaS - Complete Backup Schedule

### Daily Schedule

| Time (UTC) | Job | Duration | Retention | Notes |
|------------|-----|----------|-----------|-------|
| 00:00 | Velero full backup | ~30 min | 30 days | All namespaces |
| 01:00 | Velero secrets backup | ~5 min | 7 days | Secrets + ConfigMaps |
| 02:00 | PostgreSQL full backup | ~15 min | 30 days local, 90 days S3 | pg_dump + gzip |
| 02:30 | PostgreSQL WAL archive | ~1 min | 30 days | Continuous archiving |
| 03:00 | Redis RDB + AOF backup | ~5 min | 14 days | BGSAVE + compress |
| 03:30 | S3 cross-region sync | ~10 min | 90 days | All buckets |
| 04:00 | Backup verification | ~10 min | 1 day | Integrity checks |
| 06:00 | Full verification suite | ~20 min | 1 day | All backup types |
| */30 | DR status check | ~1 min | 1 day | Health monitoring |

### Weekly Schedule

| Day | Time (UTC) | Job | Notes |
|-----|------------|-----|-------|
| Sunday | 01:00 | Velero PV backup | EBS snapshots |
| Sunday | 04:00 | Full restore test | Test database restore |
| Sunday | 05:00 | S3 versioning audit | Check all buckets |
| Sunday | 06:00 | Chaos engineering | Run resilience tests |

### Monthly Schedule

| Date | Time (UTC) | Job | Notes |
|------|------------|-----|-------|
| 1st | 02:00 | Full DR drill | Complete failover test |
| 1st | 06:00 | Restore validation | Verify all backup types |
| 15th | 02:00 | Cross-region test | DR region validation |

### Backup Retention Summary

| Data Type | Local | S3 Standard-IA | S3 Glacier | Deep Archive |
|-----------|-------|----------------|------------|--------------|
| PostgreSQL Full | 30 days | 90 days | 180 days | 365 days |
| PostgreSQL WAL | 7 days | 30 days | 90 days | - |
| Redis RDB/AOF | 14 days | 60 days | 180 days | - |
| S3 Objects | Versioned | IA after 30d | Glacier after 90d | Deep Archive after 180d |
| K8s Velero | - | 30 days | - | - |
| K8s Secrets | - | 7 days | - | - |

### Storage Estimates

| Data Type | Daily Size | Monthly | Annual |
|-----------|------------|---------|--------|
| PostgreSQL Full | ~500 MB | ~15 GB | ~180 GB |
| PostgreSQL WAL | ~50 MB | ~1.5 GB | ~18 GB |
| Redis | ~100 MB | ~3 GB | ~36 GB |
| S3 Uploads | ~10 GB | ~300 GB | ~3.6 TB |
| K8s Velero | ~500 MB | ~15 GB | ~180 GB |
| **Total** | ~11 GB | ~335 GB | ~4 TB |

### CronJob Specifications

#### PostgreSQL Backup (Kubernetes CronJob)
```yaml
schedule: "0 2 * * *"
concurrencyPolicy: Forbid
backoffLimit: 2
activeDeadlineSeconds: 7200
resources:
  requests: { cpu: 100m, memory: 256Mi }
  limits: { cpu: 500m, memory: 512Mi }
```

#### Redis Backup (Kubernetes CronJob)
```yaml
schedule: "0 3 * * *"
concurrencyPolicy: Forbid
backoffLimit: 2
activeDeadlineSeconds: 3600
resources:
  requests: { cpu: 100m, memory: 128Mi }
  limits: { cpu: 250m, memory: 256Mi }
```

#### Backup Verification (Kubernetes CronJob)
```yaml
schedule: "0 6 * * *"
concurrencyPolicy: Forbid
backoffLimit: 1
activeDeadlineSeconds: 1800
resources:
  requests: { cpu: 100m, memory: 128Mi }
  limits: { cpu: 250m, memory: 256Mi }
```

#### DR Status Check (Kubernetes CronJob)
```yaml
schedule: "*/30 * * * *"
concurrencyPolicy: Forbid
backoffLimit: 1
activeDeadlineSeconds: 300
resources:
  requests: { cpu: 50m, memory: 64Mi }
  limits: { cpu: 100m, memory: 128Mi }
```

### Alert Thresholds

| Alert | Condition | Severity |
|-------|-----------|----------|
| PostgresBackupMissing | >24h since last backup | Critical |
| PostgresBackupFailed | Backup status = 0 | Critical |
| PostgresBackupStale | >15h since last backup | Warning |
| RedisBackupMissing | >24h since last backup | Critical |
| RedisBackupFailed | Backup status = 0 | Critical |
| BackupVerificationFailed | Verification status = 0 | Critical |
| VeleroBackupFailed | Any Velero failure | Critical |
| RestoreTestOverdue | >30 days since last test | Warning |

### Manual Backup Commands

```bash
# Trigger immediate PostgreSQL backup
bash infrastructure/backup/scripts/postgres-backup.sh full manual

# Trigger immediate Redis backup
bash infrastructure/backup/scripts/redis-backup.sh full

# Trigger S3 sync
bash infrastructure/backup/scripts/s3-backup.sh sync

# Run full backup suite
bash infrastructure/backup/scripts/disaster-recovery.sh backup-now

# Run verification
bash infrastructure/backup/scripts/verify-backup.sh all
```
