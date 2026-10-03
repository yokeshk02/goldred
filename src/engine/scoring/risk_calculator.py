"""
Risk Calculator Module.
Combines multiple heterogeneous signals into a normalized composite risk score [0.0, 1.0].
"""
from __future__ import annotations

from typing import Any, Dict, List, Tuple
from src.config.config import RiskConfig, get_config


class RiskCalculator:
    def __init__(self, config: RiskConfig | None = None):
        self.config = config or get_config()

    def calculate_score(
        self,
        signals: Dict[str, float],
        role: str,
        missing_sources: List[str],
        delayed_sources: List[str],
        conflict_flags: List[str],
    ) -> Tuple[float, Dict[str, float]]:
        """
        Calculates composite risk score and returns (normalized_risk, weighted_breakdown).
        """
        base_weights = dict(self.config.global_weights)
        role_policy = self.config.get_role_policy(role)

        # Role-specific weight adjustments
        if role == "Alumni" and "identity_weight_boost" in role_policy:
            boost = role_policy["identity_weight_boost"]
            base_weights["identity_evidence"] += boost
            # re-normalize slightly across others
            base_weights["device_trust"] = max(0.10, base_weights.get("device_trust", 0.20) - boost / 2)

        # Map signal names to weights
        signal_mapping = {
            "identity_evidence": signals.get("identity_risk", 0.5),
            "device_trust": signals.get("device_risk", 0.5),
            "ip_risk": signals.get("ip_risk", 0.3),
            "geo_consistency": signals.get("geo_risk", 0.2),
            "login_history": signals.get("login_risk", 0.2),
            "mfa_history": signals.get("mfa_risk", 0.2),
            "recovery_velocity": signals.get("velocity_risk", 0.1),
        }

        # Compute weighted sum
        total_weight = 0.0
        weighted_sum = 0.0
        breakdown: Dict[str, float] = {}

        for key, weight in base_weights.items():
            if key in signal_mapping:
                sig_val = signal_mapping[key]
                weighted_val = sig_val * weight
                weighted_sum += weighted_val
                total_weight += weight
                breakdown[key] = round(sig_val, 4)

        base_risk = weighted_sum / total_weight if total_weight > 0 else 0.50

        # Apply missing-data penalty
        missing_penalties = self.config.missing_data_penalties
        risk_penalty = 0.0
        for src in missing_sources:
            if src in missing_penalties:
                risk_penalty += missing_penalties[src].get("risk_penalty", 0.0)

        # Faculty unknown device penalty
        if role == "Faculty" and signals.get("device_risk", 0) > 0.5:
            risk_penalty += role_policy.get("unknown_device_penalty", 0.08)

        # Conflicting evidence penalty
        if conflict_flags:
            risk_penalty += 0.12 * len(conflict_flags)

        final_risk = min(1.0, max(0.0, base_risk + risk_penalty))
        return round(final_risk, 4), breakdown
