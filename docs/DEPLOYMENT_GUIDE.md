# Deployment Guide

Complete deployment guide for the Email Converter SaaS project across all environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Docker Production Deployment](#docker-production-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Terraform Infrastructure](#terraform-infrastructure)
- [SSL/TLS Setup](#ssltls-setup)
- [Domain Configuration](#domain-configuration)
- [Database Setup](#database-setup)
- [Redis Setup](#redis-setup)
- [MinIO/S3 Setup](#minios3-setup)
- [Monitoring Stack](#monitoring-stack)
- [Backup Configuration](#backup-configuration)
- [Disaster Recovery](#disaster-recovery)
- [Scaling Guide](#scaling-guide)

---

## Prerequisites

### Infrastructure Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 vCPU | 8 vCPU |
| RAM | 8 GB | 16 GB |
| Storage | 50 GB SSD | 200 GB SSD |
| Network | 1 Gbps | 10 Gbps |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |

### Required Tools

```bash
# Docker & Docker Compose
docker --version          # 24.0+
docker compose version    # 2.20+

# Kubernetes (if applicable)
kubectl version           # 1.28+
helm version              # 3.14+

# Terraform (if applicable)
terraform version         # 1.7+

# Cloud CLI
aws --version             # AWS CLI v2
gcloud --version          # Google Cloud SDK
az --version              # Azure CLI
```

---

## Docker Production Deployment

### docker-compose.prod.yml

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - BUILD_ENV=production
    ports:
      - "8000:8000"
    environment:
      - APP_ENV=production
      - APP_DEBUG=false
    env_file:
      - .env.production
    volumes:
      - app_uploads:/app/uploads
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  worker:
    build:
      context: .
      dockerfile: Dockerfile
    env_file:
      - .env.production
    command: celery -A app.celery_app worker --loglevel=warning --concurrency=4 --max-tasks-per-child=1000
    depends_on:
      - redis
      - db
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  beat:
    build:
      context: .
      dockerfile: Dockerfile
    env_file:
      - .env.production
    command: celery -A app.celery_app beat --loglevel=warning
    depends_on:
      - redis
    restart: unless-stopped
    logging:
      driver: json-file
      options:
        max-size: "5m"
        max-file: "2"

  db:
    image: postgres:16-alpine
    ports:
      - "127.0.0.1:5432:5432"
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_INITDB_ARGS: "--data-checksums"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    command:
      - postgres
      - -c
      - shared_preload_libraries=pg_stat_statements
      - -c
      - max_connections=200
      - -c
      - shared_buffers=1GB
      - -c
      - effective_cache_size=3GB
      - -c
      - work_mem=16MB
      - -c
      - maintenance_work_mem=256MB
      - -c
      - wal_buffers=16MB
      - -c
      - min_wal_size=1GB
      - -c
      - max_wal_size=4GB
      - -c
      - checkpoint_completion_target=0.9
      - -c
      - random_page_cost=1.1
      - -c
      - effective_io_concurrency=200
      - -c
      - log_min_duration_statement=1000
      - -c
      - log_statement=ddl
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "5"

  redis:
    image: redis:7-alpine
    ports:
      - "127.0.0.1:6379:6379"
    command: >
      redis-server
      --maxmemory 1gb
      --maxmemory-policy allkeys-lru
      --save 900 1
      --save 300 10
      --save 60 10000
      --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 2G
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  nginx:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - certbot_etc:/etc/letsencrypt:ro
      - certbot_var:/var/lib/letsencrypt:ro
    depends_on:
      - app
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M

  certbot:
    image: certbot/certbot:latest
    volumes:
      - certbot_etc:/etc/letsencrypt
      - certbot_var:/var/lib/letsencrypt
      - ./nginx/conf.d:/etc/nginx/conf.d
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

  prometheus:
    image: prom/prometheus:v2.50.0
    ports:
      - "127.0.0.1:9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:10.3.0
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=${GRAFANA_USER}
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    depends_on:
      - prometheus
    restart: unless-stopped

  loki:
    image: grafana/loki:2.9.4
    ports:
      - "127.0.0.1:3100:3100"
    volumes:
      - ./monitoring/loki.yml:/etc/loki/local-config.yaml:ro
      - loki_data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    restart: unless-stopped

  minio:
    image: minio/minio:latest
    ports:
      - "127.0.0.1:9000:9000"
      - "127.0.0.1:9001:9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 30s
      timeout: 20s
      retries: 3
    restart: unless-stopped

volumes:
  app_uploads:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:
  loki_data:
  minio_data:
  certbot_etc:
  certbot_var:

networks:
  default:
    driver: bridge
```

### Production Environment File

```bash
# .env.production

# Application
APP_NAME="Email Converter"
APP_ENV=production
APP_DEBUG=false
APP_SECRET_KEY=<generate-with-openssl-rand-hex-32>
APP_ALLOWED_HOSTS=api.yourdomain.com

# Server
HOST=0.0.0.0
PORT=8000
WORKERS=4
LOG_LEVEL=WARNING

# Database
DB_USER=email_converter_prod
DB_PASSWORD=<strong-random-password>
DB_NAME=email_converter_prod
DATABASE_URL=postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}

# Redis
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2

# Authentication
JWT_SECRET_KEY=<generate-with-openssl-rand-hex-32>

# S3/MinIO
S3_ENDPOINT_URL=http://minio:9000
S3_ACCESS_KEY=${MINIO_ROOT_USER}
S3_SECRET_KEY=${MINIO_ROOT_PASSWORD}
S3_BUCKET_NAME=email-converter-prod

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
GRAFANA_USER=admin
GRAFANA_PASSWORD=<strong-random-password>

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourdomain.com
```

### Production Deployment Commands

```bash
# First-time setup
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml build

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Run migrations
docker compose -f docker-compose.prod.yml exec app alembic upgrade head

# Initialize MinIO bucket
docker compose -f docker-compose.prod.yml exec minio mc alias set local http://localhost:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD}
docker compose -f docker-compose.prod.yml exec minio mc mb local/email-converter-prod

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Check status
docker compose -f docker-compose.prod.yml ps
```

---

## Kubernetes Deployment

### Helm Chart Structure

```
k8s/helm/email-converter/
├── Chart.yaml
├── values.yaml
├── values-production.yaml
├── templates/
│   ├── _helpers.tpl
│   ├── deployment-app.yaml
│   ├── deployment-worker.yaml
│   ├── deployment-beat.yaml
│   ├── service-app.yaml
│   ├── service-db.yaml
│   ├── service-redis.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   ├── pdb.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── networkpolicy.yaml
│   ├── serviceaccount.yaml
│   └── notes.txt
└── .helmignore
```

### Chart.yaml

```yaml
apiVersion: v2
name: email-converter
description: Email Converter SaaS Application
type: application
version: 1.0.0
appVersion: "1.0.0"
maintainers:
  - name: DevOps Team
    email: devops@yourdomain.com
keywords:
  - email
  - converter
  - saas
home: https://yourdomain.com
sources:
  - https://github.com/your-org/email-converter
```

### values.yaml

```yaml
# Default values for email-converter

global:
  environment: production
  imageRegistry: ghcr.io/your-org
  imagePullSecrets:
    - name: ghcr-secret

replicaCount:
  app: 3
  worker: 2
  beat: 1

image:
  repository: email-converter
  tag: "latest"
  pullPolicy: IfNotPresent

serviceAccount:
  create: true
  name: email-converter
  annotations: {}

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
    nginx.ingress.kubernetes.io/rate-limit: "60"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
  hosts:
    - host: api.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: email-converter-tls
      hosts:
        - api.yourdomain.com

resources:
  app:
    limits:
      cpu: "2"
      memory: 2Gi
    requests:
      cpu: "1"
      memory: 1Gi
  worker:
    limits:
      cpu: "2"
      memory: 2Gi
    requests:
      cpu: "1"
      memory: 1Gi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

podDisruptionBudget:
  enabled: true
  minAvailable: 1

database:
  host: email-converter-db
  port: 5432
  name: email_converter
  existingSecret: email-converter-db-secret
  poolSize: 20
  maxOverflow: 10

redis:
  host: email-converter-redis
  port: 6379
  existingSecret: email-converter-redis-secret

celery:
  concurrency: 4
  maxTasksPerChild: 1000

monitoring:
  enabled: true
  serviceMonitor:
    enabled: true
    interval: 30s
  grafanaDashboard:
    enabled: true

networkPolicy:
  enabled: true

podAnnotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "8000"
  prometheus.io/path: "/metrics"

nodeSelector: {}
tolerations: []
affinity: {}
```

### values-production.yaml

```yaml
# Production-specific overrides

replicaCount:
  app: 5
  worker: 4
  beat: 1

resources:
  app:
    limits:
      cpu: "4"
      memory: 4Gi
    requests:
      cpu: "2"
      memory: 2Gi
  worker:
    limits:
      cpu: "4"
      memory: 4Gi
    requests:
      cpu: "2"
      memory: 2Gi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20

celery:
  concurrency: 8

database:
  poolSize: 50
  maxOverflow: 20
```

### Deployment Commands

```bash
# Install/upgrade Helm chart
helm upgrade --install email-converter \
  ./k8s/helm/email-converter \
  -f ./k8s/helm/email-converter/values-production.yaml \
  -n email-converter \
  --create-namespace

# Check deployment status
kubectl get pods -n email-converter
kubectl get ingress -n email-converter

# View logs
kubectl logs -f deployment/email-converter-app -n email-converter
kubectl logs -f deployment/email-converter-worker -n email-converter

# Scale manually
kubectl scale deployment email-converter-app --replicas=10 -n email-converter

# Rollback
helm rollback email-converter 0 -n email-converter
```

---

## Terraform Infrastructure

### infrastructure/terraform/

```
infrastructure/terraform/
├── main.tf
├── variables.tf
├── outputs.tf
├── providers.tf
├── modules/
│   ├── vpc/
│   ├── eks/
│   ├── rds/
│   ├── elasticache/
│   ├── s3/
│   └── monitoring/
├── environments/
│   ├── dev.tfvars
│   ├── staging.tfvars
│   └── production.tfvars
└── backend.tf
```

### main.tf

```hcl
terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }

  backend "s3" {
    bucket         = "email-converter-terraform"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "email-converter"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
}

# EKS Module
module "eks" {
  source = "./modules/eks"

  environment      = var.environment
  cluster_version  = var.cluster_version
  vpc_id           = module.vpc.vpc_id
  subnet_ids       = module.vpc.private_subnet_ids
  node_groups      = var.eks_node_groups
}

# RDS Module
module "rds" {
  source = "./modules/rds"

  environment         = var.environment
  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.database_subnet_ids
  instance_class      = var.rds_instance_class
  allocated_storage   = var.rds_allocated_storage
  multi_az            = var.rds_multi_az
  backup_retention    = var.rds_backup_retention
  allowed_security_groups = [module.eks.node_security_group_id]
}

# ElastiCache Module
module "elasticache" {
  source = "./modules/elasticache"

  environment         = var.environment
  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.database_subnet_ids
  node_type           = var.elasticache_node_type
  num_cache_nodes     = var.elasticache_num_nodes
  allowed_security_groups = [module.eks.node_security_group_id]
}

# S3 Module
module "s3" {
  source = "./modules/s3"

  environment = var.environment
  bucket_name = var.s3_bucket_name
  enable_versioning = true
  lifecycle_rules = [
    {
      id      = "cleanup-old-versions"
      enabled = true
      noncurrent_version_expiration = {
        days = 30
      }
    }
  ]
}

# Monitoring Module
module "monitoring" {
  source = "./modules/monitoring"

  environment     = var.environment
  eks_cluster_name = module.eks.cluster_name
  rds_instance_id  = module.rds.instance_id
  redis_cluster_id = module.elasticache.cluster_id
}
```

### variables.tf

```hcl
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "cluster_version" {
  description = "EKS cluster version"
  type        = string
  default     = "1.29"
}

variable "eks_node_groups" {
  description = "EKS node groups configuration"
  type = map(object({
    instance_types = list(string)
    min_size       = number
    max_size       = number
    desired_size   = number
    disk_size      = number
  }))
  default = {
    general = {
      instance_types = ["m6i.xlarge"]
      min_size       = 2
      max_size       = 10
      desired_size   = 3
      disk_size      = 50
    }
    compute = {
      instance_types = ["c6i.2xlarge"]
      min_size       = 0
      max_size       = 5
      desired_size   = 0
      disk_size      = 100
    }
  }
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r6g.xlarge"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 100
}

variable "rds_multi_az" {
  description = "Enable RDS Multi-AZ"
  type        = bool
  default     = true
}

variable "rds_backup_retention" {
  description = "RDS backup retention period in days"
  type        = number
  default     = 30
}

variable "elasticache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.r6g.large"
}

variable "elasticache_num_nodes" {
  description = "Number of ElastiCache nodes"
  type        = number
  default     = 2
}

variable "s3_bucket_name" {
  description = "S3 bucket name"
  type        = string
  default     = "email-converter-storage"
}
```

### outputs.tf

```hcl
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
  sensitive   = true
}

output "elasticache_endpoint" {
  description = "ElastiCache endpoint"
  value       = module.elasticache.endpoint
}

output "s3_bucket_arn" {
  description = "S3 bucket ARN"
  value       = module.s3.bucket_arn
}

output "load_balancer_dns" {
  description = "Load balancer DNS name"
  value       = module.eks.load_balancer_dns
}
```

### Terraform Commands

```bash
# Initialize
terraform init

# Plan changes
terraform plan -var-file=environments/production.tfvars

# Apply changes
terraform apply -var-file=environments/production.tfvars

# Destroy (careful!)
terraform destroy -var-file=environments/production.tfvars

# Import existing resources
terraform import module.rds.aws_db_instance.main i-1234567890abcdef0

# State management
terraform state list
terraform state show module.rds.aws_db_instance.main
```

---

## SSL/TLS Setup

### Cert-Manager Installation

```bash
# Install cert-manager via Helm
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.14.0 \
  --set installCRDs=true
```

### Cluster Issuer Configuration

```yaml
# cluster-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    email: admin@yourdomain.com
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            class: nginx
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    email: admin@yourdomain.com
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-staging-key
    solvers:
      - http01:
          ingress:
            class: nginx
```

### Manual Certificate (if needed)

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tls.key -out tls.crt \
  -subj "/CN=api.yourdomain.com"

# Create Kubernetes secret
kubectl create secret tls email-converter-tls \
  --cert=tls.crt \
  --key=tls.key \
  -n email-converter
```

---

## Domain Configuration

### DNS Records

```
# A Record (for single server)
api.yourdomain.com.    A       203.0.113.10
*.api.yourdomain.com.  A       203.0.113.10

# CNAME Record (for load balancer)
api.yourdomain.com.    CNAME   lb.amazonaws.com.

# MX Record (for email)
yourdomain.com.        MX  10  mail.yourdomain.com.

# TXT Record (for SPF)
yourdomain.com.        TXT     "v=spf1 include:_spf.google.com ~all"

# TXT Record (for DKIM)
selector._domainkey.yourdomain.com. TXT "v=DKIM1; k=rsa; p=..."
```

### Nginx Configuration

```nginx
# nginx/conf.d/app.conf
upstream app {
    server app:8000;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=60r/m;
limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Upload size
    client_max_body_size 100M;

    # Rate limiting
    location /api/v1/auth/ {
        limit_req zone=auth burst=20 nodelay;
        proxy_pass http://app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        limit_req zone=api burst=100 nodelay;
        proxy_pass http://app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    location / {
        proxy_pass http://app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://app;
        access_log off;
    }

    # Prometheus metrics
    location /metrics {
        allow 10.0.0.0/8;
        deny all;
        proxy_pass http://app;
    }
}
```

---

## Database Setup

### PostgreSQL Production Configuration

```sql
-- Create database and user
CREATE USER email_converter WITH PASSWORD 'strong_random_password';
CREATE DATABASE email_converter OWNER email_converter;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE email_converter TO email_converter;

-- Connect to database
\c email_converter

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS conversions;
CREATE SCHEMA IF NOT EXISTS billing;

-- Grant schema usage
GRANT USAGE ON SCHEMA auth, conversions, billing TO email_converter;
GRANT ALL ON ALL TABLES IN SCHEMA auth, conversions, billing TO email_converter;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth, conversions, billing TO email_converter;
```

### Database Backup Script

```bash
#!/bin/bash
# scripts/backup_db.sh

set -euo pipefail

BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/email_converter_${TIMESTAMP}.sql.gz"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Dump database
pg_dump \
  --host=localhost \
  --port=5432 \
  --username=email_converter \
  --dbname=email_converter \
  --format=custom \
  --compress=9 \
  --verbose \
  --file="${BACKUP_FILE}"

# Verify backup
pg_restore --list "${BACKUP_FILE}" > /dev/null 2>&1
echo "Backup verified: ${BACKUP_FILE}"

# Upload to S3
aws s3 cp "${BACKUP_FILE}" "s3://email-converter-backups/postgres/${TIMESTAMP}.sql.gz"

# Cleanup local backup older than 7 days
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}"
```

---

## Redis Setup

### Redis Production Configuration

```bash
# redis.conf
bind 0.0.0.0
protected-mode yes
requirepass strong_redis_password

# Memory management
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec

# Performance
tcp-backlog 511
tcp-keepalive 300
timeout 0

# Logging
loglevel notice
logfile /var/log/redis/redis.log

# Slow log
slowlog-log-slower-than 10000
slowlog-max-len 128
```

### Redis Sentinel Configuration

```bash
# sentinel.conf
port 26379
sentinel monitor mymaster 127.0.0.1 6379 2
sentinel auth-pass mymaster strong_redis_password
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1
```

---

## MinIO/S3 Setup

### MinIO Production Setup

```bash
# Start MinIO
docker run -d \
  --name minio \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=${MINIO_ROOT_USER} \
  -e MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD} \
  -v minio_data:/data \
  minio/minio server /data --console-address ":9001"

# Configure mc client
mc alias set local http://localhost:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD}

# Create buckets
mc mb local/email-converter-uploads
mc mb local/email-converter-processed
mc mb local/email-converter-backups

# Set bucket policy (public read for processed files)
mc anonymous set download local/email-converter-processed

# Enable versioning
mc version enable local/email-converter-uploads

# Set lifecycle rules (auto-delete after 30 days)
cat > /tmp/lifecycle.json << 'EOF'
{
  "Rules": [
    {
      "ID": "cleanup-uploads",
      "Status": "Enabled",
      "Expiration": {
        "Days": 30
      },
      "Filter": {
        "Prefix": "uploads/"
      }
    }
  ]
}
EOF

mc anonymous set-json /tmp/lifecycle.json local/email-converter-uploads
```

---

## Monitoring Stack

### Prometheus Configuration

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

rule_files:
  - "rules/*.yml"

scrape_configs:
  - job_name: 'email-converter-app'
    static_configs:
      - targets: ['app:8000']
    metrics_path: '/metrics'

  - job_name: 'email-converter-worker'
    static_configs:
      - targets: ['worker:8000']
    metrics_path: '/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'celery'
    static_configs:
      - targets: ['flower:5555']
    metrics_path: '/metrics'

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx-exporter:9113']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
```

### Alert Rules

```yaml
# monitoring/rules/alerts.yml
groups:
  - name: application
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "95th percentile latency is {{ $value }}s"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.instance }} is down"

  - name: database
    rules:
      - alert: HighConnections
        expr: pg_stat_activity_count > 180
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High database connections"
          description: "Database has {{ $value }} active connections"

      - alert: SlowQueries
        expr: pg_stat_activity_max_tx_duration{datname!~"template.*"} > 300
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow queries detected"
          description: "Transaction running for {{ $value }}s"

  - name: redis
    rules:
      - alert: RedisHighMemory
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis memory usage high"
          description: "Redis memory usage is {{ $value | humanizePercentage }}"

      - alert: RedisHighEviction
        expr: rate(redis_evicted_keys_total[5m]) > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High Redis eviction rate"
          description: "Redis is evicting {{ $value }} keys/sec"

  - name: celery
    rules:
      - alert: CeleryQueueBacklog
        expr: celery_queue_length > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Celery queue backlog"
          description: "Queue {{ $labels.queue }} has {{ $value }} pending tasks"

      - alert: CeleryTaskFailureRate
        expr: rate(celery_task_failed_total[5m]) / rate(celery_task_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High Celery task failure rate"
          description: "Task failure rate is {{ $value | humanizePercentage }}"
```

### Grafana Dashboards

```json
{
  "dashboard": {
    "title": "Email Converter Overview",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{status}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "p95"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~'5..'}[5m]) / rate(http_requests_total[5m])",
            "legendFormat": "Error %"
          }
        ]
      },
      {
        "title": "Active Users",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(active_users)",
            "legendFormat": "Users"
          }
        ]
      }
    ]
  }
}
```

### Loki Configuration

```yaml
# monitoring/loki.yml
auth_enabled: false

server:
  http_listen_port: 3100

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: "2024-01-01"
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h

analytics:
  reporting_enabled: false
```

---

## Backup Configuration

### Automated Backup Cron Jobs

```bash
# /etc/cron.d/email-converter-backups

# Database backup every 6 hours
0 */6 * * * root /opt/email-converter/scripts/backup_db.sh >> /var/log/backup/db.log 2>&1

# Redis backup every hour
0 * * * * root /opt/email-converter/scripts/backup_redis.sh >> /var/log/backup/redis.log 2>&1

# MinIO/S3 sync daily
0 2 * * * root /opt/email-converter/scripts/sync_s3.sh >> /var/log/backup/s3.log 2>&1

# Cleanup old backups weekly
0 3 * * 0 root /opt/email-converter/scripts/cleanup_backups.sh >> /var/log/backup/cleanup.log 2>&1
```

### Backup Scripts

```bash
#!/bin/bash
# scripts/backup_redis.sh

set -euo pipefail

BACKUP_DIR="/backups/redis"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/redis_${TIMESTAMP}.rdb"

mkdir -p "${BACKUP_DIR}"

# Trigger BGSAVE
redis-cli -a "${REDIS_PASSWORD}" BGSAVE

# Wait for save to complete
while [ "$(redis-cli -a "${REDIS_PASSWORD}" LASTSAVE)" == "${LAST_SAVE}" ]; do
  sleep 1
done

# Copy RDB file
cp /var/lib/redis/dump.rdb "${BACKUP_FILE}"

# Upload to S3
aws s3 cp "${BACKUP_FILE}" "s3://email-converter-backups/redis/${TIMESTAMP}.rdb"

# Cleanup old backups
find "${BACKUP_DIR}" -name "*.rdb" -mtime +7 -delete

echo "Redis backup completed: ${BACKUP_FILE}"
```

---

## Disaster Recovery

### Recovery Procedures

```bash
# 1. Database Recovery
# Restore from latest backup
pg_restore \
  --host=localhost \
  --port=5432 \
  --username=email_converter \
  --dbname=email_converter \
  --clean \
  --if-exists \
  /backups/postgres/latest_backup.sql.gz

# Apply WAL logs for point-in-time recovery (if needed)
recovery_target_time='2024-01-15 10:30:00'

# 2. Redis Recovery
# Restore from RDB/AOF backup
cp /backups/redis/latest_dump.rdb /var/lib/redis/dump.rdb
chown redis:redis /var/lib/redis/dump.rdb
systemctl restart redis

# 3. File Storage Recovery
# Sync from S3 backup bucket
mc mirror s3/email-converter-backups/uploads /var/lib/minio/email-converter-uploads

# 4. Application Recovery
# Redeploy latest version
kubectl rollout restart deployment/email-converter-app -n email-converter

# 5. DNS Failover (if needed)
# Update DNS to point to backup region
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch file://dns_failover.json
```

### RTO/RPO Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| RTO (Recovery Time Objective) | < 1 hour | Automated failover, health checks |
| RPO (Recovery Point Objective) | < 5 minutes | Continuous replication, WAL archiving |
| Availability | 99.9% | Multi-AZ, load balancing, auto-scaling |

---

## Scaling Guide

### Horizontal Scaling

```bash
# Scale app deployment
kubectl scale deployment email-converter-app --replicas=10 -n email-converter

# Scale worker deployment
kubectl scale deployment email-converter-worker --replicas=5 -n email-converter

# HPA is configured for auto-scaling based on:
# - CPU utilization (target: 70%)
# - Memory utilization (target: 80%)
# - Custom metrics (request rate, queue length)
```

### Vertical Scaling

```bash
# Scale RDS instance
aws rds modify-db-instance \
  --db-instance-identifier email-converter-db \
  --db-instance-class db.r6g.2xlarge \
  --apply-immediately

# Scale ElastiCache
aws elasticache modify-cache-cluster \
  --cache-cluster-id email-converter-redis \
  --cache-node-type cache.r6g.xlarge \
  --apply-immediately
```

### Database Connection Pooling

```python
# Connection pool configuration
DATABASE_POOL_SIZE = 20          # Base connections
DATABASE_MAX_OVERFLOW = 10       # Additional connections under load
DATABASE_POOL_TIMEOUT = 30       # Seconds to wait for connection
DATABASE_POOL_RECYCLE = 1800     # Recycle connections after 30 minutes
DATABASE_POOL_PRE_PING = True    # Verify connections before use
```

### Performance Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| CPU Usage | > 70% | > 90% | Scale horizontally |
| Memory Usage | > 80% | > 95% | Scale vertically |
| DB Connections | > 150 | > 180 | Increase pool size |
| Redis Memory | > 70% | > 85% | Increase maxmemory |
| Queue Length | > 500 | > 1000 | Add workers |
| Response Time (p95) | > 1s | > 3s | Optimize queries |

---

*Last updated: July 2026*
