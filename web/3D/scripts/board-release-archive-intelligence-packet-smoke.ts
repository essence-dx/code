import assert from "node:assert/strict";
import type { BoardReleaseArchiveAnomalyReviewReport } from "@/features/projects/board-release-archive-anomaly-review";
import {
  createBoardReleaseArchiveIntelligencePacketReport,
} from "@/features/projects/board-release-archive-intelligence-packet";
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

const replaySimulator = createBoardReleaseArchiveReplaySimulatorReport({
  anomalyReview,
  generatedAt,
  index,
  trendDigest,
  workspaceId: "workspace-board",
});

const report = createBoardReleaseArchiveIntelligencePacketReport({
  anomalyReview,
  generatedAt,
  index,
  replaySimulator,
  trendDigest,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.sectionCount, 5);
assert.equal(report.summary.recommendationCount, 4);
assert.equal(report.summary.blockedSectionCount, 5);
assert.equal(report.summary.blockedRecommendationCount, 3);
assert.equal(report.summary.watchRecommendationCount, 1);
assert.equal(report.summary.governanceUpdateCount, 1);
assert.equal(report.summary.packetScore, 34);
assert.equal(report.sections[0]?.sectionKind, "index");
assert.equal(report.sections[4]?.sectionKind, "governance");
assert.equal(report.recommendations[0]?.recommendationKind, "remediate-anomaly");
assert.equal(report.recommendations[2]?.recommendationKind, "decision-control");
assert.equal(report.recommendations[3]?.recommendationKind, "governance-update");
assert.match(report.summary.packetHash, /^sha256:/);
assert.match(report.sections[0]?.sectionHash ?? "", /^sha256:/);
assert.match(report.recommendations[0]?.recommendationHash ?? "", /^sha256:/);
assert.match(report.executiveMemo, /BLOCKED archive intelligence packet/);
assert.match(report.csvContent, /record_type,id,kind,title,status,score_or_priority,evidence_hash,record_hash,next_action/);
assert.match(report.jsonContent, /"recommendationKind": "governance-update"/);
assert.equal(report.csvFileName, "workspace-board-board-release-archive-intelligence-packet-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-archive-intelligence-packet-20260529.json");

console.log("board release archive intelligence packet smoke passed");
