# =============================================================================
# AWS Cloud Infrastructure - Email Converter SaaS
# =============================================================================
# Production-grade AWS infrastructure with Terraform
# =============================================================================

## Overview

Production-grade AWS infrastructure with:
- **Networking**: VPC with public/private subnets, NAT Gateway, NACLs
- **Compute**: EKS cluster with managed node groups
- **Database**: RDS PostgreSQL with Multi-AZ and read replicas
- **Cache**: ElastiCache Redis with automatic failover
- **Storage**: S3 with versioning, lifecycle policies, encryption
- **CDN**: CloudFront with SSL/TLS
- **DNS**: Route53 with ACM certificates
- **Security**: WAF, KMS, Secrets Manager, IRSA
- **Monitoring**: CloudWatch, X-Ray

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              AWS CLOUD                                  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                        VPC (10.2.0.0/16)                        │    │
│  │                                                                 │    │
│  │  ┌─────────────────────────────────────────────────────────┐    │    │
│  │  │              PUBLIC SUBNETS (3 AZs)                      │    │    │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐               │    │    │
│  │  │  │   ALB    │  │   NAT    │  │   NAT    │               │    │    │
│  │  │  └──────────┘  └──────────┘  └──────────┘               │    │    │
│  │  └─────────────────────────────────────────────────────────┘    │    │
│  │                                                                 │    │
│  │  ┌─────────────────────────────────────────────────────────┐    │    │
│  │  │              PRIVATE SUBNETS (3 AZs)                     │    │    │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐               │    │    │
│  │  │  │   EKS    │  │   RDS    │  │ ElastiCache│              │    │    │
│  │  │  │  Nodes   │  │ Primary  │  │  Primary  │              │    │    │
│  │  │  └──────────┘  └──────────┘  └──────────┘               │    │    │
│  │  └─────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    MANAGED SERVICES                              │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │    │
│  │  │CloudFront│  │ Route53  │  │    S3    │  │   WAF    │       │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Create S3 Backend (first time only)

```bash
cd infrastructure/terraform/global/s3-backend
terraform init
terraform apply
```

### 2. Deploy Dev Environment

```bash
cd infrastructure/terraform/environments/dev
terraform init \
  -backend-config="bucket=email-converter-terraform-state-us-east-1" \
  -backend-config="key=dev/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=email-converter-terraform-lock"

terraform plan -var-file="terraform.tfvars"
terraform apply -var-file="terraform.tfvars"
```

### 3. Deploy Prod Environment

```bash
cd infrastructure/terraform/environments/prod
terraform init \
  -backend-config="bucket=email-converter-terraform-state-us-east-1" \
  -backend-config="key=prod/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=email-converter-terraform-lock"

terraform plan -var-file="terraform.tfvars"
terraform apply -var-file="terraform.tfvars"
```

## File Structure

```
infrastructure/
└── terraform/
    ├── global/
    │   └── s3-backend/
    │       └── main.tf                    # S3 state bucket + DynamoDB
    ├── modules/
    │   ├── networking/
    │   │   └── main.tf                    # VPC, subnets, NAT, NACLs
    │   ├── eks/
    │   │   └── main.tf                    # EKS cluster, node groups, IRSA
    │   ├── rds/
    │   │   └── main.tf                    # PostgreSQL, Multi-AZ, replicas
    │   ├── elasticache/
    │   │   └── main.tf                    # Redis, failover, encryption
    │   ├── s3/
    │   │   └── main.tf                    # Buckets, lifecycle, versioning
    │   ├── cloudfront/
    │   │   └── main.tf                    # CDN, SSL, caching
    │   ├── route53/
    │   │   └── main.tf                    # DNS, ACM certificates
    │   ├── waf/
    │   │   └── main.tf                    # WAF rules, rate limiting
    │   ├── secrets/
    │   │   └── main.tf                    # Secrets Manager
    │   ├── kms/
    │   │   └── main.tf                    # KMS encryption keys
    │   ├── iam/
    │   │   └── main.tf                    # IAM roles for IRSA
    │   └── monitoring/
    │       └── main.tf                    # CloudWatch, X-Ray, SNS
    └── environments/
        ├── dev/
        │   ├── main.tf                    # Dev environment
        │   ├── variables.tf               # Dev variables
        │   ├── outputs.tf                 # Dev outputs
        │   └── terraform.tfvars           # Dev values
        ├── staging/
        │   ├── main.tf
        │   ├── variables.tf
        │   ├── outputs.tf
        │   └── terraform.tfvars
        └── prod/
            ├── main.tf
            ├── variables.tf
            ├── outputs.tf
            └── terraform.tfvars
```

## Modules

| Module | Purpose | Key Resources |
|--------|---------|---------------|
| `networking` | VPC infrastructure | VPC, Subnets, NAT, NACLs, Flow Logs |
| `eks` | Kubernetes cluster | EKS, Node Groups, OIDC, IRSA |
| `rds` | PostgreSQL database | RDS, Multi-AZ, Read Replicas |
| `elasticache` | Redis cache | ElastiCache, Failover, Encryption |
| `s3` | Object storage | S3 Buckets, Lifecycle, Versioning |
| `cloudfront` | CDN | Distribution, SSL, Caching |
| `route53` | DNS | Hosted Zone, ACM, Records |
| `waf` | Security | WAF Rules, Rate Limiting |
| `secrets` | Secret management | Secrets Manager |
| `kms` | Encryption | KMS Keys |
| `iam` | Access control | IAM Roles for IRSA |
| `monitoring` | Observability | CloudWatch, X-Ray, SNS |

## Environment Comparison

| Feature | Dev | Staging | Prod |
|---------|-----|---------|------|
| VPC CIDR | 10.0.0.0/16 | 10.1.0.0/16 | 10.2.0.0/16 |
| NAT Gateway | Single | Single | Per-AZ |
| EKS Nodes | 1-3 | 2-5 | 3-10 |
| RDS Instance | db.r6g.large | db.r6g.xlarge | db.r6g.2xlarge |
| RDS Multi-AZ | No | No | Yes |
| RDS Read Replicas | 0 | 0 | 1 |
| ElastiCache | Single | Single | Multi-AZ |
| Backup Retention | 7 days | 7 days | 30 days |
| Deletion Protection | No | No | Yes |
| WAF Rate Limit | 5000 | 3000 | 2000 |

## Required Variables

| Variable | Description | Sensitive |
|----------|-------------|-----------|
| `db_username` | Database username | Yes |
| `db_password` | Database password | Yes |
| `redis_auth_token` | Redis auth token | Yes |
| `jwt_secret_key` | JWT secret key | Yes |
| `stripe_secret_key` | Stripe API key | Yes |
| `sendgrid_api_key` | SendGrid API key | Yes |

## Outputs

| Output | Description |
|--------|-------------|
| `eks_cluster_name` | EKS cluster name |
| `eks_cluster_endpoint` | EKS API endpoint |
| `rds_endpoint` | RDS primary endpoint |
| `elasticache_endpoint` | Redis primary endpoint |
| `s3_uploads_bucket_name` | S3 uploads bucket |
| `cloudfront_distribution_domain` | CloudFront domain |
| `route53_zone_id` | Route53 zone ID |
| `kms_key_arn` | KMS key ARN |

## Cost Optimization

- **Single NAT Gateway** for non-prod environments
- **Spot Instances** for non-critical workloads
- **S3 Lifecycle Policies** for data archival
- **Right-sized instances** per environment
- **Auto Scaling** for EKS nodes

## Security

- **Encryption at rest** (KMS) for RDS, ElastiCache, S3
- **Encryption in transit** (TLS) for all services
- **Private subnets** for all workloads
- **WAF** for DDoS protection and rate limiting
- **IRSA** for pod-level IAM permissions
- **Secrets Manager** for credential management
- **VPC Flow Logs** for network monitoring

## Disaster Recovery

- **RDS**: Automated backups + point-in-time recovery
- **ElastiCache**: Automatic failover + snapshots
- **S3**: Versioning + cross-region replication
- **EKS**: Multi-AZ node groups

## Troubleshooting

```bash
# Check EKS cluster
aws eks describe-cluster --name email-converter-prod-eks

# Check RDS
aws rds describe-db-instances --db-instance-identifier email-converter-prod-postgres

# Check ElastiCache
aws elasticache describe-cache-clusters --cache-cluster-id email-converter-prod-redis

# Get kubeconfig
aws eks update-kubeconfig --name email-converter-prod-eks --region us-east-1
```
