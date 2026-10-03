"""
Model Evaluation and Metrics Module.
Calculates academic and security metrics across Baseline and Proposed Risk Engine:
- Legitimate Recovery Success Rate
- Impersonation Resistance
- False Acceptance Rate (FAR)
- False Rejection Rate (FRR)
- Manual Review Rate
- Precision, Recall, F1 Score
- Confusion Matrices (Binary and Ternary)
- Robustness Under Missing and Delayed Data
"""
from __future__ import annotations

from typing import Any, Dict, List, Tuple
from src.models.risk_evaluation import RiskEvaluation


class SystemEvaluator:
    @staticmethod
    def evaluate_decisions(
        records: List[Dict[str, Any]],
        evaluations: List[RiskEvaluation],
    ) -> Dict[str, Any]:
        """
        Computes comprehensive evaluation metrics comparing ground truth to system decisions.
        """
        assert len(records) == len(evaluations), "Records and evaluations length mismatch"

        total = len(records)
        legit_total = 0
        fraud_total = 0

        # Decision counts
        legit_approved = 0
        legit_manual = 0
        legit_denied = 0

        fraud_approved = 0  # Severe security failure (False Accept)
        fraud_manual = 0    # Caught for human scrutiny
        fraud_denied = 0    # Blocked automatically

        # Sub-cohorts
        missing_total = 0
        missing_safe_decisions = 0  # Not false accept

        delayed_total = 0
        delayed_safe_decisions = 0

        for rec, ev in zip(records, evaluations):
            gt = rec.get("ground_truth", "LEGITIMATE")
            dec = ev.decision

            is_missing = rec.get("source_missing", "none") != "none"
            is_delayed = rec.get("source_delayed", "none") != "none" or rec.get("evidence_delay", False)

            if is_missing:
                missing_total += 1
                if not (gt == "FRAUD" and dec == "APPROVE"):
                    missing_safe_decisions += 1

            if is_delayed:
                delayed_total += 1
                if not (gt == "FRAUD" and dec == "APPROVE"):
                    delayed_safe_decisions += 1

            if gt == "LEGITIMATE":
                legit_total += 1
                if dec == "APPROVE":
                    legit_approved += 1
                elif dec == "MANUAL_REVIEW":
                    legit_manual += 1
                elif dec == "DENY":
                    legit_denied += 1
            else:  # FRAUD
                fraud_total += 1
                if dec == "APPROVE":
                    fraud_approved += 1
                elif dec == "MANUAL_REVIEW":
                    fraud_manual += 1
                elif dec == "DENY":
                    fraud_denied += 1

        # Metric Calculations
        # 1. Legitimate Recovery Success Rate (automated approval of legit users)
        legit_success_rate = legit_approved / legit_total if legit_total > 0 else 0.0

        # 2. Impersonation Resistance: Fraction of fraud prevented from auto-approval
        impersonation_resistance = (fraud_denied + fraud_manual) / fraud_total if fraud_total > 0 else 1.0

        # 3. False Acceptance Rate (FAR): Fraud mistakenly auto-approved
        far = fraud_approved / fraud_total if fraud_total > 0 else 0.0

        # 4. False Rejection Rate (FRR): Legit mistakenly denied outright
        frr = legit_denied / legit_total if legit_total > 0 else 0.0

        # 5. Manual Review Rate: Fraction of overall traffic requiring human operator
        manual_review_rate = (legit_manual + fraud_manual) / total if total > 0 else 0.0

        # 6. Precision (Legitimate class auto-approval): TP / (TP + FP)
        precision = legit_approved / (legit_approved + fraud_approved) if (legit_approved + fraud_approved) > 0 else 0.0

        # 7. Recall (Legitimate class auto-approval): TP / Total Legit
        recall = legit_success_rate

        # 8. F1 Score
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

        # 9. Confusion Matrix Data
        # Binary perspective (Positive = Auto-Approve, Negative = Intercepted)
        tp = legit_approved
        fp = fraud_approved
        tn = fraud_denied + fraud_manual
        fn = legit_denied + legit_manual

        # 10 & 11. Coverage / Safety under missing/delayed data
        missing_safety_rate = missing_safe_decisions / missing_total if missing_total > 0 else 1.0
        delayed_safety_rate = delayed_safe_decisions / delayed_total if delayed_total > 0 else 1.0

        return {
            "total_samples": total,
            "legitimate_samples": legit_total,
            "fraud_samples": fraud_total,
            "metrics": {
                "legitimate_recovery_success_rate": round(legit_success_rate, 4),
                "impersonation_resistance": round(impersonation_resistance, 4),
                "false_acceptance_rate": round(far, 4),
                "false_rejection_rate": round(frr, 4),
                "manual_review_rate": round(manual_review_rate, 4),
                "precision": round(precision, 4),
                "recall": round(recall, 4),
                "f1_score": round(f1, 4),
                "missing_data_safety_rate": round(missing_safety_rate, 4),
                "delayed_data_safety_rate": round(delayed_safety_rate, 4),
            },
            "confusion_matrix": {
                "binary": {
                    "true_positive": tp,
                    "false_positive": fp,
                    "true_negative": tn,
                    "false_negative": fn,
                },
                "ternary": {
                    "legitimate": {
                        "approved": legit_approved,
                        "manual_review": legit_manual,
                        "denied": legit_denied,
                    },
                    "fraud": {
                        "approved": fraud_approved,
                        "manual_review": fraud_manual,
                        "denied": fraud_denied,
                    },
                },
            },
        }
