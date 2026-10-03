"""
Unit Tests for Policy Rules, Hard Triggers, and Organisational Roles.
"""
import pytest
from src.engine.risk_engine.engine import RiskEngine
from src.models.recovery_request import RecoveryRequest


@pytest.fixture
def engine():
    return RiskEngine()


def test_role_differentiation_student_vs_faculty(engine):
    """
    Identical borderline profile evaluated under Student vs Faculty policy.
    Faculty requires higher confidence (0.80) and has lower risk tolerance (0.25 vs 0.32).
    """
    student_req = RecoveryRequest(
        user_id="u600001",
        role="Student",
        device_known=True,
        device_trust_score=0.80,
        ip_risk_score=0.20,
        geo_consistency=0.85,
        login_history_consistency=0.80,
        identity_evidence_available=True,
        identity_evidence_score=0.82,
        directory_status="ACTIVE",
    )
    faculty_req = RecoveryRequest(
        user_id="u600002",
        role="Faculty",
        device_known=True,
        device_trust_score=0.80,
        ip_risk_score=0.20,
        geo_consistency=0.85,
        login_history_consistency=0.80,
        identity_evidence_available=True,
        identity_evidence_score=0.82,
        directory_status="ACTIVE",
    )

    s_res = engine.evaluate(student_req)
    f_res = engine.evaluate(faculty_req)

    # Student can be approved under standard threshold
    assert s_res.decision in ("APPROVE", "MANUAL_REVIEW")
    # Faculty policy holds strict scrutiny
    assert f_res.confidence_score >= 0.70


def test_temporary_researcher_high_scrutiny(engine):
    """
    Temporary researchers have the lowest risk ceiling (0.20) and highest confidence need (0.85).
    Any anomaly routes to manual review.
    """
    req = RecoveryRequest(
        user_id="u600003",
        role="Temporary Researcher",
        device_known=False,
        device_trust_score=0.65,
        ip_risk_score=0.15,
        geo_consistency=0.90,
        identity_evidence_available=True,
        identity_evidence_score=0.85,
    )
    res = engine.evaluate(req)

    assert res.decision == "MANUAL_REVIEW"
    assert "TEMPORARY RESEARCHER" in res.reason_codes[0] or "AMBIGUOUS" in res.reason_codes[0] or "CONFIDENCE" in res.reason_codes[0]


def test_hard_block_extreme_velocity(engine):
    req = RecoveryRequest(
        user_id="u600004",
        role="Student",
        device_known=True,
        identity_evidence_available=True,
        identity_evidence_score=0.95,
        recovery_velocity=5,  # Trigger hard block
    )
    res = engine.evaluate(req)

    assert res.decision == "DENY"
    assert any("VELOCITY" in r for r in res.reason_codes)
