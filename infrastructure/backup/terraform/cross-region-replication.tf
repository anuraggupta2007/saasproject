terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "primary_region" {
  description = "Primary AWS region"
  type        = string
  default     = "us-east-1"
}

variable "secondary_region" {
  description = "Secondary AWS region for DR"
  type        = string
  default     = "us-west-2"
}

variable "prefix" {
  description = "Resource name prefix"
  type        = string
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 90
}

variable "backup_glacier_transition_days" {
  description = "Days before transitioning to Glacier"
  type        = number
  default     = 30
}

variable "backup_deep_archive_days" {
  description = "Days before transitioning to Deep Archive"
  type        = number
  default     = 90
}

variable "tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}

# =============================================================================
# KMS Key for Backup Encryption (Primary Region)
# =============================================================================
resource "aws_kms_key" "backup" {
  description             = "KMS key for backup encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = merge(var.tags, {
    Name        = "${var.prefix}-backup-key"
    Environment = "backup"
  })
}

resource "aws_kms_alias" "backup" {
  name          = "alias/${var.prefix}-backup"
  target_key_id = aws_kms_key.backup.key_id
}

# =============================================================================
# KMS Key for Backup Encryption (Secondary Region)
# =============================================================================
provider "aws" {
  alias  = "secondary"
  region = var.secondary_region
}

resource "aws_kms_key" "backup_secondary" {
  provider            = aws.secondary
  description         = "KMS key for backup encryption in secondary region"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = merge(var.tags, {
    Name        = "${var.prefix}-backup-key-secondary"
    Environment = "backup"
  })
}

resource "aws_kms_alias" "backup_secondary" {
  provider      = aws.secondary
  name          = "alias/${var.prefix}-backup-secondary"
  target_key_id = aws_kms_key.backup_secondary.key_id
}

# =============================================================================
# S3 Backup Bucket (Primary Region)
# =============================================================================
resource "aws_s3_bucket" "backup" {
  bucket = "${var.prefix}-backups"

  tags = merge(var.tags, {
    Name        = "${var.prefix}-backups"
    Environment = "backup"
  })
}

resource "aws_s3_bucket_versioning" "backup" {
  bucket = aws_s3_bucket.backup.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backup" {
  bucket = aws_s3_bucket.backup.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.backup.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "backup" {
  bucket = aws_s3_bucket.backup.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "backup" {
  bucket = aws_s3_bucket.backup.id

  rule {
    id     = "backup-lifecycle"
    status = "Enabled"

    transition {
      days          = var.backup_glacier_transition_days
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = var.backup_deep_archive_days
      storage_class = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = var.backup_retention_days
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  rule {
    id     = "cleanup-incomplete-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

resource "aws_s3_bucket_object_lock_configuration" "backup" {
  bucket = aws_s3_bucket.backup.id

  rule {
    default_retention {
      mode = "GOVERNANCE"
      days = var.backup_retention_days
    }
  }
}

# =============================================================================
# S3 Backup Bucket (Secondary Region - DR)
# =============================================================================
resource "aws_s3_bucket" "backup_secondary" {
  provider = aws.secondary
  bucket   = "${var.prefix}-backups-dr"

  tags = merge(var.tags, {
    Name        = "${var.prefix}-backups-dr"
    Environment = "backup-dr"
  })
}

resource "aws_s3_bucket_versioning" "backup_secondary" {
  provider = aws.secondary
  bucket   = aws_s3_bucket.backup_secondary.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backup_secondary" {
  provider = aws.secondary
  bucket   = aws_s3_bucket.backup_secondary.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.backup_secondary.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "backup_secondary" {
  provider = aws.secondary
  bucket   = aws_s3_bucket.backup_secondary.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "backup_secondary" {
  provider = aws.secondary
  bucket   = aws_s3_bucket.backup_secondary.id

  rule {
    id     = "backup-lifecycle"
    status = "Enabled"

    transition {
      days          = var.backup_glacier_transition_days
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = var.backup_deep_archive_days
      storage_class = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = var.backup_retention_days
    }
  }
}

# =============================================================================
# Cross-Region Replication Role
# =============================================================================
resource "aws_iam_role" "replication" {
  name = "${var.prefix}-s3-replication-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_policy" "replication" {
  name = "${var.prefix}-s3-replication-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.backup.arn,
          aws_s3_bucket.backup_secondary.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Resource = "${aws_s3_bucket.backup.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Resource = "${aws_s3_bucket.backup_secondary.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = aws_kms_key.backup.arn
        Condition = {
          StringEquals = {
            "kms:ViaS3" = "true"
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Encrypt"
        ]
        Resource = aws_kms_key.backup_secondary.arn
        Condition = {
          StringEquals = {
            "kms:ViaS3" = "true"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "replication" {
  role       = aws_iam_role.replication.name
  policy_arn = aws_iam_policy.replication.arn
}

# =============================================================================
# Cross-Region Replication Configuration
# =============================================================================
resource "aws_s3_bucket_replication_configuration" "backup" {
  depends_on = [aws_s3_bucket_versioning.backup]
  role       = aws_iam_role.replication.arn
  bucket     = aws_s3_bucket.backup.id

  rule {
    id     = "cross-region-replication"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.backup_secondary.arn
      storage_class = "STANDARD_IA"

      encryption_configuration {
        replica_kms_key_id = aws_kms_key.backup_secondary.arn
      }

      metrics {
        status = "Enabled"
        event_threshold {
          minutes = 15
        }
      }

      replication_time {
        status = "Enabled"
        time {
          minutes = 15
        }
      }
    }

    source_selection_criteria {
      sse_kms_encrypted_objects {
        status = "Enabled"
      }
    }

    filter {
      prefix = ""
    }
  }
}

# =============================================================================
# S3 Access Logging Bucket
# =============================================================================
resource "aws_s3_bucket" "backup_logs" {
  bucket = "${var.prefix}-backup-logs"

  tags = merge(var.tags, {
    Name        = "${var.prefix}-backup-logs"
    Environment = "backup"
  })
}

resource "aws_s3_bucket_versioning" "backup_logs" {
  bucket = aws_s3_bucket.backup_logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backup_logs" {
  bucket = aws_s3_bucket.backup_logs.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "backup_logs" {
  bucket = aws_s3_bucket.backup_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "backup_logs" {
  bucket = aws_s3_bucket.backup_logs.id

  rule {
    id     = "log-lifecycle"
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

resource "aws_s3_bucket_logging" "backup" {
  bucket = aws_s3_bucket.backup.id

  target_bucket = aws_s3_bucket.backup_logs.id
  target_prefix = "backup-access-logs/"
}

# =============================================================================
# IAM User for Backup Operations
# =============================================================================
resource "aws_iam_user" "backup" {
  name = "${var.prefix}-backup-user"
  path = "/backup/"

  tags = var.tags
}

resource "aws_iam_access_key" "backup" {
  user = aws_iam_user.backup.name
}

resource "aws_iam_user_policy" "backup" {
  name = "${var.prefix}-backup-policy"
  user = aws_iam_user.backup.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = [
          aws_s3_bucket.backup.arn,
          "${aws_s3_bucket.backup.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.backup.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetBucketVersioning",
          "s3:PutBucketVersioning"
        ]
        Resource = aws_s3_bucket.backup.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectLockConfiguration",
          "s3:PutObjectLockConfiguration"
        ]
        Resource = aws_s3_bucket.backup.arn
      }
    ]
  })
}

# =============================================================================
# CloudWatch Alarms for Backup Monitoring
# =============================================================================
resource "aws_sns_topic" "backup_alerts" {
  name = "${var.prefix}-backup-alerts"
  tags = var.tags
}

resource "aws_sns_topic_subscription" "backup_email" {
  count     = var.backup_alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.backup_alerts.arn
  protocol  = "email"
  endpoint  = var.backup_alert_email
}

variable "backup_alert_email" {
  description = "Email address for backup alerts"
  type        = string
  default     = ""
}

# CloudWatch Log Group for backup operations
resource "aws_cloudwatch_log_group" "backup" {
  name              = "/backup/${var.prefix}"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.backup.arn

  tags = var.tags
}

# Metric filter for backup failures
resource "aws_cloudwatch_log_metric_filter" "backup_failure" {
  name           = "${var.prefix}-backup-failure"
  log_group_name = aws_cloudwatch_log_group.backup.name
  pattern        = "[timestamp, level=ERROR, ...]"

  metric_transformation {
    name          = "BackupFailureCount"
    namespace     = "EmailConverter/Backup"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_metric_alarm" "backup_failure" {
  alarm_name          = "${var.prefix}-backup-failure-alarm"
  alarm_description   = "Backup operation failed"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "BackupFailureCount"
  namespace           = "EmailConverter/Backup"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_actions       = [aws_sns_topic.backup_alerts.arn]
  ok_actions          = [aws_sns_topic.backup_alerts.arn]
  treat_missing_data  = "notBreaching"

  tags = var.tags
}

# RDS Snapshot monitoring
resource "aws_cloudwatch_metric_alarm" "rds_backup_age" {
  alarm_name          = "${var.prefix}-rds-backup-age"
  alarm_description   = "RDS automated backup is older than expected"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "BackupStorageUsed"
  namespace           = "AWS/RDS"
  period              = 3600
  statistic           = "Maximum"
  threshold           = 0
  alarm_actions       = [aws_sns_topic.backup_alerts.arn]
  treat_missing_data  = "breaching"

  tags = var.tags
}

# =============================================================================
# Outputs
# =============================================================================
output "backup_bucket_id" {
  description = "Primary backup bucket ID"
  value       = aws_s3_bucket.backup.id
}

output "backup_bucket_arn" {
  description = "Primary backup bucket ARN"
  value       = aws_s3_bucket.backup.arn
}

output "backup_dr_bucket_id" {
  description = "DR backup bucket ID"
  value       = aws_s3_bucket.backup_secondary.id
}

output "backup_dr_bucket_arn" {
  description = "DR backup bucket ARN"
  value       = aws_s3_bucket.backup_secondary.arn
}

output "backup_kms_key_arn" {
  description = "Backup KMS key ARN"
  value       = aws_kms_key.backup.arn
}

output "backup_kms_key_id" {
  description = "Backup KMS key ID"
  value       = aws_kms_key.backup.key_id
}

output "backup_dr_kms_key_arn" {
  description = "DR backup KMS key ARN"
  value       = aws_kms_key.backup_secondary.arn
}

output "backup_user_access_key" {
  description = "Backup IAM user access key"
  value       = aws_iam_access_key.backup.id
  sensitive   = true
}

output "backup_user_secret_key" {
  description = "Backup IAM user secret key"
  value       = aws_iam_access_key.backup.secret
  sensitive   = true
}

output "backup_sns_topic_arn" {
  description = "Backup alerts SNS topic ARN"
  value       = aws_sns_topic.backup_alerts.arn
}

output "backup_log_group_name" {
  description = "Backup CloudWatch log group"
  value       = aws_cloudwatch_log_group.backup.name
}
