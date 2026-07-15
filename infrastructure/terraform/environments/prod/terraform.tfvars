# =============================================================================
# Prod Environment - Terraform Variables
# =============================================================================

environment = "prod"
aws_region  = "us-east-1"

# Networking
vpc_cidr            = "10.2.0.0/16"
public_subnet_cidrs  = ["10.2.1.0/24", "10.2.2.0/24", "10.2.3.0/24"]
private_subnet_cidrs = ["10.2.10.0/24", "10.2.20.0/24", "10.2.30.0/24"]
enable_nat_gateway   = true
single_nat_gateway   = false

# EKS
eks_cluster_version    = "1.29"
eks_node_instance_types = ["m6i.xlarge", "m6i.2xlarge"]
eks_node_min_size      = 3
eks_node_max_size      = 10
eks_node_desired_size  = 5

# RDS
rds_instance_class      = "db.r6g.2xlarge"
rds_engine_version      = "16.1"
rds_allocated_storage   = 100
rds_max_allocated_storage = 1000

# ElastiCache
elasticache_node_type      = "cache.r6g.xlarge"
elasticache_engine_version = "7.0"

# CloudFront
cloudfront_price_class = "PriceClass_100"

# WAF
waf_rate_limit = 2000
