import assert from "node:assert/strict";
import type { BoardReleaseArchiveAnomalyReviewReport } from "@/features/projects/board-release-archive-anomaly-review";
import type { BoardReleaseArchiveIntelligenceIndexReport } from "@/features/projects/board-release-archive-intelligence-index";
import { createBoardReleaseArchiveTrendDigestReport } from "@/features/projects/board-release-archive-trend-digest";

const generatedAt = "2026-05-29T10:00:00.000Z";

const index = {
  generatedAt,
  rows: [
    { indexId: "index-readiness", score: 73, status: "blocked" },
    { indexId: "index-archive", score: 42, status: "watch" },
    { indexId: "index-decision", score: 30, status: "blocked" },
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

const report = createBoardReleaseArchiveTrendDigestReport({
  anomalyReview,
  generatedAt,
  index,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.rowCount, 5);
assert.equal(report.summary.closeoutScoreMovement, -52);
assert.equal(report.summary.recurringBlockerCategoryCount, 1);
assert.equal(report.summary.blockedCount, 3);
assert.equal(report.summary.watchCount, 2);
assert.equal(report.summary.trendScore, 49);
assert.equal(report.rows[0]?.kind, "closeout-score");
assert.equal(report.rows[0]?.metric, "-52 movement");
assert.equal(report.rows.find((row) => row.title === "repeated decision")?.status, "blocked");
assert.equal(report.rows.find((row) => row.title === "archive drift")?.status, "watch");
assert.match(report.rows[0]?.digestHash ?? "", /^sha256:/);
assert.match(report.summary.digestHash, /^sha256:/);
assert.match(report.csvContent, /digest_id,kind,title,status,score,metric,detail,digest_hash,next_action/);
assert.match(report.jsonContent, /"kind": "owner-follow-through"/);
assert.equal(report.csvFileName, "workspace-board-board-release-archive-trend-digest-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-archive-trend-digest-20260529.json");

console.log("board release archive trend digest smoke passed");
