"""
Data models for Risk Engine and Baseline Evaluation Results.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List


@dataclass
class RiskEvaluation:
    """
    Structured outcome produced by the verification engine (or baseline model).
    Encapsulates the automated triage decision, normalized scores, diagnostic audit codes,
    telemetry provenance tracking, and actionable operator guidance.
    """
    request_id: str
    user_id: str
    role: str
    decision: str  # Triage category: APPROVE (self-service reset), MANUAL_REVIEW (technician review), DENY (security block)
    risk_score: float  # Multi-signal Bayesian composite risk [0.0 = safest, 1.0 = most hazardous]
    confidence_score: float  # Telemetry completeness & certainty score [0.10 = low certainty, 1.0 = full certainty]
    reason_codes: List[str] = field(default_factory=list)  # Machine-readable audit indicators explaining the score
    evidence_used: List[str] = field(default_factory=list)  # Active telemetry sources incorporated in calculation
    evidence_missing: List[str] = field(default_factory=list)  # Absent telemetry sources that penalized confidence
    evidence_delayed: List[str] = field(default_factory=list)  # Asynchronous telemetry sources pending verification
    signals_breakdown: Dict[str, float] = field(default_factory=dict)  # Component risk breakdown per dimension
    recommended_action: str = ""  # Natural-language playbook instruction for help-desk technicians
    policy_version: str = "2.4.0"  # Version stamp of active security policy configuration
    engine_type: str = "proposed_risk_engine"  # Engine identifier: baseline vs proposed_risk_engine

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
