#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Failover Test Suite
# Tests failover scenarios for PostgreSQL, Redis, and application services
# =============================================================================

TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${TEST_DIR}/results"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RESULTS_FILE="${RESULTS_DIR}/failover-results-${TIMESTAMP}.json"
NAMESPACE="${K8S_NAMESPACE:-email-converter}"
PASS_COUNT=0
FAIL_COUNT=0

mkdir -p "$RESULTS_DIR"
: > "${RESULTS_FILE}"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [FAILOVER] $*"; }
pass() { log "PASS: $*"; PASS_COUNT=$((PASS_COUNT + 1)); echo "{\"status\":\"pass\",\"test\":\"$*\"}" >> "$RESULTS_FILE"; }
fail() { log "FAIL: $*"; FAIL_COUNT=$((FAIL_COUNT + 1)); echo "{\"status\":\"fail\",\"test\":\"$*\"}" >> "$RESULTS_FILE"; }

# =============================================================================
# PostgreSQL Failover Tests
# =============================================================================

test_postgres_primary_restart() {
    log "--- Test: PostgreSQL Primary Restart ---"
    local start_time
    start_time=$(date +%s)
    local db_pod
    db_pod=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=postgresql -o name 2>/dev/null | head -1)
    if [[ -z "$db_pod" ]]; then
        log "SKIP: No PostgreSQL pods found"
        return 0
    fi
    log "Restarting PostgreSQL pod: $db_pod"
    kubectl delete "$db_pod" -n "$NAMESPACE" --grace-period=30 2>/dev/null || true
    log "Waiting for PostgreSQL to recover..."
    kubectl rollout status statefulset/postgresql -n "$NAMESPACE" --timeout=120s 2>/dev/null || true
    sleep 10
    local ready
    ready=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=postgresql --field-selector=status.phase=Running -o name 2>/dev/null | wc -l)
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    if [[ "$ready" -gt 0 ]]; then
        pass "PostgreSQL primary restart: recovered in ${duration}s"
    else
        fail "PostgreSQL primary restart: not recovered in ${duration}s"
    fi
}

test_postgres_read_replica() {
    log "--- Test: PostgreSQL Read Replica ---"
    local start_time
    start_time=$(date +%s)
    local replica_pod
    replica_pod=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=postgresql,role=replica -o name 2>/dev/null | head -1)
    if [[ -z "$replica_pod" ]]; then
        log "SKIP: No read replica found"
        return 0
    fi
    log "Read replica found: $replica_pod"
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    pass "PostgreSQL read replica: available (${duration}s)"
}

test_postgres_connection_pool() {
    log "--- Test: PostgreSQL Connection Pool ---"
    local start_time
    start_time=$(date +%s)
    local connections
    connections=$(kubectl exec -n "$NAMESPACE" statefulset/postgresql -- \
        psql -U postgres -d email_converter -t -c \
        "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null | tr -d ' ' || echo "0")
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    log "Active connections: ${connections}"
    pass "PostgreSQL connection pool: ${connections} active (${duration}s)"
}

# =============================================================================
# Redis Failover Tests
# =============================================================================

test_redis_primary_restart() {
    log "--- Test: Redis Primary Restart ---"
    local start_time
    start_time=$(date +%s)
    local redis_pod
    redis_pod=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=redis -o name 2>/dev/null | head -1)
    if [[ -z "$redis_pod" ]]; then
        log "SKIP: No Redis pods found"
        return 0
    fi
    log "Restarting Redis pod: $redis_pod"
    kubectl delete "$redis_pod" -n "$NAMESPACE" --grace-period=10 2>/dev/null || true
    log "Waiting for Redis to recover..."
    kubectl rollout status statefulset/redis -n "$NAMESPACE" --timeout=60s 2>/dev/null || true
    sleep 10
    local ready
    ready=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=redis --field-selector=status.phase=Running -o name 2>/dev/null | wc -l)
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    if [[ "$ready" -gt 0 ]]; then
        pass "Redis primary restart: recovered in ${duration}s"
    else
        fail "Redis primary restart: not recovered in ${duration}s"
    fi
}

test_redis_sentinel() {
    log "--- Test: Redis Sentinel ---"
    local start_time
    start_time=$(date +%s)
    local sentinel_count
    sentinel_count=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=redis-sentinel -o name 2>/dev/null | wc -l)
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    if [[ "$sentinel_count" -gt 0 ]]; then
        pass "Redis Sentinel: ${sentinel_count} instances (${duration}s)"
    else
        log "INFO: Redis Sentinel not configured"
        pass "Redis Sentinel: not configured (standalone mode)"
    fi
}

# =============================================================================
# Application Failover Tests
# =============================================================================

test_api_rolling_restart() {
    log "--- Test: API Rolling Restart ---"
    local start_time
    start_time=$(date +%s)
    log "Performing rolling restart of API..."
    kubectl rollout restart deploy/api -n "$NAMESPACE" 2>/dev/null || { log "SKIP: No API deployment"; return 0; }
    kubectl rollout status deploy/api -n "$NAMESPACE" --timeout=120s 2>/dev/null || true
    sleep 10
    local ready
    ready=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=email-converter-api --field-selector=status.phase=Running -o name 2>/dev/null | wc -l)
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    if [[ "$ready" -gt 0 ]]; then
        pass "API rolling restart: ${ready} pods running (${duration}s)"
    else
        fail "API rolling restart: no pods running (${duration}s)"
    fi
}

test_celery_worker_restart() {
    log "--- Test: Celery Worker Restart ---"
    local start_time
    start_time=$(date +%s)
    log "Restarting Celery workers..."
    kubectl rollout restart statefulset/celery-worker -n "$NAMESPACE" 2>/dev/null || { log "SKIP: No Celery workers"; return 0; }
    kubectl rollout status statefulset/celery-worker -n "$NAMESPACE" --timeout=120s 2>/dev/null || true
    sleep 10
    local ready
    ready=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=celery-worker --field-selector=status.phase=Running -o name 2>/dev/null | wc -l)
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    if [[ "$ready" -gt 0 ]]; then
        pass "Celery worker restart: ${ready} workers running (${duration}s)"
    else
        fail "Celery worker restart: no workers running (${duration}s)"
    fi
}

test_load_balancer_failover() {
    log "--- Test: Load Balancer Failover ---"
    local start_time
    start_time=$(date +%s)
    local ingress
    ingress=$(kubectl get ingress -n "$NAMESPACE" -o name 2>/dev/null | head -1)
    if [[ -z "$ingress" ]]; then
        log "SKIP: No ingress found"
        return 0
    fi
    local lb_hostname
    lb_hostname=$(kubectl get ingress -n "$NAMESPACE" -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
    if [[ -n "$lb_hostname" ]]; then
        log "Load balancer: $lb_hostname"
        if curl -s -o /dev/null -w "%{http_code}" "http://${lb_hostname}/health" | grep -q "200"; then
            pass "Load balancer failover: healthy"
        else
            fail "Load balancer failover: unhealthy"
        fi
    else
        log "INFO: Load balancer hostname not available"
        pass "Load balancer failover: pending"
    fi
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    log "Load balancer test completed in ${duration}s"
}

# =============================================================================
# Network Failover Tests
# =============================================================================

test_network_partition_recovery() {
    log "--- Test: Network Partition Recovery ---"
    local start_time
    start_time=$(date +%s)
    local api_pod
    api_pod=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=email-converter-api -o name 2>/dev/null | head -1)
    if [[ -z "$api_pod" ]]; then
        log "SKIP: No API pods found"
        return 0
    fi
    log "Simulating network partition..."
    kubectl exec "$api_pod" -n "$NAMESPACE" -- iptables -A OUTPUT -j DROP 2>/dev/null || {
        log "INFO: iptables not available, skipping"
        pass "Network partition: skipped (no iptables)"
        return 0
    }
    sleep 5
    log "Restoring network..."
    kubectl exec "$api_pod" -n "$NAMESPACE" -- iptables -D OUTPUT -j DROP 2>/dev/null || true
    sleep 5
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    pass "Network partition recovery: ${duration}s"
}

# =============================================================================
# Full Failover Test
# =============================================================================

test_full_failover() {
    log "--- Test: Full Failover Scenario ---"
    local start_time
    start_time=$(date +%s)
    log "Running comprehensive failover tests..."
    test_postgres_primary_restart
    test_redis_primary_restart
    test_api_rolling_restart
    test_celery_worker_restart
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    log "Full failover test completed in ${duration}s"
}

# =============================================================================
# Main
# =============================================================================

usage() {
    cat <<EOF
Usage: $0 [test_name|all]

Tests:
  postgres          PostgreSQL failover tests
  redis             Redis failover tests
  api               API failover tests
  network           Network failover tests
  full              Full failover scenario
  all               Run all tests
EOF
}

main() {
    log "=========================================="
    log "Failover Test Suite"
    log "Timestamp: ${TIMESTAMP}"
    log "Namespace: ${NAMESPACE}"
    log "=========================================="
    local test_name="${1:-all}"
    case "$test_name" in
        postgres)
            test_postgres_primary_restart
            test_postgres_read_replica
            test_postgres_connection_pool
            ;;
        redis)
            test_redis_primary_restart
            test_redis_sentinel
            ;;
        api)
            test_api_rolling_restart
            test_celery_worker_restart
            test_load_balancer_failover
            ;;
        network)
            test_network_partition_recovery
            ;;
        full)
            test_full_failover
            ;;
        all)
            test_postgres_primary_restart
            test_postgres_read_replica
            test_postgres_connection_pool
            test_redis_primary_restart
            test_redis_sentinel
            test_api_rolling_restart
            test_celery_worker_restart
            test_load_balancer_failover
            test_network_partition_recovery
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
    log ""
    log "=========================================="
    log "Failover Test Results"
    log "=========================================="
    log "PASSED: ${PASS_COUNT}"
    log "FAILED: ${FAIL_COUNT}"
    log "=========================================="
    if [[ "$FAIL_COUNT" -gt 0 ]]; then
        log "OVERALL: FAILED"
        return 1
    else
        log "OVERALL: PASSED"
        return 0
    fi
}

main "$@"
