# Failure Mode and Effects Analysis (FMEA)

This document formalizes failure modes, detection mechanisms, and remediation actions across the account-recovery verification lifecycle.

---

## 1. Structured Failure Mode Matrix

| Failure Mode | Root Cause | Detection Mechanism | Security / Operational Risk | System Response | Required Human Action |
|---|---|---|---|---|---|
| **Missing Device Information** | User lost smartphone, wiped PC, or uses private incognito window. | Telemetry validator identifies `device_id == ""` or `device_trust_score == 0.0`. | Attacker operating headless browser without stored cookies or fingerprints. | Disables automated approval (`APPROVE` blocked). Penalizes confidence by $-0.20$. Routes to `MANUAL_REVIEW`. | Specialist asks user for physical campus card verification or initiates out-of-band video call. |
| **Delayed Identity Evidence** | Cloud OCR queue backup, document verification latency, or slow registrar sync. | `source_delayed == 'identity'` or ingest latency $> 15\,\text{sec}$. | User lockout during critical academic deadlines; impatient user abandons request. | Imposes $-0.22$ confidence discount. Blocks auto-approval for Faculty & Researchers. Allows conditional hold. | Agent verifies secondary records manually in registrar database and approves conditional override. |
| **Fraudulent Recovery Request** | Credential stuffing from compromised third-party dump. | High IP risk ($\ge 0.75$), unknown device, velocity $> 2$, low geo-consistency. | Unauthorized takeover of university mailbox, grade alteration, or payroll redirect. | Triggers `DENY`. Enforces high-risk reason codes. Generates SecOps security incident alert. | IT Security blocks offending IP subnet and forces session revocation on affected account. |
| **Conflicting Evidence** | Known laptop connects from known hostile proxy or VPN node. | Device trust $> 0.75$ while IP risk $> 0.70$ or geo-consistency $< 0.25$. | Stolen physical laptop or session token exfiltration to foreign command server. | Flags `CONFLICTING_TELEMETRY`. Adds $+0.12$ risk penalty and $-0.20$ confidence. Routes to `MANUAL_REVIEW`. | Help desk calls user's verified phone number on file to confirm physical possession of device. |
| **Suspicious Device Telemetry** | Attacker emulating device user-agent using automated bot frameworks. | Device trust $< 0.40$, device change flag set, irregular OS font/canvas fingerprint. | Automated brute-force bypass using synthetic browser signatures. | Applies device risk penalty ($s_{\text{dev}} \ge 0.60$). Routes to `MANUAL_REVIEW` or `DENY`. | Agent requires hardware security key (FIDO2) or in-person walk-up at university library help desk. |
| **Suspicious IP / Network Anomaly** | Request routed via commercial datacenter hosting (AWS, Linode), VPN, or Tor. | Reverse ASN lookup matches known proxy/hosting ranges (`ip_risk_score >= 0.85`). | Anonymous offshore attacker attempting credential harvesting. | If paired with unknown device: triggers deterministic `HARD_BLOCK_TOR_PROXY`. Else escalates risk. | Agent reviews location history. Strict denial if applicant cannot substantiate travel. |
| **Repeated Recovery Velocity** | Rapid consecutive password reset requests within a 48-hour rolling window. | `recovery_velocity >= 2` alerts; `recovery_velocity >= 4` hard triggers. | Denial-of-service against legitimate user, or brute-force OTP interception. | Velocity $\ge 4$ enforces instant `HARD_BLOCK_EXCESSIVE_RECOVERY_VELOCITY`. Account locked for 60 min. | Agent reviews velocity history with user to ensure account is not under targeted spear-phishing attack. |
| **Directory Suspension Anomaly** | Student with disciplinary suspension or terminated adjunct attempting login. | Directory status query returns `SUSPENDED` from Active Directory. | Unauthorized lateral movement by disgruntled former employee or suspended student. | Instant hard denial (`HARD_BLOCK_DIRECTORY_ACCOUNT_SUSPENDED`). | Agent informs applicant that account recovery is barred pending clearance from Human Resources or Dean of Students. |

---

## 2. Defensive Principles Summary

1. **Fail-Closed on Uncertainty:** Incomplete, missing, or delayed telemetry never results in an unverified approval.
2. **Deterministic Precedence:** Hard security triggers (suspension, excessive velocity, Tor exit nodes) override all statistical weights.
3. **Auditability:** Every failure condition is permanently stamped with machine-readable reason codes for post-incident forensics.
