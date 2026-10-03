"""
Proposed Risk-Based Account-Recovery Identity Verification Engine.
Coordinates multi-signal aggregation, confidence estimation, role policy, and decision logic.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from src.config.config import RiskConfig, get_config
from src.data.preprocessing.pipeline import RecoveryDataPipeline
from src.engine.rules.policy_engine import PolicyEngine
from src.engine.scoring.confidence_calculator import ConfidenceCalculator
from src.engine.scoring.risk_calculator import RiskCalculator
from src.models.recovery_request import RecoveryRequest
from src.models.risk_evaluation import RiskEvaluation


class RiskEngine:
    def __init__(self, config: RiskConfig | None = None):
        self.config = config or get_config()
        self.pipeline = RecoveryDataPipeline()
        self.risk_calc = RiskCalculator(self.config)
        self.conf_calc = ConfidenceCalculator(self.config)
        self.policy_engine = PolicyEngine(self.config)

    def evaluate(self, request: Dict[str, Any] | RecoveryRequest) -> RiskEvaluation:
        # 1. Feature Preprocessing & Evidence Tracking
        feat = self.pipeline.process_record(request)

        signals = feat["signals"]
        evidence_status = feat["evidence_status"]
        raw_attrs = feat["raw_attributes"]
        role = feat["role"]

        missing_sources = evidence_status.get("missing", [])
        delayed_sources = evidence_status.get("delayed", [])
        conflict_flags = evidence_status.get("conflicts", [])

        # 2. Risk Score Computation
        risk_score, signals_breakdown = self.risk_calc.calculate_score(
            signals=signals,
            role=role,
            missing_sources=missing_sources,
            delayed_sources=delayed_sources,
            conflict_flags=conflict_flags,
        )

        # 3. Confidence Score Computation
        confidence_score = self.conf_calc.calculate_confidence(
            missing_sources=missing_sources,
            delayed_sources=delayed_sources,
            conflict_flags=conflict_flags,
            role=role,
        )

        # 4. Policy Decision & Reasoning
        decision, reasons, action = self.policy_engine.decide(
            risk_score=risk_score,
            confidence_score=confidence_score,
            role=role,
            signals=signals,
            evidence_status=evidence_status,
            raw_attrs=raw_attrs,
        )

        # 5. Assemble Evidence Audit Trail
        evidence_used = [s for s in evidence_status.get("available", [])]

        return RiskEvaluation(
            request_id=feat["request_id"],
            user_id=feat["user_id"],
            role=role,
            decision=decision,
            risk_score=risk_score,
            confidence_score=confidence_score,
            reason_codes=reasons,
            evidence_used=evidence_used,
            evidence_missing=missing_sources,
            evidence_delayed=delayed_sources,
            signals_breakdown=signals_breakdown,
            recommended_action=action,
            policy_version=self.config.policy_version,
            engine_type="proposed_risk_engine",
        )

    def evaluate_batch(self, requests: List[Dict[str, Any]] | List[RecoveryRequest]) -> List[RiskEvaluation]:
        return [self.evaluate(r) for r in requests]
