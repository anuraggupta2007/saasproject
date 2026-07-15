# Release Strategy

## Overview

This document defines the release strategy, versioning policy, and deployment procedures for the SaaS Email Converter platform. All team members must follow these conventions to ensure consistent, reliable, and traceable releases.

---

## Semantic Versioning

All releases follow [Semantic Versioning 2.0.0](https://semver.org/).

```
MAJOR.MINOR.PATCH
```

| Segment | Increment When | Examples |
|---------|---------------|----------|
| **MAJOR** | Breaking API changes, database schema incompatibilities, major architectural shifts | 1.0.0 → 2.0.0 |
| **MINOR** | New features, new API endpoints, backward-compatible enhancements | 1.0.0 → 1.1.0 |
| **PATCH** | Bug fixes, security patches, dependency updates, configuration changes | 1.0.0 → 1.0.1 |

### Version Numbering Policy

- Pre-release versions use hyphens: `1.0.0-alpha.1`, `1.0.0-beta.2`, `1.0.0-rc.1`
- Build metadata uses plus: `1.0.0+build.456`
- Version numbers are assigned at the **commit** that triggers the release, not the tag date.
- Never reuse a version number. If a release is abandoned, bump the next version.
- The version is the **single source of truth** across all services, SDKs, and documentation.

---

## Release Cadence

| Type | Frequency | Stabilization | Notification Window |
|------|-----------|---------------|---------------------|
| **MAJOR** | Quarterly (Jan, Apr, Jul, Oct) | 4-week stabilization | 30 days advance |
| **MINOR** | Monthly (first Monday) | 2-week stabilization | 14 days advance |
| **PATCH** | Weekly (Wednesday) | 3-day stabilization | 3 days advance |

Hotfixes and critical security patches are released **immediately** outside the normal cadence.

---

## Branching Strategy

```
main (production)
├── develop (integration branch)
│   ├── feature/* (new features)
│   ├── fix/* (bug fixes)
│   └── experiment/* (prototyping)
├── release/* (stabilization for minors/majors)
└── hotfix/* (critical production fixes)
```

### Branch Rules

| Branch | Merges Into | Lifetime | Protected |
|--------|------------|----------|-----------|
| `main` | — | Permanent | Yes, requires PR + CI + 2 approvals |
| `develop` | `main` via release | Permanent | Yes, requires PR + CI + 1 approval |
| `feature/*` | `develop` | Temporary, deleted after merge | No |
| `release/*` | `main` + `develop` | Temporary, deleted after release | Yes, requires PR + CI + 2 approvals |
| `hotfix/*` | `main` + `develop` | Temporary, deleted after patch | Yes, requires PR + CI + 2 approvals |

### Naming Conventions

- `feature/EMAIL-1234-classification-engine`
- `fix/EMAIL-5678-attachment-encoding-error`
- `release/1.2.0`
- `hotfix/1.1.2-security-patch`

---

## Tagging Conventions

All releases use annotated tags:

```bash
git tag -a v1.0.0 -m "Release v1.0.0: Initial GA release"
```

Tag format: `v{MAJOR}.{MINOR}.{PATCH}`

Pre-release tags: `v1.0.0-alpha.1`, `v1.0.0-beta.1`, `v1.0.0-rc.1`

---

## Release Checklist

### Pre-Release (T-5 days)

- [ ] All tickets in release scope marked Done in project tracker
- [ ] `develop` branch is green on CI (all tests pass)
- [ ] No open P0/P1 bugs in release scope
- [ ] Feature freeze declared (for MINOR/MAJOR only)
- [ ] Performance benchmarks meet or exceed baseline
- [ ] Security scan passes (no new critical/high findings)
- [ ] Documentation updated (API docs, user guides, changelog)
- [ ] Release notes drafted

### Code Freeze (T-3 days)

- [ ] `release/*` branch created from `develop`
- [ ] No new commits allowed except approved fixes
- [ ] All CI/CD pipelines validated on release branch
- [ ] Dependency audit completed (`npm audit`, `pip audit`, etc.)
- [ ] Database migration dry-run on staging

### Staging Verification (T-2 to T-1 days)

- [ ] Deploy to staging environment
- [ ] Full regression test suite executed
- [ ] Integration tests against staging pass
- [ ] Load/performance test within SLA thresholds
- [ ] Security scan on staging deployment
- [ ] Manual QA sign-off on critical paths
- [ ] Product owner sign-off
- [ ] Release notes reviewed and approved

### Production Deploy (T-0)

- [ ] Merge `release/*` → `main`
- [ ] Tag release on `main`
- [ ] CI/CD triggers automated deployment
- [ ] Deploy to canary region first (if multi-region)
- [ ] Verify canary health (10-minute soak)
- [ ] Full production rollout
- [ ] Smoke tests pass post-deploy
- [ ] Monitoring dashboards show normal metrics

### Post-Deploy Monitoring (T+0 to T+4 hours)

- [ ] Error rate within baseline
- [ ] Latency P50/P95/P99 within baseline
- [ ] No new alerts triggered
- [ ] User-reported issues monitored in support channels
- [ ] Rollback decision made by T+4 hours if issues arise

---

## Rollback Procedures

### Application Rollback (Helm)

```bash
# List recent releases
helm history email-converter -n production

# Rollback to previous revision
helm rollback email-converter <revision> -n production

# Verify rollback
kubectl rollout status deployment/email-converter -n production
```

### Database Migration Rollback

```bash
# Each migration must have a reversible down migration
npx prisma migrate diff --from-schema-datasource ./prisma/migrations/current ./prisma/migrations/previous

# Apply down migration in controlled order
node scripts/run-migration.js --down <migration-id>

# Verify data integrity
node scripts/verify-migration.js --target <migration-id>
```

### Feature Flag Rollback

```bash
# Disable feature flag immediately (no deploy required)
curl -X PATCH https://config.internal/api/flags/feature-name \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"enabled": false, "reason": "Rollback: <incident-id>"}'
```

### Database Backup Restore

```bash
# Point-in-time recovery (RDS/Aurora)
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier email-converter-prod \
  --target-db-instance-identifier email-converter-prod-restore \
  --restore-time "2025-01-15T10:30:00Z"
```

---

## Hotfix Process

Critical bugs affecting production are handled through the hotfix process:

### Severity Classification

| Severity | Definition | Response Time | Resolution Target |
|----------|-----------|---------------|-------------------|
| **P0** | Complete service outage or data loss | 15 minutes | 2 hours |
| **P1** | Major feature broken, no workaround | 30 minutes | 4 hours |
| **P2** | Feature degraded, workaround exists | 2 hours | 24 hours |
| **P3** | Minor issue, cosmetic | Next business day | Next sprint |

### Hotfix Workflow

1. **Triage** — On-call engineer classifies severity and creates incident ticket
2. **Branch** — Create `hotfix/{version}` branch from `main`
3. **Fix** — Minimal, targeted fix. No refactoring or unrelated changes
4. **Test** — Run targeted tests plus full regression suite
5. **Review** — Expedited PR review (1 approval minimum for P0/P1)
6. **Deploy** — Merge to `main`, tag, deploy via CI/CD pipeline
7. **Verify** — Confirm fix in production, monitor for 2 hours
8. **Backport** — Merge hotfix into `develop` to prevent regression
9. **Post-mortem** — For P0/P1, complete incident post-mortem within 48 hours

---

## Release Notes Template

```markdown
# Release v{VERSION} - {DATE}

## Highlights
- [Brief summary of most impactful changes]

## Added
- Feature description (#issue-number)

## Changed
- Improvement description (#issue-number)

## Fixed
- Bug fix description (#issue-number)

## Security
- Security improvement description (#CVE-number)

## Deprecated
- Feature being deprecated (#issue-number)

## Breaking Changes
- Description of breaking change and migration path (#issue-number)

## Known Issues
- Issue description and workaround (#issue-number)

## Upgrade Notes
- Steps required before upgrading
- Database migration requirements
- Configuration changes needed
```

---

## Changelog Maintenance

- The `CHANGELOG.md` is maintained in the repository root
- Changes are categorized: Added, Changed, Fixed, Deprecated, Removed, Security
- Each entry references the issue/PR number
- Changes are added to `develop` as part of feature PRs
- Before release, the changelog entry is reviewed and finalized
- Automated tooling (`conventional-changelog` or similar) generates draft entries from commit history

---

## Communication Plan

### Internal Communication

| Event | Channel | Timing | Audience |
|-------|---------|--------|----------|
| Feature freeze | Slack #releases | T-5 days | Engineering, QA |
| Code freeze | Slack #releases | T-3 days | Engineering |
| Deploy started | Slack #ops | T-0 | Engineering, SRE |
| Deploy complete | Slack #releases + email | T+0 | All stakeholders |
| Incident (P0/P1) | Slack #incidents + PagerDuty | Immediately | Engineering, SRE, Leadership |
| Post-mortem | Confluence + Slack | T+48 hours | Engineering, Product |

### External Communication

| Event | Channel | Timing |
|-------|---------|--------|
| Scheduled maintenance | Status page + email | 7 days + 24 hours before |
| Release announcement | Blog + email + changelog | Release day |
| API changes | Developer blog + email | 30 days before (MAJOR), 14 days (MINOR) |
| Security advisory | Email + security advisory | Same day as patch |
| Incident (customer-facing) | Status page | Within 15 minutes of detection |

---

## Appendix: CI/CD Release Pipeline

```
push to main
  → CI: lint, test, build
  → Docker image built & tagged
  → Image pushed to registry
  → Deploy to canary (manual approval gate)
  → Canary health check (10 min)
  → Full production rollout
  → Post-deploy smoke tests
  → Notify #releases channel
```
