/**
 * TypeScript Implementation of Risk Engine & Baseline for Real-Time Web Application.
 * Shares 100% parity with Python implementation in src/engine/.
 */

export interface RecoveryRequestData {
  request_id: string;
  user_id: string;
  role: "Student" | "Faculty" | "Alumni" | "Temporary Researcher" | string;
  account_age?: number;
  recovery_reason: string;
  device_id?: string;
  device_known: boolean;
  device_trust_score: number;
  device_change?: boolean;
  ip_risk_score: number;
  geo_consistency: number;
  login_history_consistency: number;
  identity_evidence_available: boolean;
  identity_evidence_score: number;
  directory_status: "ACTIVE" | "SUSPENDED" | "LEAVE" | "PENDING_REVIEW" | string;
  mfa_history: "ACTIVE_HEALTHY" | "RECENTLY_RESET" | "FAILED_RECENTLY" | "DISABLED" | string;
  previous_recovery_count?: number;
  recovery_velocity: number;
  evidence_delay?: boolean;
  source_missing?: string;
  source_delayed?: string;
  fraud_scenario?: string;
  ground_truth?: "LEGITIMATE" | "FRAUD" | string;
  expected_decision?: "APPROVE" | "MANUAL_REVIEW" | "DENY" | string;
}

export interface RiskEvaluationData {
  request_id: string;
  user_id: string;
  role: string;
  decision: "APPROVE" | "MANUAL_REVIEW" | "DENY";
  risk_score: number;
  confidence_score: number;
  reason_codes: string[];
  evidence_used: string[];
  evidence_missing: string[];
  evidence_delayed: string[];
  signals_breakdown: Record<string, number>;
  recommended_action: string;
  policy_version: string;
  engine_type: "baseline" | "proposed_risk_engine";
}

export function evaluateBaseline(req: RecoveryRequestData): RiskEvaluationData {
  const missing: string[] = [];
  if (!req.identity_evidence_available || req.source_missing === "identity") missing.push("identity");
  if (req.source_missing === "device") missing.push("device");

  if (req.directory_status === "SUSPENDED") {
    return {
      request_id: req.request_id,
      user_id: req.user_id,
      role: req.role,
      decision: "DENY",
      risk_score: 0.95,
      confidence_score: 0.90,
      reason_codes: ["BASELINE_ACCOUNT_SUSPENDED"],
      evidence_used: ["directory_status"],
      evidence_missing: missing,
      evidence_delayed: [],
      signals_breakdown: { identity_score: req.identity_evidence_score || 0, device_known: req.device_known ? 1 : 0 },
      recommended_action: "Block account recovery immediately due to directory suspension",
      policy_version: "baseline-1.0",
      engine_type: "baseline",
    };
  }

  const identityScore = req.identity_evidence_available ? (req.identity_evidence_score || 0) : 0;
  const isApproved = identityScore >= 0.80 && req.device_known;
  const isDenied = identityScore < 0.35 && !req.device_known;

  let decision: "APPROVE" | "MANUAL_REVIEW" | "DENY" = "MANUAL_REVIEW";
  let riskScore = 0.55;
  let confScore = 0.60;
  const reasons: string[] = [];
  let action = "Escalate to help-desk technician for manual credential and ID check";

  if (isApproved) {
    decision = "APPROVE";
    riskScore = Math.max(0.10, 1.0 - identityScore);
    confScore = 0.85;
    reasons.push("BASELINE_IDENTITY_VERIFIED_AND_DEVICE_KNOWN");
    action = "Issue standard automated self-service password reset link";
  } else if (isDenied) {
    decision = "DENY";
    riskScore = 0.85;
    confScore = 0.75;
    reasons.push("BASELINE_LOW_IDENTITY_EVIDENCE_AND_UNKNOWN_DEVICE");
    action = "Reject automated recovery; advise user to visit IT service desk in person";
  } else {
    if (!req.device_known) reasons.push("BASELINE_UNKNOWN_DEVICE");
    if (identityScore < 0.80) reasons.push("BASELINE_IDENTITY_SCORE_BELOW_THRESHOLD_0.80");
  }

  return {
    request_id: req.request_id,
    user_id: req.user_id,
    role: req.role,
    decision,
    risk_score: Number(riskScore.toFixed(3)),
    confidence_score: Number(confScore.toFixed(3)),
    reason_codes: reasons,
    evidence_used: ["identity_evidence_score", "device_known"],
    evidence_missing: missing,
    evidence_delayed: [],
    signals_breakdown: { identity_score: identityScore, device_known: req.device_known ? 1 : 0 },
    recommended_action: action,
    policy_version: "baseline-1.0",
    engine_type: "baseline",
  };
}

export function evaluateProposed(req: RecoveryRequestData, customWeights?: Record<string, number>): RiskEvaluationData {
  const available: string[] = [];
  const missing: string[] = [];
  const delayed: string[] = [];
  const conflicts: string[] = [];

  // 1. Device
  const isDevMissing = req.source_missing === "device" || (req.device_trust_score === 0 && !req.device_known);
  let devRisk = 0.60;
  let devConf = 0.30;
  if (isDevMissing) {
    missing.push("device");
  } else {
    available.push("device");
    const baseDevRisk = 1.0 - req.device_trust_score;
    devRisk = req.device_known ? baseDevRisk : Math.max(0.50, baseDevRisk + 0.25);
    devConf = 0.90;
  }
  if (req.source_delayed === "device_intelligence") {
    delayed.push("device_intelligence");
    devConf = Math.max(0.40, devConf - 0.25);
  }

  // 2. Identity
  const isIdMissing = !req.identity_evidence_available || req.source_missing === "identity";
  let idRisk = 0.80;
  let idConf = 0.20;
  if (isIdMissing) {
    missing.push("identity");
  } else {
    available.push("identity");
    idRisk = Math.max(0, 1.0 - req.identity_evidence_score);
    idConf = 0.95;
  }
  if (req.source_delayed === "identity" || req.evidence_delay) {
    delayed.push("identity");
    idConf = Math.max(0.35, idConf - 0.30);
  }

  // 3. Network
  let netRisk = req.ip_risk_score;
  available.push("network");

  // 4. Geo & Login
  const geoRisk = Math.max(0, 1.0 - req.geo_consistency);
  const loginRisk = Math.max(0, 1.0 - req.login_history_consistency);
  available.push("geo", "login_history");

  // 5. Directory
  const dirMap: Record<string, number> = { ACTIVE: 0.05, LEAVE: 0.40, PENDING_REVIEW: 0.65, SUSPENDED: 1.00 };
  const dirRisk = dirMap[req.directory_status] || 0.50;
  available.push("directory");
  if (req.source_delayed === "directory") delayed.push("directory");

  // 6. MFA
  const mfaMap: Record<string, number> = { ACTIVE_HEALTHY: 0.10, RECENTLY_RESET: 0.45, FAILED_RECENTLY: 0.70, DISABLED: 0.85 };
  const mfaRisk = mfaMap[req.mfa_history] || 0.50;
  available.push("mfa_history");

  // 7. Velocity
  const veloRisk = Math.min(1.0, (req.recovery_velocity || 0) * 0.25);
  available.push("velocity");

  // Conflicts
  if (req.device_trust_score > 0.75 && req.ip_risk_score > 0.70) conflicts.push("TRUSTED_DEVICE_WITH_HOSTILE_NETWORK");
  if (req.identity_evidence_score > 0.80 && req.recovery_velocity >= 3) conflicts.push("VALID_IDENTITY_WITH_ABNORMAL_VELOCITY");
  if (req.device_known && req.geo_consistency < 0.25) conflicts.push("KNOWN_DEVICE_FROM_IMPOSSIBLE_LOCATION");

  // Weights
  const weights: Record<string, number> = {
    identity_evidence: 0.30,
    device_trust: 0.20,
    ip_risk: 0.15,
    geo_consistency: 0.12,
    login_history: 0.10,
    mfa_history: 0.08,
    recovery_velocity: 0.05,
    ...(customWeights || {}),
  };

  if (req.role === "Alumni") {
    weights.identity_evidence += 0.10;
    weights.device_trust = Math.max(0.10, weights.device_trust - 0.05);
  }

  const signalMap: Record<string, number> = {
    identity_evidence: idRisk,
    device_trust: devRisk,
    ip_risk: netRisk,
    geo_consistency: geoRisk,
    login_history: loginRisk,
    mfa_history: mfaRisk,
    recovery_velocity: veloRisk,
  };

  let totalW = 0;
  let sumW = 0;
  for (const k of Object.keys(weights)) {
    if (signalMap[k] !== undefined) {
      sumW += signalMap[k] * weights[k];
      totalW += weights[k];
    }
  }
  let baseRisk = totalW > 0 ? sumW / totalW : 0.50;

  // Penalties
  let riskPenalty = 0;
  if (missing.includes("device")) riskPenalty += 0.10;
  if (missing.includes("identity")) riskPenalty += 0.25;
  if (missing.includes("directory")) riskPenalty += 0.15;
  if (req.role === "Faculty" && devRisk > 0.50) riskPenalty += 0.08;
  if (conflicts.length > 0) riskPenalty += 0.12 * conflicts.length;

  const finalRisk = Math.min(1.0, Math.max(0.0, baseRisk + riskPenalty));

  // Confidence
  let baseConf = 1.0;
  if (missing.includes("device")) baseConf -= 0.20;
  if (missing.includes("identity")) baseConf -= 0.35;
  if (missing.includes("directory")) baseConf -= 0.15;
  if (delayed.includes("identity")) baseConf -= 0.22;
  if (delayed.includes("directory")) baseConf -= 0.10;
  if (delayed.includes("device_intelligence")) baseConf -= 0.10;
  if (conflicts.length > 0) baseConf -= 0.20 * conflicts.length;
  if (req.role === "Temporary Researcher" && (missing.length > 0 || delayed.length > 0)) baseConf -= 0.10;
  const finalConf = Math.min(1.0, Math.max(0.10, baseConf));

  // Role Thresholds
  const roleThresholds: Record<string, { approvalCeiling: number; denialFloor: number; minConf: number }> = {
    Student: { approvalCeiling: 0.32, denialFloor: 0.72, minConf: 0.65 },
    Faculty: { approvalCeiling: 0.25, denialFloor: 0.65, minConf: 0.80 },
    Alumni: { approvalCeiling: 0.28, denialFloor: 0.68, minConf: 0.75 },
    "Temporary Researcher": { approvalCeiling: 0.20, denialFloor: 0.60, minConf: 0.85 },
  };

  const currentThresh = roleThresholds[req.role] || roleThresholds["Student"];
  const reasons: string[] = [];

  // Hard Rule Checks
  if (req.directory_status === "SUSPENDED") {
    return {
      request_id: req.request_id,
      user_id: req.user_id,
      role: req.role,
      decision: "DENY",
      risk_score: 0.98,
      confidence_score: 0.95,
      reason_codes: ["HARD_BLOCK_DIRECTORY_ACCOUNT_SUSPENDED"],
      evidence_used: ["directory_status"],
      evidence_missing: missing,
      evidence_delayed: delayed,
      signals_breakdown: signalMap,
      recommended_action: "Immediate security block: Account is suspended in Active Directory. Contact SecOps.",
      policy_version: "2.4.0",
      engine_type: "proposed_risk_engine",
    };
  }

  if ((req.recovery_velocity || 0) >= 4) {
    return {
      request_id: req.request_id,
      user_id: req.user_id,
      role: req.role,
      decision: "DENY",
      risk_score: 0.92,
      confidence_score: 0.90,
      reason_codes: ["HARD_BLOCK_EXCESSIVE_RECOVERY_VELOCITY"],
      evidence_used: available,
      evidence_missing: missing,
      evidence_delayed: delayed,
      signals_breakdown: signalMap,
      recommended_action: "Security alert: 4+ recovery attempts within rolling 48h window. Lock reset pipeline.",
      policy_version: "2.4.0",
      engine_type: "proposed_risk_engine",
    };
  }

  if (req.ip_risk_score >= 0.90 && !req.device_known) {
    return {
      request_id: req.request_id,
      user_id: req.user_id,
      role: req.role,
      decision: "DENY",
      risk_score: 0.95,
      confidence_score: 0.90,
      reason_codes: ["HARD_BLOCK_TOR_PROXY_WITH_UNRECOGNIZED_DEVICE"],
      evidence_used: available,
      evidence_missing: missing,
      evidence_delayed: delayed,
      signals_breakdown: signalMap,
      recommended_action: "High risk network detected on unknown hardware. Automated reset barred.",
      policy_version: "2.4.0",
      engine_type: "proposed_risk_engine",
    };
  }

  // Reason Explanations
  if (req.device_known) reasons.push("KNOWN_RECOGNIZED_DEVICE");
  else reasons.push("UNRECOGNIZED_DEVICE_REGISTERED");

  if (idRisk < 0.25) reasons.push("HIGH_FIDELITY_IDENTITY_EVIDENCE");
  else if (idRisk > 0.65) reasons.push("WEAK_OR_MISSING_IDENTITY_EVIDENCE");

  if (netRisk > 0.65) reasons.push("ELEVATED_NETWORK_ANOMALY");
  for (const m of missing) reasons.push(`TELEMETRY_SOURCE_UNAVAILABLE_${m.toUpperCase()}`);
  for (const d of delayed) reasons.push(`TELEMETRY_SOURCE_DELAYED_${d.toUpperCase()}`);
  for (const c of conflicts) reasons.push(`CONFLICTING_TELEMETRY_${c}`);

  // Decision
  const hasCriticalMissing = missing.includes("device") || missing.includes("identity");
  let decision: "APPROVE" | "MANUAL_REVIEW" | "DENY" = "MANUAL_REVIEW";
  let action = "";

  if (finalRisk <= currentThresh.approvalCeiling && finalConf >= currentThresh.minConf && !hasCriticalMissing) {
    decision = "APPROVE";
    reasons.unshift(`LOW_RISK_CONFIRMED_FOR_ROLE_${req.role.toUpperCase()}`);
    action = `Issue automated time-bound password reset token directly to registered backup email/SMS for ${req.role}.`;
  } else if (finalRisk >= currentThresh.denialFloor) {
    decision = "DENY";
    reasons.unshift(`HIGH_RISK_THRESHOLD_EXCEEDED_FOR_ROLE_${req.role.toUpperCase()}`);
    action = `Reject recovery request. Log high-risk incident on account ${req.user_id} and alert user.`;
  } else {
    decision = "MANUAL_REVIEW";
    if (hasCriticalMissing) {
      reasons.unshift(`CRITICAL_TELEMETRY_MISSING_REQUIRES_MANUAL_REVIEW (${missing.join(", ")})`);
    } else if (finalConf < currentThresh.minConf) {
      reasons.unshift(`CONFIDENCE_DEFICIT_TRIGGERED_MANUAL_REVIEW (Confidence ${finalConf.toFixed(2)} < ${currentThresh.minConf.toFixed(2)})`);
    } else {
      reasons.unshift(`AMBIGUOUS_RISK_SCORE_REQUIRES_OPERATOR_REVIEW (Risk ${finalRisk.toFixed(2)})`);
    }
    action = `Escalate to university help desk specialist. Review primary identity documentation and verify secondary contact before authorizing override for ${req.role}.`;
  }

  return {
    request_id: req.request_id,
    user_id: req.user_id,
    role: req.role,
    decision,
    risk_score: Number(finalRisk.toFixed(3)),
    confidence_score: Number(finalConf.toFixed(3)),
    reason_codes: reasons,
    evidence_used: available,
    evidence_missing: missing,
    evidence_delayed: delayed,
    signals_breakdown: {
      identity_evidence: Number(idRisk.toFixed(3)),
      device_trust: Number(devRisk.toFixed(3)),
      ip_risk: Number(netRisk.toFixed(3)),
      geo_consistency: Number(geoRisk.toFixed(3)),
      login_history: Number(loginRisk.toFixed(3)),
      directory_risk: Number(dirRisk.toFixed(3)),
      mfa_history: Number(mfaRisk.toFixed(3)),
      recovery_velocity: Number(veloRisk.toFixed(3)),
    },
    recommended_action: action,
    policy_version: "2.4.0",
    engine_type: "proposed_risk_engine",
  };
}
