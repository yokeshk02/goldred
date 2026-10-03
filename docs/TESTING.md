# Automated Testing Suite & Error Boundary Architecture

**Project:** Secure Account-Recovery Prototype Using Risk-Based Identity Verification  
**Evaluation Standard:** Qubee AI & Academic University Security Framework  
**Test Framework:** `pytest` (Python 3.11)  
**Execution Command:** `python -m pytest -v`  

---

## 1. Test Architecture & Directory Structure

The automated verification suite is organized into seven modular test files under `/tests`, designed to validate the end-to-end recovery verification pipeline from raw inputs to final policy decisions:

```
tests/
├── test_baseline.py         # Heuristic baseline verification logic (4 tests)
├── test_delayed_data.py     # Asynchronous & queued telemetry latency handling (2 tests)
├── test_failure_cases.py    # 7 executable real-world failure scenarios (7 tests)
├── test_fraud_cases.py      # Adversarial attack & impersonation resistance tests (4 tests)
├── test_missing_data.py     # Missing hardware & unsubmitted identity handling (3 tests)
├── test_risk_engine.py      # Multi-signal composite scoring & boundary tests (3 tests)
└── test_rules.py            # Role-specific policies & hard circuit-breaker triggers (3 tests)
```

---

## 2. Comprehensive Test File Mapping (All 26 Repository Tests)

Every test listed below actually executes in the repository and verifies a distinct operational requirement:

| Test Area | Test File | Test Name | Purpose / Tested Condition | Expected Result |
|---|---|---|---|---|
| **Baseline** | `tests/test_baseline.py` | `test_baseline_approves_when_known_device_and_high_identity` | Validates approval heuristic when identity score $\ge 0.80$ on a known device. | Decision: `APPROVE`, Reason: `BASELINE_IDENTITY_VERIFIED_AND_DEVICE_KNOWN` |
| **Baseline** | `tests/test_baseline.py` | `test_baseline_demotes_to_manual_review_on_unknown_device` | Asserts baseline refuses automated approval if device is unrecognized, even with 100% identity score. | Decision: `MANUAL_REVIEW`, Reason: `BASELINE_UNKNOWN_DEVICE` |
| **Baseline** | `tests/test_baseline.py` | `test_baseline_denies_low_identity_and_unknown_device` | Verifies rejection when identity evidence $< 0.35$ on an unknown device. | Decision: `DENY` |
| **Baseline** | `tests/test_baseline.py` | `test_baseline_denies_suspended_account` | Tests hard directory block in baseline logic. | Decision: `DENY`, Reason: `BASELINE_ACCOUNT_SUSPENDED` |
| **Delayed Data** | `tests/test_delayed_data.py` | `test_delayed_directory_status` | Ingestion delay on Active Directory / LDAP synchronization records. | Confidence discounted, Reason: `TELEMETRY_SOURCE_DELAYED_DIRECTORY` |
| **Delayed Data** | `tests/test_delayed_data.py` | `test_delayed_identity_evidence_for_faculty` | Tests high-assurance role (Faculty, min confidence 0.80) when identity verification is queued. | Confidence drops to 0.78, Decision: `MANUAL_REVIEW` |
| **Failure Cases** | `tests/test_failure_cases.py` | `test_scenario_1_missing_device_data` | Scenario 1: Lost smartphone with absent device telemetry. | Decision: `MANUAL_REVIEW`, zero blind approval |
| **Failure Cases** | `tests/test_failure_cases.py` | `test_scenario_2_delayed_identity_directory_evidence` | Scenario 2: Faculty replacement device during sync queue latency. | Decision: `MANUAL_REVIEW`, Confidence discounted |
| **Failure Cases** | `tests/test_failure_cases.py` | `test_scenario_3_fraudulent_recovery_request` | Scenario 3: Headless bot credential stuffing via Tor network. | Decision: `DENY`, Risk $\ge 0.70$ |
| **Failure Cases** | `tests/test_failure_cases.py` | `test_scenario_4_conflicting_evidence_device_vs_network` | Scenario 4: Known laptop connecting through high-threat proxy. | Conflict flagged, Decision: `MANUAL_REVIEW`, override required |
| **Failure Cases** | `tests/test_failure_cases.py` | `test_scenario_5_high_recovery_velocity` | Scenario 5: Rapid reset bombardment ($\ge 4$ attempts within 48h). | Hard block triggered, Decision: `DENY` |
| **Failure Cases** | `tests/test_failure_cases.py` | `test_scenario_6_multiple_signals_unavailable` | Scenario 6: Transient researcher with no hardware or identity telemetry. | Decision: `DENY` / `MANUAL_REVIEW`, Confidence $\le 0.60$ |
| **Failure Cases** | `tests/test_failure_cases.py` | `test_scenario_7_suspended_directory_status` | Scenario 7: Student with disciplinary hold attempting credential reset. | Decision: `DENY`, Reason: `HARD_BLOCK_DIRECTORY_ACCOUNT_SUSPENDED` |
| **Fraud Attacks** | `tests/test_fraud_cases.py` | `test_credential_stuffing_attack` | Validates defense against automated dictionary attacks with high IP threat scores. | Decision: `DENY`, Risk $\ge 0.70$ |
| **Fraud Attacks** | `tests/test_fraud_cases.py` | `test_sim_swap_mfa_reset_attack` | Adversary claiming MFA replacement without secondary identity documents. | Decision: `DENY`, Risk elevated |
| **Fraud Attacks** | `tests/test_fraud_cases.py` | `test_dormant_account_takeover` | Attack targeting inactive alumni account ($> 3,600$ days dormant) from foreign IP. | Decision: `DENY` |
| **Fraud Attacks** | `tests/test_fraud_cases.py` | `test_insider_threat_suspended_account` | Terminated adjunct or suspended student attempting workstation recovery. | Deterministic hard block, Decision: `DENY` |
| **Missing Data** | `tests/test_missing_data.py` | `test_missing_device_telemetry` | Validates graceful degradation when device fingerprint is empty. | `device` in `evidence_missing`, Confidence $< 0.85$, Decision: `MANUAL_REVIEW` |
| **Missing Data** | `tests/test_missing_data.py` | `test_missing_identity_evidence` | Validates security hold when user has not yet submitted proof of identity. | `identity` in `evidence_missing`, Confidence $\le 0.70$, Decision: `MANUAL_REVIEW` |
| **Missing Data** | `tests/test_missing_data.py` | `test_multiple_telemetry_sources_missing` | Worst-case compound absence: missing device and missing identity. | Decision: `DENY` / `MANUAL_REVIEW`, never auto-approves |
| **Risk Engine** | `tests/test_risk_engine.py` | `test_normal_legitimate_known_device` | Ideal student path: known hardware, campus IP, verified student ID. | Decision: `APPROVE`, Risk $\le 0.32$, Confidence $\ge 0.70$ |
| **Risk Engine** | `tests/test_risk_engine.py` | `test_legitimate_unknown_device_with_high_identity` | Student lost phone, replacement device paired with 100% verified photo ID. | Decision: `MANUAL_REVIEW` / conditional `APPROVE` with explanation |
| **Risk Engine** | `tests/test_risk_engine.py` | `test_boundary_risk_score_evaluation` | Borderline scoring ($0.30 \le R \le 0.70$) on synthetic edge inputs. | Decision: `MANUAL_REVIEW`, Operator review prescribed |
| **Role Rules** | `tests/test_rules.py` | `test_role_differentiation_student_vs_faculty` | Evaluates identical borderline signals under Student vs. Faculty thresholds. | Faculty policy enforces higher confidence gate ($\ge 0.80$) and lower risk ceiling ($\le 0.25$) |
| **Role Rules** | `tests/test_rules.py` | `test_temporary_researcher_high_scrutiny` | Scrutiny check on transient researcher persona ($R_{\text{ceiling}} = 0.20, C_{\text{min}} = 0.85$). | Escalates any anomaly to `MANUAL_REVIEW` |
| **Role Rules** | `tests/test_rules.py` | `test_hard_block_extreme_velocity` | Tests velocity circuit breaker when 48h reset attempts $\ge 4$. | Deterministic `DENY`, Reason: `HARD_BLOCK_EXCESSIVE_RECOVERY_VELOCITY` |

---

## 3. Test Categories & Boundary Scenarios

### 3.1 Boundary Conditions Tested
1. **Risk Score Boundary:** Tests scores hovering near the $R_{\text{max}} = 0.30$ and $R_{\text{min}} = 0.70$ thresholds. The engine guarantees that ambiguous risk is never forced into a binary approve/deny, but is routed to human operators.
2. **Confidence Gate Boundary:** Tests requests where risk is low ($R = 0.22$) but confidence is dampened ($C = 0.64 < 0.65$). The policy engine prevents automated approval until the minimum confidence floor is met.
3. **Recovery Velocity Boundary:** Tests recovery attempts at $V = 1$ (normal), $V = 2$ (alert), and $V \ge 4$ (hard circuit breaker).

### 3.2 Robustness Under Missing Telemetry
- The system enforces a **fail-closed** invariant: if primary telemetry (`device` or `identity`) is marked as missing in `evidence_status.missing`, the `policy_engine.py` code prohibits automated approval regardless of low baseline risk.
- Confidence is decremented by $-0.20$ for missing device data and $-0.35$ for missing identity records.

### 3.3 Robustness Under Delayed Telemetry
- Ingestion latency flags `evidence_delay == True` and tags the source in `evidence_status.delayed`.
- Confidence is decremented by $-0.22$ for delayed identity documents and $-0.10$ for directory sync delays, ensuring high-assurance roles (Faculty, Researchers) are held for review until synchronization completes.

---

## 4. Application Error Boundaries & Exception Handling

The application implements defense-in-depth error handling across both backend evaluation engines and frontend user interfaces:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Incoming Recovery Request                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
       [Boundary 1: API Layer Input & Content-Type Gate]
       - Catch JSON parse errors
       - Validate body.request presence (HTTP 400 Bad Request)
                                    │
                                    ▼
       [Boundary 2: Schema & Numeric Bounds Validation]
       - Check required fields (user_id, role, scores)
       - Validate numeric ranges [0.0, 1.0] (RequestValidator)
                                    │
                                    ▼
       [Boundary 3: Telemetry Degradation & Pipeline Fallback]
       - Handle null/empty device_id or missing identity scores
       - Substitute neutral-uncertainty risk (0.60 dev, 0.80 id)
       - Flag missing/delayed signals without throwing unhandled exceptions
                                    │
                                    ▼
       [Boundary 4: Deterministic Hard Security Triggers]
       - Directory status == "SUSPENDED" -> Immediate DENY
       - Recovery velocity >= 4 -> Immediate DENY
       - IP Threat >= 0.90 & Unknown Device -> Immediate DENY
                                    │
                                    ▼
       [Boundary 5: Client-Side UI React Error Boundary]
       - Component crash isolation (<ErrorBoundary>)
       - Fallback recovery screen with stack trace & reload option
```

### Structured Error Boundary Matrix

| Error Condition | Detection Mechanism | System Response | Help-Desk / User Impact | Security Implication |
|---|---|---|---|---|
| **API Validation Failure / Missing Request Body** | `server/index.ts` checks `if (!body.request)` in `/api/evaluate` & `/api/baseline` | Returns HTTP `400 Bad Request` with `{"error": "Missing request in request body"}`. | Frontend displays error toast: "Invalid request payload submitted". | Prevents unhandled server crash, null-pointer dereferences, or denial of service. |
| **Malformed Recovery Request / Bad JSON** | Express `express.json()` middleware parser | Returns HTTP `400 Bad Request` with syntax error notification. | Client receives immediate HTTP 400 error; form does not submit. | Sanitizes raw input streams; prevents parser exploitation and memory leakage. |
| **Missing Required Schema Fields** | `RequestValidator.validate_record()` iterates over `REQUIRED_FIELDS` | Appends validation issue `Missing required field: '<field>'`; marks `is_valid = False`. | Cockpit marks submission invalid and displays specific missing attribute warnings. | Prevents silent evaluation with uninitialized fields, ensuring deterministic scoring. |
| **Unavailable / Missing Evidence Sources** | `RecoveryDataPipeline.process_record()` detects missing `device` or `identity` | Assigns neutral uncertainty risk ($R=0.60/0.80$), discounts confidence, inhibits automated `APPROVE`. | Help-desk agent sees warning banner with missing source and manual verification playbook. | **Prevents blind automated recovery of unverified callers (fail-closed invariant).** |
| **Delayed Telemetry Ingestion** | Pipeline checks `evidence_delay == True` or `source_delayed` flags | Ingests available data; applies confidence discount ($-0.22$ for ID, $-0.10$ for directory). | Ticket shows "Telemetry Pending Verification" status; alerts operator of queue delay. | Prevents race conditions during registrar or Active Directory replication cycles. |
| **Invalid / Unrecognized Role** | `RequestValidator` validates role against `VALID_ROLES` set | Flags validation error; engine falls back to safest default thresholds (`Student`). | Request is triaged under conservative general policy; audit log tags anomaly. | Eliminates privilege escalation through arbitrary or unauthorized role strings. |
| **Invalid Risk Configuration / File Failure** | `server/index.ts` `try/catch` in `GET/POST /api/rules` and `RiskConfig` loader | Returns HTTP `500 Internal Server Error` with error message or raises `FileNotFoundError`. | UI shows "Failed to load/update policy rules"; falls back to in-memory defaults. | Protects rule configuration integrity; prevents corrupt rules from entering production. |
| **Unexpected Engine Calculation Errors** | `try/catch` wrappers in server endpoints and safe numeric clamping `[0.0, 1.0]` | Returns HTTP `500 Internal Server Error` with structured JSON error; avoids process crash. | Operator sees execution failure dialog; request is preserved in ticket queue. | Prevents unhandled runtime exceptions from crashing the verification daemon. |
| **Directory Suspension State** | `PolicyEngine.evaluate_hard_rules()` checks `directory_status == "SUSPENDED"` | Triggers deterministic hard circuit breaker (`HARD_BLOCK_DIRECTORY_ACCOUNT_SUSPENDED`), returns `DENY`. | Agent is instructed that recovery is barred due to administrative hold; contact SecOps. | Prevents compromised, expelled, or terminated credentials from being reinstated. |

---

## 5. Granular Error Boundary Specifications (Condition → Response Lifecycle)

Each error boundary implemented in the codebase follows a strict lifecycle to maintain the **fail-closed security posture**:

### 1. API Validation Failures (Missing Request Body)
- **Condition:** Client submits a POST request to `/api/evaluate` or `/api/baseline` with empty payload or missing `request` object.
- **Detection:** Handled synchronously in `server/index.ts` via `if (!body.request)`.
- **System Response:** Emits HTTP `400 Bad Request` with payload `{"error": "Missing request in request body"}`.
- **User/Help-Desk Response:** Frontend verification cockpit catches HTTP 400 and renders an inline alert informing the operator of the malformed submission.
- **Security Implication:** Prevents server process abortion via null-pointer dereferences, guarding against DoS attacks on the recovery endpoint.

### 2. Malformed Recovery Requests (JSON Syntax Errors)
- **Condition:** Network transmission corruption or attacker fuzzing sends non-parseable JSON bytes.
- **Detection:** Caught by Express `express.json()` middleware layer before reaching route controllers.
- **System Response:** Express halts request processing and returns standard HTTP `400 Bad Request` HTML/JSON error.
- **User/Help-Desk Response:** Client displays "Communication error: Invalid response from server".
- **Security Implication:** Blocks prototype fuzzing and memory exploitation attempts at the edge.

### 3. Missing Required Fields
- **Condition:** Ingested recovery record lacks one or more critical schema attributes (`user_id`, `role`, `identity_evidence_score`, etc.).
- **Detection:** Identified by `RequestValidator.validate_record()` in `src/data/validation/validator.py` checking against `REQUIRED_FIELDS`.
- **System Response:** Generates structured warning strings `Missing required field: '<field>'` and sets batch validity flag `is_valid = False`.
- **User/Help-Desk Response:** UI highlights missing form fields in red with descriptive tooltips for help-desk personnel.
- **Security Implication:** Guarantees that downstream Bayesian weighted calculations never execute on uninitialized variables or `None` types.

### 4. Unavailable Evidence Sources (Missing Device or Identity)
- **Condition:** User claims recovery from a new device without hardware registration (`source_missing = 'device'`) or has not yet uploaded photo ID (`identity_evidence_available = False`).
- **Detection:** Ingested by `RecoveryDataPipeline.process_record()`, identifying absent signals and appending them to `evidence_status.missing`.
- **System Response:** Imputes safe neutral uncertainty risk ($R_{\text{device}} = 0.60$, $R_{\text{identity}} = 0.80$), penalizes confidence ($-0.20$ / $-0.35$), and enforces `has_critical_missing` check in `PolicyEngine` to block automated approval.
- **User/Help-Desk Response:** Specialist console displays `[CRITICAL_TELEMETRY_MISSING]` banner with direct links to the physical identity verification checklist.
- **Security Implication:** **Core Fail-Closed Principle**: Zero automated approvals can be granted without verified identity documents and hardware provenance.

### 5. Delayed Data Ingestion
- **Condition:** Upstream registrar sync or Active Directory LDAP replication experiences latency (`evidence_delay = True` or `source_delayed = 'directory'`).
- **Detection:** Pipeline inspects `source_delayed` and `evidence_delay` flags, registering them under `evidence_status.delayed`.
- **System Response:** Calculates available telemetry normally but discounts confidence score ($-0.22$ for delayed ID, $-0.10$ for directory). For high-assurance roles (Faculty $C_{\text{min}} = 0.80$), this safely drops $C$ below threshold ($C=0.78$), routing to `MANUAL_REVIEW`.
- **User/Help-Desk Response:** Verification desk shows "Telemetry Delayed: Document Verification Queued", informing agent to hold request until sync completes.
- **Security Implication:** Prevents race-condition exploits where attackers attempt resets during known Active Directory replication intervals.

### 6. Invalid / Spoofed Role
- **Condition:** Inbound request specifies an unauthenticated or corrupt role string (e.g., `role: "SuperAdmin"` or `role: "Guest"`).
- **Detection:** `RequestValidator` checks against `VALID_ROLES = {"Student", "Faculty", "Alumni", "Temporary Researcher"}`.
- **System Response:** Pipeline issues validation error; `PolicyEngine` and `RiskCalculator` fall back to the most conservative default thresholds (`Student` defaults: $R_{\text{ceiling}} = 0.30$, $C_{\text{min}} = 0.70$).
- **User/Help-Desk Response:** Operator log displays "Unrecognized role; evaluated under baseline Student profile".
- **Security Implication:** Prevents privilege escalation by restricting attackers from creating custom permissive role policies.

### 7. Invalid Risk Configuration
- **Condition:** Corrupted or unreadable `src/config/risk_rules.json` file or invalid JSON syntax during rule updating via `POST /api/rules`.
- **Detection:** `RiskConfig` loader catches `FileNotFoundError` or JSON decode errors; `server/index.ts` wraps disk write in `try/catch`.
- **System Response:** Emits HTTP `500 Internal Server Error` with `{"error": err.message}` and aborts file write; Python engine falls back to default singleton state.
- **User/Help-Desk Response:** Help desk administration settings show error modal: "Configuration update rejected: Syntax invalid".
- **Security Implication:** Guarantees that corrupted or syntactically invalid rule sets cannot replace active security policies.

### 8. Unexpected Engine Errors
- **Condition:** Numerical divide-by-zero, out-of-range floats, or unexpected runtime exceptions during signal aggregation.
- **Detection:** Handled via numerical clamping `min(1.0, max(0.0, score))` in `RiskCalculator` and global `try/catch` in Express server handlers.
- **System Response:** Catches error cleanly, logs diagnostic trace, and returns HTTP `500` rather than allowing process termination.
- **User/Help-Desk Response:** Operator receives "Evaluation service error; ticket escalated to Tier 3 Engineering".
- **Security Implication:** Ensures continuous availability of the verification service; prevents process denial of service.

### 9. Frontend Component Render Failure
- **Condition:** Unhandled JavaScript runtime exception in client-side React component hierarchy.
- **Detection:** Intercepted by `client/src/components/ErrorBoundary.tsx` (`componentDidCatch` lifecycle).
- **System Response:** Prevents white-screen crash; renders localized Velvet Ledger recovery container with error message and reset trigger.
- **User/Help-Desk Response:** Technician can read the diagnostic message and click "Reload Application" without terminating ongoing customer calls.
- **Security Implication:** Maintains operator workflow continuity during peak help-desk operations.

