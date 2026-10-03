"""
Unit Tests for Baseline Recovery Model.
Tests approval heuristics, device requirement, and fallback rules.
"""
import pytest
from src.engine.baseline.baseline_model import BaselineRecoveryModel
from src.models.recovery_request import RecoveryRequest


@pytest.fixture
def baseline():
    return BaselineRecoveryModel(approval_identity_threshold=0.80, denial_identity_threshold=0.35, require_known_device=True)


def test_baseline_approves_when_known_device_and_high_identity(baseline):
    req = RecoveryRequest(
        user_id="u200001",
        device_known=True,
        identity_evidence_available=True,
        identity_evidence_score=0.85,
        directory_status="ACTIVE",
    )
    res = baseline.evaluate(req)
    assert res.decision == "APPROVE"
    assert "BASELINE_IDENTITY_VERIFIED_AND_DEVICE_KNOWN" in res.reason_codes


def test_baseline_demotes_to_manual_review_on_unknown_device(baseline):
    """
    Even with 100% identity evidence, baseline cannot approve if device is unknown.
    """
    req = RecoveryRequest(
        user_id="u200002",
        device_known=False,
        identity_evidence_available=True,
        identity_evidence_score=0.95,
        directory_status="ACTIVE",
    )
    res = baseline.evaluate(req)
    assert res.decision == "MANUAL_REVIEW"
    assert "BASELINE_UNKNOWN_DEVICE" in res.reason_codes


def test_baseline_denies_low_identity_and_unknown_device(baseline):
    req = RecoveryRequest(
        user_id="u200003",
        device_known=False,
        identity_evidence_available=True,
        identity_evidence_score=0.20,
        directory_status="ACTIVE",
    )
    res = baseline.evaluate(req)
    assert res.decision == "DENY"


def test_baseline_denies_suspended_account(baseline):
    req = RecoveryRequest(
        user_id="u200004",
        device_known=True,
        identity_evidence_available=True,
        identity_evidence_score=0.90,
        directory_status="SUSPENDED",
    )
    res = baseline.evaluate(req)
    assert res.decision == "DENY"
    assert "BASELINE_ACCOUNT_SUSPENDED" in res.reason_codes
