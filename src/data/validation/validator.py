"""
Data Validation Module for Account-Recovery Requests.
Validates input schemas, ranges, types, and flags potential anomalies.
"""
from __future__ import annotations

from typing import Any, Dict, List, Tuple
from src.models.recovery_request import RecoveryRequest

REQUIRED_FIELDS = [
    "request_id",
    "user_id",
    "role",
    "device_trust_score",
    "ip_risk_score",
    "geo_consistency",
    "login_history_consistency",
    "identity_evidence_score",
    "directory_status",
    "mfa_history",
]

VALID_ROLES = {"Student", "Faculty", "Alumni", "Temporary Researcher"}
VALID_DIRECTORY_STATUSES = {"ACTIVE", "SUSPENDED", "LEAVE", "PENDING_REVIEW"}


class DataValidationError(Exception):
    """Raised when data structure is fundamentally broken."""
    pass


class RequestValidator:
    @staticmethod
    def validate_record(record: Dict[str, Any] | RecoveryRequest) -> Tuple[bool, List[str]]:
        """
        Validates an individual record.
        Returns: (is_valid, list_of_validation_warnings_or_errors)
        """
        issues: List[str] = []
        data = record.to_dict() if isinstance(record, RecoveryRequest) else record

        # 1. Required schema verification: Ensure all critical attributes exist
        # to prevent uninitialized fields or NoneTypes from entering the Bayesian scoring pipeline.
        for field in REQUIRED_FIELDS:
            if field not in data or data[field] is None:
                issues.append(f"Missing required field: '{field}'")

        # 2. Numeric probability bounds verification: Enforce strict [0.0, 1.0] range
        # to prevent arithmetic overflow, underflow, or inverted risk scoring.
        numeric_bounds = [
            ("device_trust_score", 0.0, 1.0),
            ("ip_risk_score", 0.0, 1.0),
            ("geo_consistency", 0.0, 1.0),
            ("login_history_consistency", 0.0, 1.0),
            ("identity_evidence_score", 0.0, 1.0),
        ]
        for field, low, high in numeric_bounds:
            if field in data and data[field] is not None:
                try:
                    val = float(data[field])
                    if not (low <= val <= high):
                        issues.append(f"Field '{field}' out of bounds [{low}, {high}]: {val}")
                except (ValueError, TypeError):
                    issues.append(f"Field '{field}' must be numeric")

        # 3. Categorical role validation: Restrict roles to authorized university personas
        # to prevent unauthorized escalation via novel or spoofed role strings.
        role = data.get("role")
        if role and role not in VALID_ROLES:
            issues.append(f"Invalid role: '{role}' (expected one of {VALID_ROLES})")

        # 4. Directory status validation: Restrict to valid LDAP/Active Directory lifecycle states
        dir_status = data.get("directory_status")
        if dir_status and dir_status not in VALID_DIRECTORY_STATUSES:
            issues.append(f"Invalid directory status: '{dir_status}'")

        is_valid = len(issues) == 0
        return is_valid, issues

    @classmethod
    def validate_batch(cls, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Validates an entire batch of recovery requests.
        """
        total = len(records)
        valid_count = 0
        all_issues = []

        for idx, rec in enumerate(records):
            valid, issues = cls.validate_record(rec)
            if valid:
                valid_count += 1
            else:
                all_issues.append({"index": idx, "request_id": rec.get("request_id"), "issues": issues})

        return {
            "total_records": total,
            "valid_records": valid_count,
            "invalid_records": total - valid_count,
            "is_all_valid": valid_count == total,
            "issues_sample": all_issues[:10],
        }
