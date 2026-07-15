# =============================================================================
# Dev Environment - Terraform Variables
# =============================================================================

environment = "dev"
aws_region  = "us-east-1"

# Networking
vpc_cidr            = "10.0.0.0/16"
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.20.0/24", "10.0.30.0/24"]
enable_nat_gateway   = true
single_nat_gateway   = true

# EKS
eks_cluster_version    = "1.29"
eks_node_instance_types = ["m6i.large"]
eks_node_min_size      = 1
eks_node_max_size      = 3
eks_node_desired_size  = 2

# RDS
rds_instance_class      = "db.r6g.large"
rds_engine_version      = "16.1"
rds_allocated_storage   = 20
rds_max_allocated_storage = 100

# ElastiCache
elasticache_node_type      = "cache.r6g.large"
elasticache_engine_version = "7.0"

# CloudFront
cloudfront_price_class = "PriceClass_100"

# WAF
waf_rate_limit = 5000
