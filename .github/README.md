# =============================================================================
# CI/CD Pipeline Documentation
# =============================================================================
# Email Converter SaaS - Production-Grade CI/CD
# =============================================================================

## Overview

Production-grade CI/CD pipeline with:
- **Continuous Integration**: Lint, typecheck, test, security scan on every PR
- **Continuous Delivery**: Auto-deploy to dev/staging, manual approval for production
- **Continuous Deployment**: Zero-downtime releases with rollback support
- **Security First**: SAST, dependency audit, container scanning, secret scanning

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DEVELOPER WORKFLOW                              │
│                                                                         │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐              │
│  │  Push   │    │   PR    │    │  Merge  │    │  Tag    │              │
│  └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘              │
│       │              │              │              │                     │
└───────┼──────────────┼──────────────┼──────────────┼────────────────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         GITHUB ACTIONS                                  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    CI WORKFLOW (ci.yml)                          │    │
│  │  ┌──────┐  ┌──────────┐  ┌──────┐  ┌──────────┐  ┌──────────┐ │    │
│  │  │ Lint │→│ TypeCheck │→│ Test │→│ Security │→│  Docker  │ │    │
│  │  └──────┘  └──────────┘  └──────┘  └──────────┘  └──────────┘ │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                DOCKER PUBLISH (docker-publish.yml)              │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │    │
│  │  │ Build x4 │→│  Scan   │→│   Push  │→│   Sign  │       │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    DEPLOY WORKFLOWS                              │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐                │    │
│  │  │  Dev (auto) │→│ Staging    │→│ Production │                │    │
│  │  │             │  │  (auto)   │  │  (manual)  │                │    │
│  │  └────────────┘  └────────────┘  └────────────┘                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    RELEASE WORKFLOW (release.yml)                │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │    │
│  │  │  Version │→│ Changelog │→│ GitHub  │→│  Notify │       │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

## Workflows

### 1. CI Pipeline (`ci.yml`)

**Triggers**: Push to main/develop, PRs to main/develop

**Jobs**:
| Job | Description | Duration |
|-----|-------------|----------|
| `lint` | Ruff linting + format check | ~1 min |
| `typecheck` | mypy static type checking | ~2 min |
| `test` | pytest with coverage (80% threshold) | ~5 min |
| `security` | pip-audit + bandit | ~2 min |
| `docker-build` | Build all 4 images (no push) | ~5 min |
| `helm-validate` | Lint + template all environments | ~1 min |
| `contract` | API contract tests with schemathesis | ~3 min |
| `performance` | Smoke tests (response time) | ~2 min |
| `quality-gate` | Fail if any job fails | ~0 min |

### 2. Docker Publish (`docker-publish.yml`)

**Triggers**: Push to main/develop, CI success

**Jobs**:
| Job | Description |
|-----|-------------|
| `build-and-push` | Build 4 images (api, worker, beat, flower) |
| `sign-images` | Sign with cosign |
| `summary` | Build summary |

**Features**:
- Multi-arch builds (amd64/arm64)
- GitHub Actions cache
- Trivy vulnerability scanning
- SBOM generation
- Image signing

### 3. Deploy to Dev (`deploy-dev.yml`)

**Triggers**: Docker Publish success on develop branch

**Features**:
- Auto-deploy on push to develop
- Health check verification
- Smoke tests
- Slack notification

### 4. Deploy to Staging (`deploy-staging.yml`)

**Triggers**: Docker Publish success on main branch

**Features**:
- Auto-deploy on push to main
- Integration test verification
- Health check verification
- Slack notification

### 5. Deploy to Production (`deploy-prod.yml`)

**Triggers**: Manual dispatch only

**Features**:
- Manual approval gate
- Image verification
- Deployment strategy selection (rolling/blue-green/canary)
- Automatic rollback on failure
- Health check verification
- Slack notification

### 6. Release (`release.yml`)

**Triggers**: Push version tag (v*)

**Features**:
- Semantic versioning
- Changelog generation
- GitHub Release creation
- Helm chart version bump
- Slack notification

### 7. Rollback (`rollback.yml`)

**Triggers**: Manual dispatch

**Features**:
- Rollback to specific revision or image tag
- Health check verification
- Slack notification

### 8. Security Scan (`security.yml`)

**Triggers**: Weekly schedule, manual, push to main/develop

**Jobs**:
| Job | Description |
|-----|-------------|
| `dependencies` | pip-audit + safety check |
| `secrets` | TruffleHog secret scanning |
| `sast` | Bandit static analysis |
| `container-scan` | Trivy container scanning |
| `iac-scan` | Checkov IaC scanning |

## Quality Gates

Pipeline fails if:
- Tests fail
- Coverage below 80%
- Security vulnerabilities detected
- Linting errors
- Docker build fails
- Helm validation fails
- API contract tests fail

## Secrets Management

| Secret | Environment | Used By |
|--------|-------------|---------|
| `SLACK_WEBHOOK_URL` | All | Notifications |
| `KUBE_CONFIG` | All | Kubernetes deploy |
| `GHCR_TOKEN` | All | Docker push |
| `DB_PASSWORD` | All | Database |
| `REDIS_PASSWORD` | All | Redis |
| `SECRET_KEY` | All | JWT signing |
| `STRIPE_SECRET_KEY` | Prod | Payments |
| `RAZORPAY_KEY_SECRET` | Prod | Payments |
| `SENDGRID_API_KEY` | All | Email |
| `TWILIO_AUTH_TOKEN` | All | SMS |
| `SENTRY_DSN` | All | Error tracking |

## Environment Strategy

| Environment | Trigger | Approval | Auto-rollback |
|-------------|---------|----------|---------------|
| Development | Push to develop | None | Yes |
| Staging | Push to main | None | Yes |
| Production | Manual | 2 reviewers, 30min wait | Yes |

## Deployment Commands

### Manual Deploy

```bash
# Deploy to dev
gh workflow run deploy-dev.yml -f image-tag=abc123

# Deploy to staging
gh workflow run deploy-staging.yml -f image-tag=abc123

# Deploy to production
gh workflow run deploy-prod.yml -f image-tag=v1.2.3 -f strategy=rolling

# Rollback
gh workflow run rollback.yml -f environment=production -f revision=0

# Create release
git tag v1.2.3
git push origin v1.2.3
```

### Helm Commands

```bash
# Check history
helm history email-converter -n email-converter-prod

# Rollback
helm rollback email-converter 5 -n email-converter-prod

# Upgrade
helm upgrade email-converter k8s/helm/email-converter \
  -f k8s/helm/email-converter/values-prod.yaml \
  --set api.image.tag=v1.2.3 \
  -n email-converter-prod
```

## Monitoring & Observability

- **Build status**: GitHub Actions UI
- **Deployment status**: Slack notifications
- **Security findings**: GitHub Security tab
- **Container scanning**: Trivy SARIF in Security tab
- **Dependency audit**: GitHub Dependabot alerts

## Troubleshooting

### Build fails
```bash
# Check CI logs
gh run list --workflow=ci.yml
gh run view <run-id>

# Re-run failed jobs
gh run rerun <run-id> --failed
```

### Deploy fails
```bash
# Check deployment status
kubectl get pods -n email-converter-prod
kubectl describe deployment api -n email-converter-prod

# View logs
kubectl logs -l app.kubernetes.io/component=api -n email-converter-prod

# Rollback
helm rollback email-converter 0 -n email-converter-prod
```

### Health check fails
```bash
# Port forward and test
kubectl port-forward svc/api 8080:8000 -n email-converter-prod
curl http://localhost:8080/health
```

## Best Practices

1. **Always run CI before merging**
2. **Use semantic versioning for releases**
3. **Never commit secrets**
4. **Review all PRs before merge**
5. **Test in staging before production**
6. **Monitor deployments after release**
7. **Keep dependencies updated**
8. **Scan for vulnerabilities regularly**
