"""
Unit Tests for Realistic Fraud & Impersonation Scenarios.
Verifies defense against Credential Stuffing, SIM Swap, Social Engineering,
Dormant Account Takeover, and Insider Threats.
"""
import pytest
from src.engine.risk_engine.engine import RiskEngine
from src.models.recovery_request import RecoveryRequest


@pytest.fixture
def engine():
    return RiskEngine()


def test_credential_stuffing_attack(engine):
    req = RecoveryRequest(
        user_id="u500001",
        role="Student",
        device_known=False,
        device_trust_score=0.15,
        ip_risk_score=0.92,  # Hosting / Tor proxy
        geo_consistency=0.10,
        login_history_consistency=0.12,
        identity_evidence_available=False,
        identity_evidence_score=0.0,
        recovery_velocity=5,
        fraud_scenario="credential_stuffing",
        ground_truth="FRAUD",
    )
    result = engine.evaluate(req)

    assert result.decision == "DENY"
    assert result.risk_score >= 0.70
    assert any("VELOCITY" in r or "TOR" in r or "HIGH_RISK" in r for r in result.reason_codes)


def test_sim_swap_mfa_reset_attack(engine):
    req = RecoveryRequest(
        user_id="u500002",
        role="Faculty",
        device_known=False,
        device_trust_score=0.35,
        ip_risk_score=0.65,
        geo_consistency=0.40,
        mfa_history="RECENTLY_RESET",
        identity_evidence_available=False,
        identity_evidence_score=0.0,
        recovery_velocity=2,
        fraud_scenario="sim_swap",
        ground_truth="FRAUD",
    )
    result = engine.evaluate(req)

    assert result.decision == "DENY"
    assert result.risk_score >= 0.65


def test_dormant_account_takeover(engine):
    req = RecoveryRequest(
        user_id="u500003",
        role="Alumni",
        account_age=3600,
        device_known=False,
        device_trust_score=0.20,
        ip_risk_score=0.88,
        geo_consistency=0.15,
        login_history_consistency=0.05,
        identity_evidence_available=False,
        identity_evidence_score=0.0,
        mfa_history="DISABLED",
        fraud_scenario="dormant_takeover",
        ground_truth="FRAUD",
    )
    result = engine.evaluate(req)

    assert result.decision == "DENY"


def test_insider_threat_suspended_account(engine):
    req = RecoveryRequest(
        user_id="u500004",
        role="Student",
        device_known=True,
        device_trust_score=0.85,
        directory_status="SUSPENDED",
        identity_evidence_available=True,
        identity_evidence_score=0.90,
        fraud_scenario="insider_threat",
        ground_truth="FRAUD",
    )
    result = engine.evaluate(req)

    assert result.decision == "DENY"
    assert any("SUSPENDED" in r for r in result.reason_codes)
