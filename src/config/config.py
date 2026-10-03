"""
Configuration loader for Risk Rules and Policy Engine.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

DEFAULT_CONFIG_PATH = Path(__file__).parent / "risk_rules.json"


class RiskConfig:
    def __init__(self, config_dict: Dict[str, Any] | None = None, config_path: Path | None = None):
        if config_dict is not None:
            self.raw_config = config_dict
        else:
            path = config_path or DEFAULT_CONFIG_PATH
            if not path.exists():
                raise FileNotFoundError(f"Configuration file not found at {path}")
            with open(path, "r", encoding="utf-8") as f:
                self.raw_config = json.load(f)

    @property
    def policy_version(self) -> str:
        return self.raw_config.get("policy_version", "1.0.0")

    @property
    def policy_name(self) -> str:
        return self.raw_config.get("policy_name", "Risk Policy")

    @property
    def global_weights(self) -> Dict[str, float]:
        return self.raw_config.get("global_weights", {})

    @property
    def baseline_config(self) -> Dict[str, Any]:
        return self.raw_config.get("baseline", {})

    @property
    def default_thresholds(self) -> Dict[str, float]:
        return self.raw_config.get("default_decision_thresholds", {})

    @property
    def role_policies(self) -> Dict[str, Dict[str, Any]]:
        return self.raw_config.get("role_specific_policies", {})

    @property
    def missing_data_penalties(self) -> Dict[str, Dict[str, Any]]:
        return self.raw_config.get("missing_data_penalties", {})

    @property
    def delayed_data_penalties(self) -> Dict[str, Dict[str, Any]]:
        return self.raw_config.get("delayed_data_penalties", {})

    @property
    def hard_rule_triggers(self) -> Dict[str, Any]:
        return self.raw_config.get("hard_rule_triggers", {})

    def get_role_policy(self, role: str) -> Dict[str, Any]:
        return self.role_policies.get(role, self.default_thresholds)


_config_singleton: RiskConfig | None = None


def get_config(reload: bool = False) -> RiskConfig:
    global _config_singleton
    if _config_singleton is None or reload:
        _config_singleton = RiskConfig()
    return _config_singleton
