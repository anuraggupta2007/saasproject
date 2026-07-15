# Accidental Deletion Recovery Runbook

## Severity: High
## Response Time: < 30 minutes
## Owner: SRE Team

---

## Detection

**Alerts:**
- `DataDeletionDetected`
- `RowCountDecreased`
- `S3ObjectDeleted`
- `UserAccountDeleted`

**Symptoms:**
- Missing data in database
- Files not found
- User reports missing data
- Application errors

---

## Step 1: Immediate Assessment (0-5 minutes)

### 1.1 Identify What Was Deleted

```bash
# Check recent database changes
psql -h $PGHOST -U $PGUSER -d email_converter \
  -c "SELECT relname, n_live_tup
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC;"

# Check S3 recent deletions
aws s3api list-object-versions --bucket email-converter-uploads \
  --prefix "path/to/deleted/" --region us-east-1 | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for dm in data.get('DeleteMarkers', [])[:10]:
    print(f'Deleted: {dm[\"Key\"]} at {dm[\"LastModified\"]}')
"

# Check application logs
kubectl logs deploy/api -n email-converter --tail=100 | \
  grep -i "delete\|removed"
```

### 1.2 Determine Deletion Type

| Type | Scope | Recovery Method |
|------|-------|-----------------|
| **Single record** | 1 row | PITR or version restore |
| **Table data** | Multiple rows | PITR restore |
| **File** | 1 object | S3 version restore |
| **Bucket contents** | Multiple objects | S3 restore from backup |
| **User account** | Account + data | Database restore |

---

## Step 2: Recovery Options (5-30 minutes)

### Option A: Restore Single Record (PITR)

```bash
# Find the timestamp before deletion
# Check application logs for deletion time

# Perform PITR to just before deletion
bash infrastructure/backup/scripts/postgres-restore.sh \
  /backups/postgres/full/LATEST_BACKUP.sql.gz \
  pitr \
  "2026-01-15T10:00:00Z"  # Just before deletion
```

### Option B: Restore from S3 Version

```bash
# List versions of deleted object
aws s3api list-object-versions --bucket email-converter-uploads \
  --prefix "path/to/deleted/file.mbox" --region us-east-1 | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
versions = data.get('Versions', [])
if versions:
    v = versions[0]
    print(f'Latest version: {v[\"VersionId\"]}')
    print(f'Date: {v[\"LastModified\"]}')
"

# Restore specific version
aws s3api get-object --bucket email-converter-uploads \
  --key "path/to/deleted/file.mbox" \
  --version-id "VERSION_ID" \
  /tmp/restored-file.mbox

# Re-upload
aws s3 cp /tmp/restored-file.mbox s3://email-converter-uploads/path/to/file.mbox
```

### Option C: Restore Multiple Objects

```bash
# Restore all objects from backup
aws s3 sync s3://email-converter-backups/email-converter-uploads/path/to/folder/ \
  s3://email-converter-uploads/path/to/folder/ \
  --region us-east-1
```

### Option D: Database Restore

```bash
# If significant data was deleted
bash infrastructure/backup/scripts/disaster-recovery.sh recover-db full
```

---

## Step 3: Validation (5-15 minutes)

### 3.1 Verify Restored Data

```bash
# Check database
psql -h $PGHOST -U $PGUSER -d email_converter \
  -c "SELECT COUNT(*) FROM users WHERE id = 'DELETED_USER_ID';"

# Check S3
aws s3api head-object --bucket email-converter-uploads \
  --key "restored/file.mbox" --region us-east-1
```

### 3.2 Test Application

```bash
# Test affected endpoints
curl -X GET https://api.example.com/api/v1/users/DELETED_USER_ID
curl -X GET https://api.example.com/api/v1/files/restored-file/download
```

---

## Step 4: Post-Recovery

### 4.1 Root Cause Analysis

- [ ] Identify who deleted the data
- [ ] Determine if accidental or malicious
- [ ] Review access controls
- [ ] Check for audit logs
- [ ] Verify backup completeness

### 4.2 Preventive Measures

- [ ] Enable soft deletes
- [ ] Implement delete confirmation
- [ ] Add audit logging
- [ ] Enable S3 versioning
- [ ] Set up deletion alerts

---

## Contacts

| Role | Name | Contact |
|------|------|---------|
| SRE On-Call | [Name] | [Phone] |
| DBA | [Name] | [Phone] |
