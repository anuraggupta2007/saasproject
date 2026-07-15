# Ransomware Recovery Runbook

## Severity: Critical
## Response Time: < 8 hours
## Owner: Security Team / SRE

---

## IMPORTANT: DO NOT PAY RANSOM

Paying ransom does not guarantee data recovery and encourages future attacks.

---

## Step 1: Containment (0-15 minutes)

### 1.1 Isolate Affected Systems

```bash
# Scale down all services immediately
kubectl scale deploy/api --replicas=0 -n email-converter
kubectl scale statefulset/celery-worker --replicas=0 -n email-converter

# Block network access
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: emergency-isolation
  namespace: email-converter
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
EOF

# Disable compromised accounts
# (Manual operation in auth system)
```

### 1.2 Preserve Forensic Evidence

```bash
# Capture pod logs
for pod in $(kubectl get pods -n email-converter -o name); do
  kubectl logs "$pod" -n email-converter > "/tmp/evidence/${pod}.log" 2>&1
done

# Capture network traffic
kubectl exec -it <pod-name> -n email-converter -- \
  tcpdump -w /tmp/evidence/network.pcap

# Capture system state
kubectl get all -n email-converter -o yaml > /tmp/evidence/cluster-state.yaml
```

### 1.3 Block Suspicious IPs

```bash
# Check access logs
aws s3api get-bucket-logging --bucket email-converter-uploads

# Block IPs at WAF
aws wafv2 update-web-acl \
  --name email-converter-waf \
  --scope REGIONAL \
  --id <acl-id> \
  --lock-token <token> \
  --rules '[
    {
      "Name": "BlockSuspiciousIPs",
      "Priority": 1,
      "Action": {"Block": {}},
      "Statement": {
        "IPSetReferenceStatement": {
          "ARN": "arn:aws:wafv2:us-east-1:ACCOUNT:regional/ipset/suspicious-ips/ID"
        }
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "BlockSuspiciousIPs"
      }
    }
  ]'
```

---

## Step 2: Assessment (15-60 minutes)

### 2.1 Identify Scope of Encryption

```bash
# Check for encrypted files
find /backups -name "*.encrypted" -o -name "*.locked" 2>/dev/null

# Check database for corrupted data
psql -h $PGHOST -U $PGUSER -d email_converter \
  -c "SELECT relname, n_live_tup FROM pg_stat_user_tables;"

# Check S3 for modified objects
aws s3api list-object-versions --bucket email-converter-uploads \
  --region us-east-1 | python3 -c "
import sys, json
from datetime import datetime, timedelta
data = json.load(sys.stdin)
cutoff = datetime.utcnow() - timedelta(hours=2)
for v in data.get('Versions', []):
    modified = v['LastModified'].replace(tzinfo=None)
    if modified > cutoff:
        print(f'Recently modified: {v[\"Key\"]} at {v[\"LastModified\"]}')
"
```

### 2.2 Determine Entry Point

```bash
# Check for unauthorized access
kubectl logs deploy/api -n email-converter | \
  grep -i "unauthorized\|failed login\|suspicious"

# Check for compromised credentials
# Review authentication logs
# Check for unusual API calls
```

### 2.3 Identify Clean Backups

```bash
# Find pre-infection backups
ls -la /backups/postgres/full/ | grep "full.sql.gz"

# Verify backup integrity
for backup in /backups/postgres/full/*_full.sql.gz; do
  echo "Checking: $backup"
  sha256sum -c "${backup}.sha256" 2>/dev/null && echo "  OK" || echo "  CORRUPT"
  gzip -t "$backup" 2>/dev/null && echo "  gzip OK" || echo "  gzip CORRUPT"
done

# Check cross-region backups
aws s3 ls s3://email-converter-backups-dr/ --region us-west-2
```

---

## Step 3: Recovery (1-4 hours)

### 3.1 Restore from Clean Backup

```bash
# IMPORTANT: Verify backup is pre-infection!
LATEST_CLEAN=$(ls -t /backups/postgres/full/*_full.sql.gz | head -2 | tail -1)

# Verify checksum
sha256sum -c "${LATEST_CLEAN}.sha256"

# Restore database
bash infrastructure/backup/scripts/postgres-restore.sh "$LATEST_CLEAN" full

# Restore Redis
LATEST_RDB=$(ls -t /backups/redis/rdb/*.rdb.gz | head -1)
bash infrastructure/backup/scripts/redis-restore.sh rdb "$LATEST_RDB"

# Restore S3
bash infrastructure/backup/scripts/disaster-recovery.sh recover-s3 backup
```

### 3.2 Rotate All Credentials

```bash
# Rotate database password
aws rds modify-db-instance \
  --db-instance-identifier email-converter \
  --master-user-password "$(openssl rand -base64 32)" \
  --apply-immediately

# Rotate Redis password
kubectl create secret generic email-converter-secrets \
  --from-literal=REDIS_PASSWORD="$(openssl rand -base64 32)" \
  --dry-run=client -o yaml | kubectl apply -f -

# Rotate JWT secret
kubectl create secret generic email-converter-secrets \
  --from-literal=JWT_SECRET="$(openssl rand -base64 64)" \
  --dry-run=client -o yaml | kubectl apply -f -

# Rotate API keys
# (Manual operation in external services)
```

### 3.3 Patch Vulnerabilities

```bash
# Update all dependencies
pip install --upgrade -r requirements.txt

# Update container images
kubectl set image deploy/api \
  api=email-converter-api:latest \
  -n email-converter

# Apply security patches
kubectl apply -f k8s/helm/email-converter/templates/security-policies.yaml
```

### 3.4 Rebuild Affected Systems

```bash
# Remove network isolation
kubectl delete networkpolicy emergency-isolation -n email-converter

# Restart all services
kubectl rollout restart deploy -n email-converter
kubectl rollout restart statefulset -n email-converter

# Scale up services
kubectl scale deploy/api --replicas=3 -n email-converter
kubectl scale statefulset/celery-worker --replicas=3 -n email-converter
```

---

## Step 4: Validation (4-8 hours)

### 4.1 Verify Data Integrity

```bash
# Check database
psql -h $PGHOST -U $PGUSER -d email_converter \
  -c "SELECT COUNT(*) FROM users;"

# Check file integrity
aws s3api head-object --bucket email-converter-uploads \
  --key "test-file.mbox" --region us-east-1

# Verify no encrypted files remain
find /backups -name "*.encrypted" 2>/dev/null | wc -l
```

### 4.2 Test All Services

```bash
# Test health
curl -f https://api.example.com/health

# Test authentication
curl -X POST https://api.example.com/api/v1/auth/login

# Test file operations
curl -X POST https://api.example.com/api/v1/uploads/test

# Test conversions
curl -X POST https://api.example.com/api/v1/conversions/test
```

### 4.3 Monitor for Reinfection

```bash
# Watch for suspicious activity
kubectl logs deploy/api -n email-converter -f | \
  grep -i "error\|suspicious\|unauthorized"

# Monitor file changes
inotifywait -m /backups -e create,modify,delete

# Check for new encrypted files
find / -name "*.encrypted" -newer /tmp/recovery-marker 2>/dev/null
```

---

## Step 5: Post-Recovery

### 5.1 Security Hardening

- [ ] Enable MFA for all accounts
- [ ] Implement least-privilege access
- [ ] Enable immutable backups (S3 Object Lock)
- [ ] Deploy intrusion detection
- [ ] Enable audit logging
- [ ] Implement network segmentation

### 5.2 Communication

- [ ] Notify affected customers
- [ ] Report to authorities (if required)
- [ ] Update status page
- [ ] Document incident timeline

### 5.3 Lessons Learned

- [ ] Conduct post-mortem
- [ ] Update security policies
- [ ] Improve monitoring
- [ ] Train staff on ransomware prevention

---

## Prevention Checklist

- [ ] Immutable backups enabled
- [ ] S3 Object Lock configured
- [ ] Backup encryption with KMS
- [ ] Network segmentation in place
- [ ] Least-privilege access enforced
- [ ] Regular security audits
- [ ] Employee security training
- [ ] Incident response drills

---

## Contacts

| Role | Name | Contact |
|------|------|---------|
| Security Lead | [Name] | [Phone] |
| Incident Commander | [Name] | [Phone] |
| SRE Lead | [Name] | [Phone] |
| Legal | [Name] | [Phone] |
| Law Enforcement | [Phone] | [Reference #] |
