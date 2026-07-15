# Disaster Recovery Plan

## Email Converter SaaS - Enterprise DR/BCP

### 1. Executive Summary

This document outlines the Disaster Recovery (DR) and Business Continuity Plan (BCP) for the Email Converter SaaS platform. The system is designed for **RPO < 15 minutes** and **RTO < 1 hour**.

### 2. Recovery Objectives

| Metric | Target | Description |
|--------|--------|-------------|
| **RPO** | < 15 minutes | Maximum acceptable data loss window |
| **RTO** | < 1 hour | Maximum acceptable downtime |
| **RPO (Regional)** | < 1 hour | Cross-region data loss window |
| **RTO (Regional)** | < 4 hours | Full regional failover time |

### 3. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRIMARY REGION (us-east-1)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ PostgreSQL│  │  Redis   │  │  S3/MinIO│  │    EKS   │   │
│  │ (RDS)    │  │(ElastiCache)│ │(Uploads)│  │(K8s)     │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │              │              │              │         │
│       └──────────────┴──────────────┴──────────────┘        │
│                          │                                   │
│                    ┌─────┴─────┐                             │
│                    │  Velero   │                             │
│                    │  + Scripts│                             │
│                    └─────┬─────┘                             │
└──────────────────────────┼──────────────────────────────────┘
                           │
                    Cross-Region Replication
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                  SECONDARY REGION (us-west-2)               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ PostgreSQL│  │  Redis   │  │    S3    │  │    EKS   │   │
│  │ (RDS RR) │  │(ElastiCache)│ │(DR Copy)│  │(Standby) │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 4. Backup Schedule

#### 4.1 PostgreSQL

| Backup Type | Schedule | Retention | Storage |
|-------------|----------|-----------|---------|
| Full (pg_dump) | Daily 02:00 UTC | 30 days local, 90 days S3 | Local PVC + S3 Standard-IA |
| WAL Archive | Continuous | 30 days | S3 |
| RDS Automated | Continuous | 7 days (configurable) | AWS-managed |
| RDS Snapshot | Weekly Sunday 03:00 | 35 days | AWS-managed |
| Cross-Region | On full backup | 90 days | S3 us-west-2 |

#### 4.2 Redis

| Backup Type | Schedule | Retention | Storage |
|-------------|----------|-----------|---------|
| RDB Snapshot | Daily 03:00 UTC | 14 days | Local PVC + S3 |
| AOF Backup | Daily 03:00 UTC | 14 days | Local PVC + S3 |
| Config Export | Daily 03:00 UTC | 14 days | Local PVC |

#### 4.3 S3/MinIO

| Operation | Schedule | Description |
|-----------|----------|-------------|
| Cross-Region Sync | On every upload | Real-time S3 replication |
| Versioning Audit | Daily | Check versioning status |
| Lifecycle Rules | On deploy | Apply lifecycle policies |
| Integrity Check | Weekly | Sample verification |

#### 4.4 Kubernetes

| Backup Type | Schedule | Retention | Storage |
|-------------|----------|-----------|---------|
| Full Velero | Daily 01:00 UTC | 30 days | S3 |
| Secrets/ConfigMaps | Every 6 hours | 7 days | S3 |
| PV Snapshots | Weekly Sunday 04:00 | 30 days | EBS Snapshots |
| DR Status Check | Every 30 minutes | 1 day | Logs |

### 5. Backup Verification

#### 5.1 Automated Verification (Daily 06:00 UTC)

- PostgreSQL backup integrity (SHA-256, gzip test)
- Redis RDB/AOF integrity
- S3 backup bucket accessibility
- Velero backup status
- Cross-region replication lag

#### 5.2 Monthly Restore Test

- Restore PostgreSQL to test database
- Verify table counts and data integrity
- Restore Redis RDB to test instance
- Validate API functionality post-restore

### 6. Disaster Scenarios

| Scenario | Severity | Response Time | Recovery Method |
|----------|----------|---------------|-----------------|
| Single pod failure | Low | < 1 min | Auto-restart |
| Database corruption | High | < 30 min | PITR restore |
| Redis failure | Medium | < 15 min | RDB/AOF restore |
| Storage loss | Critical | < 1 hour | S3 restore |
| K8s cluster failure | Critical | < 2 hours | Velero restore |
| Region outage | Critical | < 4 hours | Cross-region failover |
| Ransomware | Critical | < 8 hours | Clean backup restore |
| Accidental deletion | High | < 30 min | Version restore |

### 7. Communication Plan

| Phase | Who | When | Channel |
|-------|-----|------|---------|
| Detection | Monitoring (automated) | Immediate | Slack + PagerDuty |
| Assessment | SRE Team | < 5 min | Slack #incidents |
| Escalation | Engineering Lead | < 15 min | Phone + Slack |
| Customer Notice | Support Team | < 30 min | Status page |
| Resolution | SRE Team | As needed | Slack #incidents |
| Post-mortem | Engineering | < 48 hours | Google Docs |

### 8. Roles & Responsibilities

| Role | Responsibility | On-Call |
|------|----------------|---------|
| **Incident Commander** | Coordinate response, decisions | Primary SRE |
| **Database Lead** | DB recovery, data integrity | DBA |
| **Infrastructure Lead** | K8s, networking, storage | SRE |
| **Application Lead** | Service validation, testing | Dev Lead |
| **Communications** | Status updates, customer notice | Support Lead |

### 9. Testing Schedule

| Test Type | Frequency | Duration | Participants |
|-----------|-----------|----------|--------------|
| Backup verification | Daily | 10 min | Automated |
| Restore test | Monthly | 2 hours | SRE |
| Failover test | Quarterly | 4 hours | SRE + Dev |
| Chaos engineering | Monthly | 2 hours | SRE |
| Full DR drill | Semi-annual | 8 hours | All teams |

### 10. Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-08 | SRE Team | Initial version |
