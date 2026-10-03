"""
Unit Tests for Proposed Risk Engine Core Functionality.
Verifies normal requests, known vs unknown device, boundary conditions, and scoring.
"""
import pytest
from src.engine.risk_engine.engine import RiskEngine
from src.models.recovery_request import RecoveryRequest


@pytest.fixture
def engine():
    return RiskEngine()


def test_normal_legitimate_known_device(engine):
    req = RecoveryRequest(
        user_id="u102931",
        role="Student",
        device_known=True,
        device_trust_score=0.92,
        ip_risk_score=0.08,
        geo_consistency=0.95,
        login_history_consistency=0.90,
        identity_evidence_available=True,
        identity_evidence_score=0.92,
        directory_status="ACTIVE",
        mfa_history="ACTIVE_HEALTHY",
        recovery_velocity=0,
        ground_truth="LEGITIMATE",
    )
    result = engine.evaluate(req)

    assert result.decision == "APPROVE"
    assert result.risk_score <= 0.32
    assert result.confidence_score >= 0.70
    assert "LOW_RISK_CONFIRMED_FOR_ROLE_STUDENT" in result.reason_codes[0]
    assert "device" in result.evidence_used
    assert "identity" in result.evidence_used


def test_legitimate_unknown_device_with_high_identity(engine):
    """
    Legitimate student who lost their phone, using a new device,
    but provides strong identity verification (e.g., student portal + photo ID).
    """
    req = RecoveryRequest(
        user_id="u104822",
        role="Student",
        device_known=False,
        device_change=True,
        device_trust_score=0.60,
        ip_risk_score=0.12,
        geo_consistency=0.88,
        login_history_consistency=0.82,
        identity_evidence_available=True,
        identity_evidence_score=0.88,
        directory_status="ACTIVE",
        recovery_velocity=1,
    )
    result = engine.evaluate(req)

    # Risk is elevated due to unknown device but manageable
    assert result.decision in ("APPROVE", "MANUAL_REVIEW")
    assert "UNRECOGNIZED_DEVICE_REGISTERED" in result.reason_codes


def test_boundary_risk_score_evaluation(engine):
    """
    Boundary condition: Risk score exactly near threshold values.
    """
    req_borderline = RecoveryRequest(
        user_id="u109999",
        role="Student",
        device_known=False,
        device_trust_score=0.50,
        ip_risk_score=0.45,
        geo_consistency=0.60,
        login_history_consistency=0.55,
        identity_evidence_available=True,
        identity_evidence_score=0.60,
        directory_status="ACTIVE",
        recovery_velocity=2,
    )
    result = engine.evaluate(req_borderline)

    # Should escalate to manual review, never blindly approve or deny
    assert result.decision == "MANUAL_REVIEW"
    assert 0.30 <= result.risk_score <= 0.70
    assert "Escalate" in result.recommended_action or "Specialist" in result.recommended_action
