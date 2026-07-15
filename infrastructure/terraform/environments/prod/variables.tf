# =============================================================================
# Root Variables - Email Converter SaaS
# =============================================================================

# =============================================================================
# General
# =============================================================================

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "email-converter"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# =============================================================================
# Networking
# =============================================================================

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.20.0/24", "10.0.30.0/24"]
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

# =============================================================================
# EKS
# =============================================================================

variable "eks_cluster_version" {
  description = "EKS cluster version"
  type        = string
  default     = "1.29"
}

variable "eks_node_instance_types" {
  description = "EKS node instance types"
  type        = list(string)
  default     = ["m6i.xlarge", "m6i.2xlarge"]
}

variable "eks_node_min_size" {
  description = "EKS node group minimum size"
  type        = number
  default     = 2
}

variable "eks_node_max_size" {
  description = "EKS node group maximum size"
  type        = number
  default     = 10
}

variable "eks_node_desired_size" {
  description = "EKS node group desired size"
  type        = number
  default     = 3
}

# =============================================================================
# RDS
# =============================================================================

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r6g.xlarge"
}

variable "rds_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "16.1"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage (GB)"
  type        = number
  default     = 50
}

variable "rds_max_allocated_storage" {
  description = "RDS max allocated storage (GB)"
  type        = number
  default     = 500
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "email_converter"
}

variable "db_username" {
  description = "Database username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

# =============================================================================
# ElastiCache
# =============================================================================

variable "elasticache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.r6g.large"
}

variable "elasticache_engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

variable "redis_auth_token" {
  description = "Redis auth token"
  type        = string
  sensitive   = true
}

# =============================================================================
# S3
# =============================================================================

variable "s3_lifecycle_rules" {
  description = "S3 lifecycle rules"
  type = list(object({
    id                            = string
    enabled                       = bool
    prefix                        = string
    transition_days               = optional(number, 90)
    transition_storage_class      = optional(string, "STANDARD_IA")
    glacier_transition_days       = optional(number, 180)
    expiration_days               = optional(number, 365)
    noncurrent_version_expiration = optional(number, 90)
  }))
  default = [
    {
      id         = "uploads-lifecycle"
      enabled    = true
      prefix     = "uploads/"
      transition_days = 90
      expiration_days = 365
    }
  ]
}

# =============================================================================
# CloudFront
# =============================================================================

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "emailconverter.com"
}

variable "cloudfront_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"
}

# =============================================================================
# WAF
# =============================================================================

variable "waf_rate_limit" {
  description = "WAF rate limit per IP"
  type        = number
  default     = 2000
}

variable "waf_blocked_ip_countries" {
  description = "Countries to block in WAF"
  type        = list(string)
  default     = []
}

# =============================================================================
# Secrets
# =============================================================================

variable "jwt_secret_key" {
  description = "JWT secret key"
  type        = string
  sensitive   = true
}

variable "stripe_secret_key" {
  description = "Stripe secret key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "sendgrid_api_key" {
  description = "SendGrid API key"
  type        = string
  sensitive   = true
  default     = ""
}

# =============================================================================
# Monitoring
# =============================================================================

variable "alert_sns_topic_arn" {
  description = "SNS topic ARN for alerts"
  type        = string
  default     = ""
}
