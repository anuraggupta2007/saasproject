# =============================================================================
# Staging Environment - Terraform Variables
# =============================================================================

environment = "staging"
aws_region  = "us-east-1"

# Networking
vpc_cidr            = "10.1.0.0/16"
public_subnet_cidrs  = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
private_subnet_cidrs = ["10.1.10.0/24", "10.1.20.0/24", "10.1.30.0/24"]
enable_nat_gateway   = true
single_nat_gateway   = true

# EKS
eks_cluster_version    = "1.29"
eks_node_instance_types = ["m6i.xlarge"]
eks_node_min_size      = 2
eks_node_max_size      = 5
eks_node_desired_size  = 3

# RDS
rds_instance_class      = "db.r6g.xlarge"
rds_engine_version      = "16.1"
rds_allocated_storage   = 50
rds_max_allocated_storage = 200

# ElastiCache
elasticache_node_type      = "cache.r6g.large"
elasticache_engine_version = "7.0"

# CloudFront
cloudfront_price_class = "PriceClass_100"

# WAF
waf_rate_limit = 3000
