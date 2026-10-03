# Data Directory

This directory contains datasets used for training, testing, and evaluating the Risk-Based Account-Recovery Verification Prototype.

## Structure

- `synthetic/`: Generated synthetic datasets representing account-recovery requests across university roles (Students, Faculty, Alumni, Temporary Researchers). Includes both legitimate requests and realistic fraud/impersonation scenarios.
- `processed/`: Validated and preprocessed feature matrices ready for model scoring and statistical analysis.
- `raw/`: Raw ingest fixtures and seed templates.

## Dataset Schema

Each generated recovery request contains 24 structured features:

| Field | Type | Description |
|---|---|---|
| `request_id` | String | Unique UUID for the recovery request |
| `user_id` | String | University account identifier (e.g. `u104829`) |
| `role` | String | User role (`Student`, `Faculty`, `Alumni`, `Temporary Researcher`) |
| `account_age_days` | Integer | Account age in days |
| `recovery_reason` | String | Stated reason (e.g., `lost_device`, `forgot_password`, `mfa_token_broken`) |
| `device_id` | String | Device identifier fingerprint hash |
| `device_known` | Boolean | True if the device was seen in previous successful sessions |
| `device_trust_score` | Float | Device hygiene & security score `[0.0, 1.0]` |
| `device_change` | Boolean | Whether user claims a new device is being registered |
| `ip_risk_score` | Float | IP reputation / proxy / Tor / hosting score `[0.0, 1.0]` (higher = riskier) |
| `geo_consistency` | Float | Geographic consistency with past university activity `[0.0, 1.0]` |
| `login_history_consistency` | Float | Consistency with typical login hours and behaviors `[0.0, 1.0]` |
| `identity_evidence_available` | Boolean | Whether official secondary identity verification is available |
| `identity_evidence_score` | Float | Verification score of identity documents/evidence `[0.0, 1.0]` |
| `directory_status` | String | Active Directory / LDAP status (`ACTIVE`, `SUSPENDED`, `LEAVE`, `PENDING_REVIEW`) |
| `mfa_history` | String | Recent MFA health (`ACTIVE_HEALTHY`, `RECENTLY_RESET`, `FAILED_RECENTLY`, `DISABLED`) |
| `previous_recovery_count` | Integer | Total account recoveries requested in past 365 days |
| `recovery_velocity` | Integer | Number of recovery requests initiated within past 48 hours |
| `evidence_delay` | Boolean | True if identity/directory evidence was delayed during ingestion |
| `source_missing` | String | Missing evidence source if any (`none`, `device`, `identity`, `directory`, `network`) |
| `source_delayed` | String | Delayed evidence source if any (`none`, `directory`, `device_intelligence`, `identity`) |
| `fraud_scenario` | String | Fraud pattern label if malicious (`none`, `credential_stuffing`, `sim_swap`, `social_engineering`, `dormant_takeover`, `insider_threat`) |
| `ground_truth` | String | Actual truth: `LEGITIMATE` vs `FRAUD` |
| `expected_decision` | String | Ideal policy decision: `APPROVE`, `MANUAL_REVIEW`, `DENY` |

## Reproducibility

To regenerate the primary synthetic dataset:
```bash
python -m src.data.generator.generate_recovery_dataset --rows 10000 --seed 42 --output data/synthetic/recovery_requests_10k.csv
```
