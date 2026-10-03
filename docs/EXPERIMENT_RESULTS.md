# Experimental Evaluation & Empirical Benchmarks

## 1. Primary Evaluation Benchmark (10,000 Synthetic Requests)

**Dataset Size:** 10,000 synthetic requests (`7,048 Legitimate`, `2,952 Fraudulent`)  
**Random Seed:** 42 (Fully deterministic and reproducible)  
**Evaluation Standard:** Qubee AI & Academic University Security Framework  

### Master Performance Comparison Table

| Metric | Baseline Model | Proposed Risk Engine | Target / Constraint | Improvement | Status |
|---|---|---|---|---|---|
| **Legitimate Recovery Success** | **39.97%** | **73.77%** | Maximize | **+33.80%** | **Exceeded** |
| **Impersonation Resistance** | **100.00%** | **100.00%** | $\ge 99.00\%$ | $+0.00\%$ | **Exceeded** |
| **False Acceptance Rate (FAR)** | **0.00%** | **0.00%** | $< 1.00\%$ | $0.00\%$ | **Optimal** |
| **False Rejection Rate (FRR)** | **0.84%** | **0.84%** | $< 5.00\%$ | $0.00\%$ | **Optimal** |
| **Manual Review Rate** | **49.52%** | **21.79%** | $15\% - 30\%$ | **-27.73%** | **Target Met** |
| **Precision (Legitimate)** | **1.0000** | **1.0000** | N/A | $+0.0000$ | **Optimal** |
| **Recall (Legitimate)** | **0.3997** | **0.7377** | N/A | $+0.3380$ | **Optimal** |
| **F1 Score** | **0.5711** | **0.8490** | N/A | **+0.2779** | **Significant** |
| **Missing Data Safety Rate** | **100.00%** | **100.00%** | $\ge 95.00\%$ | $+0.00\%$ | **Optimal** |
| **Delayed Data Safety Rate** | **100.00%** | **100.00%** | $\ge 95.00\%$ | $+0.00\%$ | **Optimal** |

---

## 2. Primary Success Metric Analysis

> **Primary Success Target:** Legitimate Recovery Success at a Defined Impersonation-Resistance Level ($\ge 99.00\%$).

- **Baseline Model:** Achieved 100.00% Impersonation Resistance, but at a catastrophic operational cost: only **39.97%** of legitimate users could recover their accounts without human intervention, dumping **49.52%** of all campus recovery requests onto help-desk staff.
- **Proposed Risk Engine:** Maintained **100.00% Impersonation Resistance** (0 false acceptances out of 2,952 fraud attempts) while raising Legitimate Recovery Success to **73.77%**—an absolute increase of **+33.80%** (an **84.5% relative boost** in automated recovery efficiency).
- **Manual Review Load:** Slashed from **49.52% to 21.79%**, freeing over half of help-desk operator time for genuine support issues.

---

## 3. Confusion Matrices

### 3.1 Ternary Decision Distribution (Total $N = 10,000$)

#### Baseline Model
| Ground Truth | Automated Approve | Manual Review | Outright Deny | Total |
|---|---|---|---|---|
| **Legitimate** | 2,817 | 4,172 | 59 | 7,048 |
| **Fraud** | 0 | 780 | 2,172 | 2,952 |

#### Proposed Risk Engine
| Ground Truth | Automated Approve | Manual Review | Outright Deny | Total |
|---|---|---|---|---|
| **Legitimate** | 5,199 | 1,790 | 59 | 7,048 |
| **Fraud** | 0 | 389 | 2,563 | 2,952 |

### 3.2 Binary Security View (Approve vs. Intercepted)
- **Baseline:** $\text{TP} = 2,817, \text{FP} = 0, \text{TN} = 2,952, \text{FN} = 4,231$
- **Proposed Engine:** $\text{TP} = 5,199, \text{FP} = 0, \text{TN} = 2,952, \text{FN} = 1,849$
- **Improvement:** 2,382 additional legitimate requests safely automated with zero false positive security leaks.

Visual chart rendered in: `docs/results/confusion_matrix.png`.

---

## 4. Controlled Telemetry Robustness Ablation Studies

To satisfy Phase 12, controlled degradation experiments were run across five cohorts ($N = 2,000$ each):

| Cohort | Description | Legit Success | Manual Review | FAR | FRR | Impersonation Resistance |
|---|---|---|---|---|---|---|
| **Cohort A** | Complete Telemetry | 74.34% | 21.70% | 0.00% | 1.12% | 100.00% |
| **Cohort B** | 10% Device Data Missing | 65.70% | 27.30% | 0.00% | 1.34% | 100.00% |
| **Cohort C** | 25% Device Data Missing | 54.10% | 35.15% | 0.00% | 1.77% | 100.00% |
| **Cohort D** | Identity Evidence Delayed | 57.21% | 33.45% | 0.00% | 1.20% | 100.00% |
| **Cohort E** | Multi-Source Telemetry Missing | 0.00% | 71.95% | 0.00% | 3.04% | 100.00% |

### Key Robustness Observations:
1. **Zero Blind Approvals:** In Cohort E (where both device and identity proof are missing), automated approval drops to **0.00%**. The engine gracefully degrades to Manual Review (71.95%) and Denial.
2. **Predictable Scaling:** As device missingness increases from 0% to 10% to 25%, manual review escalates proportionally ($21.7\% \rightarrow 27.3\% \rightarrow 35.2\%$) without permitting any attacker bypass.

---

## 5. Role-Specific Breakdown

| Role | Legitimate Success | Manual Review Rate | FRR | Impersonation Resistance | F1 Score |
|---|---|---|---|---|---|
| **Student** | **86.28%** | 15.46% | 0.30% | 100.00% | **0.9264** |
| **Faculty** | **53.30%** | 34.78% | 1.26% | 100.00% | **0.6954** |
| **Alumni** | **77.76%** | 17.20% | 1.46% | 100.00% | **0.8749** |
| **Temporary Researcher** | **37.47%** | 35.92% | 2.09% | 100.00% | **0.5451** |

- **Students** enjoy frictionless self-service (86.28% auto-approval) due to high campus Wi-Fi tenure and low privilege risk.
- **Faculty & Temporary Researchers** are held to strict impersonation ceilings, routing 34–36% of requests to help-desk technicians to safeguard university administrative domains and research repositories.

---

## 6. Error & Boundary Analysis (Phase 21)

### 6.1 False Rejections (FRR = 0.84%, 59 records out of 7,048)
- **Cause:** Legitimate student accounts with directory status flagged as `SUSPENDED` (e.g., administrative hold due to unpaid tuition or judicial hold).
- **Rule Triggered:** `HARD_BLOCK_DIRECTORY_ACCOUNT_SUSPENDED`.
- **Finding:** This is technically correct security behavior; recovery should remain blocked until academic holds are resolved.

### 6.2 Escalated Manual Reviews (1,790 records)
- **Sub-cohort A (68%):** Legitimate users registering a new replacement device with identity document verification still pending.
- **Sub-cohort B (22%):** Faculty traveling overseas experiencing geographic anomaly ($S_{\text{geo}} < 0.40$).
- **Remediation:** Introduce out-of-band biometric push confirmation (e.g., FIDO2 / WebAuthn passkey) to convert 10–15% of Sub-cohort A into automated approvals.
