# Kubernetes Cluster Failure Runbook

## Severity: Critical
## Response Time: < 2 hours
## Owner: SRE Team

---

## Detection

**Alerts:**
- `K8sClusterUnhealthy`
- `K8sNodeNotReady`
- `VeleroBackupFailed`
- `PodCrashLoopBackOff`

**Symptoms:**
- All pods failing
- kubectl commands timing out
- Services unreachable
- Load balancer unhealthy

---

## Step 1: Assessment (0-15 minutes)

### 1.1 Check Cluster Status

```bash
# Check node status
kubectl get nodes -o wide

# Check pod status across all namespaces
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed

# Check cluster info
kubectl cluster-info
```

### 1.2 Check Velero Status

```bash
# Check Velero backups
velero backup get

# Check Velero restores
velero restore get

# Check Velero server status
kubectl get pods -n velero
```

---

## Step 2: Recovery Options (15-120 minutes)

### Option A: Restore from Velero (Full Recovery)

```bash
# List available backups
velero backup get -o json | python3 -c "
import sys, json
data = json.load(sys.stdin)
for item in sorted(data.get('items', []), key=lambda x: x['metadata']['creationTimestamp'], reverse=True)[:5]:
    name = item['metadata']['name']
    phase = item['status'].get('phase', 'Unknown')
    created = item['metadata']['creationTimestamp'][:19]
    print(f'{name} (phase={phase}, created={created})')
"

# Restore from latest backup
velero restore create --from-backup "backup-latest"

# Monitor restore
velero restore get
kubectl get pods -n email-converter -w
```

### Option B: Restore from Helm Chart

```bash
# Reinstall from Helm
helm upgrade --install email-converter \
  k8s/helm/email-converter \
  --namespace email-converter \
  --values k8s/helm/email-converter/values-prod.yaml \
  --wait --timeout 30m

# Verify
kubectl get pods -n email-converter
kubectl get pvc -n email-converter
```

### Option C: Manual Recovery

```bash
# 1. Recreate namespace
kubectl create namespace email-converter

# 2. Apply ConfigMaps
kubectl apply -f k8s/helm/email-converter/templates/configmap.yaml -n email-converter

# 3. Apply Secrets
kubectl apply -f k8s/helm/email-converter/templates/secret.yaml -n email-converter

# 4. Apply PVCs
kubectl apply -f k8s/helm/email-converter/templates/pvc.yaml -n email-converter

# 5. Apply Deployments
kubectl apply -f k8s/helm/email-converter/templates/deployment.yaml -n email-converter

# 6. Apply Services
kubectl apply -f k8s/helm/email-converter/templates/service.yaml -n email-converter

# 7. Apply Ingress
kubectl apply -f k8s/helm/email-converter/templates/ingress.yaml -n email-converter
```

---

## Step 3: Validation (15-30 minutes)

### 3.1 Verify Workloads

```bash
# Check all pods
kubectl get pods -n email-converter

# Check all services
kubectl get svc -n email-converter

# Check all PVCs
kubectl get pvc -n email-converter

# Check ingress
kubectl get ingress -n email-converter
```

### 3.2 Test Application

```bash
# Test health endpoint
curl -f https://api.example.com/health

# Test authentication
curl -X POST https://api.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# Test file upload
curl -X POST https://api.example.com/api/v1/uploads/test \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-file.mbox"
```

### 3.3 Verify Backup Jobs

```bash
# Check CronJobs
kubectl get cronjobs -n email-converter

# Trigger test backup
kubectl create job --from=cronjob/postgres-backup test-backup-$(date +%s) -n email-converter

# Monitor job
kubectl get jobs -n email-converter -w
```

---

## Step 4: Post-Recovery

### 4.1 Root Cause Analysis

- [ ] Check node health
- [ ] Review cluster events
- [ ] Check resource quotas
- [ ] Review network policies
- [ ] Check storage class availability

### 4.2 Preventive Measures

- [ ] Enable cluster auto-scaling
- [ ] Configure Pod Disruption Budgets
- [ ] Set up node affinity rules
- [ ] Enable cluster logging
- [ ] Configure cluster monitoring

---

## Contacts

| Role | Name | Contact |
|------|------|---------|
| SRE On-Call | [Name] | [Phone] |
| K8s Admin | [Name] | [Phone] |
| AWS Support | [Name] | [Phone] |
