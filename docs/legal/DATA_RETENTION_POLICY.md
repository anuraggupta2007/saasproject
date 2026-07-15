# Data Retention Policy

**Effective Date:** July 8, 2026
**Last Updated:** July 8, 2026

## 1. Purpose

This Data Retention Policy establishes the guidelines and schedules for retaining and disposing of personal data collected and processed by Email Converter Ltd. ("we," "our," or "us"). This policy ensures compliance with applicable data protection laws, including the General Data Protection Regulation (GDPR), California Consumer Privacy Act (CCPA), and Service Organization Control 2 (SOC 2) requirements.

## 2. Scope

This policy applies to all personal data processed by Email Converter, including:
- Data collected from users of the Service
- Data generated through use of the Service
- Data received from third-party sources
- All data stored in our systems, backups, and archives

## 3. Retention Schedule

### 3.1 Account Data

| Data Element | Retention Period | Justification |
|-------------|-----------------|---------------|
| User profile information | Duration of active account + 30 days after deletion | Service provision and account management |
| Authentication credentials | Duration of active account | Security and access control |
| Account preferences | Duration of active account + 30 days after deletion | Service customization |
| Account activity logs | Duration of active account + 30 days | Security monitoring |

**Retention Details:**
- Active accounts: Retained for the duration the account exists
- Post-deletion: Account data is retained for 30 days after user-initiated or admin-initiated deletion
- During the 30-day post-deletion period, data is flagged for deletion and inaccessible to the user
- After 30 days, all account data is permanently deleted from production systems
- Anonymized account identifiers may be retained indefinitely for analytics

### 3.2 Uploaded Email Files

| Data Element | Retention Period | Justification |
|-------------|-----------------|---------------|
| Source email files (.eml, .msg, .mbox, .pst, .ost) | 30 days after conversion completion | Service provision |
| Attached files within emails | 30 days after conversion completion | Service provision |
| Email metadata | 30 days after conversion completion | Service provision and debugging |

**Retention Details:**
- Uploaded files are processed and retained temporarily for conversion
- Files are automatically queued for deletion 30 days after the conversion process completes
- Deletion occurs regardless of whether the user has downloaded the converted output
- Files are securely wiped using cryptographic erasure where technically feasible

### 3.3 Converted Output Files

| Data Element | Retention Period | Justification |
|-------------|-----------------|---------------|
| Converted email files | 7 days after download or 30 days if not downloaded | User convenience |

**Retention Details:**
- Output files are available for download immediately after conversion
- Files are retained for 7 days after the user downloads them
- If the user never downloads the output, files are retained for 30 days after conversion
- After the retention period, output files are permanently deleted

### 3.4 Conversion Logs

| Data Element | Retention Period | Justification |
|-------------|-----------------|---------------|
| Conversion metadata | 90 days | Service improvement and debugging |
| Conversion status records | 90 days | Service improvement and debugging |
| Processing timestamps | 90 days | Performance monitoring |
| Error details | 90 days | Troubleshooting |

**Retention Details:**
- Conversion logs record the inputs, outputs, and status of each conversion job
- Logs are used for service improvement, debugging, and quality assurance
- After 90 days, logs are permanently deleted from production systems
- Aggregated, anonymized conversion statistics may be retained indefinitely

### 3.5 Audit Logs

| Data Element | Retention Period | Justification |
|-------------|-----------------|---------------|
| System access logs | 1 year | Security and compliance |
| Administrative action logs | 1 year | Accountability and compliance |
| Data access logs | 1 year | Security monitoring |
| Authentication event logs | 1 year | Security monitoring |

**Retention Details:**
- Audit logs track all significant system and data access events
- Required for SOC 2 compliance and security incident investigations
- Logs are stored in tamper-evident, append-only storage
- After 1 year, audit logs are permanently deleted

### 3.6 Payment Records

| Data Element | Retention Period | Justification |
|-------------|-----------------|---------------|
| Transaction records | 7 years | Legal and tax compliance |
| Invoices | 7 years | Legal and tax compliance |
| Payment method metadata | Duration of payment relationship + 7 years | Legal compliance |
| Subscription history | 7 years | Legal compliance and dispute resolution |

**Retention Details:**
- Payment records are retained for 7 years to comply with tax, accounting, and financial regulations
- This retention period aligns with typical statutory requirements in major jurisdictions
- Payment card details are not stored by Email Converter; only metadata (last four digits, card type, expiry) is retained
- Records are stored in encrypted, access-controlled systems

### 3.7 Analytics Data

| Data Element | Retention Period | Justification |
|-------------|-----------------|---------------|
| Usage analytics | 2 years (anonymized after 12 months) | Service improvement |
| Performance metrics | 2 years (anonymized after 12 months) | Service optimization |
| Aggregated user behavior | 2 years | Product development |

**Retention Details:**
- Analytics data is retained in identifiable form for 12 months
- After 12 months, data is irreversibly anonymized and may be retained indefinitely
- Anonymized data cannot be used to identify individual users
- Analytics data is used for service improvement, capacity planning, and feature development

### 3.8 Error Logs

| Data Element | Retention Period | Justification |
|-------------|-----------------|---------------|
| Application error logs | 90 days | Debugging and maintenance |
| System error logs | 90 days | System stability |
| User-reported issues | 90 days after resolution | Quality assurance |

**Retention Details:**
- Error logs capture technical failures and exceptions
- Used by engineering teams for debugging and improving service reliability
- After 90 days, error logs are permanently deleted
- Critical error patterns may be retained in anonymized form for trend analysis

### 3.9 Backups

| Data Element | Retention Period | Justification |
|-------------|-----------------|---------------|
| Full system backups | 30 days (rolling) | Disaster recovery |
| Incremental backups | 30 days (rolling) | Disaster recovery |

**Retention Details:**
- Backups are maintained on a rolling 30-day cycle
- New backups overwrite the oldest backups in the rotation
- Backups are encrypted at rest using AES-256 encryption
- Backup access is restricted to authorized personnel for disaster recovery purposes
- When a user deletes their data, the data is flagged for deletion in the next backup cycle

## 4. Deletion Procedures

### 4.1 Automated Deletion
The majority of data deletion is performed automatically by our systems according to the retention schedules above:
- Scheduled deletion jobs run daily at 02:00 UTC
- Data past its retention period is permanently deleted within 24 hours of the scheduled deletion
- Deletion is performed using secure data wiping methods

### 4.2 Manual Deletion
In certain cases, data may be manually deleted by authorized personnel:
- Upon user request (subject to identity verification)
- Upon legal hold release
- As part of data cleanup operations

### 4.3 Deletion Verification
After deletion, verification checks are performed to confirm:
- Data has been removed from production databases
- Data has been removed from backup systems within the next backup rotation
- No residual copies remain in secondary storage

### 4.4 Deletion Certificates
Upon request, we can provide confirmation of data deletion. This confirmation includes:
- The types of data deleted
- The date of deletion
- The systems from which data was deleted

## 5. Legal Holds

### 5.1 Purpose
A legal hold suspends the normal deletion schedule for data that may be relevant to pending or reasonably anticipated litigation, regulatory investigation, or audit.

### 5.2 Implementation
When a legal hold is issued:
- Affected data is identified and flagged in our systems
- Automated deletion is suspended for the held data
- The legal hold is documented with the scope, reason, and expected duration
- All relevant personnel are notified of the hold

### 5.3 Duration
Legal holds remain in effect until:
- The legal matter is resolved
- The hold is formally released by the authorized legal team
- The maximum legal hold period (typically 7 years) is reached

### 5.4 Release
Upon release of a legal hold:
- The normal deletion schedule resumes
- Data is deleted according to the applicable retention period
- The release is documented and communicated to relevant teams

## 6. Compliance Requirements

### 6.1 GDPR Compliance
Under the General Data Protection Regulation:
- Data is retained only for as long as necessary for the stated purpose
- Data minimization principles are applied to all collection activities
- Data subjects can exercise their right to erasure (subject to legal exceptions)
- Retention periods are documented and communicated in our Privacy Policy
- Data protection impact assessments consider retention implications

### 6.2 CCPA Compliance
Under the California Consumer Privacy Act:
- Consumers have the right to request deletion of personal information
- We maintain records of deletion requests and responses
- Retention periods do not conflict with consumer deletion rights
- We do not sell personal information and do not retain it for undisclosed purposes

### 6.3 SOC 2 Compliance
Under Service Organization Control 2:
- Data retention policies are formally documented and implemented
- Retention schedules are reviewed at least annually
- Deletion procedures are tested and validated
- Access controls restrict deletion capabilities to authorized personnel
- Audit trails track all data modification and deletion activities

### 6.4 Other Regulations
We also comply with applicable retention requirements under:
- Payment Card Industry Data Security Standard (PCI DSS) for payment data
- Electronic Communications Privacy Act (ECPA) where applicable
- Local data protection laws in jurisdictions where we operate

## 7. Policy Review

This policy is reviewed and updated:
- At least annually
- When new data types are introduced
- When new processing activities are implemented
- When applicable laws or regulations change
- After significant security incidents

## 8. Responsibilities

- **Data Protection Officer:** Oversees policy implementation and compliance
- **Engineering Team:** Implements automated deletion procedures
- **Legal Team:** Manages legal holds and regulatory compliance
- **Operations Team:** Monitors deletion execution and provides reports
- **All Employees:** Adhere to this policy in their daily activities

## 9. Contact Information

For questions about this Data Retention Policy, contact:

**Email Converter Ltd.**
- Data Protection Officer: dpo@emailconverter.com
- Privacy Team: privacy@emailconverter.com
- Legal Team: legal@emailconverter.com

---

*This Data Retention Policy is effective as of the date stated above and applies to all personal data processed by Email Converter.*
