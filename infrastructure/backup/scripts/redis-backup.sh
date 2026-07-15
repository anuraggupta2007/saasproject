#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Redis Backup Script
# Supports: RDB snapshot, AOF backup, cross-region upload, integrity check
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-/backups/redis}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
S3_BUCKET="${S3_BACKUP_BUCKET:-}"
S3_REGION="${S3_REGION:-us-east-1}"
CROSS_REGION_BUCKET="${CROSS_REGION_BUCKET:-}"
PROMETHEUS_PUSHGATEWAY="${PROMETHEUS_PUSHGATEWAY:-prometheus-pushgateway:9091}"
BACKUP_TYPE="${1:-rdb}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
HOSTNAME_SHORT="$(hostname -s 2>/dev/null || echo 'unknown')"

REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

LOG_FILE="${BACKUP_ROOT}/logs/backup-${TIMESTAMP}.log"
mkdir -p "$(dirname "$LOG_FILE")"
exec > >(tee -a "$LOG_FILE") 2>&1

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [REDIS] $*"; }
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

push_metrics() {
    local status="$1"
    local duration="${2:-0}"
    local size="${3:-0}"
    if command -v curl &>/dev/null && [[ -n "$PROMETHEUS_PUSHGATEWAY" ]]; then
        cat <<EOF | curl -s --data-binary @- "http://${PROMETHEUS_PUSHGATEWAY}/metrics/job/redis_backup/host/${HOSTNAME_SHORT}" 2>/dev/null || true
# HELP redis_backup_last_success_timestamp Timestamp of last successful backup
# TYPE redis_backup_last_success_timestamp gauge
redis_backup_last_success_timestamp{host="${HOSTNAME_SHORT}",type="${BACKUP_TYPE}"} $(date +%s)
# HELP redis_backup_duration_seconds Backup duration in seconds
# TYPE redis_backup_duration_seconds gauge
redis_backup_duration_seconds{host="${HOSTNAME_SHORT}",type="${BACKUP_TYPE}"} ${duration}
# HELP redis_backup_size_bytes Backup file size in bytes
# TYPE redis_backup_size_bytes gauge
redis_backup_size_bytes{host="${HOSTNAME_SHORT}",type="${BACKUP_TYPE}"} ${size}
# HELP redis_backup_status Backup status (1=success, 0=failure)
# TYPE redis_backup_status gauge
redis_backup_status{host="${HOSTNAME_SHORT}",type="${BACKUP_TYPE}"} $([[ "$status" == "success" ]] && echo 1 || echo 0)
EOF
    fi
}

backup_rdb() {
    local backup_dir="${BACKUP_ROOT}/rdb"
    mkdir -p "$backup_dir"
    local backup_file="${backup_dir}/${TIMESTAMP}_dump.rdb"
    log "Starting RDB backup..."
    local start_time
    start_time=$(date +%s)
    redis_cmd BGSAVE
    local max_wait=300
    local waited=0
    while [[ $waited -lt $max_wait ]]; do
        local bg_status
        bg_status=$(redis_cmd LASTSAVE 2>/dev/null || echo "")
        sleep 2
        waited=$((waited + 2))
        local current_save
        current_save=$(redis_cmd LASTSAVE 2>/dev/null || echo "")
        if [[ "$current_save" != "$bg_status" ]] || [[ $waited -ge 10 ]]; then
            break
        fi
    done
    redis_cmd CLIENT LIST > /dev/null 2>&1 || error "Redis connection lost during backup"
    local rdb_path
    rdb_path=$(redis_cmd CONFIG GET dir 2>/dev/null | tail -1)
    local rdb_filename
    rdb_filename=$(redis_cmd CONFIG GET dbfilename 2>/dev/null | tail -1)
    if [[ -f "${rdb_path}/${rdb_filename}" ]]; then
        cp "${rdb_path}/${rdb_filename}" "$backup_file"
    else
        error "RDB file not found at ${rdb_path}/${rdb_filename}"
    fi
    gzip -9 "$backup_file"
    backup_file="${backup_file}.gz"
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    local file_size
    file_size=$(stat -c%s "$backup_file" 2>/dev/null || stat -f%z "$backup_file" 2>/dev/null || echo 0)
    log "RDB backup completed: ${file_size} bytes in ${duration}s"
    sha256sum "$backup_file" > "${backup_file}.sha256"
    local s3_key="redis/rdb/${HOSTNAME_SHORT}/${TIMESTAMP}_dump.rdb.gz"
    if [[ -n "$S3_BUCKET" ]]; then
        aws s3 cp "$backup_file" "s3://${S3_BUCKET}/${s3_key}" \
            --region "$S3_REGION" --storage-class STANDARD_IA --only-show-errors 2>&1 || log "WARNING: S3 upload failed"
        aws s3 cp "${backup_file}.sha256" "s3://${S3_BUCKET}/${s3_key}.sha256" \
            --region "$S3_REGION" --only-show-errors 2>/dev/null || true
    fi
    if [[ -n "$CROSS_REGION_BUCKET" ]]; then
        aws s3 cp "$backup_file" "s3://${CROSS_REGION_BUCKET}/${s3_key}" \
            --region "${CROSS_REGION_SECONDARY:-us-west-2}" --storage-class STANDARD_IA --only-show-errors 2>&1 || true
    fi
    push_metrics "success" "$duration" "$file_size"
    log "RDB backup complete: $backup_file"
}

backup_aof() {
    local backup_dir="${BACKUP_ROOT}/aof"
    mkdir -p "$backup_dir"
    local backup_file="${backup_dir}/${TIMESTAMP}_appendonly.aof.gz"
    log "Starting AOF backup..."
    local start_time
    start_time=$(date +%s)
    local aof_enabled
    aof_enabled=$(redis_cmd CONFIG GET appendonly 2>/dev/null | tail -1)
    if [[ "$aof_enabled" != "yes" ]]; then
        log "AOF not enabled, triggering RDB instead"
        backup_rdb
        return
    fi
    redis_cmd BGREWRITEAOF 2>/dev/null || true
    sleep 5
    local aof_path
    aof_path=$(redis_cmd CONFIG GET appendfilename 2>/dev/null | tail -1)
    local aof_dir
    aof_dir=$(redis_cmd CONFIG GET dir 2>/dev/null | tail -1)
    local full_aof_path="${aof_dir}/${aof_path}"
    if [[ ! -f "$full_aof_path" ]]; then
        log "AOF file not found at $full_aof_path, falling back to RDB"
        backup_rdb
        return
    fi
    gzip -9 -c "$full_aof_path" > "$backup_file"
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    local file_size
    file_size=$(stat -c%s "$backup_file" 2>/dev/null || stat -f%z "$backup_file" 2>/dev/null || echo 0)
    log "AOF backup completed: ${file_size} bytes in ${duration}s"
    sha256sum "$backup_file" > "${backup_file}.sha256"
    local s3_key="redis/aof/${HOSTNAME_SHORT}/${TIMESTAMP}_appendonly.aof.gz"
    if [[ -n "$S3_BUCKET" ]]; then
        aws s3 cp "$backup_file" "s3://${S3_BUCKET}/${s3_key}" \
            --region "$S3_REGION" --storage-class STANDARD_IA --only-show-errors 2>&1 || log "WARNING: S3 upload failed"
    fi
    push_metrics "success" "$duration" "$file_size"
    log "AOF backup complete: $backup_file"
}

backup_config() {
    local backup_dir="${BACKUP_ROOT}/config"
    mkdir -p "$backup_dir"
    local backup_file="${backup_dir}/${TIMESTAMP}_redis_config.conf"
    log "Exporting Redis configuration..."
    redis_cmd CONFIG GET "*" > "$backup_file" 2>/dev/null
    local info_file="${backup_dir}/${TIMESTAMP}_redis_info.txt"
    redis_cmd INFO all > "$info_file" 2>/dev/null
    local keyspace_file="${backup_dir}/${TIMESTAMP}_keyspace.txt"
    redis_cmd DBSIZE > "$keyspace_file" 2>/dev/null
    redis_cmd INFO keyspace >> "$keyspace_file" 2>/dev/null
    log "Redis config exported to $backup_dir"
}

rotate_backups() {
    log "Rotating Redis backups older than ${BACKUP_RETENTION_DAYS} days..."
    find "${BACKUP_ROOT}/rdb" -name "*.rdb.gz" -mtime "+${BACKUP_RETENTION_DAYS}" -delete 2>/dev/null || true
    find "${BACKUP_ROOT}/aof" -name "*.aof.gz" -mtime "+${BACKUP_RETENTION_DAYS}" -delete 2>/dev/null || true
    find "${BACKUP_ROOT}/logs" -name "*.log" -mtime "+${BACKUP_RETENTION_DAYS}" -delete 2>/dev/null || true
    find "${BACKUP_ROOT}/config" -name "*.conf" -mtime "+${BACKUP_RETENTION_DAYS}" -delete 2>/dev/null || true
    find "${BACKUP_ROOT}/config" -name "*.txt" -mtime "+${BACKUP_RETENTION_DAYS}" -delete 2>/dev/null || true
    log "Rotation complete"
}

main() {
    log "=========================================="
    log "Redis Backup - ${BACKUP_TYPE^^}"
    log "Host: ${REDIS_HOST}:${REDIS_PORT}"
    log "=========================================="
    redis_cmd PING > /dev/null 2>&1 || error "Cannot connect to Redis"
    log "Redis connection verified"
    local info
    info=$(redis_cmd INFO server 2>/dev/null | grep redis_version | cut -d: -f2 | tr -d '\r')
    log "Redis version: ${info}"
    case "$BACKUP_TYPE" in
        rdb)      backup_rdb ;;
        aof)      backup_aof ;;
        config)   backup_config ;;
        full)     backup_rdb; backup_aof; backup_config ;;
        rotate)   rotate_backups ;;
        *)        error "Unknown backup type: $BACKUP_TYPE. Use: rdb|aof|config|full|rotate" ;;
    esac
    log "=========================================="
    log "Backup operation complete"
    log "=========================================="
}

main
