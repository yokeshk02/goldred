"""
Role-Specific Verification Rules.
Defines constraints, risk ceilings, and policies tailored to university personas:
Student, Faculty, Alumni, and Temporary Researcher.
"""
from __future__ import annotations

from typing import Any, Dict
from src.config.config import RiskConfig, get_config


class RolePolicyManager:
    def __init__(self, config: RiskConfig | None = None):
        self.config = config or get_config()

    def get_effective_thresholds(self, role: str) -> Dict[str, Any]:
        """
        Retrieves role thresholds, falling back to default decision thresholds.
        """
        defaults = self.config.default_thresholds
        role_policy = self.config.get_role_policy(role)

        return {
            "approval_risk_ceiling": role_policy.get(
                "approval_risk_ceiling", defaults.get("approval_risk_ceiling", 0.30)
            ),
            "denial_risk_floor": role_policy.get(
                "denial_risk_floor", defaults.get("denial_risk_floor", 0.70)
            ),
            "minimum_confidence_for_approval": role_policy.get(
                "minimum_confidence_for_approval",
                defaults.get("minimum_confidence_for_approval", 0.70),
            ),
            "velocity_alert_threshold": role_policy.get("velocity_alert_threshold", 2),
            "description": role_policy.get("description", "Standard policy"),
        }

    def validate_role_eligibility(self, role: str, raw_attrs: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Validates whether the user's attributes align with role expectations.
        """
        if role == "Student" and raw_attrs.get("account_age", 0) > 2500:
            return False, "ROLE_ANOMALY_STUDENT_ACCOUNT_EXCEEDS_6_YEARS"
        if role == "Temporary Researcher" and raw_attrs.get("account_age", 0) > 730:
            return False, "ROLE_ANOMALY_RESEARCHER_AFFILIATION_EXPIRED"
        return True, ""
