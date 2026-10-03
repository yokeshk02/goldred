# Risk Scoring Rules & Policy Specification

## 1. Mathematical Formulation

### 1.1 Base Composite Risk Score
The base risk score $R_{\text{base}}$ is calculated as a normalized weighted sum of normalized risk signals:

$$R_{\text{base}} = \frac{\sum_{i=1}^{N} w_i \cdot s_i}{\sum_{i=1}^{N} w_i}$$

Where:
- $w_i \in [0, 1]$ represents the signal weight defined in `src/config/risk_rules.json`.
- $s_i \in [0, 1]$ represents the normalized signal risk (where $0.0 = \text{safest}$, $1.0 = \text{most risky}$).

### Signal Risk Definitions:
- **Identity Risk:** $s_{\text{identity}} = 1.0 - S_{\text{identity\_evidence\_score}}$
- **Device Risk:** $s_{\text{device}} = 1.0 - S_{\text{device\_trust}}$ (if known); $s_{\text{device}} = \max(0.50, 1.25 - S_{\text{device\_trust}})$ if unknown.
- **Network Risk:** $s_{\text{ip}} = S_{\text{ip\_risk\_score}}$
- **Geographic Risk:** $s_{\text{geo}} = 1.0 - S_{\text{geo\_consistency}}$
- **Login History Risk:** $s_{\text{login}} = 1.0 - S_{\text{login\_consistency}}$
- **MFA Risk:** $s_{\text{mfa}} \in \{0.10 \text{ (Healthy)}, 0.45 \text{ (Reset)}, 0.70 \text{ (Failed)}, 0.85 \text{ (Disabled)}\}$
- **Velocity Risk:** $s_{\text{velocity}} = \min(1.0, V_{\text{recovery\_velocity}} \times 0.25)$

---

### 1.2 Final Adjusted Risk Score
Telemetry absences, conflicting signals, and role modifiers apply additive risk penalties:

$$R_{\text{final}} = \min\left(1.0, \max\left(0.0, R_{\text{base}} + P_{\text{missing}} + P_{\text{conflict}} + P_{\text{role}}\right)\right)$$

Where:
- $P_{\text{missing}}$ is the sum of penalties for absent data sources (Device: $+0.10$, Identity: $+0.25$, Directory: $+0.15$).
- $P_{\text{conflict}} = 0.12 \times N_{\text{conflicts}}$ (e.g., trusted device from foreign Tor exit node).
- $P_{\text{role}}$ represents role-specific penalties (e.g., $+0.08$ for Faculty using unknown device).

---

### 1.3 Evidence Confidence Metric
Confidence $C \in [0.10, 1.0]$ measures the fidelity and freshness of the telemetry observed:

$$C = \max\left(0.10, \min\left(1.0, 1.0 - \sum \Delta_{\text{missing}} - \sum \Delta_{\text{delayed}} - 0.20 \times N_{\text{conflicts}}\right)\right)$$

| Telemetry Source | Missing Penalty ($\Delta_{\text{missing}}$) | Delayed Penalty ($\Delta_{\text{delayed}}$) |
|---|---|---|
| **Identity Evidence** | $0.35$ | $0.22$ |
| **Device Telemetry** | $0.20$ | $0.10$ |
| **Directory Record** | $0.15$ | $0.10$ |
| **Network Intelligence** | $0.10$ | $0.05$ |

---

## 2. Role-Specific Policy Matrix

University personas have divergent risk exposures and compliance mandates:

| Parameter | Student | Faculty | Alumni | Temporary Researcher |
|---|---|---|---|---|
| **Approval Ceiling ($R_{\text{max}}$)** | $\le 0.32$ | $\le 0.25$ | $\le 0.28$ | $\le 0.20$ |
| **Denial Floor ($R_{\text{min}}$)** | $\ge 0.72$ | $\ge 0.65$ | $\ge 0.68$ | $\ge 0.60$ |
| **Min Confidence ($C_{\text{min}}$)** | $\ge 0.65$ | $\ge 0.80$ | $\ge 0.75$ | $\ge 0.85$ |
| **Velocity Alert Limit** | $\ge 2$ | $\ge 1$ | $\ge 2$ | $\ge 1$ |
| **Device Flexibility** | High (mobile/tablet) | Strict (penalized if new) | High (personal PC) | Strict (institutional only) |
| **Primary Trust Anchor** | Campus Wi-Fi + ID | Duo Push + Known PC | Verified External Email | Sponsoring PI Sign-off |

---

## 3. Decision Determination Matrix

1. **Deterministic Hard Denial:**
   - Active Directory status == `SUSPENDED` $\rightarrow$ `DENY` (`HARD_BLOCK_DIRECTORY_ACCOUNT_SUSPENDED`)
   - Rolling Recovery Velocity $\ge 4$ $\rightarrow$ `DENY` (`HARD_BLOCK_EXCESSIVE_RECOVERY_VELOCITY`)
   - IP Threat Score $\ge 0.90$ AND Device Unknown $\rightarrow$ `DENY` (`HARD_BLOCK_TOR_PROXY_WITH_UNRECOGNIZED_DEVICE`)

2. **Automated Approval (`APPROVE`):**
   - Requires: $R_{\text{final}} \le R_{\text{max}}(\text{role})$ **AND** $C \ge C_{\text{min}}(\text{role})$ **AND** No primary telemetry missing (`device`, `identity`).

3. **High-Risk Denial (`DENY`):**
   - Triggered when $R_{\text{final}} \ge R_{\text{min}}(\text{role})$.

4. **Help Desk Escalation (`MANUAL_REVIEW`):**
   - Triggered when $R_{\text{max}} < R_{\text{final}} < R_{\text{min}}$, **OR** when confidence $C < C_{\text{min}}$, **OR** when primary telemetry is missing/delayed.
