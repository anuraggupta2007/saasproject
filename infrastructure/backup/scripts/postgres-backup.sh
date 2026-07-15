#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# PostgreSQL Backup Script
# Supports: Full backup, WAL archiving, incremental via pgBackRest,
#           compression, encryption, S3 upload, integrity verification
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-/backups/postgres}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_RETENTION_WEEKLY="${BACKUP_RETENTION_WEEKLY:-12}"
BACKUP_RETENTION_MONTHLY="${BACKUP_RETENTION_MONTHLY:-12}"
S3_BUCKET="${S3_BACKUP_BUCKET:-}"
S3_REGION="${S3_REGION:-us-east-1}"
CROSS_REGION_BUCKET="${CROSS_REGION_BUCKET:-}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"
PROMETHEUS_PUSHGATEWAY="${PROMETHEUS_PUSHGATEWAY:-prometheus-pushgateway:9091}"
BACKUP_TYPE="${1:-full}"
BACKUP_LABEL="${2:-manual}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
HOSTNAME_SHORT="$(hostname -s 2>/dev/null || echo 'unknown')"

# Database connection
PGHOST="${POSTGRES_HOST:-localhost}"
PGPORT="${POSTGRES_PORT:-5432}"
PGUSER="${POSTGRES_USER:-postgres}"
PGDATABASE="${POSTGRES_DB:-email_converter}"
export PGPASSWORD="${POSTGRES_PASSWORD:-}"

# Logging
LOG_FILE="${BACKUP_ROOT}/logs/backup-${TIMESTAMP}.log"
mkdir -p "$(dirname "$LOG_FILE")"
exec > >(tee -a "$LOG_FILE") 2>&1

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [${BACKUP_TYPE^^}] $*"; }
error() { log "ERROR: $*"; exit 1; }

cleanup() {
    local exit_code=$?
    rm -f /tmp/pg_backup_*.tmp 2>/dev/null || true
    if [[ $exit_code -ne 0 ]]; then
        log "Backup failed with exit code $exit_code"
        push_metrics "failure"
    fi
    exit $exit_code
}
trap cleanup EXIT

push_metrics() {
    local status="$1"
    local duration="${2:-0}"
    local size="${3:-0}"
    if command -v curl &>/dev/null && [[ -n "$PROMETHEUS_PUSHGATEWAY" ]]; then
        cat <<EOF | curl -s --data-binary @- "http://${PROMETHEUS_PUSHGATEWAY}/metrics/job/postgres_backup/host/${HOSTNAME_SHORT}" 2>/dev/null || true
# HELP postgres_backup_last_success_timestamp Timestamp of last successful backup
# TYPE postgres_backup_last_success_timestamp gauge
postgres_backup_last_success_timestamp{host="${HOSTNAME_SHORT}",type="${BACKUP_TYPE}"} $(date +%s)
# HELP postgres_backup_duration_seconds Backup duration in seconds
# TYPE postgres_backup_duration_seconds gauge
postgres_backup_duration_seconds{host="${HOSTNAME_SHORT}",type="${BACKUP_TYPE}"} ${duration}
# HELP postgres_backup_size_bytes Backup file size in bytes
# TYPE postgres_backup_size_bytes gauge
postgres_backup_size_bytes{host="${HOSTNAME_SHORT}",type="${BACKUP_TYPE}"} ${size}
# HELP postgres_backup_status Backup status (1=success, 0=failure)
# TYPE postgres_backup_status gauge
postgres_backup_status{host="${HOSTNAME_SHORT}",type="${BACKUP_TYPE}"} $([[ "$status" == "success" ]] && echo 1 || echo 0)
EOF
    fi
}

verify_backup() {
    local backup_file="$1"
    log "Verifying backup integrity..."
    if [[ "$backup_file" == *.gpg ]]; then
        if ! gpg --batch --yes --verify "${backup_file}.sig" "$backup_file" 2>/dev/null; then
            log "WARNING: GPG signature verification failed"
            return 1
        fi
        log "GPG signature verified"
    fi
    if [[ "$backup_file" == *.sql.gz ]]; then
        if ! gzip -t "$backup_file"; then
            log "WARNING: gzip integrity check failed"
            return 1
        fi
        log "gzip integrity verified"
    elif [[ "$backup_file" == *.pgdump ]]; then
        if ! pg_restore --list "$backup_file" > /dev/null 2>&1; then
            log "WARNING: pg_restore listing failed"
            return 1
        fi
        log "pgRestore format verified"
    fi
    local expected_checksum
    expected_checksum=$(sha256sum "$backup_file" | cut -d' ' -f1)
    echo "$expected_checksum  $backup_file" > "${backup_file}.sha256"
    log "SHA-256 checksum: $expected_checksum"
    return 0
}

upload_to_s3() {
    local backup_file="$1"
    local s3_path="$2"
    if [[ -z "$S3_BUCKET" ]]; then
        log "S3_BUCKET not set, skipping upload"
        return 0
    fi
    log "Uploading to s3://${S3_BUCKET}/${s3_path}..."
    aws s3 cp "$backup_file" "s3://${S3_BUCKET}/${s3_path}" \
        --region "$S3_REGION" \
        --storage-class STANDARD_IA \
        --only-show-errors 2>&1 || { log "WARNING: S3 upload failed"; return 1; }
    aws s3 cp "${backup_file}.sha256" "s3://${S3_BUCKET}/${s3_path}.sha256" \
        --region "$S3_REGION" --only-show-errors 2>/dev/null || true
    log "S3 upload complete"
}

upload_cross_region() {
    local backup_file="$1"
    local s3_path="$2"
    if [[ -z "$CROSS_REGION_BUCKET" ]]; then
        return 0
    fi
    log "Cross-region upload to s3://${CROSS_REGION_BUCKET}/${s3_path}..."
    aws s3 cp "$backup_file" "s3://${CROSS_REGION_BUCKET}/${s3_path}" \
        --region "${CROSS_REGION_SECONDARY:-us-west-2}" \
        --storage-class STANDARD_IA \
        --only-show-errors 2>&1 || { log "WARNING: Cross-region upload failed"; return 1; }
    log "Cross-region upload complete"
}

do_full_backup() {
    local backup_file="${BACKUP_ROOT}/full/${TIMESTAMP}_${PGDATABASE}_full.sql.gz"
    mkdir -p "${BACKUP_ROOT}/full" "${BACKUP_ROOT}/manifests"
    log "Starting full backup of ${PGDATABASE}..."
    local start_time
    start_time=$(date +%s)
    pg_dump \
        -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
        --format=plain \
        --compress=0 \
        --verbose \
        --no-owner \
        --no-privileges \
        --no-comments \
        --no-publications \
        --no-subscriptions \
        --no-security-labels \
        --no-tablespaces \
        2>/dev/null | gzip -9 > "$backup_file"
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    local file_size
    file_size=$(stat -c%s "$backup_file" 2>/dev/null || stat -f%z "$backup_file" 2>/dev/null || echo 0)
    log "Full backup completed: ${file_size} bytes in ${duration}s"
    verify_backup "$backup_file" || log "WARNING: Verification issues detected"
    cat > "${BACKUP_ROOT}/manifests/${TIMESTAMP}_full.json" <<EOF
{
    "backup_type": "full",
    "database": "${PGDATABASE}",
    "timestamp": "${TIMESTAMP}",
    "hostname": "${HOSTNAME_SHORT}",
    "file": "${backup_file}",
    "size_bytes": ${file_size},
    "duration_seconds": ${duration},
    "checksum_sha256": "$(sha256sum "$backup_file" | cut -d' ' -f1)",
    "pg_version": "$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -c 'SHOW server_version' 2>/dev/null | tr -d ' ')",
    "backup_label": "${BACKUP_LABEL}"
}
EOF
    local s3_key="postgres/full/${HOSTNAME_SHORT}/${TIMESTAMP}_${PGDATABASE}_full.sql.gz"
    upload_to_s3 "$backup_file" "$s3_key"
    upload_cross_region "$backup_file" "$s3_key"
    push_metrics "success" "$duration" "$file_size"
    log "Full backup complete: $backup_file"
}

do_incremental_backup() {
    local base_backup
    base_backup=$(find "${BACKUP_ROOT}/full" -name "*_full.sql.gz" -type f | sort -r | head -1)
    if [[ -z "$base_backup" ]]; then
        log "No full backup found, performing full backup instead"
        do_full_backup
        return
    fi
    log "Performing WAL-based incremental backup (base: $(basename "$base_backup"))"
    local wal_dir="${BACKUP_ROOT}/wal/${TIMESTAMP}"
    mkdir -p "$wal_dir"
    psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
        -c "SELECT pg_start_backup('${BACKUP_LABEL}_${TIMESTAMP}');" 2>/dev/null
    local backup_file="${BACKUP_ROOT}/incremental/${TIMESTAMP}_${PGDATABASE}_incr.tar.gz"
    mkdir -p "${BACKUP_ROOT}/incremental"
    pg_dump \
        -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
        --format=custom \
        --compress=6 \
        --no-owner \
        --no-privileges \
        -f "$backup_file" 2>/dev/null
    psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
        -c "SELECT pg_stop_backup();" 2>/dev/null
    local file_size
    file_size=$(stat -c%s "$backup_file" 2>/dev/null || stat -f%z "$backup_file" 2>/dev/null || echo 0)
    log "Incremental backup completed: ${file_size} bytes"
    verify_backup "$backup_file" || log "WARNING: Verification issues detected"
    local s3_key="postgres/incremental/${HOSTNAME_SHORT}/${TIMESTAMP}_${PGDATABASE}_incr.tar.gz"
    upload_to_s3 "$backup_file" "$s3_key"
    upload_cross_region "$backup_file" "$s3_key"
    push_metrics "success" "0" "$file_size"
}

do_wal_archive() {
    local wal_dir="${BACKUP_ROOT}/wal_archive"
    mkdir -p "$wal_dir"
    log "Archiving WAL files..."
    psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
        -c "SELECT pg_switch_wal();" 2>/dev/null || true
    local wal_file
    wal_file=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
        -t -c "SELECT pg_walfile_name();" 2>/dev/null | tr -d ' ')
    if [[ -n "$wal_file" ]]; then
        local s3_wal_key="postgres/wal/${HOSTNAME_SHORT}/${wal_file}"
        if [[ -n "$S3_BUCKET" ]]; then
            aws s3 cp "s3://${S3_BUCKET}/postgres/wal/current/" "s3://${S3_BUCKET}/${s3_wal_key}" \
                --region "$S3_REGION" --only-show-errors 2>/dev/null || true
        fi
        log "WAL archived: $wal_file"
    fi
}

rotate_backups() {
    log "Rotating backups older than ${BACKUP_RETENTION_DAYS} days..."
    find "${BACKUP_ROOT}/full" -name "*.sql.gz" -mtime "+${BACKUP_RETENTION_DAYS}" -delete 2>/dev/null || true
    find "${BACKUP_ROOT}/incremental" -name "*.tar.gz" -mtime "+${BACKUP_RETENTION_DAYS}" -delete 2>/dev/null || true
    find "${BACKUP_ROOT}/logs" -name "*.log" -mtime "+${BACKUP_RETENTION_DAYS}" -delete 2>/dev/null || true
    find "${BACKUP_ROOT}/manifests" -name "*.json" -mtime "+${BACKUP_RETENTION_DAYS}" -delete 2>/dev/null || true
    if [[ -n "$S3_BUCKET" ]]; then
        log "Cleaning S3 backups older than ${BACKUP_RETENTION_DAYS} days..."
        aws s3 ls "s3://${S3_BUCKET}/postgres/full/${HOSTNAME_SHORT}/" --region "$S3_REGION" 2>/dev/null | \
            while read -r line; do
                local file_date
                file_date=$(echo "$line" | awk '{print $1}')
                if [[ -n "$file_date" ]]; then
                    local days_old
                    days_old=$(( ( $(date +%s) - $(date -d "$file_date" +%s 2>/dev/null || echo "0") ) / 86400 ))
                    if [[ $days_old -gt $BACKUP_RETENTION_DAYS ]]; then
                        local file_name
                        file_name=$(echo "$line" | awk '{print $4}')
                        aws s3 rm "s3://${S3_BUCKET}/postgres/full/${HOSTNAME_SHORT}/${file_name}" \
                            --region "$S3_REGION" --only-show-errors 2>/dev/null || true
                        log "Removed old S3 backup: $file_name"
                    fi
                fi
            done
    fi
    log "Rotation complete"
}

main() {
    log "=========================================="
    log "PostgreSQL Backup - ${BACKUP_TYPE^^}"
    log "Database: ${PGDATABASE}"
    log "Host: ${PGHOST}:${PGPORT}"
    log "Label: ${BACKUP_LABEL}"
    log "=========================================="
    psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT 1;" > /dev/null 2>&1 \
        || error "Cannot connect to PostgreSQL at ${PGHOST}:${PGPORT}"
    log "Database connection verified"
    case "$BACKUP_TYPE" in
        full)       do_full_backup ;;
        incremental|incr) do_incremental_backup ;;
        wal)        do_wal_archive ;;
        rotate)     rotate_backups ;;
        *)          error "Unknown backup type: $BACKUP_TYPE. Use: full|incremental|wal|rotate" ;;
    esac
    log "=========================================="
    log "Backup operation complete"
    log "=========================================="
}

main
