"""
Data models for Account Recovery Requests.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Dict, Optional
import uuid


@dataclass
class RecoveryRequest:
    """
    Structured data model representing an incoming account-recovery submission.
    Encapsulates identity claims, hardware signals, network reputation, institutional directory status,
    and telemetry latency/missingness flags.
    """
    request_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = ""
    role: str = "Student"  # Student, Faculty, Alumni, Temporary Researcher
    account_age: int = 180  # Account tenure in days
    recovery_reason: str = "forgot_password"
    device_id: str = ""
    device_known: bool = True  # Provenance match against enrolled device registry
    device_trust_score: float = 0.85  # Hardware health & certificate score [0.0, 1.0]
    device_change: bool = False
    ip_risk_score: float = 0.10  # External threat intelligence & Tor/VPN reputation [0.0, 1.0]
    geo_consistency: float = 0.95  # Match with historical campus/city geofence [0.0, 1.0]
    login_history_consistency: float = 0.90  # Consistency with regular login intervals [0.0, 1.0]
    identity_evidence_available: bool = True
    identity_evidence_score: float = 0.85  # Secondary ID verification confidence [0.0, 1.0]
    directory_status: str = "ACTIVE"  # ACTIVE, SUSPENDED, LEAVE, PENDING_REVIEW
    mfa_history: str = "ACTIVE_HEALTHY"  # ACTIVE_HEALTHY, RECENTLY_RESET, FAILED_RECENTLY, DISABLED
    previous_recovery_count: int = 0
    recovery_velocity: int = 0  # Frequency of password reset attempts within rolling 48-hour window
    evidence_delay: bool = False  # Asynchronous verification latency indicator
    source_missing: str = "none"  # none, device, identity, directory, network, multiple
    source_delayed: str = "none"  # none, directory, device_intelligence, identity, multiple
    fraud_scenario: str = "none"  # none, credential_stuffing, sim_swap, social_engineering, dormant_takeover, insider_threat
    ground_truth: str = "LEGITIMATE"  # Evaluative label: LEGITIMATE vs FRAUD
    expected_decision: str = "APPROVE"  # Reference expected triage decision

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> RecoveryRequest:
        valid_keys = {f.name for f in cls.__dataclass_fields__.values()}
        filtered = {k: v for k, v in data.items() if k in valid_keys}
        
        # Coerce types safely
        if "device_known" in filtered:
            filtered["device_known"] = str(filtered["device_known"]).lower() in ("true", "1", "yes")
        if "device_change" in filtered:
            filtered["device_change"] = str(filtered["device_change"]).lower() in ("true", "1", "yes")
        if "identity_evidence_available" in filtered:
            filtered["identity_evidence_available"] = str(filtered["identity_evidence_available"]).lower() in ("true", "1", "yes")
        if "evidence_delay" in filtered:
            filtered["evidence_delay"] = str(filtered["evidence_delay"]).lower() in ("true", "1", "yes")
        if "device_trust_score" in filtered:
            filtered["device_trust_score"] = float(filtered["device_trust_score"])
        if "ip_risk_score" in filtered:
            filtered["ip_risk_score"] = float(filtered["ip_risk_score"])
        if "geo_consistency" in filtered:
            filtered["geo_consistency"] = float(filtered["geo_consistency"])
        if "login_history_consistency" in filtered:
            filtered["login_history_consistency"] = float(filtered["login_history_consistency"])
        if "identity_evidence_score" in filtered:
            filtered["identity_evidence_score"] = float(filtered["identity_evidence_score"])
        if "account_age" in filtered:
            filtered["account_age"] = int(float(filtered["account_age"]))
        if "previous_recovery_count" in filtered:
            filtered["previous_recovery_count"] = int(float(filtered["previous_recovery_count"]))
        if "recovery_velocity" in filtered:
            filtered["recovery_velocity"] = int(float(filtered["recovery_velocity"]))

        return cls(**filtered)
