"""
Policy Engine Module.
Evaluates deterministic hard rules, threshold constraints, and builds reasoning codes.
"""
from __future__ import annotations

from typing import Any, Dict, List, Tuple
from src.config.config import RiskConfig, get_config
from src.engine.rules.role_rules import RolePolicyManager


class PolicyEngine:
    def __init__(self, config: RiskConfig | None = None):
        self.config = config or get_config()
        self.role_manager = RolePolicyManager(self.config)

    def evaluate_hard_rules(self, raw_attrs: Dict[str, Any]) -> Tuple[bool, str, str]:
        """
        Checks deterministic hard blocks.
        Returns: (is_triggered, forced_decision, reason_code)
        """
        triggers = self.config.hard_rule_triggers

        # 1. Directory suspended check
        if "directory_suspended" in triggers:
            susp_rule = triggers["directory_suspended"]
            if raw_attrs.get("directory_status") == susp_rule.get("value"):
                return True, susp_rule.get("forced_decision", "DENY"), susp_rule.get("reason_code", "ACCOUNT_SUSPENDED")

        # 2. Extreme recovery velocity check
        if "extreme_velocity" in triggers:
            velo_rule = triggers["extreme_velocity"]
            if raw_attrs.get("recovery_velocity", 0) >= velo_rule.get("value", 4):
                return True, velo_rule.get("forced_decision", "DENY"), velo_rule.get("reason_code", "EXCESSIVE_VELOCITY")

        # 3. Hostile IP + Unknown device
        if "malicious_ip_unknown_device" in triggers:
            ip_val = raw_attrs.get("ip_risk_score", 0.0)
            dev_known = raw_attrs.get("device_known", False)
            if ip_val >= 0.90 and not dev_known:
                return True, "DENY", "HARD_BLOCK_TOR_PROXY_WITH_UNRECOGNIZED_DEVICE"

        return False, "", ""

    def decide(
        self,
        risk_score: float,
        confidence_score: float,
        role: str,
        signals: Dict[str, float],
        evidence_status: Dict[str, Any],
        raw_attrs: Dict[str, Any],
    ) -> Tuple[str, List[str], str]:
        """
        Computes final (decision, reason_codes, recommended_action).
        Decisions: APPROVE, MANUAL_REVIEW, DENY
        """
        reasons: List[str] = []

        # Check hard blocks first
        hard_hit, forced_dec, hard_reason = self.evaluate_hard_rules(raw_attrs)
        if hard_hit:
            reasons.append(hard_reason)
            action = f"Immediate security block: {hard_reason.replace('_', ' ')}. Notify IT SecOps."
            return forced_dec, reasons, action

        # Get role-calibrated thresholds
        thresholds = self.role_manager.get_effective_thresholds(role)
        approval_ceiling = thresholds["approval_risk_ceiling"]
        denial_floor = thresholds["denial_risk_floor"]
        min_conf = thresholds["minimum_confidence_for_approval"]

        # Signal explanations
        if raw_attrs.get("device_known"):
            reasons.append("KNOWN_RECOGNIZED_DEVICE")
        else:
            reasons.append("UNRECOGNIZED_DEVICE_REGISTERED")

        if signals.get("identity_risk", 1.0) < 0.25:
            reasons.append("HIGH_FIDELITY_IDENTITY_EVIDENCE")
        elif signals.get("identity_risk", 1.0) > 0.65:
            reasons.append("WEAK_OR_MISSING_IDENTITY_EVIDENCE")

        if signals.get("ip_risk", 0.0) > 0.65:
            reasons.append("ELEVATED_NETWORK_ANOMALY")

        if raw_attrs.get("recovery_velocity", 0) >= thresholds.get("velocity_alert_threshold", 2):
            reasons.append(f"RECOVERY_VELOCITY_EXCEEDS_ROLE_THRESHOLD_{role.upper()}")

        # Missing data impact explanation
        for missing in evidence_status.get("missing", []):
            reasons.append(f"TELEMETRY_SOURCE_UNAVAILABLE_{missing.upper()}")

        for delayed in evidence_status.get("delayed", []):
            reasons.append(f"TELEMETRY_SOURCE_DELAYED_{delayed.upper()}")

        for conflict in evidence_status.get("conflicts", []):
            reasons.append(f"CONFLICTING_TELEMETRY_{conflict}")

        # Core Decision Logic:
        has_critical_missing = any(m in ("device", "identity") for m in evidence_status.get("missing", []))

        # A. APPROVE requires both low composite risk AND sufficient evidence confidence AND no missing critical signals
        if risk_score <= approval_ceiling and confidence_score >= min_conf and not has_critical_missing:
            decision = "APPROVE"
            reasons.insert(0, f"LOW_RISK_CONFIRMED_FOR_ROLE_{role.upper()}")
            action = f"Issue automated time-bound password reset token directly to registered backup email/SMS for {role}."

        # B. DENY if risk exceeds denial floor
        elif risk_score >= denial_floor:
            decision = "DENY"
            reasons.insert(0, f"HIGH_RISK_THRESHOLD_EXCEEDED_FOR_ROLE_{role.upper()}")
            action = f"Reject recovery request. Log high-risk incident on account {raw_attrs.get('user_id')} and alert user."

        # C. Uncertain or borderline -> MANUAL_REVIEW
        else:
            decision = "MANUAL_REVIEW"
            if has_critical_missing:
                reasons.insert(0, f"CRITICAL_TELEMETRY_MISSING_REQUIRES_MANUAL_REVIEW ({', '.join(evidence_status.get('missing', []))})")
            elif confidence_score < min_conf:
                reasons.insert(0, f"CONFIDENCE_DEFICIT_TRIGGERED_MANUAL_REVIEW (Confidence {confidence_score:.2f} < {min_conf:.2f})")
            else:
                reasons.insert(0, f"AMBIGUOUS_RISK_SCORE_REQUIRES_OPERATOR_REVIEW (Risk {risk_score:.2f})")
            
            action = (
                f"Escalate to university help desk specialist. Review primary identity documentation "
                f"and verify secondary contact before authorizing override for {role}."
            )

        return decision, reasons, action
