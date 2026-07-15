# Recovery Procedures

## PostgreSQL Recovery

### Full Restore

```bash
# 1. List available backups
ls -la /backups/postgres/full/ | tail -10

# 2. Restore from latest backup
bash infrastructure/backup/scripts/postgres-restore.sh \
  /backups/postgres/full/20260115T020000Z_email_converter_full.sql.gz \
  full

# 3. Verify restoration
psql -h localhost -U postgres -d email_converter \
  -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

### Point-in-Time Recovery (PITR)

```bash
# 1. Find the latest full backup before the target time
ls -la /backups/postgres/full/

# 2. Restore to specific point in time
bash infrastructure/backup/scripts/postgres-restore.sh \
  /backups/postgres/full/20260115T020000Z_email_converter_full.sql.gz \
  pitr \
  "2026-01-15T10:30:00Z"

# 3. For Kubernetes, apply recovery ConfigMap and restart PostgreSQL
kubectl apply -f /backups/postgres/recovery/recovery-config.yaml
kubectl rollout restart statefulset/postgresql -n email-converter
```

### Cross-Region Restore

```bash
# 1. Restore from secondary region
bash infrastructure/backup/scripts/postgres-restore.sh \
  "" \
  full \
  "" \
  --s3-key "postgres/full/$(hostname)/latest_full.sql.gz" \
  --region "us-west-2"

# 2. Or use DR script
bash infrastructure/backup/scripts/disaster-recovery.sh recover-db cross-region
```

## Redis Recovery

### RDB Restore

```bash
# 1. List available RDB backups
ls -la /backups/redis/rdb/

# 2. Restore from RDB
bash infrastructure/backup/scripts/redis-restore.sh \
  rdb \
  /backups/redis/rdb/20260115T020000Z_dump.rdb.gz

# 3. Restart Redis
kubectl rollout restart statefulset/redis -n email-converter

# 4. Verify
redis-cli -h redis -p 6379 -a $REDIS_PASSWORD DBSIZE
```

### AOF Restore

```bash
# 1. List available AOF backups
ls -la /backups/redis/aof/

# 2. Restore from AOF
bash infrastructure/backup/scripts/redis-restore.sh \
  aof \
  /backups/redis/aof/20260115T020000Z_appendonly.aof.gz

# 3. Restart Redis with AOF enabled
kubectl rollout restart statefulset/redis -n email-converter
```

## S3/MinIO Recovery

### Cross-Region Restore

```bash
# 1. Sync from secondary region
bash infrastructure/backup/scripts/s3-backup.sh sync

# 2. Or restore specific bucket
aws s3 sync s3://email-converter-backups-dr/email-converter-uploads/ \
  s3://email-converter-uploads/ \
  --source-region us-west-2 \
  --region us-east-1
```

### Restore from Backup Bucket

```bash
# 1. Restore from backup bucket
bash infrastructure/backup/scripts/disaster-recovery.sh recover-s3 backup
```

## Kubernetes Recovery

### Full Cluster Restore (Velero)

```bash
# 1. List available backups
velero backup get

# 2. Restore from backup
velero restore create --from-backup "backup-20260115"

# 3. Verify restore
kubectl get pods -n email-converter
kubectl get pvc -n email-converter
```

### Secrets Restore

```bash
# 1. Restore secrets only
bash infrastructure/backup/kubernetes/velero-config.yaml restore-secrets.sh <backup-name>

# 2. Or apply from backup directory
kubectl apply -f /backups/kubernetes/secrets/ -n email-converter
```

### Helm Release Restore

```bash
# 1. Reinstall from Helm chart
helm upgrade --install email-converter \
  k8s/helm/email-converter \
  --namespace email-converter \
  --values k8s/helm/email-converter/values-prod.yaml \
  --wait --timeout 30m
```

## Regional Failover

```bash
# 1. Check DR status
bash infrastructure/backup/scripts/disaster-recovery.sh status

# 2. Initiate failover
bash infrastructure/backup/scripts/disaster-recovery.sh failover

# 3. Or manual steps:
#    a. Promote RDS read replica
aws rds promote-read-replica \
  --db-instance-identifier email-converter-replica \
  --region us-west-2

#    b. Update DNS
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch file://failover-dns.json

#    c. Activate services
helm upgrade --install email-converter \
  k8s/helm/email-converter \
  --namespace email-converter \
  --set global.region=us-west-2 \
  --values k8s/helm/email-converter/values-prod.yaml
```

## Ransomware Recovery

```bash
# 1. Execute DR ransomware procedure
bash infrastructure/backup/scripts/disaster-recovery.sh ransomware

# 2. Or follow manual procedure:
#    Phase 1: Containment (0-15 min)
#    - Isolate affected systems
#    - Disable compromised accounts
#    - Block suspicious IPs
#
#    Phase 2: Assessment (15-60 min)
#    - Identify scope of encryption
#    - Determine entry point
#    - Check for data exfiltration
#
#    Phase 3: Recovery (1-4 hours)
#    - Restore from clean backup (verify checksums!)
#    - Rotate all credentials
#    - Patch vulnerabilities
#
#    Phase 4: Validation (4-8 hours)
#    - Verify data integrity
#    - Test all services
#    - Monitor for reinfection
```

## Verification Checklist

After any recovery operation:

- [ ] Database connectivity verified
- [ ] Table row counts match expected values
- [ ] Application health endpoints return 200
- [ ] File uploads working correctly
- [ ] Conversion jobs processing
- [ ] Authentication/authorization working
- [ ] Payment processing functional
- [ ] Email notifications sending
- [ ] Monitoring alerts cleared
- [ ] Backup jobs resuming normally
