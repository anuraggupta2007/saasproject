# =============================================================================
# Kubernetes Infrastructure Documentation
# =============================================================================
# Email Converter SaaS - Production-Grade K8s Infrastructure
# =============================================================================

## Overview

Production-grade Kubernetes infrastructure with:
- Helm charts for templating and deployment
- Kustomize overlays for multi-environment management
- High availability (3+ replicas for critical services)
- Zero downtime deployments (rolling updates, PDBs)
- Network isolation (NetworkPolicies)
- RBAC (least privilege access)
- Automated backups (CronJobs)
- Full observability (Prometheus, Grafana, Loki, OTEL)

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        NGINX INGRESS CONTROLLER                         │
│                           (HTTPS, TLS, Rate Limiting)                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         EMAIL-CONVERTER NAMESPACE                       │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    APPLICATION TIER                               │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │    │
│  │  │   API   │  │ Celery  │  │  Beat   │  │ Flower  │           │    │
│  │  │ (3-10)  │  │ (3-8)   │  │   (1)   │  │   (1)   │           │    │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘           │    │
│  └───────┼─────────────┼────────────┼────────────┼────────────────┘    │
│          │             │            │            │                       │
│  ┌───────┼─────────────┼────────────┼────────────┼────────────────┐    │
│  │       │     DATA TIER              │            │                │    │
│  │  ┌────┴────┐  ┌────┴────┐  ┌──────┴─────┐  ┌──┴───┐           │    │
│  │  │PostgreSQL│  │  Redis  │  │   MinIO    │  │ Loki │           │    │
│  │  │(StatefulSet)│(StatefulSet)│(StatefulSet)│(StatefulSet)│     │    │
│  │  └─────────┘  └─────────┘  └───────────┘  └──────┘           │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                  OBSERVABILITY TIER                              │    │
│  │  ┌─────────────┐  ┌─────────┐  ┌─────────┐  ┌───────────┐     │    │
│  │  │ Prometheus  │  │ Grafana │  │   Loki  │  │OTEL Coll  │     │    │
│  │  └─────────────┘  └─────────┘  └─────────┘  └───────────┘     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites
- Kubernetes cluster v1.27+
- Helm v3.14+
- kubectl configured
- cert-manager installed (for TLS)
- NGINX Ingress Controller installed

### Development

```bash
# Using Helm
helm install email-converter ./k8s/helm/email-converter \
  -f ./k8s/helm/email-converter/values-dev.yaml \
  -n email-converter-dev --create-namespace

# Using Kustomize
kubectl apply -k ./k8s/kustomize/overlays/dev
```

### Staging

```bash
# Using Helm
helm install email-converter ./k8s/helm/email-converter \
  -f ./k8s/helm/email-converter/values-staging.yaml \
  -n email-converter-staging --create-namespace

# Using Kustomize
kubectl apply -k ./k8s/kustomize/overlays/staging
```

### Production

```bash
# Using Helm
helm upgrade --install email-converter ./k8s/helm/email-converter \
  -f ./k8s/helm/email-converter/values-prod.yaml \
  -n email-converter-prod --create-namespace \
  --set secrets.secretKey=$(openssl rand -base64 32) \
  --set secrets.postgresPassword=$(openssl rand -base64 32) \
  --set secrets.redisPassword=$(openssl rand -base64 32) \
  --set secrets.minioRootPassword=$(openssl rand -base64 32) \
  --set secrets.grafanaAdminPassword=$(openssl rand -base64 16)
```

## File Structure

```
k8s/
├── helm/
│   └── email-converter/
│       ├── Chart.yaml                    # Helm chart metadata
│       ├── values.yaml                   # Default values
│       ├── values-dev.yaml               # Development overrides
│       ├── values-staging.yaml           # Staging overrides
│       ├── values-prod.yaml              # Production overrides
│       └── templates/
│           ├── _helpers.tpl              # Template helpers
│           ├── namespace.yaml            # Namespace
│           ├── configmap.yaml            # Application config
│           ├── secret.yaml               # Application secrets
│           ├── secret-db.yaml            # Database credentials
│           ├── configmap-nginx.yaml      # Nginx config
│           ├── configmap-prometheus.yaml # Prometheus config + alerts
│           ├── configmap-grafana.yaml    # Grafana datasources
│           ├── configmap-loki.yaml       # Loki + Promtail config
│           ├── configmap-otel.yaml       # OTEL Collector config
│           ├── configmap-postgres-init.yaml # PostgreSQL init script
│           ├── api/
│           │   ├── deployment.yaml
│           │   ├── service.yaml
│           │   ├── hpa.yaml
│           │   └── pdb.yaml
│           ├── celery-worker/
│           │   ├── deployment.yaml
│           │   ├── hpa.yaml
│           │   └── pdb.yaml
│           ├── celery-beat/
│           │   └── deployment.yaml
│           ├── flower/
│           │   ├── deployment.yaml
│           │   └── service.yaml
│           ├── postgresql/
│           │   ├── statefulset.yaml
│           │   └── service.yaml
│           ├── redis/
│           │   ├── statefulset.yaml
│           │   └── service.yaml
│           ├── minio/
│           │   ├── statefulset.yaml
│           │   └── service.yaml
│           ├── ingress/
│           │   └── ingress.yaml
│           ├── monitoring/
│           │   ├── prometheus-statefulset.yaml
│           │   ├── prometheus-service.yaml
│           │   ├── grafana-deployment.yaml
│           │   ├── grafana-service.yaml
│           │   ├── loki-statefulset.yaml
│           │   ├── loki-service.yaml
│           │   ├── otel-collector-deployment.yaml
│           │   └── otel-collector-service.yaml
│           ├── network-policies/
│           │   └── policies.yaml
│           ├── rbac/
│           │   ├── service-account.yaml
│           │   └── role.yaml
│           ├── certificates/
│           │   └── cluster-issuer.yaml
│           └── cronjobs/
│               └── backup.yaml
├── kustomize/
│   ├── base/
│   │   └── kustomization.yaml
│   └── overlays/
│       ├── dev/
│       │   └── kustomization.yaml
│       ├── staging/
│       │   └── kustomization.yaml
│       └── prod/
│           └── kustomization.yaml
└── README.md
```

## Services

| Service | Type | Replicas (Prod) | CPU (Prod) | Memory (Prod) | Storage |
|---------|------|-----------------|------------|---------------|---------|
| API | Deployment | 3-10 (HPA) | 0.5-2 cores | 512Mi-2Gi | - |
| Celery Worker | Deployment | 3-8 (HPA) | 1-4 cores | 1Gi-4Gi | - |
| Celery Beat | Deployment | 1 | 0.1-0.5 cores | 128Mi-512Mi | - |
| Flower | Deployment | 1 | 0.1-0.5 cores | 128Mi-256Mi | - |
| PostgreSQL | StatefulSet | 1 | 0.5-2 cores | 1Gi-4Gi | 100Gi |
| Redis | StatefulSet | 1 | 0.25-1 cores | 256Mi-1Gi | 10Gi |
| MinIO | StatefulSet | 1 | 0.25-1 cores | 256Mi-1Gi | 200Gi |
| Prometheus | StatefulSet | 1 | 0.5-1 cores | 512Mi-1Gi | 100Gi |
| Grafana | Deployment | 1 | 0.25-0.5 cores | 256Mi-512Mi | 10Gi |
| Loki | StatefulSet | 1 | 0.25-1 cores | 256Mi-1Gi | 100Gi |
| OTEL Collector | Deployment | 1 | 0.25-0.5 cores | 256Mi-512Mi | - |

## Networking

### Network Policies
- **Default Deny**: All traffic blocked by default
- **API**: Ingress from nginx, egress to DB/Redis/MinIO/OTEL
- **Celery Worker**: Egress to DB/Redis/MinIO/OTEL
- **Prometheus**: Ingress from Grafana, egress to all services
- **Grafana**: Ingress from nginx, egress to Prometheus/Loki
- **Loki**: Ingress from Grafana/OTEL

### Ingress
- HTTPS with TLS termination (cert-manager)
- HTTP to HTTPS redirect
- Rate limiting (10 req/s for API, 5 req/s for auth)
- Security headers (HSTS, CSP, X-Frame-Options)
- CORS support
- Proxy buffering disabled for file uploads

## Security

### Container Security
- All containers run as non-root
- Read-only root filesystems
- No privilege escalation
- Drop all capabilities
- seccomp profile: RuntimeDefault

### RBAC
- ServiceAccount per namespace
- Role with least privilege (read-only access to resources)
- RoleBinding to ServiceAccount

### Secrets Management
- Kubernetes Secrets for all credentials
- Recommended: Sealed Secrets or External Secrets Operator
- Never store plaintext secrets in values files

## Scaling

### Horizontal Pod Autoscaler
- **API**: 3-10 replicas, CPU 70%, Memory 80%
- **Celery Worker**: 3-8 replicas, CPU 75%, Memory 80%
- Scale-down stabilization: 300s
- Scale-up stabilization: 60s

### Pod Disruption Budgets
- **API**: minAvailable 2
- **Celery Worker**: minAvailable 2

## Observability

### Prometheus
- Scrapes API, Celery, PostgreSQL, Redis
- 30-day retention
- Alert rules for error rate, latency, queue backlog, container restarts

### Grafana
- Auto-provisioned Prometheus + Loki datasources
- Pre-built dashboards for API, workers, infrastructure

### Loki + Promtail
- Centralized log aggregation
- Auto-discovers pods via Kubernetes metadata
- JSON log parsing

### OpenTelemetry
- OTLP receiver (gRPC + HTTP)
- Exports traces to Jaeger/Tempo
- Exports metrics to Prometheus
- Exports logs to Loki

## Backup & Recovery

### PostgreSQL Backup
- CronJob runs daily at 2:00 AM UTC
- Uses pg_dump with compression
- Retains backups for 30 days
- Stores in PersistentVolumeClaim

### Restore Procedure
```bash
# Exec into backup pod
kubectl exec -it backup-pod -- /bin/sh

# Restore from backup
gunzip -c /backup/postgres_YYYYMMDD_HHMMSS.sql.gz | \
  pg_restore -h postgresql -U emailconverter -d email_converter
```

## Troubleshooting

### Check pod status
```bash
kubectl get pods -n email-converter-prod
kubectl describe pod <pod-name> -n email-converter-prod
```

### View logs
```bash
kubectl logs -f deployment/api -n email-converter-prod
kubectl logs -f deployment/celery-worker -n email-converter-prod
```

### Port forward
```bash
# Grafana
kubectl port-forward svc/grafana 3000:3000 -n email-converter-prod

# Prometheus
kubectl port-forward svc/prometheus 9090:9090 -n email-converter-prod
```

### Check HPA
```bash
kubectl get hpa -n email-converter-prod
kubectl describe hpa email-converter-api -n email-converter-prod
```

## Production Checklist

- [ ] Kubernetes cluster v1.27+ with 3+ nodes
- [ ] cert-manager installed
- [ ] NGINX Ingress Controller installed
- [ ] StorageClass `gp3` available
- [ ] Generate all secrets (openssl rand -base64 32)
- [ ] Configure DNS for api.emailconverter.com
- [ ] Set up Sealed Secrets or External Secrets
- [ ] Configure backup S3 bucket
- [ ] Set up monitoring alerts (PagerDuty/Slack)
- [ ] Test restore procedure
- [ ] Run security scan (Trivy/KubeHunter)
- [ ] Load test with k6/Locust
