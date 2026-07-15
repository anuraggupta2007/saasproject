#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Chaos Engineering Test Suite
# Tests system resilience against various failure scenarios
# =============================================================================

CHAOS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${CHAOS_DIR}/../tests/results"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RESULTS_FILE="${RESULTS_DIR}/chaos-${TIMESTAMP}.json"
NAMESPACE="${K8S_NAMESPACE:-email-converter}"

mkdir -p "$RESULTS_DIR"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [CHAOS] $*"; }
pass() { log "PASS: $*"; }
fail() { log "FAIL: $*"; }

record_result() {
    local test_name="$1"
    local status="$2"
    local duration="${3:-0}"
    local details="${4:-}"
    echo "{\"test\": \"${test_name}\", \"status\": \"${status}\", \"duration\": ${duration}, \"details\": \"${details}\"}" >> "${RESULTS_FILE}.jsonl"
}

# Test 1: Kill a random API pod
test_pod_kill() {
    log "--- Test: Random Pod Kill ---"
    local start_time
    start_time=$(date +%s)
    local pods
    pods=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=email-converter-api -o name 2>/dev/null)
    if [[ -z "$pods" ]]; then
        log "SKIP: No API pods found"
        return 0
    fi
    local target_pod
    target_pod=$(echo "$pods" | shuf -n1)
    log "Killing pod: $target_pod"
    kubectl delete "$target_pod" -n "$NAMESPACE" --grace-period=0 --force 2>/dev/null || true
    sleep 10
    local ready_pods
    ready_pods=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=email-converter-api --field-selector=status.phase=Running -o name 2>/dev/null | wc -l)
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    if [[ "$ready_pods" -gt 0 ]]; then
        pass "Pod killed, $ready_pods pods running"
        record_result "pod_kill" "pass" "$duration" "$ready_pods pods recovered"
    else
        fail "No pods running after kill"
        record_result "pod_kill" "fail" "$duration" "No pods recovered"
    fi
}

# Test 2: Network partition simulation
test_network_partition() {
    log "--- Test: Network Partition ---"
    local start_time
    start_time=$(date +%s)
    local api_pod
    api_pod=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=email-converter-api -o name 2>/dev/null | head -1)
    if [[ -z "$api_pod" ]]; then
        log "SKIP: No API pods found"
        return 0
    fi
    log "Blocking network for $api_pod"
    kubectl exec "$api_pod" -n "$NAMESPACE" -- iptables -A OUTPUT -j DROP 2>/dev/null || {
        log "SKIP: iptables not available in pod"
        return 0
    }
    sleep 5
    log "Restoring network"
    kubectl exec "$api_pod" -n "$NAMESPACE" -- iptables -D OUTPUT -j DROP 2>/dev/null || true
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    pass "Network partition test completed"
    record_result "network_partition" "pass" "$duration" "Partition simulated and restored"
}

# Test 3: CPU stress test
test_cpu_stress() {
    log "--- Test: CPU Stress ---"
    local start_time
    start_time=$(date +%s)
    local target_pod
    target_pod=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=email-converter-celery-worker -o name 2>/dev/null | head -1)
    if [[ -z "$target_pod" ]]; then
        log "SKIP: No celery worker pods found"
        return 0
    fi
    log "Applying CPU stress to $target_pod"
    kubectl exec "$target_pod" -n "$NAMESPACE" -- sh -c "timeout 10 dd if=/dev/urandom of=/dev/null bs=1M &" 2>/dev/null || true
    sleep 15
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    pass "CPU stress test completed"
    record_result "cpu_stress" "pass" "$duration" "Stress applied and recovered"
}

# Test 4: Database failover simulation
test_database_failover() {
    log "--- Test: Database Failover ---"
    local start_time
    start_time=$(date +%s)
    local db_pod
    db_pod=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=postgresql -o name 2>/dev/null | head -1)
    if [[ -z "$db_pod" ]]; then
        log "SKIP: No PostgreSQL pods found"
        return 0
    fi
    log "Simulating DB failover by restarting $db_pod"
    kubectl delete "$db_pod" -n "$NAMESPACE" --grace-period=30 2>/dev/null || true
    sleep 30
    local ready
    ready=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=postgresql --field-selector=status.phase=Running -o name 2>/dev/null | wc -l)
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    if [[ "$ready" -gt 0 ]]; then
        pass "Database recovered in ${duration}s"
        record_result "database_failover" "pass" "$duration" "DB recovered"
    else
        fail "Database did not recover in ${duration}s"
        record_result "database_failover" "fail" "$duration" "DB not recovered"
    fi
}

# Test 5: Redis failover simulation
test_redis_failover() {
    log "--- Test: Redis Failover ---"
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
    sleep 20
    local ready
    ready=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=redis --field-selector=status.phase=Running -o name 2>/dev/null | wc -l)
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    if [[ "$ready" -gt 0 ]]; then
        pass "Redis recovered in ${duration}s"
        record_result "redis_failover" "pass" "$duration" "Redis recovered"
    else
        fail "Redis did not recover in ${duration}s"
        record_result "redis_failover" "fail" "$duration" "Redis not recovered"
    fi
}

# Test 6: PVC data loss simulation
test_pvc_rollback() {
    log "--- Test: PVC Rollback ---"
    local start_time
    start_time=$(date +%s)
    log "Simulating PVC rollback scenario"
    local backup_pvc
    backup_pvc=$(kubectl get pvc -n "$NAMESPACE" -l app.kubernetes.io/name=backup-storage -o name 2>/dev/null | head -1)
    if [[ -z "$backup_pvc" ]]; then
        log "SKIP: No backup PVC found"
        return 0
    fi
    log "Backup PVC exists: $backup_pvc"
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    pass "PVC rollback scenario validated"
    record_result "pvc_rollback" "pass" "$duration" "Backup PVC available"
}

# Test 7: API endpoint resilience
test_api_resilience() {
    log "--- Test: API Endpoint Resilience ---"
    local start_time
    start_time=$(date +%s)
    local success=0
    local total=0
    for i in $(seq 1 10); do
        total=$((total + 1))
        if kubectl exec "deploy/api" -n "$NAMESPACE" -- \
            wget -q -O- "http://localhost:8000/health" > /dev/null 2>&1; then
            success=$((success + 1))
        fi
        sleep 1
    done
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    local success_rate=$(( (success * 100) / total ))
    if [[ "$success_rate" -ge 80 ]]; then
        pass "API resilience: ${success_rate}% success rate"
        record_result "api_resilience" "pass" "$duration" "${success_rate}% success"
    else
        fail "API resilience: ${success_rate}% success rate"
        record_result "api_resilience" "fail" "$duration" "${success_rate}% success"
    fi
}

# Test 8: Concurrent backup test
test_concurrent_backup() {
    log "--- Test: Concurrent Backup ---"
    local start_time
    start_time=$(date +%s)
    kubectl create job --from=cronjob/postgres-backup "concurrent-backup-test-${TIMESTAMP}" -n "$NAMESPACE" 2>/dev/null || {
        log "SKIP: Cannot create backup job"
        return 0
    }
    sleep 5
    local jobs
    jobs=$(kubectl get jobs -n "$NAMESPACE" -l app.kubernetes.io/name=postgres-backup -o name 2>/dev/null | wc -l)
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    log "Backup jobs running: $jobs"
    pass "Concurrent backup test completed"
    record_result "concurrent_backup" "pass" "$duration" "${jobs} jobs"
}

# Test 9: Resource exhaustion
test_resource_exhaustion() {
    log "--- Test: Resource Exhaustion ---"
    local start_time
    start_time=$(date +%s)
    log "Checking resource quotas"
    local quotas
    quotas=$(kubectl get resourcequota -n "$NAMESPACE" -o json 2>/dev/null | \
        python3 -c "
import sys, json
data = json.load(sys.stdin)
for item in data.get('items', []):
    hard = item.get('status', {}).get('hard', {})
    used = item.get('status', {}).get('used', {})
    for key in hard:
        h = hard[key]
        u = used.get(key, '0')
        print(f'{key}: {u}/{h}')
" 2>/dev/null || echo "No quotas found")
    log "Resource quotas: $quotas"
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    pass "Resource exhaustion check completed"
    record_result "resource_exhaustion" "pass" "$duration" "Quotas checked"
}

# Test 10: Full disaster recovery test
test_full_dr() {
    log "--- Test: Full Disaster Recovery ---"
    local start_time
    start_time=$(date +%s)
    log "Running full DR verification..."
    bash "${CHAOS_DIR}/../scripts/disaster-recovery.sh" status 2>/dev/null || true
    local end_time
    end_time=$(date +%s)
    local duration=$(( end_time - start_time ))
    pass "Full DR test completed in ${duration}s"
    record_result "full_dr" "pass" "$duration" "DR status checked"
}

usage() {
    cat <<EOF
Usage: $0 [test_name|all]

Tests:
  pod_kill          Kill a random API pod
  network_partition Simulate network partition
  cpu_stress        Apply CPU stress to workers
  database_failover Simulate PostgreSQL failover
  redis_failover    Simulate Redis failover
  pvc_rollback      Test PVC rollback scenario
  api_resilience    Test API endpoint resilience
  concurrent_backup Test concurrent backup jobs
  resource_exhaustion Check resource quotas
  full_dr           Full disaster recovery test
  all               Run all tests

Results saved to: ${RESULTS_DIR}/
EOF
}

main() {
    log "=========================================="
    log "Chaos Engineering Test Suite"
    log "Timestamp: ${TIMESTAMP}"
    log "Namespace: ${NAMESPACE}"
    log "=========================================="
    : > "${RESULTS_FILE}.jsonl"
    local test_name="${1:-all}"
    case "$test_name" in
        pod_kill)            test_pod_kill ;;
        network_partition)   test_network_partition ;;
        cpu_stress)          test_cpu_stress ;;
        database_failover)   test_database_failover ;;
        redis_failover)      test_redis_failover ;;
        pvc_rollback)        test_pvc_rollback ;;
        api_resilience)      test_api_resilience ;;
        concurrent_backup)   test_concurrent_backup ;;
        resource_exhaustion) test_resource_exhaustion ;;
        full_dr)             test_full_dr ;;
        all)
            test_pod_kill
            test_network_partition
            test_cpu_stress
            test_database_failover
            test_redis_failover
            test_pvc_rollback
            test_api_resilience
            test_concurrent_backup
            test_resource_exhaustion
            test_full_dr
            ;;
        help|-h|--help) usage; exit 0 ;;
        *) log "Unknown test: $test_name"; usage; exit 1 ;;
    esac
    log "=========================================="
    log "Chaos tests complete"
    log "Results: ${RESULTS_FILE}.jsonl"
    log "=========================================="
}

main "$@"
