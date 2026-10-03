// server/index.ts
import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// shared/risk-service.ts
function evaluateBaseline(req) {
  const missing = [];
  if (!req.identity_evidence_available || req.source_missing === "identity") missing.push("identity");
  if (req.source_missing === "device") missing.push("device");
  if (req.directory_status === "SUSPENDED") {
    return {
      request_id: req.request_id,
      user_id: req.user_id,
      role: req.role,
      decision: "DENY",
      risk_score: 0.95,
      confidence_score: 0.9,
      reason_codes: ["BASELINE_ACCOUNT_SUSPENDED"],
      evidence_used: ["directory_status"],
      evidence_missing: missing,
      evidence_delayed: [],
      signals_breakdown: { identity_score: req.identity_evidence_score || 0, device_known: req.device_known ? 1 : 0 },
      recommended_action: "Block account recovery immediately due to directory suspension",
      policy_version: "baseline-1.0",
      engine_type: "baseline"
    };
  }
  const identityScore = req.identity_evidence_available ? req.identity_evidence_score || 0 : 0;
  const isApproved = identityScore >= 0.8 && req.device_known;
  const isDenied = identityScore < 0.35 && !req.device_known;
  let decision = "MANUAL_REVIEW";
  let riskScore = 0.55;
  let confScore = 0.6;
  const reasons = [];
  let action = "Escalate to help-desk technician for manual credential and ID check";
  if (isApproved) {
    decision = "APPROVE";
    riskScore = Math.max(0.1, 1 - identityScore);
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
    if (identityScore < 0.8) reasons.push("BASELINE_IDENTITY_SCORE_BELOW_THRESHOLD_0.80");
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
    engine_type: "baseline"
  };
}
function evaluateProposed(req, customWeights) {
  const available = [];
  const missing = [];
  const delayed = [];
  const conflicts = [];
  const isDevMissing = req.source_missing === "device" || req.device_trust_score === 0 && !req.device_known;
  let devRisk = 0.6;
  let devConf = 0.3;
  if (isDevMissing) {
    missing.push("device");
  } else {
    available.push("device");
    const baseDevRisk = 1 - req.device_trust_score;
    devRisk = req.device_known ? baseDevRisk : Math.max(0.5, baseDevRisk + 0.25);
    devConf = 0.9;
  }
  if (req.source_delayed === "device_intelligence") {
    delayed.push("device_intelligence");
    devConf = Math.max(0.4, devConf - 0.25);
  }
  const isIdMissing = !req.identity_evidence_available || req.source_missing === "identity";
  let idRisk = 0.8;
  let idConf = 0.2;
  if (isIdMissing) {
    missing.push("identity");
  } else {
    available.push("identity");
    idRisk = Math.max(0, 1 - req.identity_evidence_score);
    idConf = 0.95;
  }
  if (req.source_delayed === "identity" || req.evidence_delay) {
    delayed.push("identity");
    idConf = Math.max(0.35, idConf - 0.3);
  }
  let netRisk = req.ip_risk_score;
  available.push("network");
  const geoRisk = Math.max(0, 1 - req.geo_consistency);
  const loginRisk = Math.max(0, 1 - req.login_history_consistency);
  available.push("geo", "login_history");
  const dirMap = { ACTIVE: 0.05, LEAVE: 0.4, PENDING_REVIEW: 0.65, SUSPENDED: 1 };
  const dirRisk = dirMap[req.directory_status] || 0.5;
  available.push("directory");
  if (req.source_delayed === "directory") delayed.push("directory");
  const mfaMap = { ACTIVE_HEALTHY: 0.1, RECENTLY_RESET: 0.45, FAILED_RECENTLY: 0.7, DISABLED: 0.85 };
  const mfaRisk = mfaMap[req.mfa_history] || 0.5;
  available.push("mfa_history");
  const veloRisk = Math.min(1, (req.recovery_velocity || 0) * 0.25);
  available.push("velocity");
  if (req.device_trust_score > 0.75 && req.ip_risk_score > 0.7) conflicts.push("TRUSTED_DEVICE_WITH_HOSTILE_NETWORK");
  if (req.identity_evidence_score > 0.8 && req.recovery_velocity >= 3) conflicts.push("VALID_IDENTITY_WITH_ABNORMAL_VELOCITY");
  if (req.device_known && req.geo_consistency < 0.25) conflicts.push("KNOWN_DEVICE_FROM_IMPOSSIBLE_LOCATION");
  const weights = {
    identity_evidence: 0.3,
    device_trust: 0.2,
    ip_risk: 0.15,
    geo_consistency: 0.12,
    login_history: 0.1,
    mfa_history: 0.08,
    recovery_velocity: 0.05,
    ...customWeights || {}
  };
  if (req.role === "Alumni") {
    weights.identity_evidence += 0.1;
    weights.device_trust = Math.max(0.1, weights.device_trust - 0.05);
  }
  const signalMap = {
    identity_evidence: idRisk,
    device_trust: devRisk,
    ip_risk: netRisk,
    geo_consistency: geoRisk,
    login_history: loginRisk,
    mfa_history: mfaRisk,
    recovery_velocity: veloRisk
  };
  let totalW = 0;
  let sumW = 0;
  for (const k of Object.keys(weights)) {
    if (signalMap[k] !== void 0) {
      sumW += signalMap[k] * weights[k];
      totalW += weights[k];
    }
  }
  let baseRisk = totalW > 0 ? sumW / totalW : 0.5;
  let riskPenalty = 0;
  if (missing.includes("device")) riskPenalty += 0.1;
  if (missing.includes("identity")) riskPenalty += 0.25;
  if (missing.includes("directory")) riskPenalty += 0.15;
  if (req.role === "Faculty" && devRisk > 0.5) riskPenalty += 0.08;
  if (conflicts.length > 0) riskPenalty += 0.12 * conflicts.length;
  const finalRisk = Math.min(1, Math.max(0, baseRisk + riskPenalty));
  let baseConf = 1;
  if (missing.includes("device")) baseConf -= 0.2;
  if (missing.includes("identity")) baseConf -= 0.35;
  if (missing.includes("directory")) baseConf -= 0.15;
  if (delayed.includes("identity")) baseConf -= 0.22;
  if (delayed.includes("directory")) baseConf -= 0.1;
  if (delayed.includes("device_intelligence")) baseConf -= 0.1;
  if (conflicts.length > 0) baseConf -= 0.2 * conflicts.length;
  if (req.role === "Temporary Researcher" && (missing.length > 0 || delayed.length > 0)) baseConf -= 0.1;
  const finalConf = Math.min(1, Math.max(0.1, baseConf));
  const roleThresholds = {
    Student: { approvalCeiling: 0.32, denialFloor: 0.72, minConf: 0.65 },
    Faculty: { approvalCeiling: 0.25, denialFloor: 0.65, minConf: 0.8 },
    Alumni: { approvalCeiling: 0.28, denialFloor: 0.68, minConf: 0.75 },
    "Temporary Researcher": { approvalCeiling: 0.2, denialFloor: 0.6, minConf: 0.85 }
  };
  const currentThresh = roleThresholds[req.role] || roleThresholds["Student"];
  const reasons = [];
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
      engine_type: "proposed_risk_engine"
    };
  }
  if ((req.recovery_velocity || 0) >= 4) {
    return {
      request_id: req.request_id,
      user_id: req.user_id,
      role: req.role,
      decision: "DENY",
      risk_score: 0.92,
      confidence_score: 0.9,
      reason_codes: ["HARD_BLOCK_EXCESSIVE_RECOVERY_VELOCITY"],
      evidence_used: available,
      evidence_missing: missing,
      evidence_delayed: delayed,
      signals_breakdown: signalMap,
      recommended_action: "Security alert: 4+ recovery attempts within rolling 48h window. Lock reset pipeline.",
      policy_version: "2.4.0",
      engine_type: "proposed_risk_engine"
    };
  }
  if (req.ip_risk_score >= 0.9 && !req.device_known) {
    return {
      request_id: req.request_id,
      user_id: req.user_id,
      role: req.role,
      decision: "DENY",
      risk_score: 0.95,
      confidence_score: 0.9,
      reason_codes: ["HARD_BLOCK_TOR_PROXY_WITH_UNRECOGNIZED_DEVICE"],
      evidence_used: available,
      evidence_missing: missing,
      evidence_delayed: delayed,
      signals_breakdown: signalMap,
      recommended_action: "High risk network detected on unknown hardware. Automated reset barred.",
      policy_version: "2.4.0",
      engine_type: "proposed_risk_engine"
    };
  }
  if (req.device_known) reasons.push("KNOWN_RECOGNIZED_DEVICE");
  else reasons.push("UNRECOGNIZED_DEVICE_REGISTERED");
  if (idRisk < 0.25) reasons.push("HIGH_FIDELITY_IDENTITY_EVIDENCE");
  else if (idRisk > 0.65) reasons.push("WEAK_OR_MISSING_IDENTITY_EVIDENCE");
  if (netRisk > 0.65) reasons.push("ELEVATED_NETWORK_ANOMALY");
  for (const m of missing) reasons.push(`TELEMETRY_SOURCE_UNAVAILABLE_${m.toUpperCase()}`);
  for (const d of delayed) reasons.push(`TELEMETRY_SOURCE_DELAYED_${d.toUpperCase()}`);
  for (const c of conflicts) reasons.push(`CONFLICTING_TELEMETRY_${c}`);
  const hasCriticalMissing = missing.includes("device") || missing.includes("identity");
  let decision = "MANUAL_REVIEW";
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
      recovery_velocity: Number(veloRisk.toFixed(3))
    },
    recommended_action: action,
    policy_version: "2.4.0",
    engine_type: "proposed_risk_engine"
  };
}

// shared/failure-scenarios.ts
var FAILURE_SCENARIOS = [
  {
    id: "scen-1",
    name: "Scenario 1: Missing Device Data",
    tag: "Ablation / Missing Data",
    summary: "User lost their smartphone over the weekend; device fingerprint and hardware trust are entirely absent.",
    expectedOutcome: "MANUAL_REVIEW",
    request: {
      request_id: "req-scen-01",
      user_id: "u104829",
      role: "Student",
      recovery_reason: "lost_device",
      device_id: "",
      device_known: false,
      device_trust_score: 0,
      device_change: true,
      ip_risk_score: 0.12,
      geo_consistency: 0.92,
      login_history_consistency: 0.85,
      identity_evidence_available: true,
      identity_evidence_score: 0.88,
      directory_status: "ACTIVE",
      mfa_history: "ACTIVE_HEALTHY",
      recovery_velocity: 0,
      source_missing: "device",
      ground_truth: "LEGITIMATE",
      expected_decision: "MANUAL_REVIEW"
    }
  },
  {
    id: "scen-2",
    name: "Scenario 2: Delayed Identity & Directory Sync",
    tag: "Latency / Delayed Data",
    summary: "Faculty member reset phone while travel verification / LDAP sync is delayed in ingestion queues.",
    expectedOutcome: "MANUAL_REVIEW",
    request: {
      request_id: "req-scen-02",
      user_id: "f302914",
      role: "Faculty",
      recovery_reason: "mfa_phone_replaced",
      device_id: "dev_macbook_faculty",
      device_known: true,
      device_trust_score: 0.9,
      device_change: false,
      ip_risk_score: 0.15,
      geo_consistency: 0.85,
      login_history_consistency: 0.8,
      identity_evidence_available: true,
      identity_evidence_score: 0.85,
      directory_status: "ACTIVE",
      mfa_history: "RECENTLY_RESET",
      recovery_velocity: 1,
      evidence_delay: true,
      source_delayed: "identity",
      ground_truth: "LEGITIMATE",
      expected_decision: "MANUAL_REVIEW"
    }
  },
  {
    id: "scen-3",
    name: "Scenario 3: Credential Stuffing & Bot Takeover",
    tag: "Adversarial Attack",
    summary: "Attacker using residential proxy / Tor node with breached credentials and elevated recovery velocity.",
    expectedOutcome: "DENY",
    request: {
      request_id: "req-scen-03",
      user_id: "u902183",
      role: "Student",
      recovery_reason: "forgot_password",
      device_id: "dev_bot_headless",
      device_known: false,
      device_trust_score: 0.1,
      device_change: true,
      ip_risk_score: 0.94,
      geo_consistency: 0.08,
      login_history_consistency: 0.05,
      identity_evidence_available: false,
      identity_evidence_score: 0,
      directory_status: "ACTIVE",
      mfa_history: "FAILED_RECENTLY",
      recovery_velocity: 4,
      fraud_scenario: "credential_stuffing",
      ground_truth: "FRAUD",
      expected_decision: "DENY"
    }
  },
  {
    id: "scen-4",
    name: "Scenario 4: Conflicting Telemetry (Trusted Device, Tor IP)",
    tag: "Session Hijack / Conflict",
    summary: "Known laptop fingerprint paired with a hostile foreign VPN / Tor exit node and anomalous location.",
    expectedOutcome: "MANUAL_REVIEW",
    request: {
      request_id: "req-scen-04",
      user_id: "u550192",
      role: "Student",
      recovery_reason: "locked_out_traveling",
      device_id: "dev_known_student_dell",
      device_known: true,
      device_trust_score: 0.95,
      device_change: false,
      ip_risk_score: 0.88,
      geo_consistency: 0.15,
      login_history_consistency: 0.4,
      identity_evidence_available: true,
      identity_evidence_score: 0.8,
      directory_status: "ACTIVE",
      mfa_history: "ACTIVE_HEALTHY",
      recovery_velocity: 1,
      fraud_scenario: "none",
      ground_truth: "FRAUD",
      expected_decision: "MANUAL_REVIEW"
    }
  },
  {
    id: "scen-5",
    name: "Scenario 5: High Recovery Velocity (Reset Bombardment)",
    tag: "Brute Force / Velocity",
    summary: "Multiple consecutive recovery attempts within minutes, triggering automated denial circuits.",
    expectedOutcome: "DENY",
    request: {
      request_id: "req-scen-05",
      user_id: "f882103",
      role: "Faculty",
      recovery_reason: "session_expired_urgent",
      device_id: "dev_unknown_browser",
      device_known: false,
      device_trust_score: 0.45,
      device_change: true,
      ip_risk_score: 0.55,
      geo_consistency: 0.6,
      login_history_consistency: 0.5,
      identity_evidence_available: true,
      identity_evidence_score: 0.7,
      directory_status: "ACTIVE",
      mfa_history: "FAILED_RECENTLY",
      recovery_velocity: 5,
      fraud_scenario: "social_engineering",
      ground_truth: "FRAUD",
      expected_decision: "DENY"
    }
  },
  {
    id: "scen-6",
    name: "Scenario 6: Multiple Telemetry Sources Unavailable",
    tag: "Degraded Telemetry",
    summary: "Temporary researcher requesting access with zero device history and unsubmitted identity documents.",
    expectedOutcome: "DENY",
    request: {
      request_id: "req-scen-06",
      user_id: "r110482",
      role: "Temporary Researcher",
      recovery_reason: "forgot_password",
      device_id: "",
      device_known: false,
      device_trust_score: 0,
      device_change: true,
      ip_risk_score: 0.35,
      geo_consistency: 0.5,
      login_history_consistency: 0.2,
      identity_evidence_available: false,
      identity_evidence_score: 0,
      directory_status: "PENDING_REVIEW",
      mfa_history: "DISABLED",
      recovery_velocity: 1,
      source_missing: "multiple",
      ground_truth: "FRAUD",
      expected_decision: "DENY"
    }
  },
  {
    id: "scen-7",
    name: "Scenario 7: Suspended Directory Account",
    tag: "Insider Threat / Suspension",
    summary: "Student or employee with administrative disciplinary suspension attempting credential override.",
    expectedOutcome: "DENY",
    request: {
      request_id: "req-scen-07",
      user_id: "u330192",
      role: "Student",
      recovery_reason: "forgot_password",
      device_id: "dev_dorm_desktop",
      device_known: true,
      device_trust_score: 0.9,
      device_change: false,
      ip_risk_score: 0.1,
      geo_consistency: 0.95,
      login_history_consistency: 0.9,
      identity_evidence_available: true,
      identity_evidence_score: 0.95,
      directory_status: "SUSPENDED",
      mfa_history: "DISABLED",
      recovery_velocity: 0,
      fraud_scenario: "insider_threat",
      ground_truth: "FRAUD",
      expected_decision: "DENY"
    }
  }
];

// server/index.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var PROJECT_ROOT = path.resolve(__dirname, "..");
async function startServer() {
  const app = express();
  const server = createServer(app);
  app.use(express.json());
  app.get("/api/health", (_req, res) => {
    res.json({ status: "healthy", timestamp: (/* @__PURE__ */ new Date()).toISOString(), service: "risk-verification-engine" });
  });
  app.get("/api/requests", (_req, res) => {
    try {
      const samplePath = path.join(PROJECT_ROOT, "data", "synthetic", "sample_requests.json");
      if (fs.existsSync(samplePath)) {
        const raw = fs.readFileSync(samplePath, "utf-8");
        return res.json(JSON.parse(raw));
      }
    } catch (e) {
      console.error("Error reading sample requests:", e);
    }
    res.json(FAILURE_SCENARIOS.map((s) => s.request));
  });
  app.post("/api/evaluate", (req, res) => {
    try {
      const body = req.body;
      if (!body.request) {
        return res.status(400).json({ error: "Missing request in request body" });
      }
      const evaluation = evaluateProposed(body.request, body.customWeights);
      res.json(evaluation);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/baseline", (req, res) => {
    try {
      const body = req.body;
      if (!body.request) {
        return res.status(400).json({ error: "Missing request in request body" });
      }
      const evaluation = evaluateBaseline(body.request);
      res.json(evaluation);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/scenarios", (_req, res) => {
    res.json(FAILURE_SCENARIOS);
  });
  app.get("/api/metrics", (_req, res) => {
    try {
      const summaryPath = path.join(PROJECT_ROOT, "docs", "results", "experiment_summary.json");
      if (fs.existsSync(summaryPath)) {
        const raw = fs.readFileSync(summaryPath, "utf-8");
        return res.json(JSON.parse(raw));
      }
    } catch (err) {
      console.error("Error reading metrics summary:", err);
    }
    res.status(404).json({ error: "Experiment summary not found. Run python scripts/run_experiment.py first." });
  });
  app.get("/api/rules", (_req, res) => {
    try {
      const rulesPath = path.join(PROJECT_ROOT, "src", "config", "risk_rules.json");
      if (fs.existsSync(rulesPath)) {
        const raw = fs.readFileSync(rulesPath, "utf-8");
        return res.json(JSON.parse(raw));
      }
    } catch (err) {
      console.error("Error reading rules:", err);
    }
    res.status(500).json({ error: "Failed to read risk rules" });
  });
  app.post("/api/rules", (req, res) => {
    try {
      const rulesPath = path.join(PROJECT_ROOT, "src", "config", "risk_rules.json");
      fs.writeFileSync(rulesPath, JSON.stringify(req.body, null, 2), "utf-8");
      res.json({ success: true, message: "Rules updated successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  const auditLogs = [];
  app.post("/api/audit", (req, res) => {
    const entry = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ...req.body
    };
    auditLogs.push(entry);
    res.json({ success: true, log_id: `audit_${auditLogs.length}`, entry });
  });
  app.get("/api/audit", (_req, res) => {
    res.json(auditLogs);
  });
  const staticPath = process.env.NODE_ENV === "production" ? path.resolve(__dirname, "public") : path.resolve(__dirname, "..", "dist", "public");
  app.use(express.static(staticPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });
  const port = process.env.PORT || 3e3;
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);
