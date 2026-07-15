#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Backup Verification Script
# Verifies integrity, test restores, reports results to Prometheus
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-/backups}"
S3_BUCKET="${S3_BACKUP_BUCKET:-}"
S3_REGION="${S3_REGION:-us-east-1}"
PROMETHEUS_PUSHGATEWAY="${PROMETHEUS_PUSHGATEWAY:-prometheus-pushgateway:9091}"
VERIFY_TYPE="${1:-all}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
HOSTNAME_SHORT="$(hostname -s 2>/dev/null || echo 'unknown')"
RESULTS_FILE="${BACKUP_ROOT}/verify-results-${TIMESTAMP}.json"

PGHOST="${POSTGRES_HOST:-localhost}"
PGPORT="${POSTGRES_PORT:-5432}"
PGUSER="${POSTGRES_USER:-postgres}"
PGDATABASE="${POSTGRES_DB:-email_converter}"
export PGPASSWORD="${POSTGRES_PASSWORD:-}"

REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

mkdir -p "${BACKUP_ROOT}/verify" "$(dirname "$RESULTS_FILE")"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [VERIFY] $*"; }

push_results() {
    local test_name="$1"
    local status="$2"
    local duration="${3:-0}"
    local details="${4:-}"
    if command -v curl &>/dev/null && [[ -n "$PROMETHEUS_PUSHGATEWAY" ]]; then
        cat <<EOF | curl -s --data-binary @- "http://${PROMETHEUS_PUSHGATEWAY}/metrics/job/backup_verification/host/${HOSTNAME_SHORT}" 2>/dev/null || true
# HELP backup_verification_last_timestamp Timestamp of last verification
# TYPE backup_verification_last_timestamp gauge
backup_verification_last_timestamp{host="${HOSTNAME_SHORT}",test="${test_name}"} $(date +%s)
# HELP backup_verification_duration_seconds Verification duration
# TYPE backup_verification_duration_seconds gauge
backup_verification_duration_seconds{host="${HOSTNAME_SHORT}",test="${test_name}"} ${duration}
# HELP backup_verification_status Verification status (1=pass, 0=fail)
# TYPE backup_verification_status gauge
backup_verification_status{host="${HOSTNAME_SHORT}",test="${test_name}"} $([[ "$status" == "pass" ]] && echo 1 || echo 0)
EOF
    fi
}

verify_postgres_backup() {
    log "--- PostgreSQL Backup Verification ---"
    local start_time
    start_time=$(date +%s)
    local latest_backup
    latest_backup=$(find "${BACKUP_ROOT}/postgres/full" -name "*_full.sql.gz" -type f 2>/dev/null | sort -r | head -1)
    if [[ -z "$latest_backup" ]]; then
        log "FAIL: No PostgreSQL backup found"
        push_results "postgres_backup_exists" "fail" "0" "No backup found"
        return 1
    fi
    log "Latest backup: $(basename "$latest_backup")"
    if [[ -f "${latest_backup}.sha256" ]]; then
        local expected
        expected=$(cut -d' ' -f1 < "${latest_backup}.sha256")
        local actual
        actual=$(sha256sum "$latest_backup" | cut -d' ' -f1)
        if [[ "$expected" == "$actual" ]]; then
            log "PASS: SHA-256 checksum verified: $actual"
        else
            log "FAIL: Checksum mismatch: expected $expected, got $actual"
            push_results "postgres_checksum" "fail" "0" "Mismatch"
            return 1
        fi
    else
        log "WARN: No checksum file found"
    fi
    if [[ "$latest_backup" == *.sql.gz ]]; then
        if gzip -t "$latest_backup" 2>/dev/null; then
            log "PASS: gzip integrity verified"
        else
            log "FAIL: gzip integrity check failed"
            push_results "postgres_gzip" "fail" "0" "Corrupt gzip"
            return 1
        fi
    fi
    local file_size
    file_size=$(stat -c%s "$latest_backup" 2>/dev/null || stat -f%z "$latest_backup" 2>/dev/null || echo 0)
    if [[ "$file_size" -gt 1024 ]]; then
        log "PASS: Backup size reasonable: $(numfmt --to=iec $file_size 2>/dev/null || echo "${file_size} bytes")"
    else
        log "FAIL: Backup suspiciously small: ${file_size} bytes"
        push_results "postgres_size" "fail" "0" "Too small"
        return 1
    fi
    local backup_age
    backup_age=$(( ($(date +%s) - $(stat -c%Y "$latest_backup" 2>/dev/null || stat -f%m "$latest_backup" 2>/dev/null || echo "0")) / 3600 ))
    if [[ "$backup_age" -lt 25 ]]; then
        log "PASS: Backup is ${backup_age} hours old (within 25h window)"
    else
        log "WARN: Backup is ${backup_age} hours old (may be stale)"
    fi
    local s3_check=false
    if [[ -n "$S3_BUCKET" ]]; then
        local backup_name
        backup_name=$(basename "$latest_backup")
        if aws s3 ls "s3://${S3_BUCKET}/postgres/full/${HOSTNAME_SHORT}/${backup_name}" --region "$S3_REGION" > /dev/null 2>&1; then
            log "PASS: Backup found in S3"
            s3_check=true
        else
            log "WARN: Backup not found in S3"
        fi
    fi
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    push_results "postgres_backup_exists" "pass" "$duration"
    log "PostgreSQL backup verification complete (${duration}s)"
}

verify_redis_backup() {
    log "--- Redis Backup Verification ---"
    local start_time
    start_time=$(date +%s)
    local latest_rdb
    latest_rdb=$(find "${BACKUP_ROOT}/redis/rdb" -name "*.rdb.gz" -type f 2>/dev/null | sort -r | head -1)
    if [[ -z "$latest_rdb" ]]; then
        log "FAIL: No Redis RDB backup found"
        push_results "redis_backup_exists" "fail" "0" "No backup found"
        return 1
    fi
    log "Latest RDB: $(basename "$latest_rdb")"
    if [[ -f "${latest_rdb}.sha256" ]]; then
        local expected
        expected=$(cut -d' ' -f1 < "${latest_rdb}.sha256")
        local actual
        actual=$(sha256sum "$latest_rdb" | cut -d' ' -f1)
        if [[ "$expected" == "$actual" ]]; then
            log "PASS: RDB SHA-256 checksum verified"
        else
            log "FAIL: RDB checksum mismatch"
            push_results "redis_checksum" "fail" "0" "Mismatch"
            return 1
        fi
    fi
    if gzip -t "$latest_rdb" 2>/dev/null; then
        log "PASS: RDB gzip integrity verified"
    else
        log "FAIL: RDB gzip integrity check failed"
        push_results "redis_gzip" "fail" "0" "Corrupt"
        return 1
    fi
    local file_size
    file_size=$(stat -c%s "$latest_rdb" 2>/dev/null || stat -f%z "$latest_rdb" 2>/dev/null || echo 0)
    log "RDB backup size: $(numfmt --to=iec $file_size 2>/dev/null || echo "${file_size} bytes")"
    local latest_aof
    latest_aof=$(find "${BACKUP_ROOT}/redis/aof" -name "*.aof.gz" -type f 2>/dev/null | sort -r | head -1)
    if [[ -n "$latest_aof" ]]; then
        if gzip -t "$latest_aof" 2>/dev/null; then
            log "PASS: AOF backup verified"
        fi
    fi
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    push_results "redis_backup_exists" "pass" "$duration"
    log "Redis backup verification complete (${duration}s)"
}

verify_s3_backup() {
    log "--- S3 Backup Verification ---"
    local start_time
    start_time=$(date +%s)
    local backup_bucket="${S3_BUCKET}-backup"
    if [[ -n "$S3_BUCKET" ]]; then
        if aws s3 ls "s3://${backup_bucket}/" --region "$S3_REGION" > /dev/null 2>&1; then
            local object_count
            object_count=$(aws s3 ls "s3://${backup_bucket}/" --recursive --region "$S3_REGION" 2>/dev/null | wc -l)
            log "PASS: S3 backup bucket exists with ~${object_count} objects"
            push_results "s3_bucket_exists" "pass" "0"
        else
            log "FAIL: S3 backup bucket not accessible"
            push_results "s3_bucket_exists" "fail" "0" "Not accessible"
            return 1
        fi
    fi
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    push_results "s3_backup_exists" "pass" "$duration"
    log "S3 backup verification complete (${duration}s)"
}

test_restore() {
    log "--- Test Restore Verification ---"
    local start_time
    start_time=$(date +%s)
    local latest_backup
    latest_backup=$(find "${BACKUP_ROOT}/postgres/full" -name "*_full.sql.gz" -type f 2>/dev/null | sort -r | head -1)
    if [[ -z "$latest_backup" ]]; then
        log "SKIP: No backup available for test restore"
        return 0
    fi
    local test_db="${PGDATABASE}_restore_test_$(date +%s)"
    log "Creating test database: ${test_db}..."
    psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "postgres" \
        -c "CREATE DATABASE ${test_db};" 2>/dev/null || { log "FAIL: Cannot create test DB"; return 1; }
    log "Restoring to test database..."
    if gunzip -c "$latest_backup" | psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$test_db" \
        --single-transaction --quiet > /dev/null 2>&1; then
        local table_count
        table_count=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$test_db" \
            -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
        log "PASS: Test restore successful. Tables found: ${table_count:-0}"
        push_results "test_restore" "pass" "$(( $(date +%s) - start_time ))"
    else
        log "FAIL: Test restore failed"
        push_results "test_restore" "fail" "$(( $(date +%s) - start_time ))"
    fi
    log "Cleaning up test database: ${test_db}..."
    psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "postgres" \
        -c "DROP DATABASE IF EXISTS ${test_db};" 2>/dev/null || true
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    log "Test restore complete (${duration}s)"
}

generate_report() {
    log "=========================================="
    log "Backup Verification Report"
    log "Timestamp: ${TIMESTAMP}"
    log "Host: ${HOSTNAME_SHORT}"
    log "=========================================="
    cat > "$RESULTS_FILE" <<EOF
{
    "timestamp": "${TIMESTAMP}",
    "hostname": "${HOSTNAME_SHORT}",
    "verify_type": "${VERIFY_TYPE}",
    "results": {
        "postgres": "$(verify_postgres_backup 2>&1 && echo 'pass' || echo 'fail')",
        "redis": "$(verify_redis_backup 2>&1 && echo 'pass' || echo 'fail')",
        "s3": "$(verify_s3_backup 2>&1 && echo 'pass' || echo 'fail')",
        "test_restore": "$(test_restore 2>&1 && echo 'pass' || echo 'fail')"
    }
}
EOF
    log "Report saved to: $RESULTS_FILE"
    log "=========================================="
}

main() {
    log "=========================================="
    log "Backup Verification Suite"
    log "Mode: ${VERIFY_TYPE}"
    log "=========================================="
    case "$VERIFY_TYPE" in
        postgres)  verify_postgres_backup ;;
        redis)     verify_redis_backup ;;
        s3)        verify_s3_backup ;;
        restore)   test_restore ;;
        all)       generate_report ;;
        *)         echo "Usage: $0 [postgres|redis|s3|restore|all]"; exit 1 ;;
    esac
}

main
