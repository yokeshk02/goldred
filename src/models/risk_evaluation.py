"""
Data models for Risk Engine and Baseline Evaluation Results.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List


@dataclass
class RiskEvaluation:
    request_id: str
    user_id: str
    role: str
    decision: str  # APPROVE, MANUAL_REVIEW, DENY
    risk_score: float  # 0.0 (safest) to 1.0 (most hazardous)
    confidence_score: float  # 0.0 (no confidence) to 1.0 (high certainty)
    reason_codes: List[str] = field(default_factory=list)
    evidence_used: List[str] = field(default_factory=list)
    evidence_missing: List[str] = field(default_factory=list)
    evidence_delayed: List[str] = field(default_factory=list)
    signals_breakdown: Dict[str, float] = field(default_factory=dict)
    recommended_action: str = ""
    policy_version: str = "2.4.0"
    engine_type: str = "proposed_risk_engine"  # baseline vs proposed_risk_engine

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
