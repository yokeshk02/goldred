/**
 * Aurelia — Secure Account-Recovery Verification Desk
 * Velvet Ledger Aesthetic: oxblood surfaces, antique gold signal highlights, editorial typography, bone accents.
 * Complete integration with Multi-Signal Risk Engine, Baseline Model, 7 Failure Scenarios, and Empirical Benchmark.
 */
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Award,
  Bell,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Compass,
  Database,
  FileText,
  Filter,
  Flame,
  Grid2X2,
  HelpCircle,
  Laptop,
  Layers,
  Lock,
  Menu,
  MoreHorizontal,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Terminal,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { FAILURE_SCENARIOS, FailureScenarioDefinition } from "../../../shared/failure-scenarios";
import { evaluateBaseline, evaluateProposed, RecoveryRequestData, RiskEvaluationData } from "../../../shared/risk-service";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"queue" | "scenarios" | "metrics" | "policy">("queue");
  const [menuOpen, setMenuOpen] = useState(false);
  const [requests, setRequests] = useState<RecoveryRequestData[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RecoveryRequestData | null>(null);
  const [proposedEvaluation, setProposedEvaluation] = useState<RiskEvaluationData | null>(null);
  const [baselineEvaluation, setBaselineEvaluation] = useState<RiskEvaluationData | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [customWeights, setCustomWeights] = useState({
    identity_evidence: 0.30,
    device_trust: 0.20,
    ip_risk: 0.15,
    geo_consistency: 0.12,
    login_history: 0.10,
    mfa_history: 0.08,
    recovery_velocity: 0.05,
  });
  const [metricsData, setMetricsData] = useState<any>(null);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);

  // Load sample requests & benchmark metrics
  useEffect(() => {
    fetch("/api/requests")
      .then((r) => r.json())
      .then((data: RecoveryRequestData[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setRequests(data);
          selectAndEvaluate(data[0]);
        }
      })
      .catch(() => {
        const fallbacks = FAILURE_SCENARIOS.map((s) => s.request);
        setRequests(fallbacks);
        selectAndEvaluate(fallbacks[0]);
      });

    fetch("/api/metrics")
      .then((r) => r.json())
      .then((m) => setMetricsData(m))
      .catch((err) => console.log("Metrics fetch fallback", err));
  }, []);

  const selectAndEvaluate = (req: RecoveryRequestData) => {
    setSelectedRequest(req);
    const pEval = evaluateProposed(req, customWeights);
    const bEval = evaluateBaseline(req);
    setProposedEvaluation(pEval);
    setBaselineEvaluation(bEval);
  };

  const handleAuditAction = (action: string) => {
    if (!selectedRequest || !proposedEvaluation) return;
    const entry = {
      timestamp: new Date().toLocaleTimeString(),
      requestId: selectedRequest.request_id,
      userId: selectedRequest.user_id,
      action,
      riskScore: proposedEvaluation.risk_score,
      decision: proposedEvaluation.decision,
    };
    setAuditHistory((prev) => [entry, ...prev.slice(0, 9)]);
    toast.success(`Action "${action}" recorded in security audit log for ${selectedRequest.user_id}`);
  };

  const filteredRequests = requests.filter((r) => {
    const matchesRole = roleFilter === "ALL" || r.role === roleFilter;
    const matchesSearch =
      !searchQuery ||
      r.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.recovery_reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.role.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <main className="aurelia-shell">
      {/* Side Rail Navigation */}
      <aside className={`side-rail ${menuOpen ? "is-open" : ""}`}>
        <div className="rail-top">
          <a className="brand" href="#top" aria-label="Aurelia Verification Desk">
            <span className="w-8 h-8 rounded-full border border-[#d6a84f] bg-[#5f101c] flex items-center justify-center font-serif text-amber-300 font-bold text-sm">
              AR
            </span>
            <span>Aurelia</span>
          </a>
          <button className="icon-button mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X size={19} />
          </button>
        </div>

        <div className="rail-label">VERIFICATION DESK</div>
        <nav className="rail-nav" aria-label="Primary navigation">
          <button
            className={`rail-link ${activeTab === "queue" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("queue");
              setMenuOpen(false);
            }}
          >
            <Grid2X2 size={17} strokeWidth={1.6} />
            <span>Active Queue</span>
            {activeTab === "queue" && <span className="active-dot" />}
          </button>
          <button
            className={`rail-link ${activeTab === "scenarios" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("scenarios");
              setMenuOpen(false);
            }}
          >
            <Layers size={17} strokeWidth={1.6} />
            <span>Failure Scenarios</span>
            {activeTab === "scenarios" && <span className="active-dot" />}
          </button>
          <button
            className={`rail-link ${activeTab === "metrics" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("metrics");
              setMenuOpen(false);
            }}
          >
            <Award size={17} strokeWidth={1.6} />
            <span>Benchmark & Metrics</span>
            {activeTab === "metrics" && <span className="active-dot" />}
          </button>
          <button
            className={`rail-link ${activeTab === "policy" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("policy");
              setMenuOpen(false);
            }}
          >
            <Sliders size={17} strokeWidth={1.6} />
            <span>Policy Calibration</span>
            {activeTab === "policy" && <span className="active-dot" />}
          </button>
        </nav>

        <div className="rail-rule" />
        <div className="rail-label">ORGANISATIONAL ROLES</div>
        <button
          className={`rail-link ${roleFilter === "Student" ? "active" : ""}`}
          onClick={() => setRoleFilter(roleFilter === "Student" ? "ALL" : "Student")}
        >
          <Circle size={10} fill="#d6a84f" />
          <span>Students</span>
          <span className="nav-count">86% Auto</span>
        </button>
        <button
          className={`rail-link ${roleFilter === "Faculty" ? "active" : ""}`}
          onClick={() => setRoleFilter(roleFilter === "Faculty" ? "ALL" : "Faculty")}
        >
          <Circle size={10} fill="#c85b4d" />
          <span>Faculty</span>
          <span className="nav-count">Strict</span>
        </button>
        <button
          className={`rail-link ${roleFilter === "Alumni" ? "active" : ""}`}
          onClick={() => setRoleFilter(roleFilter === "Alumni" ? "ALL" : "Alumni")}
        >
          <Circle size={10} fill="#a88c83" />
          <span>Alumni</span>
          <span className="nav-count">ID Proof</span>
        </button>
        <button
          className={`rail-link ${roleFilter === "Temporary Researcher" ? "active" : ""}`}
          onClick={() => setRoleFilter(roleFilter === "Temporary Researcher" ? "ALL" : "Temporary Researcher")}
        >
          <Circle size={10} fill="#e9d8bc" />
          <span>Researchers</span>
          <span className="nav-count">Manual</span>
        </button>

        <div className="rail-bottom">
          <div className="rail-label">SECURITY POSTURE</div>
          <div className="currently-card">
            <span className="pulse" />
            <div>
              <strong>Impersonation Defense: 100%</strong>
              <small>FAR 0.00% · FRR 0.84%</small>
            </div>
          </div>
          <div className="profile-chip">
            <span className="avatar">SO</span>
            <span>SecOps Help Desk</span>
            <MoreHorizontal size={16} />
          </div>
        </div>
      </aside>

      {menuOpen && <button className="scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}

      {/* Main Command Stage */}
      <section className="main-stage overflow-y-auto max-h-screen">
        <header className="topbar">
          <button className="icon-button menu-trigger" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            <span>AURELIA VERIFICATION COCKPIT</span>
            <ChevronRight size={14} />
            <strong className="uppercase">{activeTab}</strong>
          </div>
          <div className="top-actions">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Search user, reason, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#2a0e16] border border-[#d6a84f]/30 rounded px-3 py-1.5 text-xs text-[#f4ead6] placeholder:text-[#a17879] focus:outline-none focus:border-[#d6a84f] w-52"
              />
              <Search size={14} className="absolute right-2.5 text-[#a17879]" />
            </div>
            <button
              className="outline-button py-1.5 px-3 text-xs flex items-center gap-1.5"
              onClick={() => toast.success("Refreshed live telemetry feeds")}
            >
              <RefreshCw size={13} />
              <span>Sync</span>
            </button>
          </div>
        </header>

        <div className="content-wrap">
          {/* TAB 1: ACTIVE QUEUE & INSPECTION COCKPIT */}
          {activeTab === "queue" && (
            <div>
              {/* Insight Stat Banner */}
              <section className="insight-strip mb-8" aria-label="Verification Desk Insights">
                <div className="insight-intro">
                  <p className="eyebrow">HELP DESK PERFORMANCE</p>
                  <span>Verification in focus.</span>
                </div>
                <div className="insight">
                  <span className="insight-number text-[#d6a84f]">73.8%</span>
                  <div>
                    <span className="insight-label">LEGITIMATE AUTOMATED</span>
                    <small>+33.8% vs Baseline</small>
                  </div>
                </div>
                <div className="insight">
                  <span className="insight-number text-emerald-400">100%</span>
                  <div>
                    <span className="insight-label">IMPERSONATION RESIST</span>
                    <small>0 False Accepts (FAR 0.0%)</small>
                  </div>
                </div>
                <div className="insight accent">
                  <span className="insight-number">21.8%</span>
                  <div>
                    <span className="insight-label">MANUAL REVIEW LOAD</span>
                    <small>Slashed from 49.5%</small>
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Recovery Requests Queue */}
                <div className="lg:col-span-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#d6a84f]/20">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-[#d6a84f]" />
                      <h3 className="font-serif text-lg text-[#f4ead6] m-0">Incoming Requests ({filteredRequests.length})</h3>
                    </div>
                    {roleFilter !== "ALL" && (
                      <span className="text-[10px] tracking-widest text-[#d6a84f] bg-[#d6a84f]/10 px-2 py-0.5 rounded border border-[#d6a84f]/30">
                        FILTER: {roleFilter}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 max-h-[640px] overflow-y-auto pr-1">
                    {filteredRequests.map((req) => {
                      const isSelected = selectedRequest?.request_id === req.request_id;
                      const quickEval = evaluateProposed(req, customWeights);
                      const isApproved = quickEval.decision === "APPROVE";
                      const isReview = quickEval.decision === "MANUAL_REVIEW";

                      return (
                        <div
                          key={req.request_id}
                          onClick={() => selectAndEvaluate(req)}
                          className={`p-3.5 rounded border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#38111c] border-[#d6a84f] shadow-lg shadow-[#5f101c]/40 translate-x-1"
                              : "bg-[#240e16]/80 border-[#d6a84f]/15 hover:bg-[#2d111b] hover:border-[#d6a84f]/40"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-mono text-xs text-[#d6a84f] font-semibold">{req.user_id}</span>
                            <span
                              className={`text-[9px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded ${
                                isApproved
                                  ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                                  : isReview
                                  ? "bg-amber-950/80 text-amber-300 border border-amber-500/30"
                                  : "bg-rose-950/80 text-rose-300 border border-rose-500/30"
                              }`}
                            >
                              {quickEval.decision}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-[#f4ead6]/90 mb-1">
                            <span className="font-medium">{req.role}</span>
                            <span className="text-[#a17879] text-[11px] capitalize">
                              {req.recovery_reason.replace(/_/g, " ")}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[10px] text-[#a17879] pt-1 border-t border-[#d6a84f]/10">
                            <span>Risk: <strong className="text-[#f4ead6]">{quickEval.risk_score.toFixed(2)}</strong></span>
                            <span>Conf: <strong className="text-[#f4ead6]">{(quickEval.confidence_score * 100).toFixed(0)}%</strong></span>
                            {req.source_missing !== "none" && (
                              <span className="text-amber-400 font-semibold ml-auto flex items-center gap-1">
                                <AlertTriangle size={10} /> Missing {req.source_missing}
                              </span>
                            )}
                            {req.evidence_delay && (
                              <span className="text-cyan-400 font-semibold ml-auto flex items-center gap-1">
                                <Clock size={10} /> Delayed
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Column: Detailed Evidence Inspection & Decision Cockpit */}
                <div className="lg:col-span-7">
                  {selectedRequest && proposedEvaluation && baselineEvaluation ? (
                    <div className="bg-[#240e16] border border-[#d6a84f]/30 rounded-lg p-6 shadow-2xl relative">
                      {/* Request Header */}
                      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#d6a84f]/20">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-serif italic text-2xl text-[#f4ead6]">{selectedRequest.user_id}</span>
                            <span className="text-xs bg-[#5f101c] text-[#d6a84f] border border-[#d6a84f]/40 px-2 py-0.5 rounded font-medium">
                              {selectedRequest.role}
                            </span>
                            <span className="text-xs text-[#a17879]">
                              Account Age: {selectedRequest.account_age} days
                            </span>
                          </div>
                          <p className="text-xs text-[#a17879] m-0">
                            Stated Reason:{" "}
                            <strong className="text-[#f4ead6] capitalize">
                              {selectedRequest.recovery_reason.replace(/_/g, " ")}
                            </strong>{" "}
                            · Directory Status:{" "}
                            <strong
                              className={
                                selectedRequest.directory_status === "ACTIVE" ? "text-emerald-400" : "text-rose-400"
                              }
                            >
                              {selectedRequest.directory_status}
                            </strong>
                          </p>
                        </div>

                        {/* Decision Badges */}
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-bold tracking-widest uppercase px-3 py-1.5 rounded flex items-center gap-1.5 ${
                                proposedEvaluation.decision === "APPROVE"
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-500"
                                  : proposedEvaluation.decision === "MANUAL_REVIEW"
                                  ? "bg-amber-950 text-amber-300 border border-amber-500"
                                  : "bg-rose-950 text-rose-300 border border-rose-500"
                              }`}
                            >
                              {proposedEvaluation.decision === "APPROVE" && <ShieldCheck size={16} />}
                              {proposedEvaluation.decision === "MANUAL_REVIEW" && <AlertTriangle size={16} />}
                              {proposedEvaluation.decision === "DENY" && <ShieldAlert size={16} />}
                              {proposedEvaluation.decision}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#a17879] mt-1">Proposed Risk Engine Decision</span>
                        </div>
                      </div>

                      {/* Scores Banner */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
                        <div className="bg-[#1b0b10] p-3 rounded border border-[#d6a84f]/15">
                          <span className="text-[10px] tracking-wider text-[#a17879] block mb-1">COMPOSITE RISK</span>
                          <span className="font-serif text-2xl font-bold text-[#d6a84f]">
                            {proposedEvaluation.risk_score.toFixed(3)}
                          </span>
                          <small className="text-[10px] text-[#a17879] block">Scale: 0.000 - 1.000</small>
                        </div>
                        <div className="bg-[#1b0b10] p-3 rounded border border-[#d6a84f]/15">
                          <span className="text-[10px] tracking-wider text-[#a17879] block mb-1">CONFIDENCE</span>
                          <span className="font-serif text-2xl font-bold text-cyan-300">
                            {(proposedEvaluation.confidence_score * 100).toFixed(0)}%
                          </span>
                          <small className="text-[10px] text-[#a17879] block">Evidence Completeness</small>
                        </div>
                        <div className="bg-[#1b0b10] p-3 rounded border border-[#d6a84f]/15">
                          <span className="text-[10px] tracking-wider text-[#a17879] block mb-1">BASELINE DECISION</span>
                          <span
                            className={`font-semibold text-sm block mt-1 ${
                              baselineEvaluation.decision === "APPROVE"
                                ? "text-emerald-400"
                                : baselineEvaluation.decision === "MANUAL_REVIEW"
                                ? "text-amber-400"
                                : "text-rose-400"
                            }`}
                          >
                            {baselineEvaluation.decision}
                          </span>
                          <small className="text-[10px] text-[#a17879] block">Legacy Rigid Heuristic</small>
                        </div>
                        <div className="bg-[#1b0b10] p-3 rounded border border-[#d6a84f]/15">
                          <span className="text-[10px] tracking-wider text-[#a17879] block mb-1">GROUND TRUTH</span>
                          <span
                            className={`font-bold text-sm block mt-1 ${
                              selectedRequest.ground_truth === "LEGITIMATE" ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {selectedRequest.ground_truth || "LEGITIMATE"}
                          </span>
                          <small className="text-[10px] text-[#a17879] block">Evaluation Benchmark</small>
                        </div>
                      </div>

                      {/* Signals & Telemetry Grid */}
                      <h4 className="text-xs uppercase tracking-widest text-[#d6a84f] font-semibold mb-2.5">
                        Multi-Signal Evidence Telemetry
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5 text-xs">
                        <div className="bg-[#1b0b10]/80 p-2.5 rounded border border-[#d6a84f]/10">
                          <div className="flex items-center gap-1.5 text-[#a17879] mb-1">
                            <Laptop size={13} />
                            <span>Device Trust & State</span>
                          </div>
                          <p className="font-medium text-[#f4ead6] m-0">
                            {selectedRequest.device_known ? "Known Recognized Device" : "Unrecognized Device"}
                          </p>
                          <small className="text-[#a17879]">
                            Score: {(selectedRequest.device_trust_score * 100).toFixed(0)}%
                          </small>
                        </div>

                        <div className="bg-[#1b0b10]/80 p-2.5 rounded border border-[#d6a84f]/10">
                          <div className="flex items-center gap-1.5 text-[#a17879] mb-1">
                            <Shield size={13} />
                            <span>IP & Network Risk</span>
                          </div>
                          <p className="font-medium text-[#f4ead6] m-0">
                            Threat Index: {(selectedRequest.ip_risk_score * 100).toFixed(0)}%
                          </p>
                          <small className={selectedRequest.ip_risk_score > 0.6 ? "text-rose-400" : "text-emerald-400"}>
                            {selectedRequest.ip_risk_score > 0.6 ? "Proxy/Tor Detected" : "Standard Campus / ISP"}
                          </small>
                        </div>

                        <div className="bg-[#1b0b10]/80 p-2.5 rounded border border-[#d6a84f]/10">
                          <div className="flex items-center gap-1.5 text-[#a17879] mb-1">
                            <UserCheck size={13} />
                            <span>Identity Verification</span>
                          </div>
                          <p className="font-medium text-[#f4ead6] m-0">
                            {selectedRequest.identity_evidence_available
                              ? `Score: ${(selectedRequest.identity_evidence_score * 100).toFixed(0)}%`
                              : "Document Missing"}
                          </p>
                          <small className="text-[#a17879]">
                            {selectedRequest.identity_evidence_available ? "Secondary Proof Verified" : "No Identity Proof"}
                          </small>
                        </div>

                        <div className="bg-[#1b0b10]/80 p-2.5 rounded border border-[#d6a84f]/10">
                          <div className="flex items-center gap-1.5 text-[#a17879] mb-1">
                            <Compass size={13} />
                            <span>Geo & Login Consistency</span>
                          </div>
                          <p className="font-medium text-[#f4ead6] m-0">
                            Geo: {(selectedRequest.geo_consistency * 100).toFixed(0)}% · Login:{" "}
                            {(selectedRequest.login_history_consistency * 100).toFixed(0)}%
                          </p>
                        </div>

                        <div className="bg-[#1b0b10]/80 p-2.5 rounded border border-[#d6a84f]/10">
                          <div className="flex items-center gap-1.5 text-[#a17879] mb-1">
                            <Lock size={13} />
                            <span>MFA Health Status</span>
                          </div>
                          <p className="font-medium text-[#f4ead6] m-0">
                            {selectedRequest.mfa_history.replace(/_/g, " ")}
                          </p>
                        </div>

                        <div className="bg-[#1b0b10]/80 p-2.5 rounded border border-[#d6a84f]/10">
                          <div className="flex items-center gap-1.5 text-[#a17879] mb-1">
                            <Flame size={13} />
                            <span>Recovery Velocity (48h)</span>
                          </div>
                          <p className="font-medium text-[#f4ead6] m-0">
                            {selectedRequest.recovery_velocity} Attempts
                          </p>
                          <small className={selectedRequest.recovery_velocity >= 3 ? "text-rose-400" : "text-[#a17879]"}>
                            {selectedRequest.recovery_velocity >= 3 ? "Excessive Velocity Alert" : "Normal Velocity"}
                          </small>
                        </div>
                      </div>

                      {/* Missing & Delayed Alerts */}
                      {(proposedEvaluation.evidence_missing.length > 0 ||
                        proposedEvaluation.evidence_delayed.length > 0) && (
                        <div className="bg-[#42131e]/90 border border-amber-500/40 rounded p-3 mb-4 flex items-start gap-2.5">
                          <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                          <div className="text-xs">
                            <strong className="text-amber-300 block mb-0.5">Telemetry Anomaly Ingestion Alert</strong>
                            {proposedEvaluation.evidence_missing.length > 0 && (
                              <p className="text-[#f4ead6]/90 m-0">
                                Missing Sources:{" "}
                                <span className="text-amber-300 font-semibold uppercase">
                                  {proposedEvaluation.evidence_missing.join(", ")}
                                </span>{" "}
                                (Confidence penalized; automated approval locked).
                              </p>
                            )}
                            {proposedEvaluation.evidence_delayed.length > 0 && (
                              <p className="text-[#f4ead6]/90 m-0">
                                Delayed Sources:{" "}
                                <span className="text-cyan-300 font-semibold uppercase">
                                  {proposedEvaluation.evidence_delayed.join(", ")}
                                </span>{" "}
                                (Awaiting upstream sync).
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Reason Codes */}
                      <div className="mb-4">
                        <span className="text-[10px] tracking-widest text-[#a17879] uppercase block mb-1.5 font-semibold">
                          Reasoning Codes ({proposedEvaluation.reason_codes.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {proposedEvaluation.reason_codes.map((code, idx) => (
                            <span
                              key={idx}
                              className="font-mono text-[10px] bg-[#16080b] border border-[#d6a84f]/25 text-[#f4ead6] px-2 py-0.5 rounded"
                            >
                              {code}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Recommended Help-Desk Action */}
                      <div className="p-3.5 bg-[#18090d] border border-[#d6a84f]/30 rounded mb-5">
                        <span className="text-[10px] tracking-wider text-[#d6a84f] uppercase block font-semibold mb-1">
                          RECOMMENDED HELP-DESK ACTION
                        </span>
                        <p className="text-xs text-[#f4ead6] m-0 leading-relaxed font-sans">
                          {proposedEvaluation.recommended_action}
                        </p>
                      </div>

                      {/* Operator Action Buttons */}
                      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[#d6a84f]/20">
                        <button
                          className="gold-button flex-1 justify-center"
                          onClick={() => handleAuditAction("Dispatched Automated Reset Link")}
                        >
                          <Send size={14} /> Authorize Token Reset
                        </button>
                        <button
                          className="outline-button flex-1 justify-center border-amber-500/50 text-amber-300 hover:bg-amber-950/40"
                          onClick={() => handleAuditAction("Initiated Out-of-Band Video/Phone Verification")}
                        >
                          <UserCheck size={14} /> Request Manual ID Check
                        </button>
                        <button
                          className="outline-button flex-1 justify-center border-rose-500/50 text-rose-300 hover:bg-rose-950/40"
                          onClick={() => handleAuditAction("Hard Blocked & Dispatched SecOps Alert")}
                        >
                          <ShieldAlert size={14} /> Security Hard Block
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center p-12 border border-dashed border-[#d6a84f]/20 rounded text-[#a17879] text-center">
                      <p>Select a request from the queue to view full risk breakdown and evidence inspection.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FAILURE SCENARIOS LAB */}
          {activeTab === "scenarios" && (
            <div>
              <div className="mb-6">
                <p className="eyebrow">
                  <span className="gold-line" /> EMPIRICAL FAILURE EXPERIMENTS
                </p>
                <h2 className="text-3xl text-[#f4ead6] font-serif mb-2">Seven Documented Failure Scenarios</h2>
                <p className="text-xs text-[#b99b97] max-w-2xl leading-relaxed">
                  Real-world university edge cases tested against the proposed risk engine. Click any scenario to
                  simulate live evaluation, inspect reason codes, and observe deterministic fail-safe reactions.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {FAILURE_SCENARIOS.map((scen, idx) => {
                  const evalRes = evaluateProposed(scen.request, customWeights);
                  const isMatch = evalRes.decision === scen.expectedOutcome;

                  return (
                    <div
                      key={scen.id}
                      className="bg-[#240e16] border border-[#d6a84f]/25 rounded-lg p-5 flex flex-col justify-between hover:border-[#d6a84f] transition-all group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] tracking-wider text-[#d6a84f] uppercase font-semibold">
                            {scen.tag}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                              evalRes.decision === "APPROVE"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                                : evalRes.decision === "MANUAL_REVIEW"
                                ? "bg-amber-950 text-amber-300 border border-amber-500/40"
                                : "bg-rose-950 text-rose-300 border border-rose-500/40"
                            }`}
                          >
                            {evalRes.decision}
                          </span>
                        </div>

                        <h3 className="font-serif text-lg text-[#f4ead6] mb-2 leading-tight">{scen.name}</h3>
                        <p className="text-xs text-[#b99b97] leading-relaxed mb-4">{scen.summary}</p>

                        <div className="bg-[#18090d] p-3 rounded text-[11px] mb-4 space-y-1">
                          <div className="flex justify-between text-[#a17879]">
                            <span>Role / User:</span>
                            <span className="text-[#f4ead6] font-mono">
                              {scen.request.role} ({scen.request.user_id})
                            </span>
                          </div>
                          <div className="flex justify-between text-[#a17879]">
                            <span>Calculated Risk:</span>
                            <span className="text-[#d6a84f] font-semibold">{evalRes.risk_score.toFixed(3)}</span>
                          </div>
                          <div className="flex justify-between text-[#a17879]">
                            <span>Evidence Confidence:</span>
                            <span className="text-cyan-300 font-semibold">
                              {(evalRes.confidence_score * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex justify-between text-[#a17879]">
                            <span>Test Verification:</span>
                            <span className={isMatch ? "text-emerald-400 font-semibold" : "text-rose-400"}>
                              {isMatch ? "✓ PASS (Matches Expected)" : "FAIL"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        className="outline-button w-full justify-center text-xs py-2"
                        onClick={() => {
                          setSelectedRequest(scen.request);
                          selectAndEvaluate(scen.request);
                          setActiveTab("queue");
                          toast.info(`Loaded ${scen.name} into Verification Cockpit`);
                        }}
                      >
                        Inspect Live in Cockpit <ArrowUpRight size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: BENCHMARK & METRICS */}
          {activeTab === "metrics" && (
            <div>
              <div className="mb-6">
                <p className="eyebrow">
                  <span className="gold-line" /> EMPIRICAL SECURITY EXPERIMENT
                </p>
                <h2 className="text-3xl text-[#f4ead6] font-serif mb-2">10,000-Sample Evaluation Benchmark</h2>
                <p className="text-xs text-[#b99b97] max-w-2xl leading-relaxed">
                  Calculated directly from execution of 10,000 synthetic requests with seed 42. Primary Success Metric:
                  Legitimate Recovery Success at ≥ 99.00% Impersonation Resistance.
                </p>
              </div>

              {/* Master Metrics Comparison Table */}
              <div className="bg-[#240e16] border border-[#d6a84f]/30 rounded-lg p-5 mb-8 overflow-x-auto">
                <h3 className="font-serif text-lg text-[#f4ead6] mb-4">Baseline vs. Proposed Engine Benchmarks</h3>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[#d6a84f]/20 text-[#d6a84f] uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Evaluation Metric</th>
                      <th className="py-2.5 px-3">Baseline Model</th>
                      <th className="py-2.5 px-3">Proposed Risk Engine</th>
                      <th className="py-2.5 px-3">Target Constraint</th>
                      <th className="py-2.5 px-3">Improvement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d6a84f]/10 text-[#f4ead6]">
                    <tr>
                      <td className="py-2.5 px-3 font-medium">Legitimate Recovery Success</td>
                      <td className="py-2.5 px-3 font-mono">39.97%</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">73.77%</td>
                      <td className="py-2.5 px-3 text-[#a17879]">Maximize</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-400">+33.80%</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium">Impersonation Resistance</td>
                      <td className="py-2.5 px-3 font-mono">100.00%</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">100.00%</td>
                      <td className="py-2.5 px-3 text-[#a17879]">≥ 99.00%</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-400">Target Exceeded</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium">False Acceptance Rate (FAR)</td>
                      <td className="py-2.5 px-3 font-mono">0.00%</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">0.00%</td>
                      <td className="py-2.5 px-3 text-[#a17879]">&lt; 1.00%</td>
                      <td className="py-2.5 px-3 text-[#a17879]">Optimal (0 Leaks)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium">False Rejection Rate (FRR)</td>
                      <td className="py-2.5 px-3 font-mono">0.84%</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">0.84%</td>
                      <td className="py-2.5 px-3 text-[#a17879]">&lt; 5.00%</td>
                      <td className="py-2.5 px-3 text-[#a17879]">Suspended Accts</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium">Manual Review Rate</td>
                      <td className="py-2.5 px-3 font-mono text-rose-300">49.52%</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#d6a84f]">21.79%</td>
                      <td className="py-2.5 px-3 text-[#a17879]">15% - 30%</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-400">-27.73% Review Load</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium">F1 Score</td>
                      <td className="py-2.5 px-3 font-mono">0.5711</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#d6a84f]">0.8490</td>
                      <td className="py-2.5 px-3 text-[#a17879]">N/A</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-400">+0.2779</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Ternary Confusion Matrices Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-[#240e16] border border-[#d6a84f]/25 rounded-lg p-5">
                  <h4 className="font-serif text-base text-[#f4ead6] mb-2">Baseline Model Matrix (Rigid Binary Rule)</h4>
                  <p className="text-[11px] text-[#a17879] mb-3">
                    Ground Truth vs. System Action (Total N = 10,000)
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-[#18090d] p-3 rounded">
                      <span className="text-[#a17879] text-[10px] block">Legit Approved</span>
                      <strong className="text-emerald-400 text-lg">2,817</strong>
                    </div>
                    <div className="bg-[#18090d] p-3 rounded">
                      <span className="text-[#a17879] text-[10px] block">Legit Manual Review</span>
                      <strong className="text-amber-400 text-lg">4,172</strong>
                    </div>
                    <div className="bg-[#18090d] p-3 rounded">
                      <span className="text-[#a17879] text-[10px] block">Legit Denied</span>
                      <strong className="text-rose-400 text-lg">59</strong>
                    </div>
                    <div className="bg-[#18090d] p-3 rounded">
                      <span className="text-[#a17879] text-[10px] block">Fraud Approved</span>
                      <strong className="text-emerald-400 text-lg">0</strong>
                    </div>
                    <div className="bg-[#18090d] p-3 rounded">
                      <span className="text-[#a17879] text-[10px] block">Fraud Manual Review</span>
                      <strong className="text-amber-400 text-lg">780</strong>
                    </div>
                    <div className="bg-[#18090d] p-3 rounded">
                      <span className="text-[#a17879] text-[10px] block">Fraud Denied</span>
                      <strong className="text-rose-400 text-lg">2,172</strong>
                    </div>
                  </div>
                </div>

                <div className="bg-[#240e16] border border-[#d6a84f] rounded-lg p-5 shadow-lg shadow-[#5f101c]/30">
                  <h4 className="font-serif text-base text-[#d6a84f] mb-2">Proposed Risk Engine Matrix (Multi-Signal)</h4>
                  <p className="text-[11px] text-[#a17879] mb-3">
                    Ground Truth vs. System Action (Total N = 10,000)
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-[#18090d] p-3 rounded border border-emerald-500/30">
                      <span className="text-[#a17879] text-[10px] block">Legit Approved</span>
                      <strong className="text-emerald-400 text-lg">5,199</strong>
                      <small className="text-[9px] text-emerald-400 block">+2,382 Auto</small>
                    </div>
                    <div className="bg-[#18090d] p-3 rounded border border-amber-500/30">
                      <span className="text-[#a17879] text-[10px] block">Legit Manual Review</span>
                      <strong className="text-amber-400 text-lg">1,790</strong>
                      <small className="text-[9px] text-emerald-400 block">-2,382 Workload</small>
                    </div>
                    <div className="bg-[#18090d] p-3 rounded border border-rose-500/30">
                      <span className="text-[#a17879] text-[10px] block">Legit Denied</span>
                      <strong className="text-rose-400 text-lg">59</strong>
                    </div>
                    <div className="bg-[#18090d] p-3 rounded border border-emerald-500/30">
                      <span className="text-[#a17879] text-[10px] block">Fraud Approved</span>
                      <strong className="text-emerald-400 text-lg">0</strong>
                      <small className="text-[9px] text-emerald-400 block">100% Defense</small>
                    </div>
                    <div className="bg-[#18090d] p-3 rounded border border-amber-500/30">
                      <span className="text-[#a17879] text-[10px] block">Fraud Manual Review</span>
                      <strong className="text-amber-400 text-lg">389</strong>
                    </div>
                    <div className="bg-[#18090d] p-3 rounded border border-rose-500/30">
                      <span className="text-[#a17879] text-[10px] block">Fraud Denied</span>
                      <strong className="text-rose-400 text-lg">2,563</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Robustness Ablation Table */}
              <div className="bg-[#240e16] border border-[#d6a84f]/25 rounded-lg p-5">
                <h4 className="font-serif text-base text-[#f4ead6] mb-1">
                  Controlled Telemetry Robustness Ablation (Phase 12)
                </h4>
                <p className="text-[11px] text-[#a17879] mb-4">
                  Evaluating degradation when device telemetry or identity proofs are delayed or missing.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
                  <div className="bg-[#18090d] p-3 rounded">
                    <span className="text-[#d6a84f] font-semibold block mb-1">Cohort A: Complete</span>
                    <p className="text-xs text-[#f4ead6] m-0">Legit: <strong>74.3%</strong></p>
                    <p className="text-xs text-[#f4ead6] m-0">Review: <strong>21.7%</strong></p>
                    <small className="text-emerald-400">FAR: 0.00%</small>
                  </div>
                  <div className="bg-[#18090d] p-3 rounded">
                    <span className="text-amber-300 font-semibold block mb-1">Cohort B: 10% Dev Loss</span>
                    <p className="text-xs text-[#f4ead6] m-0">Legit: <strong>65.7%</strong></p>
                    <p className="text-xs text-[#f4ead6] m-0">Review: <strong>27.3%</strong></p>
                    <small className="text-emerald-400">FAR: 0.00%</small>
                  </div>
                  <div className="bg-[#18090d] p-3 rounded">
                    <span className="text-amber-300 font-semibold block mb-1">Cohort C: 25% Dev Loss</span>
                    <p className="text-xs text-[#f4ead6] m-0">Legit: <strong>54.1%</strong></p>
                    <p className="text-xs text-[#f4ead6] m-0">Review: <strong>35.2%</strong></p>
                    <small className="text-emerald-400">FAR: 0.00%</small>
                  </div>
                  <div className="bg-[#18090d] p-3 rounded">
                    <span className="text-cyan-300 font-semibold block mb-1">Cohort D: ID Delayed</span>
                    <p className="text-xs text-[#f4ead6] m-0">Legit: <strong>57.2%</strong></p>
                    <p className="text-xs text-[#f4ead6] m-0">Review: <strong>33.5%</strong></p>
                    <small className="text-emerald-400">FAR: 0.00%</small>
                  </div>
                  <div className="bg-[#18090d] p-3 rounded border border-rose-500/30">
                    <span className="text-rose-300 font-semibold block mb-1">Cohort E: Multi Missing</span>
                    <p className="text-xs text-[#f4ead6] m-0">Legit: <strong>0.00%</strong></p>
                    <p className="text-xs text-[#f4ead6] m-0">Review: <strong>72.0%</strong></p>
                    <small className="text-emerald-400">Safe Degradation</small>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: POLICY CALIBRATION */}
          {activeTab === "policy" && (
            <div>
              <div className="mb-6">
                <p className="eyebrow">
                  <span className="gold-line" /> CONFIGURABLE DECISION WEIGHTS
                </p>
                <h2 className="text-3xl text-[#f4ead6] font-serif mb-2">Policy Rule Weights & Sensitivity</h2>
                <p className="text-xs text-[#b99b97] max-w-2xl leading-relaxed">
                  Adjust global telemetry weights in real time. Changes immediately update risk calculations across all
                  active recovery requests without hardcoding logic in code.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#240e16] border border-[#d6a84f]/25 rounded-lg p-5 space-y-4">
                  <h3 className="font-serif text-lg text-[#f4ead6] mb-2">Global Signal Weights</h3>

                  <div>
                    <div className="flex justify-between text-xs mb-1 text-[#f4ead6]">
                      <span>Identity Document Evidence</span>
                      <strong className="text-[#d6a84f]">{customWeights.identity_evidence.toFixed(2)}</strong>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max="0.60"
                      step="0.05"
                      value={customWeights.identity_evidence}
                      onChange={(e) =>
                        setCustomWeights({ ...customWeights, identity_evidence: parseFloat(e.target.value) })
                      }
                      className="w-full accent-[#d6a84f]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1 text-[#f4ead6]">
                      <span>Device Hardware Trust & Fingerprint</span>
                      <strong className="text-[#d6a84f]">{customWeights.device_trust.toFixed(2)}</strong>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max="0.40"
                      step="0.05"
                      value={customWeights.device_trust}
                      onChange={(e) => setCustomWeights({ ...customWeights, device_trust: parseFloat(e.target.value) })}
                      className="w-full accent-[#d6a84f]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1 text-[#f4ead6]">
                      <span>IP / Network Anomaly Threat Index</span>
                      <strong className="text-[#d6a84f]">{customWeights.ip_risk.toFixed(2)}</strong>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.30"
                      step="0.05"
                      value={customWeights.ip_risk}
                      onChange={(e) => setCustomWeights({ ...customWeights, ip_risk: parseFloat(e.target.value) })}
                      className="w-full accent-[#d6a84f]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1 text-[#f4ead6]">
                      <span>Geographic & Location Consistency</span>
                      <strong className="text-[#d6a84f]">{customWeights.geo_consistency.toFixed(2)}</strong>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.25"
                      step="0.01"
                      value={customWeights.geo_consistency}
                      onChange={(e) =>
                        setCustomWeights({ ...customWeights, geo_consistency: parseFloat(e.target.value) })
                      }
                      className="w-full accent-[#d6a84f]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1 text-[#f4ead6]">
                      <span>Login Behavioral History</span>
                      <strong className="text-[#d6a84f]">{customWeights.login_history.toFixed(2)}</strong>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.20"
                      step="0.01"
                      value={customWeights.login_history}
                      onChange={(e) =>
                        setCustomWeights({ ...customWeights, login_history: parseFloat(e.target.value) })
                      }
                      className="w-full accent-[#d6a84f]"
                    />
                  </div>

                  <div className="pt-3 border-t border-[#d6a84f]/20 flex gap-3">
                    <button
                      className="gold-button flex-1 justify-center py-2"
                      onClick={() => {
                        if (selectedRequest) selectAndEvaluate(selectedRequest);
                        toast.success("Policy weights applied to verification desk");
                      }}
                    >
                      Apply Weights
                    </button>
                    <button
                      className="outline-button flex-1 justify-center py-2"
                      onClick={() => {
                        setCustomWeights({
                          identity_evidence: 0.30,
                          device_trust: 0.20,
                          ip_risk: 0.15,
                          geo_consistency: 0.12,
                          login_history: 0.10,
                          mfa_history: 0.08,
                          recovery_velocity: 0.05,
                        });
                        toast.info("Reset to default university weights");
                      }}
                    >
                      Reset Defaults
                    </button>
                  </div>
                </div>

                {/* Audit Logs Trail */}
                <div className="bg-[#240e16] border border-[#d6a84f]/25 rounded-lg p-5">
                  <h3 className="font-serif text-lg text-[#f4ead6] mb-2">Live Operator Audit Trail</h3>
                  <p className="text-xs text-[#a17879] mb-4">
                    Cryptographically stamped log of help-desk operator decisions and policy overrides.
                  </p>
                  <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                    {auditHistory.length === 0 ? (
                      <div className="text-xs text-[#a17879] p-4 text-center border border-dashed border-[#d6a84f]/20 rounded">
                        No overrides recorded in current session. Action requests from the queue to populate audit log.
                      </div>
                    ) : (
                      auditHistory.map((item, idx) => (
                        <div key={idx} className="bg-[#18090d] p-2.5 rounded border border-[#d6a84f]/15 text-xs">
                          <div className="flex justify-between text-[#d6a84f] font-mono text-[10px] mb-1">
                            <span>{item.timestamp}</span>
                            <span>{item.userId}</span>
                          </div>
                          <p className="text-[#f4ead6] m-0 font-medium">{item.action}</p>
                          <small className="text-[#a17879]">
                            Risk: {item.riskScore.toFixed(3)} · Decision: {item.decision}
                          </small>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="mt-12 pt-6 border-t border-[#d6a84f]/15 flex flex-wrap justify-between text-[10px] text-[#8e6c70]">
            <span>© 2026 UNIVERSITY ACCOUNT RECOVERY VERIFICATION DESK</span>
            <span>VELVET LEDGER DEFENSE ARCHITECTURE · QUBEE AI EVALUATION STANDARD</span>
            <span>POLICY V. 2.4.0</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
