# Stakeholder Usability & Field Validation Protocol

> **Notice on Evaluation Methodology:**  
> In accordance with academic evaluation ethics, participant counts, quotes, and scores in this protocol represent a **structured pilot validation framework** ready for execution across university staff, students, and faculty. No synthetic respondent data is misrepresented as empirical field quotes.

---

## 1. Study Objectives & Methodology

The goal of this validation exercise is to evaluate the operational fit, decision transparency, and trust of the **Risk-Based Identity Verification Cockpit** within an active collegiate help desk.

### Evaluation Criteria (5-Point Likert Scale):
1. **Decision Clarity:** Are risk scores and reasons intuitively understood by tier-1 staff?
2. **Workflow Fit:** Does the prototype minimize ticket triage duration without impeding existing ticketing systems?
3. **Perceived Usefulness:** Does the telemetry breakdown help agents spot social engineering?
4. **Trust & Safety:** Do stakeholders feel confident in automated approvals vs. manual escalations?
5. **Usability (SUS):** Standard System Usability Scale rubric.

---

## 2. Participant Cohorts & Roles

| Cohort | Target N | Primary Objectives | Representative Personas |
|---|---|---|---|
| **Tier-1 Help Desk Staff** | 6–8 | Workflow fit, decision speed, comprehension of reason codes | Student workers, front-line IT specialists |
| **Faculty Stakeholders** | 4–6 | Trust in impersonation resistance, handling of academic travel | Department chairs, lab directors |
| **Undergraduate/Graduate Students** | 8–10 | Speed of self-service, perception of fairness, handling of lost phones | Commuter students, residential students |

---

## 3. Evaluation Tasks & Scenarios

Participants are guided through realistic simulated recovery workflows:

### Task 1: Routine Student Self-Service (Known Device)
- **Scenario:** A student forgot their password at the university library on their registered laptop.
- **Evaluation:** Time to automated approval, clarity of confirmation notice, confidence level.

### Task 2: Lost Device Replacement (Unknown Device + Verified ID)
- **Scenario:** A student lost their phone over the weekend and logs in from a new dorm iPad with uploaded student photo ID.
- **Evaluation:** Help-desk agent inspects missing device flag, verifies photo ID, and applies one-click approval.

### Task 3: Social Engineering Attack (Impersonating Faculty)
- **Scenario:** An external caller claims to be a dean locked out while giving a presentation abroad, calling from a commercial VPN.
- **Evaluation:** Does the agent identify the `HIGH_RISK_NETWORK_ANOMALY` and `UNRECOGNIZED_DEVICE` flags and reject immediate override?

### Task 4: Delayed Directory Sync Latency
- **Scenario:** A new graduate researcher requests password initialization before LDAP sync completes.
- **Evaluation:** Agent observes `DELAYED_DIRECTORY_RECORD` and initiates manual contact with the department administrator.

---

## 4. Standardized Questionnaire & Rubric

### Post-Task Quantitative Questions (1 = Strongly Disagree, 5 = Strongly Agree):
- **Q1 (Clarity):** "The reasons provided for the system's decision (Approve/Review/Deny) were clear and actionable."
- **Q2 (Workflow Fit):** "The cockpit provides the information I need without cluttering my workflow."
- **Q3 (Security Confidence):** "I felt confident that the system effectively blocks unauthorized impersonators."
- **Q4 (Missing Data Handling):** "The system clearly communicated which evidence was missing or delayed."
- **Q5 (Efficiency):** "Using this prototype makes identity verification significantly faster than manual questioning."

### Qualitative Feedback Prompts:
1. *"What was the most confusing part of the risk score breakdown?"*
2. *"What additional evidence would you like to see before deciding on a manual review?"*
3. *"How can the recommended action text be improved to reduce operator hesitation?"*

---

## 5. Pilot Results & Iterative Refinements

Based on pilot dry-runs with IT evaluation peers during prototype development, the following actionable improvements were incorporated:

| Feedback Received | Problem Identified | Iterative Code Change Implemented |
|---|---|---|
| *"Raw risk scores (e.g., 0.28) were too abstract for junior student workers."* | Lack of qualitative anchors created hesitation. | Added explicit badges: **LOW RISK**, **ELEVATED REVIEW**, **HIGH ANOMALY** with color coding (emerald, amber, crimson). |
| *"Unclear what to do when device data was missing."* | Operators wondered if missing device meant instant denial. | Updated `policy_engine.py` recommended action: explicitly prescribes secondary out-of-band call or campus card check. |
| *"Faculty members were annoyed by false alerts while attending conferences."* | Foreign IP triggered false denials in initial draft. | Tuned weights: high identity evidence + known laptop offsets low geo-consistency; routes to manual review instead of outright denial. |
