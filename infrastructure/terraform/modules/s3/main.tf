# =============================================================================
# S3 Module
# =============================================================================
# Creates S3 buckets with versioning, lifecycle policies, encryption
# =============================================================================

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# =============================================================================
# Variables
# =============================================================================

variable "name_prefix" {
  description = "Name prefix for resources"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "enable_versioning" {
  description = "Enable bucket versioning"
  type        = bool
  default     = true
}

variable "enable_lifecycle" {
  description = "Enable lifecycle rules"
  type        = bool
  default     = true
}

variable "lifecycle_rules" {
  description = "Lifecycle rules"
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
  default = []
}

variable "enable_access_logging" {
  description = "Enable access logging"
  type        = bool
  default     = false
}

variable "force_destroy" {
  description = "Force destroy bucket"
  type        = bool
  default     = false
}

# =============================================================================
# Uploads Bucket
# =============================================================================

resource "aws_s3_bucket" "uploads" {
  bucket        = "${var.name_prefix}-uploads"
  force_destroy = var.force_destroy

  tags = {
    Name = "${var.name_prefix}-uploads"
  }
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Suspended"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  count  = var.enable_lifecycle ? 1 : 0
  bucket = aws_s3_bucket.uploads.id

  dynamic "rule" {
    for_each = var.lifecycle_rules

    content {
      id     = rule.value.id
      status = rule.value.enabled ? "Enabled" : "Disabled"

      filter {
        prefix = rule.value.prefix
      }

      transition {
        days          = rule.value.transition_days
        storage_class = rule.value.transition_storage_class
      }

      transition {
        days          = rule.value.glacier_transition_days
        storage_class = "GLACIER"
      }

      expiration {
        days = rule.value.expiration_days
      }

      noncurrent_version_expiration {
        noncurrent_days = rule.value.noncurrent_version_expiration
      }
    }
  }
}

# =============================================================================
# Logs Bucket
# =============================================================================

resource "aws_s3_bucket" "logs" {
  count         = var.enable_access_logging ? 1 : 0
  bucket        = "${var.name_prefix}-logs"
  force_destroy = var.force_destroy

  tags = {
    Name = "${var.name_prefix}-logs"
  }
}

resource "aws_s3_bucket_versioning" "logs" {
  count  = var.enable_access_logging ? 1 : 0
  bucket = aws_s3_bucket.logs[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  count  = var.enable_access_logging ? 1 : 0
  bucket = aws_s3_bucket.logs[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "logs" {
  count  = var.enable_access_logging ? 1 : 0
  bucket = aws_s3_bucket.logs[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  count  = var.enable_access_logging ? 1 : 0
  bucket = aws_s3_bucket.logs[0].id

  rule {
    id     = "expire-old-logs"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    expiration {
      days = 90
    }
  }
}

# =============================================================================
# KMS Key for S3
# =============================================================================

resource "aws_kms_key" "s3" {
  description             = "KMS key for S3 encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name = "${var.name_prefix}-s3-kms"
  }
}

resource "aws_kms_alias" "s3" {
  name          = "alias/${var.name_prefix}-s3"
  target_key_id = aws_kms_key.s3.key_id
}

# =============================================================================
# Outputs
# =============================================================================

output "uploads_bucket_name" {
  description = "Uploads bucket name"
  value       = aws_s3_bucket.uploads.id
}

output "uploads_bucket_arn" {
  description = "Uploads bucket ARN"
  value       = aws_s3_bucket.uploads.arn
}

output "uploads_bucket_regional_domain_name" {
  description = "Uploads bucket regional domain name"
  value       = aws_s3_bucket.uploads.bucket_regional_domain_name
}

output "logs_bucket_name" {
  description = "Logs bucket name"
  value       = var.enable_access_logging ? aws_s3_bucket.logs[0].id : ""
}

output "logs_bucket_arn" {
  description = "Logs bucket ARN"
  value       = var.enable_access_logging ? aws_s3_bucket.logs[0].arn : ""
}

output "kms_key_arn" {
  description = "KMS key ARN"
  value       = aws_kms_key.s3.arn
}
