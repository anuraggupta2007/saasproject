# Region Outage Recovery Runbook

## Severity: Critical
## Response Time: < 4 hours
## Owner: SRE Team / Engineering Lead

---

## Detection

**Alerts:**
- `RegionOutage`
- `PrimaryRegionUnavailable`
- `CrossRegionReplicationLag`
- `DNSFailoverRequired`

**Symptoms:**
- All services unreachable in primary region
- Health checks failing
- Customer reports of downtime
- Monitoring gaps

---

## Step 1: Confirmation (0-15 minutes)

### 1.1 Verify Region Status

```bash
# Check AWS health dashboard
aws health describe-events --region us-east-1

# Check S3 accessibility
aws s3 ls s3://email-converter-uploads/ --region us-east-1

# Check RDS status
aws rds describe-db-instances --region us-east-1

# Check EKS status
aws eks describe-cluster --name email-converter --region us-east-1
```

### 1.2 Check Secondary Region

```bash
# Check secondary region S3
aws s3 ls s3://email-converter-backups-dr/ --region us-west-2

# Check secondary region RDS
aws rds describe-db-instances --region us-west-2

# Check secondary region EKS
aws eks describe-cluster --name email-converter-dr --region us-west-2
```

---

## Step 2: Failover Initiation (15-60 minutes)

### 2.1 Promote RDS Read Replica

```bash
# Identify read replica
aws rds describe-db-instances --region us-west-2 | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for db in data.get('DBInstances', []):
    if 'replica' in db.get('DBInstanceIdentifier', '').lower():
        print(f'Replica: {db[\"DBInstanceIdentifier\"]}')
        print(f'Status: {db[\"DBInstanceStatus\"]}')
"

# Promote replica
aws rds promote-read-replica \
  --db-instance-identifier email-converter-replica \
  --region us-west-2

# Wait for promotion
aws rds wait db-instance-available \
  --db-instance-identifier email-converter-replica \
  --region us-west-2
```

### 2.2 Update DNS

```bash
# Get current DNS configuration
aws route53 list-resource-record-sets \
  --hosted-zone-id Z1234567890 | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for rr in data.get('ResourceRecordSets', []):
    if rr['Name'] == 'api.example.com.':
        print(json.dumps(rr, indent=2))
"

# Create failover DNS change batch
cat > failover-dns.json <<EOF
{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "api.example.com",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "Z2FDTNDATAQYW2",
        "DNSName": "email-converter-dr-123456.us-west-2.elb.amazonaws.com",
        "EvaluateTargetHealth": true
      }
    }
  }]
}
EOF

# Apply DNS change
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch file://failover-dns.json
```

### 2.3 Activate Services in Secondary Region

```bash
# Install/upgrade Helm chart
helm upgrade --install email-converter \
  k8s/helm/email-converter \
  --namespace email-converter \
  --set "global.region=us-west-2" \
  --set "global.environment=dr" \
  --values k8s/helm/email-converter/values-prod.yaml \
  --wait --timeout 30m

# Verify deployment
kubectl get pods -n email-converter
kubectl get svc -n email-converter
kubectl get ingress -n email-converter
```

---

## Step 3: Validation (30-60 minutes)

### 3.1 Verify Services

```bash
# Test health endpoint
curl -f https://api.example.com/health

# Test authentication
curl -X POST https://api.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# Test file operations
curl -X POST https://api.example.com/api/v1/uploads/test \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-file.mbox"
```

### 3.2 Verify Data Integrity

```bash
# Check database connectivity
psql -h $DR_PGHOST -U $PGUSER -d $PGDATABASE \
  -c "SELECT COUNT(*) FROM users;"

# Check S3 data
aws s3 ls s3://email-converter-backups-dr/ --recursive --region us-west-2 | wc -l
```

### 3.3 Verify Monitoring

```bash
# Check Prometheus
curl -f https://prometheus.internal/api/v1/query?query=up

# Check Grafana
curl -f https://grafana.internal/api/health

# Check alerts
curl -f https://alertmanager.internal/api/v2/alerts
```

---

## Step 4: Post-Recovery

### 4.1 Communication

- [ ] Update status page
- [ ] Notify all customers
- [ ] Update internal teams
- [ ] Document incident timeline

### 4.2 Monitoring

- [ ] Monitor secondary region performance
- [ ] Watch for data sync issues
- [ ] Monitor customer traffic patterns
- [ ] Check for any remaining failures

### 4.3 Return to Primary (When Ready)

```bash
# 1. Sync data back to primary region
aws s3 sync s3://email-converter-backups-dr/ \
  s3://email-converter-backups/ \
  --source-region us-west-2 \
  --region us-east-1

# 2. Promote primary region (when available)
# (Manual AWS Console operation)

# 3. Sync data to primary
aws s3 sync s3://email-converter-backups/ \
  s3://email-converter-uploads/ \
  --region us-east-1

# 4. Update DNS back to primary
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch file://failback-dns.json

# 5. Scale down secondary region
helm upgrade --install email-converter \
  k8s/helm/email-converter \
  --namespace email-converter \
  --set "global.region=us-west-2" \
  --set "global.environment=dr" \
  --set "api.replicas=0" \
  --set "celeryWorker.replicas=0"
```

---

## Contacts

| Role | Name | Contact |
|------|------|---------|
| Incident Commander | [Name] | [Phone] |
| AWS Admin | [Name] | [Phone] |
| SRE Lead | [Name] | [Phone] |
| Engineering Lead | [Name] | [Phone] |
