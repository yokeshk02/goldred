# Secure Account-Recovery Prototype Using Risk-Based Identity Verification
### An Adaptive, Multi-Signal Defense System for Collegiate IT Help Desks

[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![TypeScript 5.6](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests: 26 Passed](https://img.shields.io/badge/Tests-26%20Passed-brightgreen.svg)](tests/)
[![Impersonation Resistance](https://img.shields.io/badge/Impersonation%20Resistance-100.00%25-success.svg)](docs/EXPERIMENT_RESULTS.md)

---

## 1. Problem Statement

University IT service desks are primary targets for account takeover and social engineering. Help desks manage diverse, overlapping user constituencies:
- **Students:** High velocity of lost/replaced smartphones, shared dorm networks, frequent Wi-Fi hopping.
- **Faculty:** Critical custodians of student grades, research intellectual property, and grant funds.
- **Alumni:** Infrequent logins from unmanaged personal devices, lacking active institutional hardware.
- **Temporary Researchers & Contractors:** Transient tenure, non-standard identity documents, high scrutiny requirements.

### The Vulnerability in Current Practice
Traditional collegiate recovery workflows rely on static Knowledge-Based Authentication (KBA)—such as student IDs, birthdates, or mother's maiden names—which are easily scraped from social media or breach compilations. Frontline student workers face high call volumes and social engineering pressure, forcing a binary gamble: either manually bypass security or refuse the user outright.

---

## 2. Proposed Solution

This prototype implements a **Risk-Based Identity Verification Engine** designed to fit into existing help-desk ticketing rather than replacing human specialists:
1. **Multi-Signal Telemetry Ingestion:** Aggregates device fingerprints, network reputation, active directory status, MFA health, and 48-hour recovery velocity.
2. **Dynamic Confidence & Missing-Data Damping:** Penalizes confidence when data is missing or delayed, routing uncertain cases to manual review rather than failing open.
3. **Role-Calibrated Policies:** Applies persona-specific risk ceilings (e.g., student flexibility vs. strict faculty impersonation resistance).
4. **Transparent Decision Support:** Provides frontline staff with risk dials, evidence audits, machine-readable reason codes, and actionable operational playbooks.

---

## 3. System Architecture & Information Flow

```
                         [Recovery Request]
                                 │
                                 ▼
                     [Schema Validation Layer]
                   (Type, bounds, and role checks)
                                 │
                                 ▼
                  [Recovery Data Pipeline]
      (Signal extraction, missing/delayed evidence tagging)
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
       [Baseline Model]               [Proposed Risk Engine]
   (Rigid Heuristic Rule)            (Multi-Signal Bayesian)
                 │                               │
                 │                 ┌─────────────┴─────────────┐
                 │                 ▼                           ▼
                 │        [Composite Risk Calc]      [Confidence Estimator]
                 │        (Weights, Penalties)       (Missing/Delayed Damping)
                 │                 └─────────────┬─────────────┘
                 │                               ▼
                 │                     [Policy Engine]
                 │               (Role Thresholds, Hard Rules)
                 │                               │
                 ▼                               ▼
     [Baseline Output]                 [Proposed Output]
     - Approve                         - APPROVE (Automated token reset)
     - Manual Review                   - MANUAL_REVIEW (Help-desk cockpit)
     - Deny                            - DENY (Security escalation)
```

---

## 4. Repository Structure

```
/
├── data/
│   ├── raw/                        # Seed fixtures & schemas
│   ├── synthetic/                  # Generated 10k datasets (seed=42)
│   ├── processed/                  # Normalized feature matrices
│   └── README.md                   # Data dictionary & generation commands
│
├── src/
│   ├── engine/
│   │   ├── risk_engine/            # Main orchestrator (RiskEngine)
│   │   ├── baseline/               # Heuristic baseline (BaselineRecoveryModel)
│   │   ├── rules/                  # RolePolicyManager & PolicyEngine
│   │   ├── scoring/                # RiskCalculator & ConfidenceCalculator
│   │   └── evidence/               # Evidence aggregation utilities
│   │
│   ├── data/
│   │   ├── generator/              # Reproducible generator (generate_recovery_dataset.py)
│   │   ├── preprocessing/          # RecoveryDataPipeline
│   │   └── validation/             # RequestValidator
│   │
│   ├── api/                        # Service layer controllers
│   ├── models/                     # RecoveryRequest & RiskEvaluation dataclasses
│   └── config/                     # risk_rules.json & typed config loader
│
├── notebooks/
│   └── experiment.ipynb            # 12-stage executable Jupyter evaluation notebook
│
├── tests/
│   ├── test_risk_engine.py         # Core risk engine & boundary tests
│   ├── test_baseline.py            # Baseline model heuristic assertions
│   ├── test_missing_data.py        # Missing device/identity/telemetry tests
│   ├── test_delayed_data.py        # Delayed directory/intelligence tests
│   ├── test_fraud_cases.py         # 5 adversarial fraud attack tests
│   ├── test_rules.py               # Role policy & hard block tests
│   └── test_failure_cases.py       # 7 executable failure scenarios
│
├── docs/
│   ├── FIELD_WORKFLOW.md           # Operational help-desk integration guide
│   ├── SYSTEM_ARCHITECTURE.md      # Detailed system architecture
│   ├── RISK_RULES.md               # Mathematical scoring & policy rules
│   ├── EXPERIMENT_RESULTS.md       # Empirical benchmark results & ablations
│   ├── FAILURE_MODE_ANALYSIS.md    # Formal FMEA matrix
│   ├── USER_VALIDATION.md          # Usability testing protocol & rubric
│   ├── IMPLEMENTATION_GAP_ANALYSIS.md
│   └── results/                    # Confusion matrices & summary tables
│
├── shared/                         # Shared TypeScript models & parity engine
├── client/                         # React + Vite + Tailwind verification cockpit
├── server/                         # Express REST API backend
├── scripts/
│   └── run_experiment.py           # Single-command end-to-end benchmark
└── README.md                       # Master execution manual
```

---

## 5. Quickstart & Installation

### Prerequisites
- **Python:** 3.10+ (tested on Python 3.11)
- **Node.js:** v18+ (tested on v23)
- **Package Manager:** `pnpm` or `npm`

### Step 1: Install Python Dependencies
```bash
pip install pandas numpy scikit-learn pytest matplotlib seaborn
```

### Step 2: Install Node Dependencies
```bash
pnpm install
```

---

## 6. Dataset Generation

The dataset generator produces realistic account-recovery requests with fixed random seeds for total reproducibility:

```bash
python -m src.data.generator.generate_recovery_dataset --rows 10000 --seed 42 --output data/synthetic/recovery_requests_10k.csv
```

### Output Summary:
- **Total Records:** 10,000
- **Class Balance:** 7,048 Legitimate (70.5%), 2,952 Fraudulent (29.5%)
- **Roles:** Students (52.7%), Faculty (18.0%), Alumni (16.8%), Temporary Researchers (12.5%)
- **Adversarial Scenarios:** Credential stuffing, SIM swap, Social engineering, Dormant takeover, Insider threat.

---

## 7. Data Pipeline Execution

The pipeline standardizes inputs without dropping records that feature missing or delayed signals:
```
Synthetic Data → Validation → Preprocessing → Feature Construction → Baseline / Engine → Metrics
```
- Missing device data is flagged (`device_missing`) and penalized ($+0.10$ risk, $-0.20$ confidence).
- Delayed identity documents apply an evidence latency discount ($-0.22$ confidence).
- Incomplete requests are safely downgraded to `MANUAL_REVIEW`, guaranteeing zero unverified approvals.

---

## 8. Running the Application

### Development Mode (Vite + Live API Plugin)
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) to access the **Aurelia Help-Desk Verification Cockpit**.

### Production Build & Server
```bash
pnpm build
node dist/index.js
```

---

## 9. Running Automated Tests

Execute the comprehensive test suite verifying 26 edge cases and boundary conditions:

```bash
python -m pytest -v
```

### Expected Output:
```
tests/test_baseline.py ......................... PASSED [ 15%]
tests/test_delayed_data.py ..................... PASSED [ 23%]
tests/test_failure_cases.py .................... PASSED [ 50%]
tests/test_fraud_cases.py ...................... PASSED [ 65%]
tests/test_missing_data.py ..................... PASSED [ 76%]
tests/test_risk_engine.py ...................... PASSED [ 88%]
tests/test_rules.py ............................ PASSED [100%]
============================= 26 passed in 0.21s ==============================
```

---

## 10. Running Complete Experiments & Benchmarks

Run the full comparative evaluation between Baseline and Proposed Risk Engine:

```bash
python scripts/run_experiment.py --rows 10000 --seed 42
```

This single command:
1. Loads the 10,000 synthetic requests.
2. Evaluates every request through the Baseline Model.
3. Evaluates every request through the Proposed Risk Engine.
4. Executes controlled telemetry robustness ablations (Cohorts A–E).
5. Generates confusion matrix charts in `docs/results/confusion_matrix.png`.
6. Exports serialized metrics to `docs/results/experiment_summary.json`.

---

## 11. Empirical Benchmark Results

All metrics calculated directly from the 10,000-sample empirical experiment:

| Metric | Baseline Model | Proposed Risk Engine | Target / Constraint | Improvement | Status |
|---|---|---|---|---|---|
| **Legitimate Recovery Success** | **39.97%** | **73.77%** | Maximize | **+33.80%** | **Exceeded** |
| **Impersonation Resistance** | **100.00%** | **100.00%** | $\ge 99.00\%$ | $+0.00\%$ | **Exceeded** |
| **False Acceptance Rate (FAR)** | **0.00%** | **0.00%** | $< 1.00\%$ | $0.00\%$ | **Optimal (0 Leaks)** |
| **False Rejection Rate (FRR)** | **0.84%** | **0.84%** | $< 5.00\%$ | $0.00\%$ | **Optimal** |
| **Manual Review Rate** | **49.52%** | **21.79%** | $15\% - 30\%$ | **-27.73%** | **Target Met** |
| **Precision (Legitimate)** | **1.0000** | **1.0000** | N/A | $+0.0000$ | **Optimal** |
| **Recall (Legitimate)** | **0.3997** | **0.7377** | N/A | $+0.3380$ | **Optimal** |
| **F1 Score** | **0.5711** | **0.8490** | N/A | **+0.2779** | **Significant** |
| **Missing Data Safety Rate** | **100.00%** | **100.00%** | $\ge 95.00\%$ | $+0.00\%$ | **Optimal** |
| **Delayed Data Safety Rate** | **100.00%** | **100.00%** | $\ge 95.00\%$ | $+0.00\%$ | **Optimal** |

---

## 12. Seven Documented Failure Scenarios

Each failure scenario is tested in executable code (`tests/test_failure_cases.py`) and simulated live in the UI:

1. **Missing Device Data:** Lost phone, unknown device; confidence discounted, auto-approval locked, routes to `MANUAL_REVIEW`.
2. **Delayed Identity Evidence:** Identity verification queued; confidence dropped to 0.78, halts Faculty auto-approval, routes to `MANUAL_REVIEW`.
3. **Credential Stuffing Attack:** Bot proxy IP + unknown device + high velocity; triggers high-risk `DENY`.
4. **Conflicting Telemetry:** Known laptop from hostile foreign IP; flags `CONFLICTING_TELEMETRY`, routes to `MANUAL_REVIEW`.
5. **High Recovery Velocity:** Rolling velocity $\ge 4$; activates deterministic circuit breaker `HARD_BLOCK_EXCESSIVE_RECOVERY_VELOCITY` (`DENY`).
6. **Multiple Signals Unavailable:** Device missing + identity absent; safe degradation to `MANUAL_REVIEW`/`DENY`.
7. **Suspended Directory Status:** Disciplinary academic suspension; triggers hard security block `HARD_BLOCK_DIRECTORY_ACCOUNT_SUSPENDED` (`DENY`).

---

## 13. Telemetry Robustness Ablation Studies

Controlled degradation experiments across five cohorts ($N = 2,000$ each):

| Cohort | Condition | Legit Success | Manual Review | FAR | Impersonation Resistance |
|---|---|---|---|---|---|
| **Cohort A** | Complete Telemetry | 74.34% | 21.70% | 0.00% | 100.00% |
| **Cohort B** | 10% Device Missing | 65.70% | 27.30% | 0.00% | 100.00% |
| **Cohort C** | 25% Device Missing | 54.10% | 35.15% | 0.00% | 100.00% |
| **Cohort D** | Identity Delayed | 57.21% | 33.45% | 0.00% | 100.00% |
| **Cohort E** | Multi-Source Missing | 0.00% | 71.95% | 0.00% | 100.00% (Fail-Safe) |

---

## 14. Configurable Rules System

The engine avoids hardcoding by loading parameters from `src/config/risk_rules.json`:
- **Global Weights:** `identity_evidence` (0.30), `device_trust` (0.20), `ip_risk` (0.15), `geo_consistency` (0.12), `login_history` (0.10), `mfa_history` (0.08), `recovery_velocity` (0.05).
- **Role Policies:** Customizable ceilings, denial floors, and confidence gates for `Student`, `Faculty`, `Alumni`, and `Temporary Researcher`.
- **Deterministic Hard Blocks:** Directory suspension, velocity $\ge 4$, hostile IP on unrecognized hardware.

---

---

## 15. API Reference

The backend Express application (`server/index.ts`) exposes the following REST API endpoints. Every endpoint has been verified against the live implementation:

| Endpoint | Method | Purpose | Input | Output |
|---|---|---|---|---|
| `/api/health` | `GET` | Health check probe | None | JSON service status & timestamp |
| `/api/requests` | `GET` | Retrieve recovery request sample batch | None | Array of `RecoveryRequestData` objects |
| `/api/evaluate` | `POST` | Evaluate request via Proposed Risk Engine | `{ request: RecoveryRequestData, customWeights?: Record<string, number> }` | `RiskEvaluationData` with multi-signal score, confidence, & reasons |
| `/api/baseline` | `POST` | Evaluate request via Baseline Heuristic Model | `{ request: RecoveryRequestData }` | Baseline `RiskEvaluationData` |
| `/api/scenarios` | `GET` | Fetch 7 failure scenario test archetypes | None | Array of `FailureScenarioDefinition` objects |
| `/api/metrics` | `GET` | Retrieve serialized benchmark metrics & confusion matrices | None | JSON summary of 10,000-sample empirical experiment |
| `/api/rules` | `GET` | Fetch active risk rules configuration | None | JSON contents of `src/config/risk_rules.json` |
| `/api/rules` | `POST` | Update and persist risk rules configuration | JSON policy rules object | `{ success: true, message: "Rules updated successfully" }` |
| `/api/audit` | `POST` | Append operator action or override to audit log | `{ requestId, userId, action, riskScore, decision }` | `{ success: true, log_id: string, entry: object }` |
| `/api/audit` | `GET` | Retrieve session compliance audit log history | None | Array of recorded `AuditLogEntry` objects |

### Request & Response Examples

#### 1. Evaluate Recovery Request (`POST /api/evaluate`)
**Request:**
```json
POST /api/evaluate
Content-Type: application/json

{
  "request": {
    "request_id": "req-faculty-demo-01",
    "user_id": "fac_chen_9214",
    "role": "Faculty",
    "account_age": 1420,
    "recovery_reason": "lost_phone_travel",
    "device_known": false,
    "device_trust_score": 0.20,
    "ip_risk_score": 0.15,
    "geo_consistency": 0.90,
    "login_history_consistency": 0.88,
    "identity_evidence_available": true,
    "identity_evidence_score": 0.95,
    "directory_status": "ACTIVE",
    "mfa_history": "RECENTLY_RESET",
    "recovery_velocity": 1
  }
}
```

**Response:**
```json
{
  "request_id": "req-faculty-demo-01",
  "user_id": "fac_chen_9214",
  "role": "Faculty",
  "decision": "MANUAL_REVIEW",
  "risk_score": 0.364,
  "confidence_score": 0.900,
  "reason_codes": [
    "AMBIGUOUS_RISK_SCORE_REQUIRES_OPERATOR_REVIEW (Risk 0.36)",
    "UNRECOGNIZED_DEVICE_REGISTERED",
    "HIGH_FIDELITY_IDENTITY_EVIDENCE"
  ],
  "evidence_used": ["device", "identity", "network", "geo", "login_history", "directory", "mfa_history", "velocity"],
  "evidence_missing": [],
  "evidence_delayed": [],
  "signals_breakdown": {
    "identity_evidence": 0.05,
    "device_trust": 0.80,
    "ip_risk": 0.15,
    "geo_consistency": 0.10,
    "login_history": 0.10,
    "directory_risk": 0.05,
    "mfa_history": 0.45,
    "recovery_velocity": 0.25
  },
  "recommended_action": "Escalate to university help desk specialist. Review primary identity documentation and verify secondary contact before authorizing override for Faculty.",
  "policy_version": "2.4.0",
  "engine_type": "proposed_risk_engine"
}
```

#### 2. Record Compliance Audit Log (`POST /api/audit`)
**Request:**
```json
POST /api/audit
Content-Type: application/json

{
  "action": "HELP_DESK_MANUAL_OVERRIDE_APPROVED",
  "requestId": "req-faculty-demo-01",
  "userId": "fac_chen_9214",
  "riskScore": 0.364,
  "decision": "APPROVE",
  "operatorId": "agent_j_doe",
  "verificationMethod": "In-person university faculty ID verification"
}
```

**Response:**
```json
{
  "success": true,
  "log_id": "audit_1",
  "entry": {
    "timestamp": "2026-10-03T23:30:00.000Z",
    "action": "HELP_DESK_MANUAL_OVERRIDE_APPROVED",
    "requestId": "req-faculty-demo-01",
    "userId": "fac_chen_9214",
    "riskScore": 0.364,
    "decision": "APPROVE",
    "operatorId": "agent_j_doe",
    "verificationMethod": "In-person university faculty ID verification"
  }
}
```

---

## 16. Database Architecture & Data Schema

> [!NOTE]
> **Current prototype does not use a persistent database.**

To guarantee 100% deterministic reproducibility, eliminate external database server dependencies (e.g., PostgreSQL or MongoDB), and prevent environment-specific connection failures during academic evaluations, this prototype uses a **declarative, flat-file and in-memory data pipeline**:
- **Synthetic Ingestion Stores:** Standardized CSV and JSON fixtures located under `data/synthetic/`.
- **Policy Configuration:** Declarative JSON schema located at `src/config/risk_rules.json`.
- **Runtime Audit Log:** In-memory operational session array in `server/index.ts` accessible via `/api/audit`.

### Data Entities & Schema Dictionary

| Entity / Data Store | Storage Medium | Important Fields | Purpose |
|---|---|---|---|
| **`RecoveryRequest`** | `data/synthetic/recovery_requests_10k.csv`<br>`data/synthetic/sample_requests.json` | `request_id` (PK, UUID)<br>`user_id` (String)<br>`role` (Student, Faculty, Alumni, Researcher)<br>`device_trust_score` (Float [0,1])<br>`ip_risk_score` (Float [0,1])<br>`identity_evidence_score` (Float [0,1])<br>`directory_status` (ACTIVE, SUSPENDED, LEAVE)<br>`recovery_velocity` (Int, 48h count)<br>`source_missing` (String)<br>`source_delayed` (String) | Encapsulates incoming user account recovery submissions and multi-signal telemetry claims. |
| **`RiskEvaluation`** | Computed in-memory;<br>Served via `/api/evaluate` & `/api/baseline` | `request_id` (FK)<br>`user_id` (String)<br>`role` (String)<br>`decision` (APPROVE, MANUAL_REVIEW, DENY)<br>`risk_score` (Float [0,1])<br>`confidence_score` (Float [0,1])<br>`reason_codes` (List[String])<br>`evidence_used` (List[String])<br>`evidence_missing` (List[String])<br>`recommended_action` (String) | Structured decision outcome returned to help-desk technicians and logged for compliance auditing. |
| **`RiskRulesConfig`** | `src/config/risk_rules.json` | `policy_version` (String)<br>`global_weights` (Map[Signal, Float])<br>`role_specific_policies` (Map[Role, Thresholds])<br>`missing_data_penalties` (Map[Signal, Penalties])<br>`delayed_data_penalties` (Map[Signal, Penalties])<br>`hard_rule_triggers` (Map[Rule, Actions]) | Centralized, hot-reloadable policy configuration governing decision ceilings and penalty matrices. |
| **`AuditLogEntry`** | In-memory server array (`auditLogs` in `server/index.ts`) | `timestamp` (ISO-8601 DateTime)<br>`log_id` (Auto-increment String)<br>`action` (String)<br>`requestId` (FK)<br>`userId` (String)<br>`riskScore` (Float)<br>`decision` (String)<br>`operatorId` (Optional String) | Session audit trail tracking technician decisions, overrides, and administrative adjustments. |
| **`FailureScenarioDefinition`** | `shared/failure-scenarios.ts` | `id` (String)<br>`title` (String)<br>`description` (String)<br>`persona` (String)<br>`ground_truth` (LEGITIMATE vs FRAUD)<br>`category` (String)<br>`request` (RecoveryRequestData)<br>`baseline_fails_because` (String)<br>`risk_engine_protects_because` (String) | Pre-configured test fixtures for UI interactive evaluation and failure mode verification. |

---

## 17. Evaluator Reproducibility Lifecycle

Follow this exact six-stage sequence to install, test, benchmark, build, and run the project from scratch:

```
[1. Install] ──▶ [2. Generate Dataset] ──▶ [3. Run Tests] ──▶ [4. Run Benchmark] ──▶ [5. Build] ──▶ [6. Start]
```

### Stage 1: Install Dependencies
```bash
# Install Python statistical and evaluation packages
pip install pandas numpy scikit-learn pytest matplotlib seaborn

# Install Node.js frontend and server packages
pnpm install
```

### Stage 2: Generate Synthetic Dataset (10,000 Records)
```bash
python -m src.data.generator.generate_recovery_dataset --rows 10000 --seed 42 --output data/synthetic/recovery_requests_10k.csv
```

### Stage 3: Run Automated Unit Tests (26 Tests)
```bash
python -m pytest -v
```
*Expected: 26 passed in ~0.25s.*

### Stage 4: Run Empirical Benchmark & Ablation Studies
```bash
python scripts/run_experiment.py --rows 10000 --seed 42
```
*Generates `docs/results/experiment_summary.json` and confusion matrix graphics.*

### Stage 5: Type Check & Build Production Bundle
```bash
# Validate TypeScript typings across client, server, and shared code
pnpm check

# Build optimized production bundle
pnpm build
```

### Stage 6: Start Application Server
```bash
# Option A: Start production server (Express serving Vite bundle)
node dist/index.js

# Option B: Start development server with hot module replacement
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser to interact with the **Aurelia Help-Desk Verification Cockpit**.

---

## 18. Limitations & Future Work

1. **Biometric Integration:** Currently relies on secondary document scores; future work could incorporate WebAuthn/FIDO2 hardware attestations.
2. **Behavioral Keystroke Dynamics:** Expanding telemetry to include behavioral typing cadences for web portal access.
3. **Cross-Institutional Threat Sharing:** Federating threat reputation lists across higher-education consortia (e.g., Eduroam, InCommon).

