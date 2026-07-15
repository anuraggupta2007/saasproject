# =============================================================================
# Secrets Manager Module
# =============================================================================
# Creates secrets for database, Redis, JWT, and third-party services
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
variable "db_username" { type = string }
variable "db_password" { type = string; sensitive = true }
variable "redis_auth_token" { type = string; sensitive = true }
variable "jwt_secret_key" { type = string; sensitive = true }
variable "stripe_secret_key" { type = string; default = ""; sensitive = true }
variable "sendgrid_api_key" { type = string; default = ""; sensitive = true }

# Database Credentials
resource "aws_secretsmanager_secret" "db" {
  name                    = "${var.name_prefix}/database"
  description             = "Database credentials"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
  })
}

# Redis Auth Token
resource "aws_secretsmanager_secret" "redis" {
  name                    = "${var.name_prefix}/redis"
  description             = "Redis auth token"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "redis" {
  secret_id = aws_secretsmanager_secret.redis.id
  secret_string = jsonencode({
    auth_token = var.redis_auth_token
  })
}

# JWT Secret Key
resource "aws_secretsmanager_secret" "jwt" {
  name                    = "${var.name_prefix}/jwt"
  description             = "JWT secret key"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "jwt" {
  secret_id = aws_secretsmanager_secret.jwt.id
  secret_string = jsonencode({
    secret_key = var.jwt_secret_key
  })
}

# Stripe Keys
resource "aws_secretsmanager_secret" "stripe" {
  count                   = var.stripe_secret_key != "" ? 1 : 0
  name                    = "${var.name_prefix}/stripe"
  description             = "Stripe API keys"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "stripe" {
  count         = var.stripe_secret_key != "" ? 1 : 0
  secret_id     = aws_secretsmanager_secret.stripe[0].id
  secret_string = jsonencode({
    secret_key = var.stripe_secret_key
  })
}

# SendGrid API Key
resource "aws_secretsmanager_secret" "sendgrid" {
  count                   = var.sendgrid_api_key != "" ? 1 : 0
  name                    = "${var.name_prefix}/sendgrid"
  description             = "SendGrid API key"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "sendgrid" {
  count         = var.sendgrid_api_key != "" ? 1 : 0
  secret_id     = aws_secretsmanager_secret.sendgrid[0].id
  secret_string = jsonencode({
    api_key = var.sendgrid_api_key
  })
}

output "secret_arn" {
  value = aws_secretsmanager_secret.db.arn
}

output "db_secret_arn" {
  value = aws_secretsmanager_secret.db.arn
}

output "redis_secret_arn" {
  value = aws_secretsmanager_secret.redis.arn
}

output "jwt_secret_arn" {
  value = aws_secretsmanager_secret.jwt.arn
}
