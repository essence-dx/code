import assert from "node:assert/strict";
import type { BoardReleaseArchiveIntelligenceIndexReport } from "@/features/projects/board-release-archive-intelligence-index";
import { createBoardReleaseArchiveAnomalyReviewReport } from "@/features/projects/board-release-archive-anomaly-review";

const generatedAt = "2026-05-29T10:00:00.000Z";

const index = {
  generatedAt,
  rows: [
    {
      archiveBundleHash: "sha256:bundle",
      correlationHash: "sha256:correlation-readiness",
      executivePacketHash: "sha256:packet",
      finalDecisionHash: "sha256:final-decision",
      finalDecisionOutcome: "held",
      indexId: "index-readiness",
      indexKind: "readiness",
      nextAction: "Resolve blocked closeout items before the board can approve release closure.",
      remediationHash: "sha256:remediation",
      score: 73,
      sectionHash: "sha256:section-readiness",
      sourceEvidenceHash: "sha256:readiness",
      status: "blocked",
      title: "Readiness gates",
      workspaceId: "workspace-board",
    },
    {
      archiveBundleHash: "sha256:bundle",
      correlationHash: "sha256:correlation-archive",
      executivePacketHash: "sha256:packet",
      finalDecisionHash: "sha256:final-decision",
      finalDecisionOutcome: "held",
      indexId: "index-archive",
      indexKind: "archive",
      nextAction: "Review watched delivery routes before final closeout.",
      remediationHash: "sha256:remediation",
      score: 42,
      sectionHash: "sha256:section-archive",
      sourceEvidenceHash: "sha256:archive",
      status: "watch",
      title: "Archive manifests",
      workspaceId: "workspace-board",
    },
    {
      archiveBundleHash: "sha256:bundle",
      correlationHash: "sha256:correlation-decision",
      executivePacketHash: "sha256:packet",
      finalDecisionHash: "sha256:final-decision",
      finalDecisionOutcome: "held",
      indexId: "index-decision",
      indexKind: "decision",
      nextAction: "Resolve blocked closeout items before the board can approve release closure.",
      remediationHash: "sha256:remediation",
      score: 30,
      sectionHash: "sha256:section-decision",
      sourceEvidenceHash: "sha256:decision",
      status: "blocked",
      title: "Final decision",
      workspaceId: "workspace-board",
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

const report = createBoardReleaseArchiveAnomalyReviewReport({
  generatedAt,
  index,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.findingCount, 9);
assert.equal(report.summary.repeatedDecisionCount, 3);
assert.equal(report.summary.staleRemediationCount, 3);
assert.equal(report.summary.archiveDriftCount, 3);
assert.equal(report.summary.criticalCount, 8);
assert.equal(report.summary.watchCount, 1);
assert.equal(report.findings[0]?.kind, "repeated-decision");
assert.equal(report.findings[0]?.severity, "critical");
assert.equal(report.findings.find((finding) => finding.sourceTitle === "Archive manifests" && finding.kind === "stale-remediation")?.status, "watch");
assert.match(report.findings[0]?.findingHash ?? "", /^sha256:/);
assert.match(report.summary.reviewHash, /^sha256:/);
assert.match(
  report.csvContent,
  /finding_id,kind,severity,status,source_title,final_decision_outcome,archive_bundle_hash,remediation_hash,correlation_hash,evidence_hash,finding_hash,next_action/,
);
assert.match(report.jsonContent, /"kind": "archive-drift"/);
assert.equal(report.csvFileName, "workspace-board-board-release-archive-anomaly-review-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-archive-anomaly-review-20260529.json");

console.log("board release archive anomaly review smoke passed");
