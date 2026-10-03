"""
Synthetic Dataset Generator for University Account-Recovery Verification.

Generates realistic, statistically grounded account-recovery requests across:
- Roles: Student, Faculty, Alumni, Temporary Researcher
- Request types: Legitimate recoveries, Missing-data cases, Delayed-data cases, Fraudulent attacks
- Attack Scenarios: Credential stuffing, SIM swap, Social engineering, Dormant takeover, Insider threat

Usage:
    python -m src.data.generator.generate_recovery_dataset --rows 10000 --seed 42 --output data/synthetic/recovery_requests_10k.csv
"""
from __future__ import annotations

import argparse
import csv
import json
import os
from pathlib import Path
import random
import uuid
from typing import Any, Dict, List

ROLES = ["Student", "Faculty", "Alumni", "Temporary Researcher"]
ROLE_WEIGHTS = [0.55, 0.20, 0.15, 0.10]

RECOVERY_REASONS = [
    "forgot_password",
    "lost_device",
    "mfa_phone_replaced",
    "hardware_token_broken",
    "locked_out_traveling",
    "session_expired_urgent",
]

DIRECTORY_STATUSES = ["ACTIVE", "ACTIVE", "ACTIVE", "LEAVE", "SUSPENDED", "PENDING_REVIEW"]
MFA_HISTORIES = ["ACTIVE_HEALTHY", "ACTIVE_HEALTHY", "RECENTLY_RESET", "FAILED_RECENTLY", "DISABLED"]


def generate_single_request(rng: random.Random, index: int) -> Dict[str, Any]:
    # Determine Ground Truth & Scenario
    # 70% Legitimate, 30% Fraudulent
    is_fraud = rng.random() < 0.30
    role = rng.choices(ROLES, weights=ROLE_WEIGHTS, k=1)[0]
    user_id = f"u{100000 + (index % 85000)}"
    request_id = str(uuid.UUID(int=rng.getrandbits(128), version=4))

    # Account age based on role
    if role == "Student":
        account_age = rng.randint(30, 1460)  # up to 4 years
    elif role == "Faculty":
        account_age = rng.randint(365, 7300)  # up to 20 years
    elif role == "Alumni":
        account_age = rng.randint(1460, 9000)  # graduated
    else:  # Temporary Researcher
        account_age = rng.randint(15, 365)

    recovery_reason = rng.choice(RECOVERY_REASONS)
    device_id = f"dev_{rng.randint(10000, 99999)}_{rng.randint(1000, 9999)}"

    # Determine data imperfection (missing or delayed data)
    imperfection_roll = rng.random()
    source_missing = "none"
    source_delayed = "none"
    evidence_delay = False

    if imperfection_roll < 0.12:
        source_missing = rng.choice(["device", "identity", "directory", "network"])
    elif imperfection_roll < 0.22:
        source_delayed = rng.choice(["directory", "device_intelligence", "identity"])
        evidence_delay = True

    if not is_fraud:
        ground_truth = "LEGITIMATE"
        fraud_scenario = "none"

        # Legitimate distributions
        # High likelihood of known device unless device was lost/replaced
        if recovery_reason in ["lost_device", "mfa_phone_replaced"]:
            device_change = True
            device_known = rng.random() < 0.25  # sometimes they borrow known laptop
        else:
            device_change = rng.random() < 0.20
            device_known = not device_change or (rng.random() < 0.35)

        device_trust_score = round(rng.uniform(0.65, 0.98), 3) if device_known else round(rng.uniform(0.40, 0.85), 3)
        ip_risk_score = round(rng.betavariate(1.2, 8.0), 3)  # mostly low risk [0.0 - 0.3]
        geo_consistency = round(rng.betavariate(8.0, 1.5), 3)  # mostly high [0.75 - 1.0]
        login_history_consistency = round(rng.betavariate(7.0, 2.0), 3)

        # Identity evidence
        identity_evidence_available = source_missing != "identity"
        if identity_evidence_available:
            identity_evidence_score = round(rng.uniform(0.70, 0.99), 3)
        else:
            identity_evidence_score = 0.0

        directory_status = "ACTIVE" if rng.random() < 0.96 else rng.choice(["LEAVE", "PENDING_REVIEW"])
        mfa_history = rng.choice(["ACTIVE_HEALTHY", "ACTIVE_HEALTHY", "RECENTLY_RESET", "FAILED_RECENTLY"])
        previous_recovery_count = rng.choices([0, 1, 2, 3], weights=[0.70, 0.20, 0.08, 0.02], k=1)[0]
        recovery_velocity = rng.choices([0, 1, 2], weights=[0.85, 0.12, 0.03], k=1)[0]

        # In case of missing device
        if source_missing == "device":
            device_known = False
            device_trust_score = 0.0

        # Expected decision for legitimate cases
        if source_missing in ["identity", "device"] or evidence_delay or directory_status != "ACTIVE" or recovery_velocity >= 2:
            expected_decision = "MANUAL_REVIEW"
        else:
            expected_decision = "APPROVE"

    else:
        ground_truth = "FRAUD"
        fraud_scenario = rng.choice([
            "credential_stuffing",
            "sim_swap",
            "social_engineering",
            "dormant_takeover",
            "insider_threat",
        ])

        if fraud_scenario == "credential_stuffing":
            device_known = False
            device_change = True
            device_trust_score = round(rng.uniform(0.05, 0.40), 3)
            ip_risk_score = round(rng.uniform(0.75, 0.98), 3)  # high risk bot/proxy IP
            geo_consistency = round(rng.uniform(0.05, 0.35), 3)
            login_history_consistency = round(rng.uniform(0.05, 0.30), 3)
            identity_evidence_available = rng.random() < 0.15
            identity_evidence_score = round(rng.uniform(0.10, 0.45), 3) if identity_evidence_available else 0.0
            directory_status = "ACTIVE"
            mfa_history = rng.choice(["FAILED_RECENTLY", "ACTIVE_HEALTHY"])
            previous_recovery_count = rng.randint(0, 4)
            recovery_velocity = rng.randint(2, 6)
            expected_decision = "DENY"

        elif fraud_scenario == "sim_swap":
            device_known = False
            device_change = True
            device_trust_score = round(rng.uniform(0.20, 0.55), 3)
            ip_risk_score = round(rng.uniform(0.40, 0.75), 3)
            geo_consistency = round(rng.uniform(0.30, 0.65), 3)
            login_history_consistency = round(rng.uniform(0.20, 0.50), 3)
            identity_evidence_available = rng.random() < 0.30
            identity_evidence_score = round(rng.uniform(0.25, 0.55), 3) if identity_evidence_available else 0.0
            directory_status = "ACTIVE"
            mfa_history = "RECENTLY_RESET"
            previous_recovery_count = rng.randint(1, 3)
            recovery_velocity = rng.randint(1, 3)
            expected_decision = "MANUAL_REVIEW" if identity_evidence_available else "DENY"

        elif fraud_scenario == "social_engineering":
            device_known = False
            device_change = True
            device_trust_score = round(rng.uniform(0.30, 0.60), 3)
            ip_risk_score = round(rng.uniform(0.50, 0.85), 3)
            geo_consistency = round(rng.uniform(0.20, 0.55), 3)
            login_history_consistency = round(rng.uniform(0.25, 0.60), 3)
            # Attacker presents forged or low quality document
            identity_evidence_available = rng.random() < 0.60
            identity_evidence_score = round(rng.uniform(0.30, 0.62), 3) if identity_evidence_available else 0.0
            directory_status = rng.choice(["ACTIVE", "PENDING_REVIEW"])
            mfa_history = rng.choice(["FAILED_RECENTLY", "DISABLED"])
            previous_recovery_count = rng.randint(1, 4)
            recovery_velocity = rng.randint(1, 4)
            expected_decision = "DENY" if identity_evidence_score < 0.50 else "MANUAL_REVIEW"

        elif fraud_scenario == "dormant_takeover":
            role = rng.choice(["Alumni", "Temporary Researcher"])
            account_age = rng.randint(1800, 7000)
            device_known = False
            device_change = True
            device_trust_score = round(rng.uniform(0.10, 0.45), 3)
            ip_risk_score = round(rng.uniform(0.60, 0.92), 3)
            geo_consistency = round(rng.uniform(0.05, 0.40), 3)
            login_history_consistency = 0.05  # dormant
            identity_evidence_available = False
            identity_evidence_score = 0.0
            directory_status = rng.choice(["ACTIVE", "LEAVE", "SUSPENDED"])
            mfa_history = "DISABLED"
            previous_recovery_count = 0
            recovery_velocity = rng.randint(1, 3)
            expected_decision = "DENY"

        else:  # insider_threat
            device_known = rng.random() < 0.65  # might use university workstation
            device_change = not device_known
            device_trust_score = round(rng.uniform(0.50, 0.85), 3)
            ip_risk_score = round(rng.uniform(0.20, 0.60), 3)
            geo_consistency = round(rng.uniform(0.60, 0.95), 3)
            login_history_consistency = round(rng.uniform(0.40, 0.80), 3)
            identity_evidence_available = rng.random() < 0.50
            identity_evidence_score = round(rng.uniform(0.40, 0.70), 3) if identity_evidence_available else 0.0
            directory_status = rng.choice(["SUSPENDED", "PENDING_REVIEW", "LEAVE"])
            mfa_history = rng.choice(["FAILED_RECENTLY", "DISABLED"])
            previous_recovery_count = rng.randint(2, 5)
            recovery_velocity = rng.randint(2, 5)
            expected_decision = "DENY"

        # Apply missing / delayed telemetry if rolled
        if source_missing == "device":
            device_known = False
            device_trust_score = 0.0
        elif source_missing == "identity":
            identity_evidence_available = False
            identity_evidence_score = 0.0

    return {
        "request_id": request_id,
        "user_id": user_id,
        "role": role,
        "account_age": account_age,
        "recovery_reason": recovery_reason,
        "device_id": device_id,
        "device_known": device_known,
        "device_trust_score": device_trust_score,
        "device_change": device_change,
        "ip_risk_score": ip_risk_score,
        "geo_consistency": geo_consistency,
        "login_history_consistency": login_history_consistency,
        "identity_evidence_available": identity_evidence_available,
        "identity_evidence_score": identity_evidence_score,
        "directory_status": directory_status,
        "mfa_history": mfa_history,
        "previous_recovery_count": previous_recovery_count,
        "recovery_velocity": recovery_velocity,
        "evidence_delay": evidence_delay,
        "source_missing": source_missing,
        "source_delayed": source_delayed,
        "fraud_scenario": fraud_scenario,
        "ground_truth": ground_truth,
        "expected_decision": expected_decision,
    }


def generate_dataset(rows: int, seed: int = 42) -> List[Dict[str, Any]]:
    rng = random.Random(seed)
    return [generate_single_request(rng, i) for i in range(rows)]


def save_dataset_csv(records: List[Dict[str, Any]], filepath: Path | str) -> None:
    path = Path(filepath)
    path.parent.mkdir(parents=True, exist_ok=True)
    if not records:
        return
    fieldnames = list(records[0].keys())
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)


def save_dataset_json(records: List[Dict[str, Any]], filepath: Path | str) -> None:
    path = Path(filepath)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic account-recovery requests dataset.")
    parser.add_argument("--rows", type=int, default=10000, help="Number of records to generate (default: 10000)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility (default: 42)")
    parser.add_argument(
        "--output",
        type=str,
        default="data/synthetic/recovery_requests_10k.csv",
        help="Target output CSV file path",
    )
    parser.add_argument(
        "--json-output",
        type=str,
        default=None,
        help="Optional target output JSON file path",
    )
    args = parser.parse_args()

    print(f"[*] Generating {args.rows} synthetic recovery requests with seed {args.seed}...")
    records = generate_dataset(rows=args.rows, seed=args.seed)

    save_dataset_csv(records, args.output)
    print(f"[+] Saved CSV dataset to: {args.output}")

    if args.json_output:
        save_dataset_json(records, args.json_output)
        print(f"[+] Saved JSON dataset to: {args.json_output}")

    # Summary statistics
    legit_count = sum(1 for r in records if r["ground_truth"] == "LEGITIMATE")
    fraud_count = len(records) - legit_count
    role_counts = {r: sum(1 for x in records if x["role"] == r) for r in ROLES}
    missing_count = sum(1 for r in records if r["source_missing"] != "none")
    delayed_count = sum(1 for r in records if r["source_delayed"] != "none")

    print(f"[i] Dataset summary: Total={len(records)} | Legit={legit_count} ({legit_count/len(records):.1%}) | Fraud={fraud_count} ({fraud_count/len(records):.1%})")
    print(f"[i] Role distribution: {role_counts}")
    print(f"[i] Missing telemetry records: {missing_count} | Delayed evidence records: {delayed_count}")


if __name__ == "__main__":
    main()
