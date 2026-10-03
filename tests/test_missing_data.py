"""
Unit Tests for Missing Data Handling & Robustness.
Verifies that the system safely degrades and escalates to MANUAL_REVIEW or DENY
rather than blindly approving incomplete requests.
"""
import pytest
from src.engine.risk_engine.engine import RiskEngine
from src.models.recovery_request import RecoveryRequest


@pytest.fixture
def engine():
    return RiskEngine()


def test_missing_device_telemetry(engine):
    req = RecoveryRequest(
        user_id="u300001",
        role="Student",
        source_missing="device",
        device_id="",
        device_known=False,
        device_trust_score=0.0,
        identity_evidence_available=True,
        identity_evidence_score=0.88,
        directory_status="ACTIVE",
    )
    result = engine.evaluate(req)

    # Missing device should drop confidence and prevent blind approval
    assert "device" in result.evidence_missing
    assert result.confidence_score < 0.85
    assert result.decision in ("MANUAL_REVIEW", "DENY")
    assert any("MISSING" in r or "UNAVAILABLE_DEVICE" in r for r in result.reason_codes)


def test_missing_identity_evidence(engine):
    req = RecoveryRequest(
        user_id="u300002",
        role="Faculty",
        source_missing="identity",
        identity_evidence_available=False,
        identity_evidence_score=0.0,
        device_known=True,
        device_trust_score=0.90,
        directory_status="ACTIVE",
    )
    result = engine.evaluate(req)

    assert "identity" in result.evidence_missing
    assert result.confidence_score <= 0.70
    assert result.decision in ("MANUAL_REVIEW", "DENY")
    assert any("IDENTITY" in r for r in result.reason_codes)


def test_multiple_telemetry_sources_missing(engine):
    """
    Worst-case scenario: device missing and identity missing.
    Must never approve.
    """
    req = RecoveryRequest(
        user_id="u300003",
        role="Student",
        source_missing="device",
        device_known=False,
        device_trust_score=0.0,
        identity_evidence_available=False,
        identity_evidence_score=0.0,
        ip_risk_score=0.40,
    )
    result = engine.evaluate(req)

    assert result.decision != "APPROVE"
    assert result.confidence_score <= 0.60
    assert result.risk_score >= 0.50
