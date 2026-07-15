# Branch Protection Rules
# =============================================================================
# Apply these rules via GitHub UI or Terraform
# Repository Settings > Branches > Add rule
# =============================================================================

## Main Branch (main)

```yaml
# Branch name pattern: main
branch_name: main

# Required status checks
required_status_checks:
  strict: true  # Branch must be up to date
  contexts:
    - "Quality Gate"
    - "Docker Build (api)"
    - "Docker Build (celery-worker)"
    - "Helm Validate"

# Require pull request reviews
required_pull_request_reviews:
  dismiss_stale_reviews: true
  require_code_owner_reviews: true
  required_approving_review_count: 2
  dismissal_restrictions:
    apps: []
    teams:
      - "email-converter/platform-team"
    users: []

# Require signed commits
require_signed_commits: true

# Require linear history
require_linear_history: true

# Require status checks
enforce_admins: true  # Even admins must follow rules

# Require conversation resolution
require_conversation_resolution: true

# Require branches to be up to date
require_branches_up_to_date: true

# Restrict who can push
restrict_pushes:
  enabled: true
  apps: []
  teams:
    - "email-converter/platform-team"

# Allow force pushes (disabled)
allow_force_pushes: false

# Allow deletions (disabled)
allow_deletions: false
```

## Develop Branch (develop)

```yaml
# Branch name pattern: develop
branch_name: develop

# Required status checks
required_status_checks:
  strict: true
  contexts:
    - "Quality Gate"
    - "Docker Build (api)"

# Require pull request reviews
required_pull_request_reviews:
  dismiss_stale_reviews: true
  require_code_owner_reviews: true
  required_approving_review_count: 1

# Require signed commits
require_signed_commits: false

# Enforce for admins
enforce_admins: false
```

## Release Branches (release/*)

```yaml
# Branch name pattern: release/*
branch_name: release/*

# Required status checks
required_status_checks:
  strict: true
  contexts:
    - "Quality Gate"

# Require pull request reviews
required_pull_request_reviews:
  required_approving_review_count: 2

# Require signed commits
require_signed_commits: true
```

## Production Branches (hotfix/*)

```yaml
# Branch name pattern: hotfix/*
branch_name: hotfix/*

# Required status checks
required_status_checks:
  strict: true
  contexts:
    - "Quality Gate"

# Require pull request reviews
required_pull_request_reviews:
  required_approving_review_count: 2

# Require signed commits
require_signed_commits: true

# Enforce for admins
enforce_admins: true
```

## Environment Protection Rules

### Production Environment
```yaml
environment: production
protection_rules:
  - type: required_reviewers
    review:
      required_approving_review_count: 2
      teams:
        - "email-converter/platform-team"
  - type: wait_timer
    timeout_minutes: 30
  - type: deployment_branch_policy
    protected_branches: true
    custom_branch_policies: false
```

### Staging Environment
```yaml
environment: staging
protection_rules:
  - type: required_reviewers
    review:
      required_approving_review_count: 1
  - type: wait_timer
    timeout_minutes: 5
```

### Development Environment
```yaml
environment: development
protection_rules: []
auto_deploy: true
```

## Webhook Notifications

### Slack
```yaml
webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
events:
  - push
  - pull_request
  - deployment
  - deployment_status
  - release
```

### Discord
```yaml
webhook_url: ${{ secrets.DISCORD_WEBHOOK_URL }}
events:
  - push
  - pull_request
  - deployment
  - deployment_status
  - release
```

## GitHub Secrets Required

| Secret | Description | Where to use |
|--------|-------------|--------------|
| `SLACK_WEBHOOK_URL` | Slack incoming webhook | Notifications |
| `DISCORD_WEBHOOK_URL` | Discord webhook | Notifications |
| `KUBE_CONFIG` | Kubernetes kubeconfig | Helm deploy |
| `GHCR_TOKEN` | GitHub Container Registry token | Docker push |
| `SENTRY_DSN` | Sentry DSN | Error tracking |
| `STRIPE_SECRET_KEY` | Stripe API key | Payment processing |
| `RAZORPAY_KEY_SECRET` | Razorpay API key | Payment processing |
| `SENDGRID_API_KEY` | SendGrid API key | Email sending |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | SMS sending |

## OIDC Authentication (Recommended)

For Kubernetes deployments, use OIDC instead of static kubeconfig:

```yaml
# In deploy workflow
- name: Configure OIDC
  uses: azure/k8s-set-context@v4
  with:
    method: service-account
    kubeconfig: ${{ secrets.KUBE_CONFIG }}

# Or use cloud-specific OIDC
- name: Configure AWS OIDC
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789012:role/github-actions
    aws-region: us-east-1
```

## Branch Strategy

```
main (production)
  │
  ├── develop (integration)
  │     │
  │     ├── feature/* (feature branches)
  │     ├── bugfix/* (bug fixes)
  │     └── refactor/* (refactoring)
  │
  ├── release/* (release candidates)
  │
  └── hotfix/* (emergency fixes)
```

## Merge Strategy

| Source | Target | Strategy | Auto-merge |
|--------|--------|----------|------------|
| feature/* | develop | Squash | Yes (if CI passes) |
| develop | main | Merge commit | No (manual) |
| release/* | main | Merge commit | No (manual) |
| release/* | develop | Merge commit | No (manual) |
| hotfix/* | main | Merge commit | No (manual) |
| hotfix/* | develop | Merge commit | No (manual) |
