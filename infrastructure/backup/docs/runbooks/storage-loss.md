# Storage Loss Recovery Runbook

## Severity: Critical
## Response Time: < 1 hour
## Owner: SRE Team

---

## Detection

**Alerts:**
- `S3BucketInaccessible`
- `MinIOPersistenceLost`
- `StorageQuotaExceeded`
- `FileUploadFailures`

**Symptoms:**
- File upload failures
- 404 errors for existing files
- Conversion job failures
- Application errors referencing storage

---

## Step 1: Immediate Assessment (0-5 minutes)

### 1.1 Identify Affected Storage

```bash
# Check S3 bucket status
aws s3 ls s3://email-converter-uploads/ --region us-east-1
aws s3 ls s3://email-converter-converted/ --region us-east-1
aws s3 ls s3://email-converter-attachments/ --region us-east-1

# Check MinIO status (if using self-hosted)
kubectl exec -it minio-0 -n email-converter -- \
  mc ls local/ --insecure
```

### 1.2 Check Backup Bucket

```bash
# Verify backup bucket is accessible
aws s3 ls s3://email-converter-backups/ --region us-east-1

# Check cross-region backup
aws s3 ls s3://email-converter-backups-dr/ --region us-west-2
```

---

## Step 2: Determine Scope (5-15 minutes)

### 2.1 Identify Lost Data

```bash
# Count objects in primary bucket
aws s3 ls s3://email-converter-uploads/ --recursive --region us-east-1 | wc -l

# Count objects in backup bucket
aws s3 ls s3://email-converter-backups/email-converter-uploads/ --recursive --region us-east-1 | wc -l

# Compare versions
aws s3api list-object-versions --bucket email-converter-uploads --region us-east-1 | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Versions: {len(d.get(\"Versions\",[]))}')"
```

### 2.2 Check Data Integrity

```bash
# Sample verification
aws s3api head-object --bucket email-converter-uploads \
  --key "sample-file.mbox" --region us-east-1
```

---

## Step 3: Recovery (15-60 minutes)

### Option A: Restore from Cross-Region Replication

```bash
# Sync from secondary region
aws s3 sync s3://email-converter-backups-dr/email-converter-uploads/ \
  s3://email-converter-uploads/ \
  --source-region us-west-2 \
  --region us-east-1 \
  --storage-class STANDARD

# Verify sync
aws s3 ls s3://email-converter-uploads/ --recursive --region us-east-1 | wc -l
```

### Option B: Restore from Backup Bucket

```bash
# Sync from backup bucket
aws s3 sync s3://email-converter-backups/email-converter-uploads/ \
  s3://email-converter-uploads/ \
  --region us-east-1 \
  --storage-class STANDARD

# Verify
aws s3 ls s3://email-converter-uploads/ --recursive --region us-east-1 | wc -l
```

### Option C: Restore from Versioned Objects

```bash
# Restore specific versions of deleted objects
aws s3api list-object-versions --bucket email-converter-uploads \
  --prefix "path/to/deleted/file.mbox" --region us-east-1 | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for v in data.get('Versions', [])[:1]:
    print(f'Restoring version: {v[\"VersionId\"]}')
    print(f'Key: {v[\"Key\"]}')
"
```

---

## Step 4: Validation (10-20 minutes)

### 4.1 Verify Restored Data

```bash
# Test file access
curl -I https://storage.example.com/email-converter-uploads/test-file.mbox

# Check file integrity
aws s3api head-object --bucket email-converter-uploads \
  --key "test-file.mbox" --region us-east-1 | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Size: {d[\"ContentLength\"]}')"
```

### 4.2 Test Application

```bash
# Scale up API
kubectl scale deploy/api --replicas=3 -n email-converter

# Test file upload
curl -X POST https://api.example.com/api/v1/uploads/test \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-file.mbox"

# Test file download
curl -I https://api.example.com/api/v1/files/test-file/download
```

---

## Step 5: Post-Recovery

### 5.1 Root Cause Analysis

- [ ] Identify why storage was lost
- [ ] Check for accidental deletion
- [ ] Review access logs
- [ ] Check for ransomware activity
- [ ] Verify bucket policies

### 5.2 Preventive Measures

- [ ] Enable S3 versioning (if not already)
- [ ] Enable MFA delete protection
- [ ] Review lifecycle policies
- [ ] Enable cross-region replication
- [ ] Add storage monitoring alerts

---

## Contacts

| Role | Name | Contact |
|------|------|---------|
| SRE On-Call | [Name] | [Phone] |
| AWS Admin | [Name] | [Phone] |
