# =============================================================================
# Root Configuration - Email Converter SaaS
# =============================================================================
# Main Terraform configuration that orchestrates all modules
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

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
    kubectl = {
      source  = "alekc/kubectl"
      version = "~> 2.0"
    }
  }

  backend "s3" {
    # Configured per environment via -backend-config
  }
}

# =============================================================================
# Providers
# =============================================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "email-converter"
      ManagedBy   = "terraform"
      Environment = var.environment
    }
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_ca_certificate)
  token                  = data.aws_eks_cluster_auth.this.token
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_ca_certificate)
    token                  = data.aws_eks_cluster_auth.this.token
  }
}

provider "kubectl" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_ca_certificate)
  token                  = data.aws_eks_cluster_auth.this.token
  load_config_file       = false
}

# =============================================================================
# Data Sources
# =============================================================================

data "aws_eks_cluster_auth" "this" {
  name = module.eks.cluster_name
}

data "aws_caller_identity" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
}

# =============================================================================
# Local Variables
# =============================================================================

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  azs = slice(data.aws_availability_zones.available.names, 0, 3)
}

# =============================================================================
# Modules
# =============================================================================

# KMS Encryption
module "kms" {
  source = "./modules/kms"

  name_prefix = local.name_prefix
  environment = var.environment
}

# Secrets Manager
module "secrets" {
  source = "./modules/secrets"

  name_prefix = local.name_prefix
  environment = var.environment

  db_username       = var.db_username
  db_password       = var.db_password
  redis_auth_token  = var.redis_auth_token
  jwt_secret_key    = var.jwt_secret_key
  stripe_secret_key = var.stripe_secret_key
  sendgrid_api_key  = var.sendgrid_api_key
}

# Networking
module "networking" {
  source = "./modules/networking"

  name_prefix = local.name_prefix
  environment = var.environment

  vpc_cidr             = var.vpc_cidr
  availability_zones   = local.azs
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  enable_nat_gateway   = var.enable_nat_gateway
  single_nat_gateway   = var.environment != "prod"
}

# EKS
module "eks" {
  source = "./modules/eks"

  name_prefix = local.name_prefix
  environment = var.environment

  cluster_version    = var.eks_cluster_version
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids

  node_instance_types = var.eks_node_instance_types
  node_min_size       = var.eks_node_min_size
  node_max_size       = var.eks_node_max_size
  node_desired_size   = var.eks_node_desired_size

  enable_cluster_autoscaler = true
  enable_metrics_server     = true
}

# RDS PostgreSQL
module "rds" {
  source = "./modules/rds"

  name_prefix = local.name_prefix
  environment = var.environment

  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  eks_security_group = module.eks.node_security_group_id

  instance_class    = var.rds_instance_class
  engine_version    = var.rds_engine_version
  allocated_storage = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  multi_az               = var.environment == "prod"
  backup_retention_period = var.environment == "prod" ? 30 : 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  enable_read_replica   = var.environment == "prod"
  read_replica_count    = var.environment == "prod" ? 1 : 0

  performance_insights_enabled = true
  monitoring_interval          = 60

  deletion_protection = var.environment == "prod"
  skip_final_snapshot = var.environment != "prod"
}

# ElastiCache Redis
module "elasticache" {
  source = "./modules/elasticache"

  name_prefix = local.name_prefix
  environment = var.environment

  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  eks_security_group = module.eks.node_security_group_id

  node_type       = var.elasticache_node_type
  engine_version  = var.elasticache_engine_version
  num_cache_nodes = var.environment == "prod" ? 2 : 1

  auth_token        = var.redis_auth_token
  transit_encryption = true

  automatic_failover_enabled = var.environment == "prod"
  multi_az_enabled          = var.environment == "prod"

  snapshot_retention_limit = var.environment == "prod" ? 7 : 1
  snapshot_window         = "03:00-05:00"
}

# S3 Buckets
module "s3" {
  source = "./modules/s3"

  name_prefix = local.name_prefix
  environment = var.environment

  enable_versioning     = true
  enable_lifecycle      = true
  lifecycle_rules       = var.s3_lifecycle_rules
  enable_access_logging = var.environment == "prod"

  force_destroy = var.environment != "prod"
}

# CloudFront
module "cloudfront" {
  source = "./modules/cloudfront"

  name_prefix = local.name_prefix
  environment = var.environment

  domain_name         = var.domain_name
  api_origin_domain   = module.eks.api_service_hostname
  s3_origin_domain    = module.s3.uploads_bucket_regional_domain_name
  acm_certificate_arn = module.route53.acm_certificate_arn

  price_class = var.cloudfront_price_class
}

# Route53
module "route53" {
  source = "./modules/route53"

  name_prefix = local.name_prefix
  environment = var.environment

  domain_name = var.domain_name

  cloudfront_distribution_domain = module.cloudfront.distribution_domain
  api_lb_dns_name               = module.eks.api_lb_dns_name
  api_lb_zone_id                = module.eks.api_lb_zone_id

  create_acm_certificate = true
}

# WAF
module "waf" {
  source = "./modules/waf"

  name_prefix = local.name_prefix
  environment = var.environment

  cloudfront_distribution_arn = module.cloudfront.distribution_arn
  api_lb_arn                  = module.eks.api_lb_arn

  enable_rate_limiting    = true
  rate_limit              = var.waf_rate_limit
  blocked_ip_addresses   = var.waf_blocked_ip_countries
}

# IAM
module "iam" {
  source = "./modules/iam"

  name_prefix = local.name_prefix
  environment = var.environment

  eks_cluster_oidc_issuer = module.eks.oidc_issuer
  eks_cluster_name        = module.eks.cluster_name

  s3_bucket_arn         = module.s3.uploads_bucket_arn
  secrets_manager_arn   = module.secrets.secret_arn
  kms_key_arn          = module.kms.key_arn
}

# Monitoring
module "monitoring" {
  source = "./modules/monitoring"

  name_prefix = local.name_prefix
  environment = var.environment

  eks_cluster_name = module.eks.cluster_name
  rds_instance_id  = module.rds.instance_id
  elasticache_cluster_id = module.elasticache.cluster_id

  enable_xray        = true
  enable_cloudwatch  = true
  log_retention_days = var.environment == "prod" ? 90 : 30

  sns_topic_arn = var.alert_sns_topic_arn
}
