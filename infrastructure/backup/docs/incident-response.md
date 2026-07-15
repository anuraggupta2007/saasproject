# Incident Response Guide

## Email Converter SaaS - Incident Response Playbook

### Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **SEV-1** | Complete service outage | Immediate | Region failure, data breach, ransomware |
| **SEV-2** | Major feature degraded | < 15 min | Database down, payment failures |
| **SEV-3** | Minor feature impact | < 1 hour | Slow responses, non-critical errors |
| **SEV-4** | Cosmetic/minimal impact | < 4 hours | UI issues, logging errors |

### Incident Response Flow

```
Detection → Triage → Mitigation → Resolution → Review
    │          │          │            │          │
    ▼          ▼          ▼            ▼          ▼
 Alert     Assign    Contain     Fix &      Post-
 fires     IC        & fix       verify     mortem
```

### Step 1: Detection & Alerting

**Automated Detection:**
- Prometheus alerts fire to Alertmanager
- PagerDuty triggers for SEV-1/SEV-2
- Slack notification to #incidents channel

**Manual Detection:**
- Customer reports
- Internal discovery
- Monitoring dashboard anomalies

### Step 2: Triage (0-5 minutes)

**Incident Commander (IC) Actions:**
1. Acknowledge the alert
2. Assess severity level
3. Open incident channel: `#incident-YYYY-MM-DD-topic`
4. Post initial status:
   ```
   INCIDENT: [Brief description]
   SEVERITY: SEV-X
   IMPACT: [What's affected]
   STATUS: Investigating
   IC: @username
   ```

**Initial Assessment Checklist:**
- [ ] Which services are affected?
- [ ] Is data at risk?
- [ ] Are backups accessible?
- [ ] Is this a security incident?
- [ ] Customer impact scope?

### Step 3: Mitigation (5-30 minutes)

#### Scenario: Database Corruption

```bash
# 1. Stop writes to database
kubectl scale deploy/api --replicas=0 -n email-converter

# 2. Create safety snapshot
pg_dump -h $PGHOST -U $PGUSER -d $PGDATABASE -F c -f /tmp/pre-restore.dump

# 3. Restore from latest clean backup
bash infrastructure/backup/scripts/postgres-restore.sh \
  /backups/postgres/full/latest_full.sql.gz full

# 4. Verify data integrity
psql -h $PGHOST -U $PGUSER -d $PGDATABASE \
  -c "SELECT COUNT(*) FROM users;"

# 5. Resume writes
kubectl scale deploy/api --replicas=3 -n email-converter
```

#### Scenario: Storage Loss

```bash
# 1. Check S3 status
aws s3 ls s3://email-converter-uploads/ --region us-east-1

# 2. Restore from cross-region
bash infrastructure/backup/scripts/s3-backup.sh sync

# 3. Verify file accessibility
curl -I https://api.example.com/files/test-download
```

#### Scenario: Redis Failure

```bash
# 1. Check Redis status
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping

# 2. Restore from RDB
bash infrastructure/backup/scripts/redis-restore.sh rdb /backups/redis/rdb/latest.rdb.gz

# 3. Restart Redis
kubectl rollout restart statefulset/redis -n email-converter
```

#### Scenario: Kubernetes Cluster Failure

```bash
# 1. Check cluster status
kubectl get nodes
kubectl get pods --all-namespaces | grep -v Running

# 2. Restore from Velero
velero restore create --from-backup "backup-latest"

# 3. Verify workloads
kubectl get pods -n email-converter
kubectl get pvc -n email-converter
```

#### Scenario: Region Outage

```bash
# 1. Verify secondary region
aws s3 ls s3://email-converter-backups-dr/ --region us-west-2

# 2. Initiate failover
bash infrastructure/backup/scripts/disaster-recovery.sh failover

# 3. Monitor activation
watch kubectl get pods -n email-converter
```

### Step 4: Resolution (30 min - 4 hours)

**Resolution Checklist:**
- [ ] All affected services restored
- [ ] Data integrity verified
- [ ] No data loss beyond RPO
- [ ] All monitoring alerts cleared
- [ ] Customer communication sent
- [ ] Backup jobs resumed
- [ ] Security implications assessed

### Step 5: Communication Templates

**Initial Notification:**
```
We're currently investigating issues with [service/feature].
Impact: [Description of user impact]
Status: Investigating
Next update: [Time]
```

**Resolution Notification:**
```
The issue with [service/feature] has been resolved.
Duration: [Start time] - [End time]
Impact: [Description of impact]
Root cause: [Brief description]
Actions taken: [Summary]
```

### Step 6: Post-Incident Review (24-48 hours)

**Post-Mortem Template:**

```markdown
# Incident Post-Mortem: [Title]

## Summary
- **Date:** YYYY-MM-DD
- **Duration:** X hours Y minutes
- **Severity:** SEV-X
- **Impact:** [Description]

## Timeline
- HH:MM - [Event]
- HH:MM - [Event]

## Root Cause
[Detailed root cause analysis]

## What Went Well
- [List positives]

## What Went Wrong
- [List negatives]

## Action Items
- [ ] [Action] - Owner - Due date
- [ ] [Action] - Owner - Due date

## Lessons Learned
- [Key takeaways]
```

### Escalation Matrix

| Severity | First Responder | Escalation (15 min) | Escalation (30 min) |
|----------|-----------------|---------------------|---------------------|
| SEV-1 | On-call SRE | Engineering Lead | CTO |
| SEV-2 | On-call SRE | Engineering Lead | VP Engineering |
| SEV-3 | On-call SRE | Team Lead | Engineering Lead |
| SEV-4 | Any Engineer | Team Lead | Team Lead |

### Contact List

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Primary SRE | [Name] | [Phone] | [Email] |
| Secondary SRE | [Name] | [Phone] | [Email] |
| DBA | [Name] | [Phone] | [Email] |
| Engineering Lead | [Name] | [Phone] | [Email] |
| Support Lead | [Name] | [Phone] | [Email] |

### Tools & Access

| Tool | URL | Purpose |
|------|-----|---------|
| Grafana | https://grafana.internal | Monitoring dashboards |
| Prometheus | https://prometheus.internal | Metrics & alerts |
| PagerDuty | https://pagerduty.internal | On-call management |
| AWS Console | https://console.aws.amazon.com | Infrastructure |
| Velero | kubectl CLI | K8s backup/restore |
