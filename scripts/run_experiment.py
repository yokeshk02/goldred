"""
Comprehensive Experiment & Benchmarking Script.
Evaluates Baseline vs Proposed Risk Engine on 10,000+ synthetic requests.
Produces confusion matrices, robustness ablation figures, and serialized results.

Usage:
    python scripts/run_experiment.py --rows 10000 --seed 42
"""
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
import sys
from typing import Any, Dict, List

# Add workspace to sys.path
WORKSPACE_DIR = Path(__file__).resolve().parent.parent
if str(WORKSPACE_DIR) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_DIR))

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from src.data.generator.generate_recovery_dataset import generate_dataset, save_dataset_csv
from src.engine.baseline.baseline_model import BaselineRecoveryModel
from src.engine.risk_engine.engine import RiskEngine
from src.engine.scoring.evaluator import SystemEvaluator


def load_or_generate_dataset(rows: int, seed: int, csv_path: Path) -> List[Dict[str, Any]]:
    if csv_path.exists():
        print(f"[*] Reading existing dataset from: {csv_path}")
        records = []
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                records.append(dict(row))
        if len(records) >= rows:
            return records[:rows]

    print(f"[*] Generating {rows} synthetic recovery requests (seed={seed})...")
    records = generate_dataset(rows=rows, seed=seed)
    save_dataset_csv(records, csv_path)
    return records


def run_ablation_studies(records: List[Dict[str, Any]], engine: RiskEngine) -> Dict[str, Any]:
    """
    Evaluates engine performance across 5 controlled ablation cohorts:
    A: Complete Telemetry
    B: 10% Device Data Missing
    C: 25% Device Data Missing
    D: Identity Evidence Delayed
    E: Multiple Evidence Sources Unavailable
    """
    print("[*] Running Controlled Data Robustness Ablation Studies...")
    import copy

    def evaluate_cohort(cohort: List[Dict[str, Any]]) -> Dict[str, float]:
        evals = engine.evaluate_batch(cohort)
        res = SystemEvaluator.evaluate_decisions(cohort, evals)
        return res["metrics"]

    # Cohort A: Complete Data
    cohort_a = [r for r in records if r.get("source_missing", "none") == "none" and not r.get("evidence_delay", False)]
    if len(cohort_a) < 100:
        cohort_a = records[:1000]

    # Cohort B: 10% device missing (artificially induce)
    cohort_b = []
    for idx, r in enumerate(copy.deepcopy(records[:2000])):
        if idx % 10 == 0:
            r["source_missing"] = "device"
            r["device_known"] = False
            r["device_trust_score"] = 0.0
        cohort_b.append(r)

    # Cohort C: 25% device missing
    cohort_c = []
    for idx, r in enumerate(copy.deepcopy(records[:2000])):
        if idx % 4 == 0:
            r["source_missing"] = "device"
            r["device_known"] = False
            r["device_trust_score"] = 0.0
        cohort_c.append(r)

    # Cohort D: Identity Evidence Delayed
    cohort_d = []
    for r in copy.deepcopy(records[:2000]):
        r["evidence_delay"] = True
        r["source_delayed"] = "identity"
        cohort_d.append(r)

    # Cohort E: Multiple evidence sources missing
    cohort_e = []
    for r in copy.deepcopy(records[:2000]):
        r["source_missing"] = "device"
        r["device_known"] = False
        r["source_delayed"] = "identity"
        r["evidence_delay"] = True
        cohort_e.append(r)

    return {
        "cohort_a_complete": evaluate_cohort(cohort_a[:2000]),
        "cohort_b_10pct_device_missing": evaluate_cohort(cohort_b),
        "cohort_c_25pct_device_missing": evaluate_cohort(cohort_c),
        "cohort_d_identity_delayed": evaluate_cohort(cohort_d),
        "cohort_e_multi_unavailable": evaluate_cohort(cohort_e),
    }


def generate_confusion_matrix_plot(baseline_cm: Dict[str, Any], proposed_cm: Dict[str, Any], output_path: Path):
    """
    Renders visual ternary confusion matrix comparing Baseline vs Proposed.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig, axes = plt.subplots(1, 2, figsize=(13, 5))

    categories = ["Approve", "Manual Review", "Deny"]
    
    # Baseline Matrix
    b_legit = [
        baseline_cm["ternary"]["legitimate"]["approved"],
        baseline_cm["ternary"]["legitimate"]["manual_review"],
        baseline_cm["ternary"]["legitimate"]["denied"],
    ]
    b_fraud = [
        baseline_cm["ternary"]["fraud"]["approved"],
        baseline_cm["ternary"]["fraud"]["manual_review"],
        baseline_cm["ternary"]["fraud"]["denied"],
    ]
    b_matrix = np.array([b_legit, b_fraud])

    # Proposed Matrix
    p_legit = [
        proposed_cm["ternary"]["legitimate"]["approved"],
        proposed_cm["ternary"]["legitimate"]["manual_review"],
        proposed_cm["ternary"]["legitimate"]["denied"],
    ]
    p_fraud = [
        proposed_cm["ternary"]["fraud"]["approved"],
        proposed_cm["ternary"]["fraud"]["manual_review"],
        proposed_cm["ternary"]["fraud"]["denied"],
    ]
    p_matrix = np.array([p_legit, p_fraud])

    y_labels = ["Legitimate", "Fraud"]

    # Plot 1: Baseline
    im1 = axes[0].imshow(b_matrix, cmap="YlOrRd", aspect="auto")
    axes[0].set_title("Baseline Model Confusion Matrix", fontsize=12, pad=12, fontweight="bold")
    axes[0].set_xticks([0, 1, 2])
    axes[0].set_xticklabels(categories, fontsize=10)
    axes[0].set_yticks([0, 1])
    axes[0].set_yticklabels(y_labels, fontsize=10)
    axes[0].set_xlabel("System Decision", fontsize=11)
    axes[0].set_ylabel("Ground Truth", fontsize=11)

    for i in range(2):
        for j in range(3):
            val = b_matrix[i, j]
            axes[0].text(j, i, f"{val:,}", ha="center", va="center", color="black" if val < np.max(b_matrix)*0.7 else "white", fontweight="bold")

    # Plot 2: Proposed
    im2 = axes[1].imshow(p_matrix, cmap="Blues", aspect="auto")
    axes[1].set_title("Proposed Risk Engine Confusion Matrix", fontsize=12, pad=12, fontweight="bold")
    axes[1].set_xticks([0, 1, 2])
    axes[1].set_xticklabels(categories, fontsize=10)
    axes[1].set_yticks([0, 1])
    axes[1].set_yticklabels(y_labels, fontsize=10)
    axes[1].set_xlabel("System Decision", fontsize=11)
    axes[1].set_ylabel("Ground Truth", fontsize=11)

    for i in range(2):
        for j in range(3):
            val = p_matrix[i, j]
            axes[1].text(j, i, f"{val:,}", ha="center", va="center", color="black" if val < np.max(p_matrix)*0.7 else "white", fontweight="bold")

    plt.tight_layout()
    plt.savefig(output_path, dpi=200)
    plt.close()
    print(f"[+] Confusion matrix visualization written to: {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Run complete evaluation experiments.")
    parser.add_argument("--rows", type=int, default=10000, help="Number of records (default: 10000)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed (default: 42)")
    parser.add_argument("--csv", type=str, default="data/synthetic/recovery_requests_10k.csv")
    args = parser.parse_args()

    results_dir = WORKSPACE_DIR / "docs" / "results"
    results_dir.mkdir(parents=True, exist_ok=True)
    reports_dir = WORKSPACE_DIR / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)

    csv_path = WORKSPACE_DIR / args.csv

    # 1. Dataset Loading
    records = load_or_generate_dataset(rows=args.rows, seed=args.seed, csv_path=csv_path)

    # 2. Baseline Model Execution
    print(f"[*] Evaluating {len(records)} records using Baseline Model...")
    baseline_model = BaselineRecoveryModel.from_config()
    baseline_evals = baseline_model.evaluate_batch(records)
    baseline_results = SystemEvaluator.evaluate_decisions(records, baseline_evals)

    # 3. Proposed Risk Engine Execution
    print(f"[*] Evaluating {len(records)} records using Proposed Risk Engine...")
    risk_engine = RiskEngine()
    proposed_evals = risk_engine.evaluate_batch(records)
    proposed_results = SystemEvaluator.evaluate_decisions(records, proposed_evals)

    # 4. Role-based Breakdown
    roles = ["Student", "Faculty", "Alumni", "Temporary Researcher"]
    role_breakdown = {}
    for r in roles:
        role_subset = [rec for rec in records if rec["role"] == r]
        if role_subset:
            r_evals = risk_engine.evaluate_batch(role_subset)
            r_metrics = SystemEvaluator.evaluate_decisions(role_subset, r_evals)
            role_breakdown[r] = r_metrics["metrics"]

    # 5. Robustness Ablations
    ablation_results = run_ablation_studies(records, risk_engine)

    # 6. Save Confusion Matrices & Outputs
    b_m = baseline_results["metrics"]
    p_m = proposed_results["metrics"]

    summary_table = {
        "primary_success_metric": {
            "name": "Legitimate Recovery Success at >= 99% Impersonation Resistance",
            "target_impersonation_resistance": 0.9900,
            "baseline_impersonation_resistance": b_m["impersonation_resistance"],
            "proposed_impersonation_resistance": p_m["impersonation_resistance"],
            "baseline_legitimate_success": b_m["legitimate_recovery_success_rate"],
            "proposed_legitimate_success": p_m["legitimate_recovery_success_rate"],
            "legitimate_success_improvement": round(p_m["legitimate_recovery_success_rate"] - b_m["legitimate_recovery_success_rate"], 4),
            "target_achieved": p_m["impersonation_resistance"] >= 0.9900,
        },
        "metrics_comparison": {
            "legitimate_recovery_success_rate": {"baseline": b_m["legitimate_recovery_success_rate"], "proposed": p_m["legitimate_recovery_success_rate"]},
            "impersonation_resistance": {"baseline": b_m["impersonation_resistance"], "proposed": p_m["impersonation_resistance"]},
            "false_acceptance_rate": {"baseline": b_m["false_acceptance_rate"], "proposed": p_m["false_acceptance_rate"]},
            "false_rejection_rate": {"baseline": b_m["false_rejection_rate"], "proposed": p_m["false_rejection_rate"]},
            "manual_review_rate": {"baseline": b_m["manual_review_rate"], "proposed": p_m["manual_review_rate"]},
            "precision": {"baseline": b_m["precision"], "proposed": p_m["precision"]},
            "recall": {"baseline": b_m["recall"], "proposed": p_m["recall"]},
            "f1_score": {"baseline": b_m["f1_score"], "proposed": p_m["f1_score"]},
            "missing_data_safety_rate": {"baseline": b_m["missing_data_safety_rate"], "proposed": p_m["missing_data_safety_rate"]},
            "delayed_data_safety_rate": {"baseline": b_m["delayed_data_safety_rate"], "proposed": p_m["delayed_data_safety_rate"]},
        },
        "baseline_confusion_matrix": baseline_results["confusion_matrix"],
        "proposed_confusion_matrix": proposed_results["confusion_matrix"],
        "role_breakdown": role_breakdown,
        "ablation_studies": ablation_results,
    }

    # Write JSON summaries
    summary_path = results_dir / "experiment_summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary_table, f, indent=2)

    cm_path = results_dir / "confusion_matrices.json"
    with open(cm_path, "w", encoding="utf-8") as f:
        json.dump({
            "baseline": baseline_results["confusion_matrix"],
            "proposed": proposed_results["confusion_matrix"]
        }, f, indent=2)

    # Mirror to reports/
    with open(reports_dir / "experiment_summary.json", "w", encoding="utf-8") as f:
        json.dump(summary_table, f, indent=2)

    # Generate Confusion Matrix Chart
    cm_img_path = results_dir / "confusion_matrix.png"
    generate_confusion_matrix_plot(
        baseline_results["confusion_matrix"],
        proposed_results["confusion_matrix"],
        cm_img_path,
    )

    # Print Summary Results Table
    print("\n" + "="*80)
    print("EXPERIMENT BENCHMARK RESULTS (10,000 SAMPLES)")
    print("="*80)
    print(f"{'Metric':<35} | {'Baseline':<12} | {'Proposed':<12} | {'Target':<10} | {'Improvement':<12}")
    print("-"*80)

    rows_to_print = [
        ("Legitimate Recovery Success", f"{b_m['legitimate_recovery_success_rate']:.2%}", f"{p_m['legitimate_recovery_success_rate']:.2%}", "Maximize", f"{p_m['legitimate_recovery_success_rate'] - b_m['legitimate_recovery_success_rate']:+.2%}"),
        ("Impersonation Resistance", f"{b_m['impersonation_resistance']:.2%}", f"{p_m['impersonation_resistance']:.2%}", ">= 99.00%", f"{p_m['impersonation_resistance'] - b_m['impersonation_resistance']:+.2%}"),
        ("False Acceptance Rate (FAR)", f"{b_m['false_acceptance_rate']:.2%}", f"{p_m['false_acceptance_rate']:.2%}", "< 1.00%", f"{p_m['false_acceptance_rate'] - b_m['false_acceptance_rate']:+.2%}"),
        ("False Rejection Rate (FRR)", f"{b_m['false_rejection_rate']:.2%}", f"{p_m['false_rejection_rate']:.2%}", "< 5.00%", f"{p_m['false_rejection_rate'] - b_m['false_rejection_rate']:+.2%}"),
        ("Manual Review Rate", f"{b_m['manual_review_rate']:.2%}", f"{p_m['manual_review_rate']:.2%}", "15 - 30%", f"{p_m['manual_review_rate'] - b_m['manual_review_rate']:+.2%}"),
        ("Precision (Legitimate)", f"{b_m['precision']:.4f}", f"{p_m['precision']:.4f}", "N/A", f"{p_m['precision'] - b_m['precision']:+.4f}"),
        ("Recall (Legitimate)", f"{b_m['recall']:.4f}", f"{p_m['recall']:.4f}", "N/A", f"{p_m['recall'] - b_m['recall']:+.4f}"),
        ("F1 Score", f"{b_m['f1_score']:.4f}", f"{p_m['f1_score']:.4f}", "N/A", f"{p_m['f1_score'] - b_m['f1_score']:+.4f}"),
        ("Missing Data Safety Rate", f"{b_m['missing_data_safety_rate']:.2%}", f"{p_m['missing_data_safety_rate']:.2%}", ">= 95.00%", f"{p_m['missing_data_safety_rate'] - b_m['missing_data_safety_rate']:+.2%}"),
        ("Delayed Data Safety Rate", f"{b_m['delayed_data_safety_rate']:.2%}", f"{p_m['delayed_data_safety_rate']:.2%}", ">= 95.00%", f"{p_m['delayed_data_safety_rate'] - b_m['delayed_data_safety_rate']:+.2%}"),
    ]

    for name, b_val, p_val, target, diff in rows_to_print:
        print(f"{name:<35} | {b_val:<12} | {p_val:<12} | {target:<10} | {diff:<12}")

    print("="*80)
    print(f"[+] All results saved to {summary_path}")


if __name__ == "__main__":
    main()
