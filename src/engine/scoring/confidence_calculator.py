"""
Confidence Calculator Module.
Measures the reliability and completeness of observed evidence.
"""
from __future__ import annotations

from typing import Any, Dict, List
from src.config.config import RiskConfig, get_config


class ConfidenceCalculator:
    def __init__(self, config: RiskConfig | None = None):
        self.config = config or get_config()

    def calculate_confidence(
        self,
        missing_sources: List[str],
        delayed_sources: List[str],
        conflict_flags: List[str],
        role: str,
    ) -> float:
        """
        Calculates evidence confidence [0.10, 1.00].
        
        Confidence Calculation:
          C_final = C_base - sum(P_missing) - sum(P_delayed) - sum(P_conflicts) - P_role
        Starts at ideal baseline C_base = 1.00 and applies cumulative damping deductions.
        If confidence drops below role minimum (e.g. C_min = 0.80 for Faculty), automated
        approval is barred and the request is routed to MANUAL_REVIEW.
        """
        base_confidence = 1.00

        # Missing-data damping: Subtracts confidence when expected telemetry streams are absent
        # (e.g., missing identity -0.35, missing device -0.20, missing directory -0.15)
        missing_penalties = self.config.missing_data_penalties
        for src in missing_sources:
            if src in missing_penalties:
                base_confidence -= missing_penalties[src].get("confidence_penalty", 0.15)

        # Delayed-data handling: Telemetry in transit or queued upstream (e.g., document scan delay -0.22,
        # directory sync latency -0.10) temporarily dampens confidence until synchronization completes.
        delayed_penalties = self.config.delayed_data_penalties
        for src in delayed_sources:
            if src in delayed_penalties:
                base_confidence -= delayed_penalties[src].get("confidence_penalty", 0.10)

        # Conflicting-evidence damping: Contradictory signals (e.g., trusted device from Tor) reduce certainty by -0.20
        if conflict_flags:
            base_confidence -= 0.20 * len(conflict_flags)

        # Role modifier: Temporary Researchers have short-tenure affiliations; any data gaps trigger -0.10 scrutiny
        if role == "Temporary Researcher" and (missing_sources or delayed_sources):
            base_confidence -= 0.10

        # Clamping: Enforce floor of 0.10 (to avoid negative confidence) and ceiling of 1.00
        return round(max(0.10, min(1.00, base_confidence)), 4)
