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
        base_confidence = 1.00

        # Apply missing-data confidence penalties
        missing_penalties = self.config.missing_data_penalties
        for src in missing_sources:
            if src in missing_penalties:
                base_confidence -= missing_penalties[src].get("confidence_penalty", 0.15)

        # Apply delayed-data confidence penalties
        delayed_penalties = self.config.delayed_data_penalties
        for src in delayed_sources:
            if src in delayed_penalties:
                base_confidence -= delayed_penalties[src].get("confidence_penalty", 0.10)

        # Apply conflicting-evidence penalties
        if conflict_flags:
            base_confidence -= 0.20 * len(conflict_flags)

        # Role specific minimum expectations
        if role == "Temporary Researcher" and (missing_sources or delayed_sources):
            base_confidence -= 0.10  # Stricter scrutiny for temp personnel

        return round(max(0.10, min(1.00, base_confidence)), 4)
