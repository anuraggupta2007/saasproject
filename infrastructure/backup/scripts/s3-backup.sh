#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# S3/MinIO Object Storage Backup Script
# Supports: Bucket sync, cross-region replication, integrity verification,
#           lifecycle management, versioning audit
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-/backups/s3}"
S3_BUCKET="${S3_BACKUP_BUCKET:-}"
S3_REGION="${S3_REGION:-us-east-1}"
CROSS_REGION_BUCKET="${CROSS_REGION_BUCKET:-}"
CROSS_REGION_SECONDARY="${CROSS_REGION_SECONDARY:-us-west-2}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-minio:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}"
BACKUP_TYPE="${1:-sync}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
HOSTNAME_SHORT="$(hostname -s 2>/dev/null || echo 'unknown')"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-365}"
INTEGRITY_CHECK="${INTEGRITY_CHECK:-true}"

LOG_FILE="${BACKUP_ROOT}/logs/backup-${TIMESTAMP}.log"
mkdir -p "$(dirname "$LOG_FILE")"
exec > >(tee -a "$LOG_FILE") 2>&1

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [S3-BACKUP] $*"; }
error() { log "ERROR: $*"; exit 1; }

# Buckets to back up
BUCKETS=(
    "email-converter-uploads"
    "email-converter-converted"
    "email-converter-attachments"
    "email-converter-licenses"
    "email-converter-reports"
)

sync_bucket() {
    local bucket="$1"
    local direction="${2:-local-to-s3}"
    log "Syncing bucket: ${bucket} (${direction})..."
    local start_time
    start_time=$(date +%s)
    if [[ "$direction" == "local-to-s3" ]]; then
        aws s3 sync "s3://${bucket}" "s3://${S3_BUCKET}-backup/${bucket}" \
            --source-region "$S3_REGION" \
            --region "$S3_REGION" \
            --storage-class STANDARD_IA \
            --only-show-errors 2>&1 || { log "WARNING: Sync failed for ${bucket}"; return 1; }
    elif [[ "$direction" == "s3-to-cross-region" ]]; then
        if [[ -n "$CROSS_REGION_BUCKET" ]]; then
            aws s3 sync "s3://${bucket}" "s3://${CROSS_REGION_BUCKET}/${bucket}" \
                --source-region "$S3_REGION" \
                --region "$CROSS_REGION_SECONDARY" \
                --storage-class STANDARD_IA \
                --only-show-errors 2>&1 || { log "WARNING: Cross-region sync failed for ${bucket}"; return 1; }
        fi
    fi
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    local object_count
    object_count=$(aws s3 ls "s3://${bucket}" --recursive --region "$S3_REGION" 2>/dev/null | wc -l)
    log "Bucket ${bucket} synced: ~${object_count} objects in ${duration}s"
}

verify_bucket_integrity() {
    local bucket="$1"
    log "Verifying integrity of bucket: ${bucket}..."
    local total_objects=0
    local verified_objects=0
    local failed_objects=0
    local sample_size=100
    local objects
    objects=$(aws s3 ls "s3://${bucket}" --recursive --region "$S3_REGION" 2>/dev/null | head -n "$sample_size")
    while IFS= read -r line; do
        [[ -z "$line" ]] && continue
        local key
        key=$(echo "$line" | awk '{print $4}')
        [[ -z "$key" ]] && continue
        total_objects=$((total_objects + 1))
        if aws s3api head-object --bucket "$bucket" --key "$key" --region "$S3_REGION" > /dev/null 2>&1; then
            verified_objects=$((verified_objects + 1))
        else
            failed_objects=$((failed_objects + 1))
            log "WARNING: Cannot access object: ${key}"
        fi
    done <<< "$objects"
    log "Integrity check for ${bucket}: ${verified_objects}/${total_objects} verified, ${failed_objects} failed"
    if [[ $failed_objects -gt 0 ]]; then
        return 1
    fi
    return 0
}

audit_versioning() {
    local bucket="$1"
    log "Auditing versioning for bucket: ${bucket}..."
    local versioning
    versioning=$(aws s3api get-bucket-versioning --bucket "$bucket" --region "$S3_REGION" 2>/dev/null || echo "{}")
    local status
    status=$(echo "$versioning" | grep -o '"Status":"[^"]*"' | cut -d'"' -f4 || echo "not-enabled")
    log "Versioning status for ${bucket}: ${status:-not-enabled}"
    if [[ "$status" != "Enabled" ]]; then
        log "WARNING: Versioning is not enabled for ${bucket}"
        return 1
    fi
    return 0
}

enable_bucket_versioning() {
    local bucket="$1"
    log "Enabling versioning for bucket: ${bucket}..."
    aws s3api put-bucket-versioning \
        --bucket "$bucket" \
        --region "$S3_REGION" \
        --versioning-configuration Status=Enabled 2>&1 || { log "WARNING: Failed to enable versioning"; return 1; }
    log "Versioning enabled for ${bucket}"
}

enable_bucket_lock() {
    local bucket="$1"
    local days="${2:-30}"
    log "Enabling Object Lock with ${days}-day retention for: ${bucket}..."
    aws s3api put-object-lock-configuration \
        --bucket "$bucket" \
        --region "$S3_REGION" \
        --object-lock-configuration "{
            \"ObjectLockEnabled\": \"Enabled\",
            \"Rule\": {
                \"DefaultRetention\": {
                    \"Mode\": \"GOVERNANCE\",
                    \"Days\": ${days}
                }
            }
        }" 2>&1 || { log "WARNING: Failed to enable Object Lock (bucket may need Object Lock enabled at creation)"; return 1; }
    log "Object Lock enabled for ${bucket}"
}

apply_lifecycle_rules() {
    local bucket="$1"
    log "Applying lifecycle rules to: ${bucket}..."
    aws s3api put-bucket-lifecycle-configuration \
        --bucket "$bucket" \
        --region "$S3_REGION" \
        --lifecycle-configuration "{
            \"Rules\": [
                {
                    \"ID\": \"TransitionToIA\",
                    \"Status\": \"Enabled\",
                    \"Filter\": {\"Prefix\": \"\"},
                    \"Transitions\": [
                        {
                            \"Days\": 30,
                            \"StorageClass\": \"STANDARD_IA\"
                        },
                        {
                            \"Days\": 90,
                            \"StorageClass\": \"GLACIER\"
                        }
                    ]
                },
                {
                    \"ID\": \"NonCurrentExpiration\",
                    \"Status\": \"Enabled\",
                    \"Filter\": {\"Prefix\": \"\"},
                    \"NoncurrentVersionExpiration\": {
                        \"NoncurrentDays\": ${BACKUP_RETENTION_DAYS}
                    }
                },
                {
                    \"ID\": \"AbortIncompleteMultipartUpload\",
                    \"Status\": \"Enabled\",
                    \"Filter\": {\"Prefix\": \"\"},
                    \"AbortIncompleteMultipartUpload\": {
                        \"DaysAfterInitiation\": 7
                    }
                }
            ]
        }" 2>&1 || { log "WARNING: Failed to apply lifecycle rules"; return 1; }
    log "Lifecycle rules applied to ${bucket}"
}

list_all_versions() {
    local bucket="$1"
    log "Listing object versions for: ${bucket}..."
    local total_versions
    total_versions=$(aws s3api list-object-versions --bucket "$bucket" --region "$S3_REGION" 2>/dev/null | \
        python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('Versions',[])) + len(d.get('DeleteMarkers',[])))" 2>/dev/null || echo "0")
    log "Total versions/delete markers for ${bucket}: ${total_versions}"
}

remove_old_versions() {
    local bucket="$1"
    local max_versions="${2:-5}"
    log "Removing old versions (keeping ${max_versions}) for: ${bucket}..."
    aws s3api list-object-versions --bucket "$bucket" --region "$S3_REGION" 2>/dev/null | \
        python3 -c "
import sys, json
data = json.load(sys.stdin)
versions = data.get('Versions', [])
by_key = {}
for v in versions:
    key = v['Key']
    if key not in by_key:
        by_key[key] = []
    by_key[key].append(v)
remove = []
for key, vers in by_key.items():
    if len(vers) > ${max_versions}:
        for v in vers[${max_versions}:]:
            remove.append({'Key': v['Key'], 'VersionId': v['VersionId']})
print(json.dumps({'Objects': remove[:1000], 'Quiet': True}))
" 2>/dev/null | aws s3api delete-objects \
        --bucket "$bucket" --region "$S3_REGION" \
        --delete "file:///dev/stdin" 2>/dev/null || true
    log "Old version cleanup complete for ${bucket}"
}

rotate_backups() {
    log "Rotating S3 backup data older than ${BACKUP_RETENTION_DAYS} days..."
    for bucket in "${BUCKETS[@]}"; do
        local backup_bucket="${S3_BUCKET}-backup"
        if [[ -n "$S3_BUCKET" ]]; then
            aws s3 ls "s3://${backup_bucket}/${bucket}/" --recursive --region "$S3_REGION" 2>/dev/null | \
                while read -r line; do
                    local file_date
                    file_date=$(echo "$line" | awk '{print $1" "$2}')
                    if [[ -n "$file_date" ]]; then
                        local file_epoch
                        file_epoch=$(date -d "$file_date" +%s 2>/dev/null || echo "0")
                        local now_epoch
                        now_epoch=$(date +%s)
                        local days_old=$(( (now_epoch - file_epoch) / 86400 ))
                        if [[ $days_old -gt $BACKUP_RETENTION_DAYS ]]; then
                            local key
                            key=$(echo "$line" | awk '{print $4}')
                            aws s3 rm "s3://${backup_bucket}/${key}" --region "$S3_REGION" --only-show-errors 2>/dev/null || true
                            log "Removed old backup: ${key}"
                        fi
                    fi
                done
        fi
    done
    log "Rotation complete"
}

main() {
    log "=========================================="
    log "S3/MinIO Backup - ${BACKUP_TYPE^^}"
    log "Timestamp: ${TIMESTAMP}"
    log "=========================================="
    case "$BACKUP_TYPE" in
        sync)
            for bucket in "${BUCKETS[@]}"; do
                sync_bucket "$bucket" "local-to-s3"
                sync_bucket "$bucket" "s3-to-cross-region"
            done
            ;;
        verify)
            for bucket in "${BUCKETS[@]}"; do
                verify_bucket_integrity "$bucket"
            done
            ;;
        versioning)
            for bucket in "${BUCKETS[@]}"; do
                audit_versioning "$bucket"
            done
            ;;
        enable-versioning)
            for bucket in "${BUCKETS[@]}"; do
                enable_bucket_versioning "$bucket"
            done
            ;;
        enable-lock)
            local retention_days="${2:-30}"
            for bucket in "${BUCKETS[@]}"; do
                enable_bucket_lock "$bucket" "$retention_days"
            done
            ;;
        lifecycle)
            for bucket in "${BUCKETS[@]}"; do
                apply_lifecycle_rules "$bucket"
            done
            ;;
        versions)
            for bucket in "${BUCKETS[@]}"; do
                list_all_versions "$bucket"
            done
            ;;
        cleanup-versions)
            for bucket in "${BUCKETS[@]}"; do
                remove_old_versions "$bucket" 5
            done
            ;;
        rotate)
            rotate_backups
            ;;
        *)
            error "Unknown backup type: $BACKUP_TYPE. Use: sync|verify|versioning|enable-versioning|enable-lock|lifecycle|versions|cleanup-versions|rotate"
            ;;
    esac
    log "=========================================="
    log "Operation complete"
    log "=========================================="
}

main
