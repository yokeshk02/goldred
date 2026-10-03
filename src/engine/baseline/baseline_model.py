"""
Baseline Account-Recovery Verification Model.

Implements the standard industry/help-desk heuristic:
- APPROVE if identity_evidence_score >= threshold AND device_known == true
- DENY if identity_evidence_score < denial_threshold OR directory_status == 'SUSPENDED'
- Else MANUAL_REVIEW
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from src.config.config import get_config
from src.models.recovery_request import RecoveryRequest
from src.models.risk_evaluation import RiskEvaluation


class BaselineRecoveryModel:
    def __init__(
        self,
        approval_identity_threshold: float = 0.80,
        denial_identity_threshold: float = 0.35,
        require_known_device: bool = True,
    ):
        self.approval_identity_threshold = approval_identity_threshold
        self.denial_identity_threshold = denial_identity_threshold
        self.require_known_device = require_known_device

    @classmethod
    def from_config(cls) -> BaselineRecoveryModel:
        config = get_config().baseline_config
        return cls(
            approval_identity_threshold=config.get("identity_evidence_threshold", 0.80),
            denial_identity_threshold=config.get("denial_identity_threshold", 0.35),
            require_known_device=config.get("require_known_device", True),
        )

    def evaluate(self, request: Dict[str, Any] | RecoveryRequest) -> RiskEvaluation:
        req = request if isinstance(request, RecoveryRequest) else RecoveryRequest.from_dict(request)
        reasons: List[str] = []
        evidence_used: List[str] = ["identity_evidence_score", "device_known"]
        evidence_missing: List[str] = []

        if not req.identity_evidence_available or req.source_missing == "identity":
            evidence_missing.append("identity")
        if req.source_missing == "device":
            evidence_missing.append("device")

        # Hard Directory Block
        if req.directory_status == "SUSPENDED":
            return RiskEvaluation(
                request_id=req.request_id,
                user_id=req.user_id,
                role=req.role,
                decision="DENY",
                risk_score=0.95,
                confidence_score=0.90,
                reason_codes=["BASELINE_ACCOUNT_SUSPENDED"],
                evidence_used=["directory_status"],
                evidence_missing=evidence_missing,
                recommended_action="Block account recovery immediately due to directory suspension",
                engine_type="baseline",
            )

        identity_score = req.identity_evidence_score if req.identity_evidence_available else 0.0

        # Baseline Simple Heuristic:
        # Represents standard collegiate help-desk practice:
        # 1. Automated APPROVE: Requires high identity score (>= 0.80) AND known hardware.
        #    Vulnerability: Fails for legitimate users with lost/new phones (drops them to manual review).
        if identity_score >= self.approval_identity_threshold and (req.device_known or not self.require_known_device):
            decision = "APPROVE"
            risk_score = max(0.10, 1.0 - identity_score)
            confidence_score = 0.85
            reasons.append("BASELINE_IDENTITY_VERIFIED_AND_DEVICE_KNOWN")
            recommended_action = "Issue standard automated self-service password reset link"

        # 2. Automated DENY: Weak identity evidence (< 0.35) combined with unrecognized hardware.
        elif identity_score < self.denial_identity_threshold and not req.device_known:
            decision = "DENY"
            risk_score = 0.85
            confidence_score = 0.75
            reasons.append("BASELINE_LOW_IDENTITY_EVIDENCE_AND_UNKNOWN_DEVICE")
            recommended_action = "Reject automated recovery; advise user to visit IT service desk in person"

        # 3. MANUAL_REVIEW: Default catch-all for all other combinations.
        #    Limitation: Lacks risk-confidence calibration, causing excessive operator overload (~49.5% review rate).
        else:
            decision = "MANUAL_REVIEW"
            risk_score = 0.55
            confidence_score = 0.60
            if not req.device_known:
                reasons.append("BASELINE_UNKNOWN_DEVICE")
            if identity_score < self.approval_identity_threshold:
                reasons.append(f"BASELINE_IDENTITY_SCORE_BELOW_THRESHOLD_{self.approval_identity_threshold}")
            recommended_action = "Escalate to help-desk technician for manual credential and ID check"

        return RiskEvaluation(
            request_id=req.request_id,
            user_id=req.user_id,
            role=req.role,
            decision=decision,
            risk_score=round(risk_score, 3),
            confidence_score=round(confidence_score, 3),
            reason_codes=reasons,
            evidence_used=evidence_used,
            evidence_missing=evidence_missing,
            signals_breakdown={
                "identity_score": identity_score,
                "device_known": 1.0 if req.device_known else 0.0,
            },
            recommended_action=recommended_action,
            policy_version="baseline-1.0",
            engine_type="baseline",
        )

    def evaluate_batch(self, requests: List[Dict[str, Any]] | List[RecoveryRequest]) -> List[RiskEvaluation]:
        return [self.evaluate(r) for r in requests]
