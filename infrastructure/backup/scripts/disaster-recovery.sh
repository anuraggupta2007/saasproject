#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Disaster Recovery Orchestration Script
# Coordinates full system recovery: Database, Redis, S3, Kubernetes
# Supports: Regional failover, corruption recovery, ransomware response
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-/backups}"
DR_MODE="${1:-status}"
DR_REGION="${DR_REGION:-us-east-1}"
DR_SECONDARY_REGION="${DR_SECONDARY_REGION:-us-west-2}"
S3_BUCKET="${S3_BACKUP_BUCKET:-}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
HOSTNAME_SHORT="$(hostname -s 2>/dev/null || echo 'unknown')"
DR_LOG="${BACKUP_ROOT}/dr/dr-${TIMESTAMP}.log"

PGHOST="${POSTGRES_HOST:-localhost}"
PGPORT="${POSTGRES_PORT:-5432}"
PGUSER="${POSTGRES_USER:-postgres}"
PGDATABASE="${POSTGRES_DB:-email_converter}"
export PGPASSWORD="${POSTGRES_PASSWORD:-}"

REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

KUBECONFIG="${KUBECONFIG:-$HOME/.kube/config}"
HELM_RELEASE="${HELM_RELEASE:-email-converter}"
HELM_NAMESPACE="${HELM_NAMESPACE:-email-converter}"

mkdir -p "$(dirname "$DR_LOG")"
exec > >(tee -a "$DR_LOG") 2>&1

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [DR] $*"; }
error() { log "ERROR: $*"; exit 1; }
warn() { log "WARNING: $*"; }

dr_status() {
    log "=========================================="
    log "Disaster Recovery Status Report"
    log "Timestamp: ${TIMESTAMP}"
    log "=========================================="
    log ""
    log "--- Database Status ---"
    if psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT 1;" > /dev/null 2>&1; then
        log "  PostgreSQL: CONNECTED"
        local db_size
        db_size=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
            -t -c "SELECT pg_size_pretty(pg_database_size('${PGDATABASE}'));" 2>/dev/null | tr -d ' ')
        log "  Database size: ${db_size}"
        local last_backup
        last_backup=$(find "${BACKUP_ROOT}/postgres/full" -name "*_full.sql.gz" -type f 2>/dev/null | sort -r | head -1)
        if [[ -n "$last_backup" ]]; then
            local backup_age
            backup_age=$(( ($(date +%s) - $(stat -c%Y "$last_backup" 2>/dev/null || stat -f%m "$last_backup" 2>/dev/null || echo "0")) / 3600 ))
            log "  Last backup: $(basename "$last_backup") (${backup_age}h ago)"
        else
            warn "  No backups found!"
        fi
    else
        warn "  PostgreSQL: DISCONNECTED"
    fi
    log ""
    log "--- Redis Status ---"
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} --no-auth-warning PING > /dev/null 2>&1; then
        log "  Redis: CONNECTED"
        local redis_memory
        redis_memory=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} --no-auth-warning INFO memory 2>/dev/null | grep used_memory_human | cut -d: -f2 | tr -d '\r')
        log "  Memory used: ${redis_memory:-unknown}"
        local last_rdb
        last_rdb=$(find "${BACKUP_ROOT}/redis/rdb" -name "*.rdb.gz" -type f 2>/dev/null | sort -r | head -1)
        if [[ -n "$last_rdb" ]]; then
            local rdb_age
            rdb_age=$(( ($(date +%s) - $(stat -c%Y "$last_rdb" 2>/dev/null || stat -f%m "$last_rdb" 2>/dev/null || echo "0")) / 3600 ))
            log "  Last RDB: $(basename "$last_rdb") (${rdb_age}h ago)"
        else
            warn "  No RDB backups found!"
        fi
    else
        warn "  Redis: DISCONNECTED"
    fi
    log ""
    log "--- S3 Status ---"
    if [[ -n "$S3_BUCKET" ]]; then
        if aws s3 ls "s3://${S3_BUCKET}" --region "$DR_REGION" > /dev/null 2>&1; then
            log "  Primary S3: ACCESSIBLE"
        else
            warn "  Primary S3: INACCESSIBLE"
        fi
        if aws s3 ls "s3://${S3_BUCKET}-backup" --region "$DR_REGION" > /dev/null 2>&1; then
            local backup_count
            backup_count=$(aws s3 ls "s3://${S3_BUCKET}-backup/" --recursive --region "$DR_REGION" 2>/dev/null | wc -l)
            log "  Backup S3: ACCESSIBLE (~${backup_count} objects)"
        else
            warn "  Backup S3: INACCESSIBLE"
        fi
    fi
    log ""
    log "--- Kubernetes Status ---"
    if command -v kubectl &>/dev/null; then
        local ready_pods
        ready_pods=$(kubectl get pods -n "$HELM_NAMESPACE" --field-selector=status.phase=Running -o name 2>/dev/null | wc -l)
        local total_pods
        total_pods=$(kubectl get pods -n "$HELM_NAMESPACE" -o name 2>/dev/null | wc -l)
        log "  Pods: ${ready_pods}/${total_pods} Running"
        if command -v helm &>/dev/null; then
            local helm_status
            helm_status=$(helm status "$HELM_RELEASE" -n "$HELM_NAMESPACE" -o json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('info',{}).get('status','unknown'))" 2>/dev/null || echo "unknown")
            log "  Helm release: ${helm_status}"
        fi
    else
        warn "  kubectl not available"
    fi
    log ""
    log "--- Backup Inventory ---"
    local pg_full_count
    pg_full_count=$(find "${BACKUP_ROOT}/postgres/full" -name "*.sql.gz" 2>/dev/null | wc -l)
    local pg_incr_count
    pg_incr_count=$(find "${BACKUP_ROOT}/postgres/incremental" -name "*.tar.gz" 2>/dev/null | wc -l)
    local redis_rdb_count
    redis_rdb_count=$(find "${BACKUP_ROOT}/redis/rdb" -name "*.rdb.gz" 2>/dev/null | wc -l)
    local redis_aof_count
    redis_aof_count=$(find "${BACKUP_ROOT}/redis/aof" -name "*.aof.gz" 2>/dev/null | wc -l)
    log "  PostgreSQL full backups: ${pg_full_count}"
    log "  PostgreSQL incremental: ${pg_incr_count}"
    log "  Redis RDB backups: ${redis_rdb_count}"
    log "  Redis AOF backups: ${redis_aof_count}"
    log ""
    log "--- DR Readiness ---"
    local rpo_met=false
    local rto_met=false
    if [[ "$pg_full_count" -gt 0 ]]; then
        local latest_backup_ts
        latest_backup_ts=$(stat -c%Y "$(find "${BACKUP_ROOT}/postgres/full" -name "*.sql.gz" -type f | sort -r | head -1)" 2>/dev/null || stat -f%m "$(find "${BACKUP_ROOT}/postgres/full" -name "*.sql.gz" -type f | sort -r | head -1)" 2>/dev/null || echo "0")
        local rpo_minutes=$(( ($(date +%s) - latest_backup_ts) / 60 ))
        if [[ $rpo_minutes -le 15 ]]; then
            rpo_met=true
            log "  RPO (<15min): MET (${rpo_minutes}min since last backup)"
        else
            warn "  RPO (<15min): NOT MET (${rpo_minutes}min since last backup)"
        fi
    else
        warn "  RPO (<15min): NOT MET (no backups)"
    fi
    log "  RTO (<1hr): Manual verification required"
    log "=========================================="
}

recover_database() {
    local recovery_type="${1:-full}"
    log "=========================================="
    log "Database Recovery - Type: ${recovery_type}"
    log "=========================================="
    case "$recovery_type" in
        full)
            local latest_backup
            latest_backup=$(find "${BACKUP_ROOT}/postgres/full" -name "*_full.sql.gz" -type f 2>/dev/null | sort -r | head -1)
            if [[ -z "$latest_backup" ]]; then
                error "No full backup available for recovery"
            fi
            log "Restoring from: $(basename "$latest_backup")"
            bash "${SCRIPT_DIR}/postgres-restore.sh" "$latest_backup" full
            ;;
        pitr)
            local target_time="${2:-}"
            if [[ -z "$target_time" ]]; then
                error "PITR requires target time. Usage: $0 recover-db pitr 2026-01-15T10:30:00Z"
            fi
            local latest_backup
            latest_backup=$(find "${BACKUP_ROOT}/postgres/full" -name "*_full.sql.gz" -type f 2>/dev/null | sort -r | head -1)
            if [[ -z "$latest_backup" ]]; then
                error "No full backup available for PITR base"
            fi
            log "Performing PITR to ${target_time}..."
            bash "${SCRIPT_DIR}/postgres-restore.sh" "$latest_backup" pitr "$target_time"
            ;;
        s3)
            if [[ -z "$S3_BUCKET" ]]; then
                error "S3_BACKUP_BUCKET not set"
            fi
            log "Downloading latest backup from S3..."
            local s3_key
            s3_key=$(aws s3 ls "s3://${S3_BUCKET}-backup/postgres/full/${HOSTNAME_SHORT}/" \
                --region "$DR_REGION" 2>/dev/null | sort -r | head -1 | awk '{print $4}')
            if [[ -z "$s3_key" ]]; then
                error "No backup found in S3"
            fi
            local local_backup="${BACKUP_ROOT}/postgres/full/${s3_key}"
            mkdir -p "${BACKUP_ROOT}/postgres/full"
            aws s3 cp "s3://${S3_BUCKET}-backup/postgres/full/${HOSTNAME_SHORT}/${s3_key}" \
                "$local_backup" --region "$DR_REGION" 2>&1
            bash "${SCRIPT_DIR}/postgres-restore.sh" "$local_backup" full
            ;;
        cross-region)
            log "Initiating cross-region recovery from ${DR_SECONDARY_REGION}..."
            local secondary_bucket="${S3_BUCKET}-dr"
            local s3_key
            s3_key=$(aws s3 ls "s3://${secondary_bucket}/postgres/full/${HOSTNAME_SHORT}/" \
                --region "$DR_SECONDARY_REGION" 2>/dev/null | sort -r | head -1 | awk '{print $4}')
            if [[ -z "$s3_key" ]]; then
                error "No backup found in secondary region"
            fi
            local local_backup="${BACKUP_ROOT}/postgres/full/${s3_key}"
            mkdir -p "${BACKUP_ROOT}/postgres/full"
            aws s3 cp "s3://${secondary_bucket}/postgres/full/${HOSTNAME_SHORT}/${s3_key}" \
                "$local_backup" --region "$DR_SECONDARY_REGION" 2>&1
            bash "${SCRIPT_DIR}/postgres-restore.sh" "$local_backup" full
            ;;
        *)
            error "Unknown recovery type: $recovery_type. Use: full|pitr|s3|cross-region"
            ;;
    esac
    log "Database recovery complete"
}

recover_redis() {
    local recovery_type="${1:-rdb}"
    log "=========================================="
    log "Redis Recovery - Type: ${recovery_type}"
    log "=========================================="
    bash "${SCRIPT_DIR}/redis-restore.sh" "$recovery_type" "${2:-}"
    log "Redis recovery complete"
}

recover_s3() {
    local source="${1:-cross-region}"
    log "=========================================="
    log "S3 Recovery - Source: ${source}"
    log "=========================================="
    local buckets=(
        "email-converter-uploads"
        "email-converter-converted"
        "email-converter-attachments"
        "email-converter-licenses"
        "email-converter-reports"
    )
    case "$source" in
        cross-region)
            for bucket in "${buckets[@]}"; do
                log "Syncing ${bucket} from secondary region..."
                aws s3 sync "s3://${S3_BUCKET}-dr/${bucket}" "s3://${bucket}" \
                    --source-region "$DR_SECONDARY_REGION" \
                    --region "$DR_REGION" \
                    --only-show-errors 2>&1 || warn "Failed to sync ${bucket}"
            done
            ;;
        backup)
            for bucket in "${buckets[@]}"; do
                log "Restoring ${bucket} from backup bucket..."
                aws s3 sync "s3://${S3_BUCKET}-backup/${bucket}" "s3://${bucket}" \
                    --region "$DR_REGION" \
                    --only-show-errors 2>&1 || warn "Failed to restore ${bucket}"
            done
            ;;
        *)
            error "Unknown S3 recovery source: $source. Use: cross-region|backup"
            ;;
    esac
    log "S3 recovery complete"
}

recover_kubernetes() {
    local recovery_type="${1:-full}"
    log "=========================================="
    log "Kubernetes Recovery - Type: ${recovery_type}"
    log "=========================================="
    if ! command -v kubectl &>/dev/null; then
        error "kubectl not available"
    fi
    case "$recovery_type" in
        full)
            log "Performing full Kubernetes recovery..."
            if command -v velero &>/dev/null; then
                log "Using Velero for full restore..."
                velero restore create --from-backup "backup-$(date -u +%Y%m%d)" \
                    --namespace-mappings "${HELM_NAMESPACE}:${HELM_NAMESPACE}" 2>&1 || warn "Velero restore failed"
            else
                log "Velero not available, using Helm-based recovery..."
                if command -v helm &>/dev/null; then
                    helm upgrade --install "$HELM_RELEASE" "${SCRIPT_DIR}/../../k8s/helm/email-converter" \
                        --namespace "$HELM_NAMESPACE" \
                        --values "${SCRIPT_DIR}/../../k8s/helm/email-converter/values-prod.yaml" \
                        --wait --timeout 30m 2>&1 || warn "Helm upgrade failed"
                fi
            fi
            ;;
        secrets)
            log "Recovering Kubernetes secrets..."
            local backup_dir="${BACKUP_ROOT}/kubernetes/secrets"
            if [[ -d "$backup_dir" ]]; then
                for secret_file in "${backup_dir}"/*.yaml; do
                    [[ -f "$secret_file" ]] || continue
                    kubectl apply -f "$secret_file" -n "$HELM_NAMESPACE" 2>&1 || warn "Failed to apply $(basename "$secret_file")"
                done
            fi
            ;;
        pv)
            log "Recovering persistent volumes..."
            local backup_dir="${BACKUP_ROOT}/kubernetes/volumes"
            if [[ -d "$backup_dir" ]]; then
                for pv_file in "${backup_dir}"/*.yaml; do
                    [[ -f "$pv_file" ]] || continue
                    kubectl apply -f "$pv_file" 2>&1 || warn "Failed to apply $(basename "$pv_file")"
                done
            fi
            ;;
        *)
            error "Unknown K8s recovery type: $recovery_type. Use: full|secrets|pv"
            ;;
    esac
    log "Kubernetes recovery complete"
}

failover_region() {
    log "=========================================="
    log "Regional Failover Initiated"
    log "Target region: ${DR_SECONDARY_REGION}"
    log "=========================================="
    log ""
    log "This operation will:"
    log "1. Verify backup availability in secondary region"
    log "2. Promote secondary RDS read replica (if applicable)"
    log "3. Update DNS to point to secondary region"
    log "4. Activate services in secondary region"
    log ""
    read -p "Are you sure you want to proceed? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
        log "Failover cancelled"
        return 0
    fi
    log "Step 1: Verifying secondary region backups..."
    if [[ -n "$S3_BUCKET" ]]; then
        local secondary_bucket="${S3_BUCKET}-dr"
        if aws s3 ls "s3://${secondary_bucket}/" --region "$DR_SECONDARY_REGION" > /dev/null 2>&1; then
            local object_count
            object_count=$(aws s3 ls "s3://${secondary_bucket}/" --recursive --region "$DR_SECONDARY_REGION" 2>/dev/null | wc -l)
            log "  Secondary region S3: ~${object_count} objects available"
        else
            error "  Secondary region S3 not accessible!"
        fi
    fi
    log "Step 2: RDS replica promotion..."
    log "  NOTE: Manual intervention may be required for RDS replica promotion"
    log "  Run: aws rds promote-read-replica --db-instance-identifier <replica-id> --region ${DR_SECONDARY_REGION}"
    log "Step 3: DNS failover..."
    log "  Route53 health checks should automatically failover if configured"
    log "  Manual: aws route53 change-resource-record-sets --hosted-zone-id <zone> --change-batch file://failover.json"
    log "Step 4: Services activation..."
    if command -v helm &>/dev/null; then
        helm upgrade --install "$HELM_RELEASE" "${SCRIPT_DIR}/../../k8s/helm/email-converter" \
            --namespace "$HELM_NAMESPACE" \
            --values "${SCRIPT_DIR}/../../k8s/helm/email-converter/values-prod.yaml" \
            --set "global.region=${DR_SECONDARY_REGION}" \
            --wait --timeout 30m 2>&1 || warn "Helm activation failed"
    fi
    log "=========================================="
    log "Regional failover initiated"
    log "Monitor services and verify functionality"
    log "=========================================="
}

ransomware_response() {
    log "=========================================="
    log "RANSOMWARE RESPONSE PROCEDURE"
    log "=========================================="
    log ""
    log "CRITICAL: Follow these steps immediately:"
    log ""
    log "Phase 1: Containment (0-15 minutes)"
    log "  1. Isolate affected systems"
    log "  2. Disable compromised accounts"
    log "  3. Block suspicious IPs"
    log "  4. Preserve forensic evidence"
    log ""
    log "Phase 2: Assessment (15-60 minutes)"
    log "  1. Identify scope of encryption"
    log "  2. Determine entry point"
    log "  3. Check for data exfiltration"
    log "  4. Identify affected backups"
    log ""
    log "Phase 3: Recovery (1-4 hours)"
    log "  1. Restore from clean backups (verify checksums!)"
    log "  2. Rotate all credentials"
    log "  3. Patch vulnerabilities"
    log "  4. Rebuild affected systems"
    log ""
    log "Phase 4: Validation (4-8 hours)"
    log "  1. Verify data integrity"
    log "  2. Test all services"
    log "  3. Monitor for reinfection"
    log "  4. Update security policies"
    log ""
    log "Executing recovery from pre-infection backup..."
    local latest_backup
    latest_backup=$(find "${BACKUP_ROOT}/postgres/full" -name "*_full.sql.gz" -type f 2>/dev/null | sort -r | head -2 | tail -1)
    if [[ -n "$latest_backup" ]]; then
        log "Using backup: $(basename "$latest_backup")"
        log "IMPORTANT: Verify this backup predates the infection!"
        read -p "Confirm backup is clean (yes/no): " confirm
        if [[ "$confirm" == "yes" ]]; then
            bash "${SCRIPT_DIR}/postgres-restore.sh" "$latest_backup" full
        fi
    fi
    log "=========================================="
    log "Ransomware response initiated"
    log "=========================================="
}

usage() {
    cat <<EOF
Usage: $0 <command> [args...]

Commands:
  status                              Show DR status and readiness
  recover-db <type> [target]          Recover PostgreSQL database
    full                              Full restore from latest backup
    pitr <timestamp>                  Point-in-time recovery
    s3                                Restore from S3 backup
    cross-region                      Restore from secondary region
  recover-redis <type> [file]         Recover Redis
    rdb [file]                        Restore from RDB snapshot
    aof [file]                        Restore from AOF
  recover-s3 <source>                 Recover S3/MinIO
    cross-region                      Sync from secondary region
    backup                            Restore from backup bucket
  recover-k8s <type>                  Recover Kubernetes
    full                              Full cluster recovery
    secrets                           Recover secrets only
    pv                                Recover persistent volumes
  failover                            Regional failover
  ransomware                          Ransomware response procedure
  backup-now                          Trigger immediate backup of all systems

Examples:
  $0 status
  $0 recover-db full
  $0 recover-db pitr "2026-01-15T10:30:00Z"
  $0 recover-redis rdb
  $0 recover-s3 cross-region
  $0 failover
  $0 ransomware
  $0 backup-now
EOF
}

trigger_full_backup() {
    log "Triggering immediate full backup of all systems..."
    log "--- PostgreSQL ---"
    bash "${SCRIPT_DIR}/postgres-backup.sh" full manual 2>&1 || warn "PostgreSQL backup failed"
    log "--- Redis ---"
    bash "${SCRIPT_DIR}/redis-backup.sh" full 2>&1 || warn "Redis backup failed"
    log "--- S3 ---"
    bash "${SCRIPT_DIR}/s3-backup.sh" sync 2>&1 || warn "S3 backup failed"
    log "--- Verification ---"
    bash "${SCRIPT_DIR}/verify-backup.sh" all 2>&1 || warn "Verification failed"
    log "Full backup triggered"
}

main() {
    if [[ $# -eq 0 ]]; then
        usage
        exit 1
    fi
    local command="$1"
    shift
    case "$command" in
        status)         dr_status ;;
        recover-db)     recover_database "$@" ;;
        recover-redis)  recover_redis "$@" ;;
        recover-s3)     recover_s3 "$@" ;;
        recover-k8s)    recover_kubernetes "$@" ;;
        failover)       failover_region ;;
        ransomware)     ransomware_response ;;
        backup-now)     trigger_full_backup ;;
        help|-h|--help) usage ;;
        *)              error "Unknown command: $command. Run '$0 help' for usage." ;;
    esac
}

main "$@"
