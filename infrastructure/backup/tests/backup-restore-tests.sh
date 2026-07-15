#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Backup & Restore Test Suite
# Validates backup integrity, restore procedures, and recovery objectives
# =============================================================================

TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${TEST_DIR}/results"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RESULTS_FILE="${RESULTS_DIR}/test-results-${TIMESTAMP}.json"
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

PGHOST="${POSTGRES_HOST:-localhost}"
PGPORT="${POSTGRES_PORT:-5432}"
PGUSER="${POSTGRES_USER:-postgres}"
PGDATABASE="${POSTGRES_DB:-email_converter}"
export PGPASSWORD="${POSTGRES_PASSWORD:-}"

REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

BACKUP_ROOT="${BACKUP_ROOT:-/backups}"

mkdir -p "$RESULTS_DIR"
: > "${RESULTS_FILE}"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [TEST] $*"; }
pass() { log "PASS: $*"; PASS_COUNT=$((PASS_COUNT + 1)); echo "{\"status\":\"pass\",\"test\":\"$*\"}" >> "$RESULTS_FILE"; }
fail() { log "FAIL: $*"; FAIL_COUNT=$((FAIL_COUNT + 1)); echo "{\"status\":\"fail\",\"test\":\"$*\"}" >> "$RESULTS_FILE"; }
skip() { log "SKIP: $*"; SKIP_COUNT=$((SKIP_COUNT + 1)); echo "{\"status\":\"skip\",\"test\":\"$*\"}" >> "$RESULTS_FILE"; }

# =============================================================================
# PostgreSQL Backup Tests
# =============================================================================

test_postgres_backup_exists() {
    local test_name="postgres_backup_exists"
    local latest
    latest=$(find "${BACKUP_ROOT}/postgres/full" -name "*_full.sql.gz" -type f 2>/dev/null | sort -r | head -1)
    if [[ -n "$latest" ]]; then
        pass "$test_name: $(basename "$latest")"
    else
        fail "$test_name: No backup found"
    fi
}

test_postgres_backup_integrity() {
    local test_name="postgres_backup_integrity"
    local latest
    latest=$(find "${BACKUP_ROOT}/postgres/full" -name "*_full.sql.gz" -type f 2>/dev/null | sort -r | head -1)
    if [[ -z "$latest" ]]; then
        skip "$test_name: No backup to test"
        return
    fi
    if gzip -t "$latest" 2>/dev/null; then
        pass "$test_name"
    else
        fail "$test_name: gzip integrity check failed"
    fi
}

test_postgres_backup_checksum() {
    local test_name="postgres_backup_checksum"
    local latest
    latest=$(find "${BACKUP_ROOT}/postgres/full" -name "*_full.sql.gz" -type f 2>/dev/null | sort -r | head -1)
    if [[ -z "$latest" ]]; then
        skip "$test_name: No backup to test"
        return
    fi
    if [[ -f "${latest}.sha256" ]]; then
        local expected
        expected=$(cut -d' ' -f1 < "${latest}.sha256")
        local actual
        actual=$(sha256sum "$latest" | cut -d' ' -f1)
        if [[ "$expected" == "$actual" ]]; then
            pass "$test_name"
        else
            fail "$test_name: Checksum mismatch"
        fi
    else
        skip "$test_name: No checksum file"
    fi
}

test_postgres_backup_size() {
    local test_name="postgres_backup_size"
    local latest
    latest=$(find "${BACKUP_ROOT}/postgres/full" -name "*_full.sql.gz" -type f 2>/dev/null | sort -r | head -1)
    if [[ -z "$latest" ]]; then
        skip "$test_name: No backup to test"
        return
    fi
    local size
    size=$(stat -c%s "$latest" 2>/dev/null || stat -f%z "$latest" 2>/dev/null || echo 0)
    if [[ "$size" -gt 1024 ]]; then
        pass "$test_name: $(numfmt --to=iec $size 2>/dev/null || echo "${size} bytes")"
    else
        fail "$test_name: Backup too small (${size} bytes)"
    fi
}

test_postgres_backup_freshness() {
    local test_name="postgres_backup_freshness"
    local latest
    latest=$(find "${BACKUP_ROOT}/postgres/full" -name "*_full.sql.gz" -type f 2>/dev/null | sort -r | head -1)
    if [[ -z "$latest" ]]; then
        skip "$test_name: No backup to test"
        return
    fi
    local age_hours
    age_hours=$(( ($(date +%s) - $(stat -c%Y "$latest" 2>/dev/null || stat -f%m "$latest" 2>/dev/null || echo "0")) / 3600 ))
    if [[ "$age_hours" -lt 25 ]]; then
        pass "$test_name: ${age_hours}h old"
    else
        fail "$test_name: Backup is ${age_hours}h old (>25h)"
    fi
}

test_postgres_backup_s3() {
    local test_name="postgres_backup_s3"
    if [[ -z "${S3_BACKUP_BUCKET:-}" ]]; then
        skip "$test_name: S3_BACKUP_BUCKET not set"
        return
    fi
    local latest
    latest=$(find "${BACKUP_ROOT}/postgres/full" -name "*_full.sql.gz" -type f 2>/dev/null | sort -r | head -1)
    if [[ -z "$latest" ]]; then
        skip "$test_name: No local backup"
        return
    fi
    local filename
    filename=$(basename "$latest")
    if aws s3 ls "s3://${S3_BACKUP_BUCKET}/postgres/full/$(hostname)/${filename}" \
        --region "${AWS_REGION:-us-east-1}" > /dev/null 2>&1; then
        pass "$test_name"
    else
        fail "$test_name: Not found in S3"
    fi
}

# =============================================================================
# PostgreSQL Restore Tests
# =============================================================================

test_postgres_restore_to_test_db() {
    local test_name="postgres_restore_test_db"
    local latest
    latest=$(find "${BACKUP_ROOT}/postgres/full" -name "*_full.sql.gz" -type f 2>/dev/null | sort -r | head -1)
    if [[ -z "$latest" ]]; then
        skip "$test_name: No backup to restore"
        return
    fi
    local test_db="${PGDATABASE}_test_$(date +%s)"
    psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "postgres" \
        -c "CREATE DATABASE ${test_db};" 2>/dev/null || { fail "$test_name: Cannot create test DB"; return; }
    if gunzip -c "$latest" | psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$test_db" \
        --single-transaction --quiet > /dev/null 2>&1; then
        local table_count
        table_count=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$test_db" \
            -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
        pass "$test_name: ${table_count} tables restored"
    else
        fail "$test_name: Restore failed"
    fi
    psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "postgres" \
        -c "DROP DATABASE IF EXISTS ${test_db};" 2>/dev/null || true
}

# =============================================================================
# Redis Backup Tests
# =============================================================================

test_redis_backup_exists() {
    local test_name="redis_backup_exists"
    local latest
    latest=$(find "${BACKUP_ROOT}/redis/rdb" -name "*.rdb.gz" -type f 2>/dev/null | sort -r | head -1)
    if [[ -n "$latest" ]]; then
        pass "$test_name: $(basename "$latest")"
    else
        fail "$test_name: No backup found"
    fi
}

test_redis_backup_integrity() {
    local test_name="redis_backup_integrity"
    local latest
    latest=$(find "${BACKUP_ROOT}/redis/rdb" -name "*.rdb.gz" -type f 2>/dev/null | sort -r | head -1)
    if [[ -z "$latest" ]]; then
        skip "$test_name: No backup to test"
        return
    fi
    if gzip -t "$latest" 2>/dev/null; then
        pass "$test_name"
    else
        fail "$test_name: gzip integrity check failed"
    fi
}

test_redis_backup_checksum() {
    local test_name="redis_backup_checksum"
    local latest
    latest=$(find "${BACKUP_ROOT}/redis/rdb" -name "*.rdb.gz" -type f 2>/dev/null | sort -r | head -1)
    if [[ -z "$latest" ]]; then
        skip "$test_name: No backup to test"
        return
    fi
    if [[ -f "${latest}.sha256" ]]; then
        local expected
        expected=$(cut -d' ' -f1 < "${latest}.sha256")
        local actual
        actual=$(sha256sum "$latest" | cut -d' ' -f1)
        if [[ "$expected" == "$actual" ]]; then
            pass "$test_name"
        else
            fail "$test_name: Checksum mismatch"
        fi
    else
        skip "$test_name: No checksum file"
    fi
}

# =============================================================================
# S3 Backup Tests
# =============================================================================

test_s3_backup_bucket_exists() {
    local test_name="s3_backup_bucket_exists"
    if [[ -z "${S3_BACKUP_BUCKET:-}" ]]; then
        skip "$test_name: S3_BACKUP_BUCKET not set"
        return
    fi
    if aws s3 ls "s3://${S3_BACKUP_BUCKET}/" --region "${AWS_REGION:-us-east-1}" > /dev/null 2>&1; then
        pass "$test_name"
    else
        fail "$test_name: Bucket not accessible"
    fi
}

test_s3_cross_region_exists() {
    local test_name="s3_cross_region_exists"
    if [[ -z "${S3_BACKUP_BUCKET:-}" ]]; then
        skip "$test_name: S3_BACKUP_BUCKET not set"
        return
    fi
    if aws s3 ls "s3://${S3_BACKUP_BUCKET}-dr/" --region "${CROSS_REGION_SECONDARY:-us-west-2}" > /dev/null 2>&1; then
        pass "$test_name"
    else
        skip "$test_name: DR bucket not configured"
    fi
}

# =============================================================================
# Kubernetes Backup Tests
# =============================================================================

test_k8s_backup_cronjobs() {
    local test_name="k8s_backup_cronjobs"
    if ! command -v kubectl &>/dev/null; then
        skip "$test_name: kubectl not available"
        return
    fi
    local cronjobs
    cronjobs=$(kubectl get cronjobs -n email-converter -l app.kubernetes.io/part-of=email-converter-backup -o name 2>/dev/null | wc -l)
    if [[ "$cronjobs" -gt 0 ]]; then
        pass "$test_name: ${cronjobs} backup CronJobs found"
    else
        fail "$test_name: No backup CronJobs found"
    fi
}

test_k8s_velero_installed() {
    local test_name="k8s_velero_installed"
    if ! command -v velero &>/dev/null; then
        skip "$test_name: velero not available"
        return
    fi
    if velero version > /dev/null 2>&1; then
        pass "$test_name"
    else
        fail "$test_name: Velero not responding"
    fi
}

test_k8s_backup_pvc() {
    local test_name="k8s_backup_pvc"
    if ! command -v kubectl &>/dev/null; then
        skip "$test_name: kubectl not available"
        return
    fi
    local pvc_status
    pvc_status=$(kubectl get pvc backup-pvc -n email-converter -o jsonpath='{.status.phase}' 2>/dev/null || echo "NotFound")
    if [[ "$pvc_status" == "Bound" ]]; then
        pass "$test_name"
    else
        fail "$test_name: PVC status is $pvc_status"
    fi
}

# =============================================================================
# RPO/RTO Compliance Tests
# =============================================================================

test_rpo_compliance() {
    local test_name="rpo_compliance_15min"
    local latest
    latest=$(find "${BACKUP_ROOT}/postgres/full" -name "*_full.sql.gz" -type f 2>/dev/null | sort -r | head -1)
    if [[ -z "$latest" ]]; then
        skip "$test_name: No backup found"
        return
    fi
    local age_minutes
    age_minutes=$(( ($(date +%s) - $(stat -c%Y "$latest" 2>/dev/null || stat -f%m "$latest" 2>/dev/null || echo "0")) / 60 ))
    if [[ "$age_minutes" -le 15 ]]; then
        pass "$test_name: ${age_minutes}min (target <15min)"
    else
        fail "$test_name: ${age_minutes}min (target <15min)"
    fi
}

test_rpo_compliance_redis() {
    local test_name="rpo_compliance_redis"
    local latest
    latest=$(find "${BACKUP_ROOT}/redis/rdb" -name "*.rdb.gz" -type f 2>/dev/null | sort -r | head -1)
    if [[ -z "$latest" ]]; then
        skip "$test_name: No backup found"
        return
    fi
    local age_minutes
    age_minutes=$(( ($(date +%s) - $(stat -c%Y "$latest" 2>/dev/null || stat -f%m "$latest" 2>/dev/null || echo "0")) / 60 ))
    if [[ "$age_minutes" -le 15 ]]; then
        pass "$test_name: ${age_minutes}min"
    else
        fail "$test_name: ${age_minutes}min"
    fi
}

# =============================================================================
# Run All Tests
# =============================================================================

run_all_tests() {
    log "=========================================="
    log "Backup & Restore Test Suite"
    log "Timestamp: ${TIMESTAMP}"
    log "=========================================="

    log ""
    log "--- PostgreSQL Tests ---"
    test_postgres_backup_exists
    test_postgres_backup_integrity
    test_postgres_backup_checksum
    test_postgres_backup_size
    test_postgres_backup_freshness
    test_postgres_backup_s3
    test_postgres_restore_to_test_db

    log ""
    log "--- Redis Tests ---"
    test_redis_backup_exists
    test_redis_backup_integrity
    test_redis_backup_checksum

    log ""
    log "--- S3 Tests ---"
    test_s3_backup_bucket_exists
    test_s3_cross_region_exists

    log ""
    log "--- Kubernetes Tests ---"
    test_k8s_backup_cronjobs
    test_k8s_velero_installed
    test_k8s_backup_pvc

    log ""
    log "--- Compliance Tests ---"
    test_rpo_compliance
    test_rpo_compliance_redis

    log ""
    log "=========================================="
    log "Test Results Summary"
    log "=========================================="
    log "PASSED:  ${PASS_COUNT}"
    log "FAILED:  ${FAIL_COUNT}"
    log "SKIPPED: ${SKIP_COUNT}"
    log "TOTAL:   $((PASS_COUNT + FAIL_COUNT + SKIP_COUNT))"
    log "=========================================="

    if [[ "$FAIL_COUNT" -gt 0 ]]; then
        log "OVERALL: FAILED"
        return 1
    else
        log "OVERALL: PASSED"
        return 0
    fi
}

usage() {
    cat <<EOF
Usage: $0 [test_name|all]

Tests:
  postgres          All PostgreSQL backup/restore tests
  redis             All Redis backup tests
  s3                All S3 backup tests
  k8s               All Kubernetes backup tests
  rpo               RPO compliance tests
  all               Run all tests
EOF
}

main() {
    local test_name="${1:-all}"
    case "$test_name" in
        postgres)
            test_postgres_backup_exists
            test_postgres_backup_integrity
            test_postgres_backup_checksum
            test_postgres_backup_size
            test_postgres_backup_freshness
            test_postgres_backup_s3
            test_postgres_restore_to_test_db
            ;;
        redis)
            test_redis_backup_exists
            test_redis_backup_integrity
            test_redis_backup_checksum
            ;;
        s3)
            test_s3_backup_bucket_exists
            test_s3_cross_region_exists
            ;;
        k8s)
            test_k8s_backup_cronjobs
            test_k8s_velero_installed
            test_k8s_backup_pvc
            ;;
        rpo)
            test_rpo_compliance
            test_rpo_compliance_redis
            ;;
        all)
            run_all_tests
            ;;
        help|-h|--help)
            usage
            exit 0
            ;;
        *)
            log "Unknown test: $test_name"
            usage
            exit 1
            ;;
    esac
}

main "$@"
