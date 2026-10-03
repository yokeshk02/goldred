# Field Workflow Specification: Help Desk Integration

## 1. Context & Operational Challenge

In collegiate IT environments, service desks field hundreds of account lockout and recovery requests daily from diverse user populations:
- **Students** (high volume, frequent device turnover, mobile-first access)
- **Faculty** (high privileged access to academic grades, sensitive research IP, and grant accounts)
- **Alumni** (intermittent access to institutional email, transcripts, and lifetime portals)
- **Temporary Researchers & Contractors** (transient access, external credentials, varied compliance standards)

### The As-Is (Legacy) Workflow
```
[User Request] 
       ↓ 
[Help Desk Agent Phone/Ticket] 
       ↓ 
[Manual Challenge: Mother's maiden name / Student ID / Birthdate] 
       ↓ 
[Static Password Reset / Override]
```

### Critical Flaws in the Legacy Workflow:
1. **Susceptibility to Social Engineering:** Attackers routinely pretext as distressed students before exams or urgent faculty members traveling abroad.
2. **Knowledge-Based Authentication (KBA) Failure:** Public records, social media, and university directories make birthdates, graduation years, and IDs trivial to harvest.
3. **Cognitive Overload & Operator Fatigue:** Frontline student workers lack real-time threat intelligence (e.g., whether an IP belongs to a known Tor exit node or VPN hosting service).
4. **Binary Blindness:** Help desks must either grant complete account access or refuse the user entirely, creating high user friction.

---

## 2. The To-Be (Proposed) Operational Workflow

The prototype integrates seamlessly into existing help-desk ticket ingestion and live support dashboards without displacing human authority.

```
       [User Submits Recovery Request (Portal or Phone Call)]
                                 │
                                 ▼
         [Telemetry Aggregation & Directory Ingestion]
        (Device Fingerprint, IP Reputation, Active Directory, MFA)
                                 │
                                 ▼
                     [Multi-Signal Risk Engine]
                    (Role Policy, Bayesian Scoring)
                                 │
                 ┌───────────────┼───────────────┐
                 ▼                               ▼
       [Automated Route]                [Ambiguous / High Risk]
   (Risk ≤ Approval Ceiling         (Confidence Deficit /
    & High Confidence)              Elevated Anomaly)
                 │                               │
                 │                               ▼
                 │                 [Operator Cockpit Card]
                 │                 - Composite Risk Dial (0.0 - 1.0)
                 │                 - Missing/Delayed Evidence Flags
                 │                 - Reason Explanations
                 │                 - Role-Calibrated Action Guide
                 │                               │
                 │                ┌──────────────┴──────────────┐
                 │                ▼                             ▼
                 │       [Operator Verification]       [Security Escalation]
                 │       - Secondary Out-of-Band Call   - Flag Threat Incident
                 │       - Government ID Check          - Lock Compromised Creds
                 │                │                             │
                 ▼                ▼                             ▼
     [Token Reset Dispatched]  [Approved with Audit]      [Hard Denial Logged]
```

---

## 3. Human-in-the-Loop & Escalation Matrix

The system automates routine verification while surfacing unambiguous signals for human escalation:

| Automated by System | Human-Controlled (Help Desk Specialist) | Escalate to IT Security Operations |
|---|---|---|
| Ingests device fingerprint and past association | Conducts secondary out-of-band video or phone verification | Investigates active credential-stuffing campaigns |
| Queries IP threat scores, proxies, and ASN classification | Validates government photo ID or faculty sponsorship letters | Handles repeated attacks on executive/dean accounts |
| Validates Active Directory status (`ACTIVE` vs `SUSPENDED`) | Approves override when student replaces a lost phone | Revokes compromised session tokens campus-wide |
| Computes 48-hour recovery velocity | Overrides delayed identity verification upon manual vetting | Freezes compromised accounts linked to foreign APT IPs |
| Enforces role-specific confidence and risk limits | Documents physical service desk verification notes | Audits forensic event logs |

---

## 4. Handling Imperfect Evidence

### A. Missing Data (e.g., Unrecognized Device, Lost Phone)
- **Policy Enforcement:** The system strictly prohibits automated approval when device or identity telemetry is missing.
- **Operator Guidance:** The Help Desk cockpit highlights:  
  `[CRITICAL_TELEMETRY_MISSING: DEVICE]`  
  The agent is instructed to ask for primary secondary verification (e.g., campus card, duo push to registered backup hardware).

### B. Delayed Data (e.g., Active Directory Sync Latency, Identity Processing Queue)
- **Policy Enforcement:** Delays reduce confidence scores (e.g., -0.22 for identity, -0.10 for directory).
- **Operator Guidance:** For standard students, low risk allows conditional pending recovery; for **Faculty** and **Temporary Researchers**, delays enforce a mandatory manual hold until synchronization concludes.

### C. Conflicting Data (e.g., Known Device from Tor Exit Node)
- **Policy Enforcement:** Immediate conflict penalty (+0.12 risk, -0.20 confidence).
- **Operator Guidance:** Alerts the technician to possible session hijacking or stolen hardware token. Immediate challenge-response required.
