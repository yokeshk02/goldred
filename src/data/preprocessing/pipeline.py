"""
Data Preprocessing & Feature Pipeline for Account-Recovery Requests.

Transforms raw recovery requests into enriched feature dictionaries without
dropping records containing missing or delayed evidence.
"""
from __future__ import annotations

from typing import Any, Dict, List, Tuple
from src.models.recovery_request import RecoveryRequest


class RecoveryDataPipeline:
    """
    Standardizes evidence signals, tags missing/delayed sources,
    and extracts structured indicators for downstream evaluation.
    """

    @staticmethod
    def process_record(record: Dict[str, Any] | RecoveryRequest) -> Dict[str, Any]:
        req = record if isinstance(record, RecoveryRequest) else RecoveryRequest.from_dict(record)

        available_signals: List[str] = []
        missing_signals: List[str] = []
        delayed_signals: List[str] = []
        conflict_flags: List[str] = []

        # 1. Device Evidence
        is_device_missing = (
            req.source_missing == "device"
            or (req.device_trust_score == 0.0 and not req.device_known)
            or (not req.device_id and req.device_trust_score == 0.0)
        )
        if is_device_missing:
            missing_signals.append("device")
            device_risk = 0.60  # Default neutral-high uncertainty risk
            device_confidence = 0.30
        else:
            available_signals.append("device")
            # If known device, risk is inverse of trust; unknown device carries inherent penalty
            base_dev_risk = 1.0 - req.device_trust_score
            device_risk = base_dev_risk if req.device_known else max(0.50, base_dev_risk + 0.25)
            device_confidence = 0.90

        # Check for delayed device intelligence
        if req.source_delayed == "device_intelligence":
            delayed_signals.append("device_intelligence")
            device_confidence = max(0.40, device_confidence - 0.25)

        # 2. Identity Evidence
        is_identity_missing = not req.identity_evidence_available or req.source_missing == "identity"
        if is_identity_missing:
            missing_signals.append("identity")
            identity_risk = 0.80  # Substantial risk if no identity verified
            identity_confidence = 0.20
        else:
            available_signals.append("identity")
            identity_risk = max(0.0, 1.0 - req.identity_evidence_score)
            identity_confidence = 0.95

        if req.source_delayed == "identity" or req.evidence_delay:
            delayed_signals.append("identity")
            identity_confidence = max(0.35, identity_confidence - 0.30)

        # 3. Network / IP Risk
        if req.source_missing == "network":
            missing_signals.append("network")
            network_risk = 0.50
            network_confidence = 0.40
        else:
            available_signals.append("network")
            network_risk = req.ip_risk_score
            network_confidence = 0.90

        # 4. Behavioral & Consistency Signals
        geo_risk = max(0.0, 1.0 - req.geo_consistency)
        login_risk = max(0.0, 1.0 - req.login_history_consistency)
        available_signals.extend(["geo", "login_history"])

        # 5. Directory Status Signal
        if req.source_missing == "directory":
            missing_signals.append("directory")
            directory_risk = 0.50
            directory_confidence = 0.30
        else:
            available_signals.append("directory")
            dir_map = {
                "ACTIVE": 0.05,
                "LEAVE": 0.40,
                "PENDING_REVIEW": 0.65,
                "SUSPENDED": 1.00,
            }
            directory_risk = dir_map.get(req.directory_status, 0.50)
            directory_confidence = 0.95

        if req.source_delayed == "directory":
            delayed_signals.append("directory")
            directory_confidence = max(0.40, directory_confidence - 0.25)

        # 6. MFA History Signal
        mfa_map = {
            "ACTIVE_HEALTHY": 0.10,
            "RECENTLY_RESET": 0.45,
            "FAILED_RECENTLY": 0.70,
            "DISABLED": 0.85,
        }
        mfa_risk = mfa_map.get(req.mfa_history, 0.50)
        available_signals.append("mfa_history")

        # 7. Recovery Velocity
        velocity_risk = min(1.0, req.recovery_velocity * 0.25)
        available_signals.append("velocity")

        # 8. Check Conflicting Evidence
        # Case A: High device trust but hostile IP
        if req.device_trust_score > 0.75 and req.ip_risk_score > 0.70:
            conflict_flags.append("TRUSTED_DEVICE_WITH_HOSTILE_NETWORK")
        # Case B: High identity evidence score but excessive recovery velocity
        if req.identity_evidence_score > 0.80 and req.recovery_velocity >= 3:
            conflict_flags.append("VALID_IDENTITY_WITH_ABNORMAL_VELOCITY")
        # Case C: Known device claimed but geo_consistency very low
        if req.device_known and req.geo_consistency < 0.25:
            conflict_flags.append("KNOWN_DEVICE_FROM_IMPOSSIBLE_LOCATION")

        # Compile feature package
        features = {
            "request_id": req.request_id,
            "user_id": req.user_id,
            "role": req.role,
            "account_age": req.account_age,
            "recovery_reason": req.recovery_reason,
            "device_known": req.device_known,
            "device_change": req.device_change,
            "signals": {
                "identity_risk": round(identity_risk, 4),
                "device_risk": round(device_risk, 4),
                "ip_risk": round(network_risk, 4),
                "geo_risk": round(geo_risk, 4),
                "login_risk": round(login_risk, 4),
                "directory_risk": round(directory_risk, 4),
                "mfa_risk": round(mfa_risk, 4),
                "velocity_risk": round(velocity_risk, 4),
            },
            "confidences": {
                "device": round(device_confidence, 2),
                "identity": round(identity_confidence, 2),
                "network": round(network_confidence, 2),
                "directory": round(directory_confidence, 2),
            },
            "evidence_status": {
                "available": available_signals,
                "missing": missing_signals,
                "delayed": delayed_signals,
                "conflicts": conflict_flags,
            },
            "raw_attributes": req.to_dict(),
        }

        return features

    @classmethod
    def process_batch(cls, records: List[Dict[str, Any]] | List[RecoveryRequest]) -> List[Dict[str, Any]]:
        return [cls.process_record(r) for r in records]
