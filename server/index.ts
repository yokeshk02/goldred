import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { evaluateBaseline, evaluateProposed, RecoveryRequestData } from "../shared/risk-service";
import { FAILURE_SCENARIOS } from "../shared/failure-scenarios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString(), service: "risk-verification-engine" });
  });

  // Get sample requests
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
    // Fallback to pre-configured failure scenarios requests
    res.json(FAILURE_SCENARIOS.map((s) => s.request));
  });

  // Evaluate request using Proposed Risk Engine
  app.post("/api/evaluate", (req, res) => {
    try {
      const body = req.body as { request: RecoveryRequestData; customWeights?: Record<string, number> };
      if (!body.request) {
        return res.status(400).json({ error: "Missing request in request body" });
      }
      const evaluation = evaluateProposed(body.request, body.customWeights);
      res.json(evaluation);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Evaluate request using Baseline Model
  app.post("/api/baseline", (req, res) => {
    try {
      const body = req.body as { request: RecoveryRequestData };
      if (!body.request) {
        return res.status(400).json({ error: "Missing request in request body" });
      }
      const evaluation = evaluateBaseline(body.request);
      res.json(evaluation);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get 7 Failure Scenarios
  app.get("/api/scenarios", (_req, res) => {
    res.json(FAILURE_SCENARIOS);
  });

  // Get Empirical Benchmark Metrics & Confusion Matrices
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

  // Get & Update Configurable Rules
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
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Audit Log Endpoint
  const auditLogs: any[] = [];
  app.post("/api/audit", (req, res) => {
    const entry = {
      timestamp: new Date().toISOString(),
      ...req.body,
    };
    auditLogs.push(entry);
    res.json({ success: true, log_id: `audit_${auditLogs.length}`, entry });
  });

  app.get("/api/audit", (_req, res) => {
    res.json(auditLogs);
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
