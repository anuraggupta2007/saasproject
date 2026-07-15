#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Redis Restore Script
# Supports: RDB restore, AOF restore, config restore
# Creates safety snapshot before restore
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-/backups/redis}"
S3_BUCKET="${S3_BACKUP_BUCKET:-}"
S3_REGION="${S3_REGION:-us-east-1}"
RESTORE_TYPE="${1:-rdb}"
RESTORE_TARGET="${2:-}"

REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

LOG_FILE="${BACKUP_ROOT}/logs/restore-$(date -u +%Y%m%dT%H%M%SZ).log"
mkdir -p "$(dirname "$LOG_FILE")"
exec > >(tee -a "$LOG_FILE") 2>&1

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [REDIS-RESTORE] $*"; }
error() { log "ERROR: $*"; exit 1; }

redis_cmd() {
    local cmd="$1"
    shift
    if [[ -n "$REDIS_PASSWORD" ]]; then
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --no-auth-warning "$cmd" "$@"
    else
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" "$cmd" "$@"
    fi
}

create_safety_snapshot() {
    log "Creating safety snapshot before restore..."
    local safety_dir="${BACKUP_ROOT}/safety"
    mkdir -p "$safety_dir"
    local timestamp
    timestamp=$(date -u +%Y%m%dT%H%M%SZ)
    redis_cmd BGSAVE
    sleep 5
    local rdb_path
    rdb_path=$(redis_cmd CONFIG GET dir 2>/dev/null | tail -1)
    local rdb_filename
    rdb_filename=$(redis_cmd CONFIG GET dbfilename 2>/dev/null | tail -1)
    if [[ -f "${rdb_path}/${rdb_filename}" ]]; then
        cp "${rdb_path}/${rdb_filename}" "${safety_dir}/${timestamp}_pre_restore.rdb"
        log "Safety snapshot created"
    fi
}

restore_rdb() {
    local rdb_file="$1"
    log "Restoring RDB from $(basename "$rdb_file")..."
    create_safety_snapshot
    if [[ "$rdb_file" == *.gz ]]; then
        local temp_rdb="/tmp/redis_restore_$(date +%s).rdb"
        gunzip -c "$rdb_file" > "$temp_rdb"
        rdb_file="$temp_rdb"
    fi
    local rdb_dir
    rdb_dir=$(redis_cmd CONFIG GET dir 2>/dev/null | tail -1)
    local rdb_filename
    rdb_filename=$(redis_cmd CONFIG GET dbfilename 2>/dev/null | tail -1)
    log "Stopping Redis AOF if enabled..."
    redis_cmd CONFIG SET appendonly no 2>/dev/null || true
    sleep 2
    redis_cmd SHUTDOWN NOSAVE 2>/dev/null || true
    sleep 3
    cp "$rdb_file" "${rdb_dir}/${rdb_filename}"
    log "RDB file placed at ${rdb_dir}/${rdb_filename}"
    log "Please restart Redis to complete the restore."
    log "After restart, run: redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} DBSIZE"
}

restore_aof() {
    local aof_file="$1"
    log "Restoring AOF from $(basename "$aof_file")..."
    create_safety_snapshot
    if [[ "$aof_file" == *.gz ]]; then
        local temp_aof="/tmp/redis_restore_$(date +%s).aof"
        gunzip -c "$aof_file" > "$temp_aof"
        aof_file="$temp_aof"
    fi
    local aof_dir
    aof_dir=$(redis_cmd CONFIG GET dir 2>/dev/null | tail -1)
    local aof_filename
    aof_filename=$(redis_cmd CONFIG GET appendfilename 2>/dev/null | tail -1)
    log "Stopping Redis..."
    redis_cmd SHUTDOWN NOSAVE 2>/dev/null || true
    sleep 3
    cp "$aof_file" "${aof_dir}/${aof_filename}"
    redis_cmd CONFIG SET appendonly yes 2>/dev/null || true
    log "AOF file placed at ${aof_dir}/${aof_filename}"
    log "Please restart Redis with: --appendonly yes"
}

restore_config() {
    local config_file="$1"
    log "Restoring Redis configuration from $(basename "$config_file")..."
    log "Configuration values:"
    cat "$config_file"
    log ""
    log "To apply these settings, update your redis.conf and restart Redis."
    log "Or use redis-cli to set individual config values."
}

main() {
    if [[ -z "$RESTORE_TARGET" ]]; then
        cat <<EOF
Usage: $0 <restore_type> <backup_file>

  restore_type: rdb | aof | config

Examples:
  $0 rdb /backups/redis/rdb/20260115T020000Z_dump.rdb.gz
  $0 aof /backups/redis/aof/20260115T020000Z_appendonly.aof.gz
  $0 config /backups/redis/config/20260115T020000Z_redis_config.conf
EOF
        exit 1
    fi
    log "=========================================="
    log "Redis Restore - ${RESTORE_TYPE^^}"
    log "Target: ${RESTORE_TARGET}"
    log "=========================================="
    if [[ ! -f "$RESTORE_TARGET" ]]; then
        log "Local file not found, attempting S3 download..."
        if [[ -n "$S3_BUCKET" ]]; then
            local filename
            filename=$(basename "$RESTORE_TARGET")
            local s3_key="redis/${RESTORE_TYPE}/${filename}"
            mkdir -p "$(dirname "$RESTORE_TARGET")"
            aws s3 cp "s3://${S3_BUCKET}/${s3_key}" "$RESTORE_TARGET" \
                --region "$S3_REGION" --only-show-errors 2>&1 || error "Backup not found"
        else
            error "Backup file not found: $RESTORE_TARGET"
        fi
    fi
    case "$RESTORE_TYPE" in
        rdb)    restore_rdb "$RESTORE_TARGET" ;;
        aof)    restore_aof "$RESTORE_TARGET" ;;
        config) restore_config "$RESTORE_TARGET" ;;
        *)      error "Unknown restore type: $RESTORE_TYPE. Use: rdb|aof|config" ;;
    esac
    log "=========================================="
    log "Restore operation complete"
    log "=========================================="
}

main
