"""
Unit Tests for Delayed Evidence Ingestion.
Verifies system handling when evidence arrives out of order or sync is delayed.
"""
import pytest
from src.engine.risk_engine.engine import RiskEngine
from src.models.recovery_request import RecoveryRequest


@pytest.fixture
def engine():
    return RiskEngine()


def test_delayed_directory_status(engine):
    req = RecoveryRequest(
        user_id="u400001",
        role="Student",
        evidence_delay=True,
        source_delayed="directory",
        device_known=True,
        device_trust_score=0.90,
        identity_evidence_available=True,
        identity_evidence_score=0.90,
    )
    result = engine.evaluate(req)

    assert "directory" in result.evidence_delayed
    assert result.confidence_score < 1.00
    assert any("DELAYED_DIRECTORY" in r for r in result.reason_codes)


def test_delayed_identity_evidence_for_faculty(engine):
    """
    Faculty requires high confidence (min 0.80).
    A delay in identity verification must block auto-approval.
    """
    req = RecoveryRequest(
        user_id="u400002",
        role="Faculty",
        evidence_delay=True,
        source_delayed="identity",
        device_known=True,
        device_trust_score=0.88,
        identity_evidence_available=True,
        identity_evidence_score=0.85,
    )
    result = engine.evaluate(req)

    assert "identity" in result.evidence_delayed
    # Delayed identity drops confidence below Faculty threshold of 0.80 -> triggers manual review
    assert result.decision == "MANUAL_REVIEW"
    assert any("CONFIDENCE" in r or "DELAYED" in r for r in result.reason_codes)
