# =============================================================================
# IAM Module
# =============================================================================
# Creates IAM roles for EKS IRSA (Service Accounts)
# =============================================================================

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "name_prefix" { type = string }
variable "environment" { type = string }
variable "eks_cluster_oidc_issuer" { type = string }
variable "eks_cluster_name" { type = string }
variable "s3_bucket_arn" { type = string }
variable "secrets_manager_arn" { type = string }
variable "kms_key_arn" { type = string }

# OIDC Provider Data
data "aws_iam_openid_connect_provider" "eks" {
  url = "https://oidc.eks.${data.aws_region.current.name}.amazonaws.com/id/${split("/", var.eks_cluster_oidc_issuer)[4]}"
}

data "aws_region" "current" {}

# =============================================================================
# S3 Access Role (for API Service Account)
# =============================================================================

resource "aws_iam_role" "s3_access" {
  name = "${var.name_prefix}-s3-access"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = data.aws_iam_openid_connect_provider.eks.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${split("/", var.eks_cluster_oidc_issuer)[4]}:sub" = "system:serviceaccount:email-converter:api"
            "${split("/", var.eks_cluster_oidc_issuer)[4]}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "s3_access" {
  name = "${var.name_prefix}-s3-access"
  role = aws_iam_role.s3_access.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          var.s3_bucket_arn,
          "${var.s3_bucket_arn}/*"
        ]
      }
    ]
  })
}

# =============================================================================
# Secrets Access Role (for API Service Account)
# =============================================================================

resource "aws_iam_role" "secrets_access" {
  name = "${var.name_prefix}-secrets-access"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = data.aws_iam_openid_connect_provider.eks.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${split("/", var.eks_cluster_oidc_issuer)[4]}:sub" = "system:serviceaccount:email-converter:api"
            "${split("/", var.eks_cluster_oidc_issuer)[4]}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "secrets_access" {
  name = "${var.name_prefix}-secrets-access"
  role = aws_iam_role.secrets_access.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = var.secrets_manager_arn
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = var.kms_key_arn
      }
    ]
  })
}

# =============================================================================
# Outputs
# =============================================================================

output "s3_access_role_arn" {
  value = aws_iam_role.s3_access.arn
}

output "secrets_access_role_arn" {
  value = aws_iam_role.secrets_access.arn
}
