import { strict as assert } from "node:assert";
import {
  createReleaseDrillHistoryRecord,
  createReleaseDrillHistoryReport,
  getReleaseDrillHistoryDownload,
  isReleaseDrillSimulationReport,
} from "@/features/projects/release-drill-history";
import type { ReleaseDrillSimulationReport } from "@/features/projects/release-drill-simulation";

const generatedAt = "2026-05-16T16:00:00.000Z";

const report: ReleaseDrillSimulationReport = {
  generatedAt,
  rows: [
    {
      blastRadius: "Production deploys and public links.",
      evidence: "1/1 runbook records complete, 0 blocked milestones.",
      exercise: ["Identify the previous stable deploy."],
      id: "rollback",
      label: "Rollback rehearsal",
      nextAction: "Schedule a short rollback tabletop before the next production promotion.",
      ownerHint: "Release owner",
      recoveryTargetMinutes: 30,
      status: "ready",
      successCriteria: ["Previous deploy is identified."],
    },
    {
      blastRadius: "Signed desktop bundles.",
      evidence: "0 valid, 0 expiring, 1 blocked certificate rows.",
      exercise: ["Select the missing package certificate."],
      id: "certificate-expiry",
      label: "Certificate expiry drill",
      nextAction: "Replace blocked or expiring certificates and regenerate package evidence.",
      ownerHint: "Signing owner",
      recoveryTargetMinutes: 45,
      status: "blocked",
      successCriteria: ["Replacement fingerprint is valid."],
    },
    {
      blastRadius: "Public viewer and API helpers.",
      evidence: "Passing, 100% completion, 0 issue rows, 1 pass streak.",
      exercise: ["Force one public route to fail in drill notes."],
      id: "deploy-smoke-failure",
      label: "Deploy smoke failure drill",
      nextAction: "Keep collecting smoke evidence after every substantial release.",
      ownerHint: "Web release owner",
      recoveryTargetMinutes: 20,
      status: "watch",
      successCriteria: ["Failed route has an owner."],
    },
    {
      blastRadius: "Native CAD imports.",
      evidence: "No CAD worker records are available.",
      exercise: ["Mark one adapter unavailable."],
      id: "cad-worker-outage",
      label: "CAD worker outage drill",
      nextAction: "Queue a representative native CAD conversion before running outage drills.",
      ownerHint: "CAD pipeline owner",
      recoveryTargetMinutes: 60,
      status: "missing",
      successCriteria: ["Affected jobs are identified."],
    },
  ],
  summary: {
    blockedCount: 1,
    missingCount: 1,
    readyCount: 1,
    score: 48,
    totalCount: 4,
    watchCount: 1,
    worstStatus: "blocked",
  },
};

assert.equal(isReleaseDrillSimulationReport(report), true);
assert.equal(isReleaseDrillSimulationReport({ rows: [] }), false);

const record = createReleaseDrillHistoryRecord({
  actor: {
    email: "release@example.com",
    name: "Release owner",
    userId: "user-1",
  },
  createdAt: generatedAt,
  report,
  workspace: {
    id: "workspace-1",
    name: "Launch Workspace",
  },
});

assert.equal(record.totalCount, 4);
assert.equal(record.readyCount, 1);
assert.equal(record.blockedCount, 1);
assert.equal(record.drillRows.length, 4);
assert.equal(record.drillRows.find((row) => row.id === "certificate-expiry")?.dueAt, generatedAt);
assert.ok(record.drillRows.find((row) => row.id === "rollback")?.dueAt.startsWith("2026-06-15"));
assert.ok(record.drillRows.every((row) => row.evidenceLinks.length > 0));
assert.ok(record.contentHash.startsWith("sha256:"));

const history = createReleaseDrillHistoryReport([record]);

assert.equal(history.summary.totalRecordCount, 1);
assert.equal(history.summary.totalDrillCount, 4);
assert.equal(history.summary.readyRunCount, 1);
assert.equal(history.summary.blockedRunCount, 1);
assert.equal(history.summary.latestContentHash, record.contentHash);

const jsonDownload = getReleaseDrillHistoryDownload(record, "json");
const csvDownload = getReleaseDrillHistoryDownload(record, "csv");

assert.equal(jsonDownload.fileName.endsWith(".json"), true);
assert.equal(csvDownload.fileName.endsWith(".csv"), true);
assert.ok(jsonDownload.body.includes("drillRows"));
assert.ok(csvDownload.body.includes("Certificate expiry drill"));

console.log("release drill history smoke passed");
