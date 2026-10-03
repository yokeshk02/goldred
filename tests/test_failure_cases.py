"""
Executable Failure Scenarios Suite (Phase 8 Requirement).

Implements 7 realistic failure scenarios:
Scenario 1: Missing Device Data (Lost device, unidentifiable hardware)
Scenario 2: Delayed Identity & Directory Evidence (LDAP / ID sync latency)
Scenario 3: Fraudulent Recovery Request (Attacker credential stuffing)
Scenario 4: Conflicting Evidence (Known trusted device with hostile Tor exit node)
Scenario 5: High Recovery Velocity (Rapid password reset bombardment)
Scenario 6: Multiple Signals Unavailable (Zero device telemetry + missing identity proof)
Scenario 7: Insider Impersonation on Suspended Directory Account
"""
import pytest
from src.engine.risk_engine.engine import RiskEngine
from src.models.recovery_request import RecoveryRequest


@pytest.fixture
def engine():
    return RiskEngine()


# Scenario 1: Missing Device Data
def test_scenario_1_missing_device_data(engine):
    record = RecoveryRequest(
        user_id="u700001",
        role="Student",
        recovery_reason="lost_device",
        device_id="",
        device_known=False,
        device_trust_score=0.0,
        source_missing="device",
        identity_evidence_available=True,
        identity_evidence_score=0.88,
        directory_status="ACTIVE",
        ground_truth="LEGITIMATE",
        expected_decision="MANUAL_REVIEW",
    )
    result = engine.evaluate(record)

    assert result.decision == "MANUAL_REVIEW", f"Expected MANUAL_REVIEW but got {result.decision}"
    assert "device" in result.evidence_missing
    assert result.confidence_score <= 0.80
    assert any("MISSING" in r or "UNAVAILABLE_DEVICE" in r for r in result.reason_codes)


# Scenario 2: Delayed Identity & Directory Evidence
def test_scenario_2_delayed_identity_directory_evidence(engine):
    record = RecoveryRequest(
        user_id="u700002",
        role="Faculty",
        recovery_reason="mfa_phone_replaced",
        evidence_delay=True,
        source_delayed="identity",
        device_known=True,
        device_trust_score=0.90,
        identity_evidence_available=True,
        identity_evidence_score=0.85,
        directory_status="ACTIVE",
        ground_truth="LEGITIMATE",
        expected_decision="MANUAL_REVIEW",
    )
    result = engine.evaluate(record)

    assert result.decision == "MANUAL_REVIEW"
    assert "identity" in result.evidence_delayed
    assert any("DELAYED" in r or "CONFIDENCE" in r for r in result.reason_codes)


# Scenario 3: Fraudulent Recovery Request
def test_scenario_3_fraudulent_recovery_request(engine):
    record = RecoveryRequest(
        user_id="u700003",
        role="Student",
        recovery_reason="forgot_password",
        device_known=False,
        device_trust_score=0.10,
        ip_risk_score=0.94,
        geo_consistency=0.05,
        login_history_consistency=0.08,
        identity_evidence_available=False,
        identity_evidence_score=0.0,
        recovery_velocity=3,
        fraud_scenario="credential_stuffing",
        ground_truth="FRAUD",
        expected_decision="DENY",
    )
    result = engine.evaluate(record)

    assert result.decision == "DENY"
    assert result.risk_score >= 0.70
    assert any("HIGH_RISK" in r or "TOR" in r or "VELOCITY" in r for r in result.reason_codes)


# Scenario 4: Conflicting Evidence (Trusted device from hostile IP)
def test_scenario_4_conflicting_evidence_device_vs_network(engine):
    record = RecoveryRequest(
        user_id="u700004",
        role="Student",
        device_known=True,
        device_trust_score=0.95,
        ip_risk_score=0.88,  # High risk IP despite known device
        geo_consistency=0.15,
        identity_evidence_available=True,
        identity_evidence_score=0.80,
        ground_truth="FRAUD",
        expected_decision="MANUAL_REVIEW",
    )
    result = engine.evaluate(record)

    # Conflicting evidence must degrade confidence and prevent automated bypass
    assert result.decision in ("MANUAL_REVIEW", "DENY")
    assert any("CONFLICTING" in r for r in result.reason_codes)


# Scenario 5: High Recovery Velocity
def test_scenario_5_high_recovery_velocity(engine):
    record = RecoveryRequest(
        user_id="u700005",
        role="Faculty",
        device_known=True,
        device_trust_score=0.85,
        identity_evidence_available=True,
        identity_evidence_score=0.90,
        recovery_velocity=4,  # Bombardment
        expected_decision="DENY",
    )
    result = engine.evaluate(record)

    assert result.decision == "DENY"
    assert any("VELOCITY" in r for r in result.reason_codes)


# Scenario 6: Multiple Signals Unavailable
def test_scenario_6_multiple_signals_unavailable(engine):
    record = RecoveryRequest(
        user_id="u700006",
        role="Temporary Researcher",
        source_missing="multiple",
        device_id="",
        device_known=False,
        device_trust_score=0.0,
        identity_evidence_available=False,
        identity_evidence_score=0.0,
        ip_risk_score=0.30,
        expected_decision="DENY",
    )
    result = engine.evaluate(record)

    assert result.decision in ("MANUAL_REVIEW", "DENY")
    assert result.confidence_score <= 0.60


# Scenario 7: Insider Impersonation on Suspended Directory Account
def test_scenario_7_suspended_directory_status(engine):
    record = RecoveryRequest(
        user_id="u700007",
        role="Student",
        device_known=True,
        device_trust_score=0.90,
        identity_evidence_available=True,
        identity_evidence_score=0.92,
        directory_status="SUSPENDED",
        expected_decision="DENY",
    )
    result = engine.evaluate(record)

    assert result.decision == "DENY"
    assert any("SUSPENDED" in r for r in result.reason_codes)
