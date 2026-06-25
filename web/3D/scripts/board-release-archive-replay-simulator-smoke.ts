import assert from "node:assert/strict";
import type { BoardReleaseArchiveAnomalyReviewReport } from "@/features/projects/board-release-archive-anomaly-review";
import type { BoardReleaseArchiveIntelligenceIndexReport } from "@/features/projects/board-release-archive-intelligence-index";
import { createBoardReleaseArchiveReplaySimulatorReport } from "@/features/projects/board-release-archive-replay-simulator";
import { createBoardReleaseArchiveTrendDigestReport } from "@/features/projects/board-release-archive-trend-digest";

const generatedAt = "2026-05-29T10:00:00.000Z";

const index = {
  generatedAt,
  rows: [
    {
      archiveBundleHash: "sha256:archive-readiness",
      finalDecisionOutcome: "held",
      indexId: "index-readiness",
      score: 73,
      status: "blocked",
    },
    {
      archiveBundleHash: "sha256:archive-closeout",
      finalDecisionOutcome: "held",
      indexId: "index-archive",
      score: 42,
      status: "watch",
    },
    {
      archiveBundleHash: "sha256:archive-decision",
      finalDecisionOutcome: "held",
      indexId: "index-decision",
      score: 30,
      status: "blocked",
    },
  ],
  summary: {
    approvedCount: 0,
    blockedCount: 2,
    deferredCount: 0,
    heldCount: 3,
    indexCount: 3,
    intelligenceHash: "sha256:intelligence",
    nextAction: "Resolve blocked closeout items before the board can approve release closure.",
    readyCount: 0,
    status: "blocked",
    watchCount: 1,
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveIntelligenceIndexReport;

const anomalyReview = {
  findings: [
    {
      findingHash: "sha256:finding-1",
      kind: "repeated-decision",
      severity: "critical",
      status: "blocked",
      sourceTitle: "Readiness gates",
    },
    {
      findingHash: "sha256:finding-2",
      kind: "repeated-decision",
      severity: "critical",
      status: "blocked",
      sourceTitle: "Final decision",
    },
    {
      findingHash: "sha256:finding-3",
      kind: "repeated-decision",
      severity: "high",
      status: "watch",
      sourceTitle: "Archive manifests",
    },
    {
      findingHash: "sha256:finding-4",
      kind: "stale-remediation",
      severity: "critical",
      status: "blocked",
      sourceTitle: "Readiness gates",
    },
    {
      findingHash: "sha256:finding-5",
      kind: "stale-remediation",
      severity: "high",
      status: "watch",
      sourceTitle: "Archive manifests",
    },
    {
      findingHash: "sha256:finding-6",
      kind: "archive-drift",
      severity: "critical",
      status: "blocked",
      sourceTitle: "Final decision",
    },
  ],
  generatedAt,
  summary: {
    archiveDriftCount: 1,
    blockedCount: 4,
    criticalCount: 4,
    findingCount: 6,
    intelligenceHash: "sha256:intelligence",
    nextAction: "Escalate held board release archive decision before the next closeout cycle.",
    repeatedDecisionCount: 3,
    reviewHash: "sha256:review",
    staleRemediationCount: 2,
    status: "blocked",
    watchCount: 2,
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveAnomalyReviewReport;

const trendDigest = createBoardReleaseArchiveTrendDigestReport({
  anomalyReview,
  generatedAt,
  index,
  workspaceId: "workspace-board",
});

const report = createBoardReleaseArchiveReplaySimulatorReport({
  anomalyReview,
  generatedAt,
  index,
  trendDigest,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.scenarioCount, 3);
assert.equal(report.summary.changedCount, 1);
assert.equal(report.summary.unchangedCount, 2);
assert.equal(report.summary.holdCount, 2);
assert.equal(report.summary.deferCount, 0);
assert.equal(report.summary.approveCount, 1);
assert.equal(report.scenarios[0]?.scenarioKind, "anomaly-adjusted");
assert.equal(report.scenarios[0]?.replayDecision, "hold");
assert.equal(report.scenarios[0]?.outcome, "unchanged");
assert.equal(report.scenarios[1]?.scenarioKind, "trend-adjusted");
assert.equal(report.scenarios[1]?.replayDecision, "hold");
assert.equal(report.scenarios[2]?.scenarioKind, "evidence-clean");
assert.equal(report.scenarios[2]?.replayDecision, "approve");
assert.equal(report.scenarios[2]?.outcome, "changed");
assert.match(report.scenarios[0]?.scenarioHash ?? "", /^sha256:/);
assert.match(report.summary.replayHash, /^sha256:/);
assert.match(report.csvContent, /scenario_id,scenario_kind,title,status,original_decision,replay_decision,outcome/);
assert.match(report.jsonContent, /"scenarioKind": "evidence-clean"/);
assert.equal(report.csvFileName, "workspace-board-board-release-archive-replay-simulator-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-archive-replay-simulator-20260529.json");

console.log("board release archive replay simulator smoke passed");
