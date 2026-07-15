# =============================================================================
# Route53 Module
# =============================================================================
# Creates Route53 hosted zone and ACM certificate
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
variable "domain_name" { type = string }
variable "cloudfront_distribution_domain" { type = string }
variable "api_lb_dns_name" { type = string }
variable "api_lb_zone_id" { type = string }
variable "create_acm_certificate" { type = bool, default = true }

# Hosted Zone
resource "aws_route53_zone" "main" {
  name = var.domain_name

  tags = {
    Name = "${var.name_prefix}-zone"
  }
}

# ACM Certificate
resource "aws_acm_certificate" "main" {
  count             = var.create_acm_certificate ? 1 : 0
  domain_name       = var.domain_name
  subject_alternative_names = [
    "*.${var.domain_name}",
    "api.${var.domain_name}"
  ]
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.name_prefix}-cert"
  }
}

# DNS Validation Records
resource "aws_route53_record" "cert_validation" {
  for_each = var.create_acm_certificate ? {
    for dvo in aws_acm_certificate.main[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main.zone_id
}

# Certificate Validation
resource "aws_acm_certificate_validation" "main" {
  count                   = var.create_acm_certificate ? 1 : 0
  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# API Record (Alias to CloudFront)
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.cloudfront_distribution_domain
    zone_id                = "Z2FDTNDATAQYW2"  # CloudFront zone ID
    evaluate_target_health = false
  }
}

# Root Domain (Alias to CloudFront)
resource "aws_route53_record" "root" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.cloudfront_distribution_domain
    zone_id                = "Z2FDTNDATAQYW2"
    evaluate_target_health = false
  }
}

output "zone_id" {
  value = aws_route53_zone.main.zone_id
}

output "acm_certificate_arn" {
  value = var.create_acm_certificate ? aws_acm_certificate.main[0].arn : ""
}

output "domain_name" {
  value = var.domain_name
}
