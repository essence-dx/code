import { strict as assert } from "node:assert";
import {
  createExecutiveReleaseSnapshotHistoryReport,
  createExecutiveReleaseSnapshotRecord,
  getExecutiveReleaseSnapshotDownload,
  isExecutiveReleaseIntelligenceReport,
} from "@/features/projects/executive-release-snapshots";
import type { ExecutiveReleaseIntelligenceReport, ExecutiveReleaseIntelligenceSignal } from "@/features/projects/executive-release-intelligence";

function signal(input: Partial<ExecutiveReleaseIntelligenceSignal> & Pick<ExecutiveReleaseIntelligenceSignal, "domain" | "id" | "label" | "status">): ExecutiveReleaseIntelligenceSignal {
  const base: ExecutiveReleaseIntelligenceSignal = {
    detail: `${input.label} detail`,
    domain: input.domain,
    evidence: `${input.label} evidence`,
    evidenceCount: 2,
    id: input.id,
    label: input.label,
    nextAction: `Resolve ${input.label}`,
    ownerHint: `${input.domain} owner`,
    score: input.status === "blocked" ? 42 : input.status === "watch" ? 74 : 94,
    severity: input.status === "blocked" ? "critical" : input.status === "watch" ? "warning" : "info",
    status: input.status,
    updatedAt: "2026-05-16T12:00:00.000Z",
    value: input.status,
  };

  return {
    ...base,
    ...input,
  };
}

function executiveReport(input: {
  blockedCount: number;
  costScore: number;
  evidenceScore: number;
  generatedAt: string;
  governanceScore: number;
  incidentScore: number;
  launchScore: number;
  riskScore: number;
  score: number;
  status: ExecutiveReleaseIntelligenceReport["summary"]["status"];
  watchCount: number;
}): ExecutiveReleaseIntelligenceReport {
  const launchSignal = signal({
    domain: "launch",
    id: "launch:promotion-decision",
    label: "Launch promotion readiness",
    score: input.launchScore,
    status: input.launchScore < 60 ? "blocked" : input.launchScore < 86 ? "watch" : "ready",
  });
  const riskSignal = signal({
    domain: "risk",
    id: "risk:digest",
    label: "Workspace risk posture",
    score: input.riskScore,
    status: input.riskScore < 60 ? "blocked" : input.riskScore < 86 ? "watch" : "ready",
  });

  return {
    criticalPath: [launchSignal, riskSignal].filter((entry) => entry.status !== "ready"),
    csvContent: "",
    csvDataUri: "data:text/csv;charset=utf-8,",
    csvFileName: "executive.csv",
    executiveMemo: input.status === "blocked" ? "Do not promote while executive blockers remain." : "Promote with owner review.",
    generatedAt: input.generatedAt,
    jsonContent: "{}",
    jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
    jsonFileName: "executive.json",
    signals: [launchSignal, riskSignal],
    summary: {
      blockedCount: input.blockedCount,
      costScore: input.costScore,
      domainCoverage: ["launch", "risk"],
      evidenceScore: input.evidenceScore,
      executiveScore: input.score,
      governanceScore: input.governanceScore,
      incidentScore: input.incidentScore,
      launchScore: input.launchScore,
      lowestDomain: input.launchScore <= input.riskScore ? "launch" : "risk",
      readyCount: 1,
      riskScore: input.riskScore,
      signalCount: 2,
      status: input.status,
      topAction: input.status === "blocked" ? "Repair release blockers." : "Review watched release signals.",
      watchCount: input.watchCount,
    },
  };
}

const olderReport = executiveReport({
  blockedCount: 3,
  costScore: 58,
  evidenceScore: 66,
  generatedAt: "2026-05-15T12:00:00.000Z",
  governanceScore: 64,
  incidentScore: 52,
  launchScore: 44,
  riskScore: 56,
  score: 62,
  status: "blocked",
  watchCount: 2,
});
const newerReport = executiveReport({
  blockedCount: 1,
  costScore: 72,
  evidenceScore: 83,
  generatedAt: "2026-05-16T12:00:00.000Z",
  governanceScore: 78,
  incidentScore: 70,
  launchScore: 74,
  riskScore: 76,
  score: 74,
  status: "watch",
  watchCount: 3,
});

assert.equal(isExecutiveReleaseIntelligenceReport(newerReport), true);
assert.equal(isExecutiveReleaseIntelligenceReport({ generatedAt: newerReport.generatedAt }), false);

const olderSnapshot = createExecutiveReleaseSnapshotRecord({
  actor: {
    email: "admin@mail.com",
    name: "Admin",
    userId: "user-admin",
  },
  createdAt: "2026-05-15T12:02:00.000Z",
  id: "older-snapshot",
  report: olderReport,
  workspace: {
    id: "workspace-1",
    name: "Essence Studio",
  },
});
const newerSnapshot = createExecutiveReleaseSnapshotRecord({
  actor: {
    email: "admin@mail.com",
    name: "Admin",
    userId: "user-admin",
  },
  createdAt: "2026-05-16T12:02:00.000Z",
  id: "newer-snapshot",
  report: newerReport,
  workspace: {
    id: "workspace-1",
    name: "Essence Studio",
  },
});

const history = createExecutiveReleaseSnapshotHistoryReport([olderSnapshot, newerSnapshot]);

assert.equal(newerSnapshot.executiveScore, 74);
assert.equal(newerSnapshot.status, "watch");
assert.equal(newerSnapshot.domainScores.launch, 74);
assert.match(newerSnapshot.contentHash, /^sha256:/);
assert.equal(history.snapshots[0]?.id, "newer-snapshot");
assert.equal(history.summary.totalSnapshotCount, 2);
assert.equal(history.summary.latestScore, 74);
assert.equal(history.summary.previousScore, 62);
assert.equal(history.summary.scoreDelta, 12);
assert.equal(history.summary.blockerDelta, -2);
assert.equal(history.summary.statusTrend, "improving");
assert.equal(history.trends.find((row) => row.metric === "Executive score")?.delta, 12);
assert.equal(history.trends.find((row) => row.metric === "Blocked signals")?.direction, "improving");
assert.match(history.csvContent, /created_at,status,executive_score,blocked_count,watch_count,lowest_domain,top_action/);
assert.match(history.csvDataUri, /^data:text\/csv/);

const jsonDownload = getExecutiveReleaseSnapshotDownload(newerSnapshot, "json");
const csvDownload = getExecutiveReleaseSnapshotDownload(newerSnapshot, "csv");

assert.equal(jsonDownload.mimeType, "application/json;charset=utf-8");
assert.equal(csvDownload.mimeType, "text/csv;charset=utf-8");
assert.match(jsonDownload.body, /"executiveMemo"/);
assert.match(csvDownload.body, /Executive score/);

console.log("executive release snapshots smoke passed");
