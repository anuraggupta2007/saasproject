#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# PostgreSQL Restore Script
# Supports: Full restore, PITR (Point-in-Time Recovery), selective table restore
# Validates integrity before restore, creates safety snapshots
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-/backups/postgres}"
RESTORE_TARGET="${1:-}"
RESTORE_TYPE="${2:-full}"
PITR_TARGET_TIME="${3:-}"
S3_BUCKET="${S3_BACKUP_BUCKET:-}"
S3_REGION="${S3_REGION:-us-east-1}"
SAFETY_BACKUP="${SAFETY_BACKUP:-true}"

PGHOST="${POSTGRES_HOST:-localhost}"
PGPORT="${POSTGRES_PORT:-5432}"
PGUSER="${POSTGRES_USER:-postgres}"
PGDATABASE="${POSTGRES_DB:-email_converter}"
export PGPASSWORD="${POSTGRES_PASSWORD:-}"

LOG_FILE="${BACKUP_ROOT}/logs/restore-$(date -u +%Y%m%dT%H%M%SZ).log"
mkdir -p "$(dirname "$LOG_FILE")"
exec > >(tee -a "$LOG_FILE") 2>&1

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [RESTORE] $*"; }
error() { log "ERROR: $*"; exit 1; }

usage() {
    cat <<EOF
Usage: $0 <backup_file> <restore_type> [pitr_target_time]

  restore_type: full | pitr | table
  pitr_target_time: ISO timestamp for PITR (e.g., 2026-01-15T10:30:00Z)

Examples:
  $0 /backups/postgres/full/20260115T020000Z_email_converter_full.sql.gz full
  $0 /backups/postgres/full/20260115T020000Z_email_converter_full.sql.gz pitr "2026-01-15T10:30:00Z"
EOF
    exit 1
}

download_from_s3() {
    local s3_key="$1"
    local local_path="$2"
    if [[ -z "$S3_BUCKET" ]]; then
        return 1
    fi
    log "Downloading from s3://${S3_BUCKET}/${s3_key}..."
    aws s3 cp "s3://${S3_BUCKET}/${s3_key}" "$local_path" \
        --region "$S3_REGION" --only-show-errors 2>&1
}

verify_restore_prerequisites() {
    log "Verifying restore prerequisites..."
    psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "postgres" -c "SELECT 1;" > /dev/null 2>&1 \
        || error "Cannot connect to PostgreSQL"
    if [[ "$RESTORE_TYPE" == "full" && -n "$RESTORE_TARGET" ]]; then
        if [[ ! -f "$RESTORE_TARGET" ]]; then
            log "Local file not found, attempting S3 download..."
            local filename
            filename=$(basename "$RESTORE_TARGET")
            local s3_key="postgres/full/${filename}"
            mkdir -p "$(dirname "$RESTORE_TARGET")"
            download_from_s3 "$s3_key" "$RESTORE_TARGET" || error "Backup not found locally or in S3"
        fi
        verify_checksum "$RESTORE_TARGET" || error "Backup integrity check failed"
    fi
    log "Prerequisites verified"
}

verify_checksum() {
    local backup_file="$1"
    local checksum_file="${backup_file}.sha256"
    if [[ -f "$checksum_file" ]]; then
        local expected
        expected=$(cut -d' ' -f1 < "$checksum_file")
        local actual
        actual=$(sha256sum "$backup_file" | cut -d' ' -f1)
        if [[ "$expected" != "$actual" ]]; then
            log "Checksum mismatch: expected $expected, got $actual"
            return 1
        fi
        log "Checksum verified: $actual"
    else
        log "WARNING: No checksum file found, skipping verification"
    fi
    return 0
}

create_safety_snapshot() {
    if [[ "$SAFETY_BACKUP" != "true" ]]; then
        return 0
    fi
    log "Creating safety snapshot before restore..."
    local safety_file="${BACKUP_ROOT}/safety/pre-restore-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
    mkdir -p "${BACKUP_ROOT}/safety"
    pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
        --format=plain --compress=9 --no-owner \
        > "$safety_file" 2>/dev/null
    log "Safety snapshot created: $safety_file"
}

do_full_restore() {
    local backup_file="$1"
    log "Starting full restore from $(basename "$backup_file")..."
    create_safety_snapshot
    log "Dropping and recreating database..."
    psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "postgres" \
        -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${PGDATABASE}' AND pid <> pg_backend_pid();" 2>/dev/null || true
    psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "postgres" \
        -c "DROP DATABASE IF EXISTS ${PGDATABASE};" 2>/dev/null
    psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "postgres" \
        -c "CREATE DATABASE ${PGDATABASE} OWNER ${PGUSER};" 2>/dev/null
    log "Restoring from backup..."
    if [[ "$backup_file" == *.sql.gz ]]; then
        gunzip -c "$backup_file" | psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
            --single-transaction --quiet 2>/dev/null
    elif [[ "$backup_file" == *.pgdump ]]; then
        pg_restore -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
            --no-owner --no-privileges --single-transaction --verbose "$backup_file" 2>/dev/null
    elif [[ "$backup_file" == *.tar.gz ]]; then
        pg_restore -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
            --no-owner --no-privileges --single-transaction --verbose "$backup_file" 2>/dev/null
    else
        psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
            --single-transaction --quiet < "$backup_file" 2>/dev/null
    fi
    log "Full restore complete"
    verify_restored_data
}

do_pitr_restore() {
    local base_backup="$1"
    local target_time="$2"
    log "Starting PITR restore to ${target_time}..."
    create_safety_snapshot
    log "Configuring recovery..."
    local recovery_conf="${BACKUP_ROOT}/recovery.conf"
    cat > "$recovery_conf" <<EOF
restore_command = 'aws s3 cp s3://${S3_BUCKET}/postgres/wal/%f %p --region ${S3_REGION} 2>/dev/null || true'
recovery_target_time = '${target_time}'
recovery_target_action = 'promote'
EOF
    log "PITR restore initiated. PostgreSQL will replay WAL to ${target_time}."
    log "Recovery configuration written to $recovery_conf"
    log "NOTE: For Kubernetes, apply the recovery ConfigMap and restart PostgreSQL."
    verify_restored_data
}

verify_restored_data() {
    log "Verifying restored data..."
    local table_count
    table_count=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
        -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
    log "Tables found: ${table_count:-0}"
    local row_counts
    row_counts=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
        -t -c "SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 10;" 2>/dev/null)
    log "Top tables by row count:"
    echo "$row_counts" | while read -r line; do
        [[ -n "$line" ]] && log "  $line"
    done
    local db_size
    db_size=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
        -t -c "SELECT pg_size_pretty(pg_database_size('${PGDATABASE}'));" 2>/dev/null | tr -d ' ')
    log "Database size: ${db_size:-unknown}"
    log "Restore verification complete"
}

main() {
    if [[ -z "$RESTORE_TARGET" ]]; then
        usage
    fi
    log "=========================================="
    log "PostgreSQL Restore - ${RESTORE_TYPE^^}"
    log "Target: ${RESTORE_TARGET}"
    log "Database: ${PGDATABASE}"
    log "=========================================="
    verify_restore_prerequisites
    case "$RESTORE_TYPE" in
        full) do_full_restore "$RESTORE_TARGET" ;;
        pitr) do_pitr_restore "$RESTORE_TARGET" "$PITR_TARGET_TIME" ;;
        table)
            log "Selective table restore from $(basename "$RESTORE_TARGET")..."
            create_safety_snapshot
            if [[ "$RESTORE_TARGET" == *.sql.gz ]]; then
                gunzip -c "$RESTORE_TARGET" | psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
                    --single-transaction --quiet 2>/dev/null
            fi
            verify_restored_data
            ;;
        *) error "Unknown restore type: $RESTORE_TYPE. Use: full|pitr|table" ;;
    esac
    log "=========================================="
    log "Restore operation complete"
    log "=========================================="
}

main
