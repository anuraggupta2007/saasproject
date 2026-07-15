# =============================================================================
# Root Outputs - Email Converter SaaS
# =============================================================================

# =============================================================================
# Networking
# =============================================================================

output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = module.networking.vpc_cidr
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.networking.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.networking.private_subnet_ids
}

# =============================================================================
# EKS
# =============================================================================

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_ca_certificate" {
  description = "EKS cluster CA certificate (base64)"
  value       = module.eks.cluster_ca_certificate
  sensitive   = true
}

output "eks_oidc_issuer" {
  description = "EKS OIDC issuer URL"
  value       = module.eks.oidc_issuer
}

# =============================================================================
# RDS
# =============================================================================

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.endpoint
}

output "rds_reader_endpoint" {
  description = "RDS reader endpoint"
  value       = module.rds.reader_endpoint
}

output "rds_port" {
  description = "RDS port"
  value       = module.rds.port
}

# =============================================================================
# ElastiCache
# =============================================================================

output "elasticache_endpoint" {
  description = "ElastiCache primary endpoint"
  value       = module.elasticache.primary_endpoint
}

output "elasticache_reader_endpoint" {
  description = "ElastiCache reader endpoint"
  value       = module.elasticache.reader_endpoint
}

output "elasticache_port" {
  description = "ElastiCache port"
  value       = module.elasticache.port
}

# =============================================================================
# S3
# =============================================================================

output "s3_uploads_bucket_name" {
  description = "S3 uploads bucket name"
  value       = module.s3.uploads_bucket_name
}

output "s3_uploads_bucket_arn" {
  description = "S3 uploads bucket ARN"
  value       = module.s3.uploads_bucket_arn
}

output "s3_logs_bucket_name" {
  description = "S3 logs bucket name"
  value       = module.s3.logs_bucket_name
}

# =============================================================================
# CloudFront
# =============================================================================

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.cloudfront.distribution_id
}

output "cloudfront_distribution_domain" {
  description = "CloudFront distribution domain"
  value       = module.cloudfront.distribution_domain
}

# =============================================================================
# Route53
# =============================================================================

output "route53_zone_id" {
  description = "Route53 hosted zone ID"
  value       = module.route53.zone_id
}

output "acm_certificate_arn" {
  description = "ACM certificate ARN"
  value       = module.route53.acm_certificate_arn
}

# =============================================================================
# WAF
# =============================================================================

output "waf_web_acl_arn" {
  description = "WAF Web ACL ARN"
  value       = module.waf.web_acl_arn
}

# =============================================================================
# Secrets Manager
# =============================================================================

output "secrets_manager_arn" {
  description = "Secrets Manager secret ARN"
  value       = module.secrets.secret_arn
}

# =============================================================================
# KMS
# =============================================================================

output "kms_key_arn" {
  description = "KMS key ARN"
  value       = module.kms.key_arn
}

output "kms_key_id" {
  description = "KMS key ID"
  value       = module.kms.key_id
}

# =============================================================================
# Connection Strings (for kubectl / helm)
# =============================================================================

output "database_url" {
  description = "Database connection URL"
  value       = "postgresql+asyncpg://${var.db_username}:${var.db_password}@${module.rds.endpoint}/${var.db_name}"
  sensitive   = true
}

output "redis_url" {
  description = "Redis connection URL"
  value       = "redis://:${var.redis_auth_token}@${module.elasticache.primary_endpoint}:6379/0"
  sensitive   = true
}

output "s3_endpoint" {
  description = "S3 endpoint URL"
  value       = "https://s3.${var.aws_region}.amazonaws.com"
}
