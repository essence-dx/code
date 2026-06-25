import assert from "node:assert/strict";
import type { BoardReleaseCloseoutArchiveManifestReport } from "@/features/projects/board-release-closeout-archive-manifests";
import type { BoardReleaseCloseoutExecutivePacketReport } from "@/features/projects/board-release-closeout-executive-packet";
import { createBoardReleaseArchiveIntelligenceIndexReport } from "@/features/projects/board-release-archive-intelligence-index";
import type { BoardReleaseCloseoutVarianceRemediationReport } from "@/features/projects/board-release-closeout-variance-remediation";

const generatedAt = "2026-05-29T10:00:00.000Z";

const executivePacket = {
  generatedAt,
  sections: [
    {
      evidenceHash: "sha256:readiness",
      nextAction: "Resolve blocked observability closeout signals before board release closure.",
      score: 73,
      sectionHash: "sha256:section-readiness",
      sectionId: "section-readiness",
      sectionKind: "readiness",
      status: "blocked",
      summary: "2/4 closeout gates ready.",
      title: "Readiness gates",
      workspaceId: "workspace-board",
    },
    {
      evidenceHash: "sha256:archive",
      nextAction: "Review watched delivery routes before final closeout.",
      score: 42,
      sectionHash: "sha256:section-archive",
      sectionId: "section-archive",
      sectionKind: "archive",
      status: "watch",
      summary: "2/4 archive manifests ready.",
      title: "Archive manifests",
      workspaceId: "workspace-board",
    },
    {
      evidenceHash: "sha256:decision",
      nextAction: "Resolve blocked closeout items before the board can approve release closure.",
      score: 30,
      sectionHash: "sha256:section-decision",
      sectionId: "section-decision",
      sectionKind: "decision",
      status: "blocked",
      summary: "Final decision is hold with 30/100 closeout confidence.",
      title: "Final decision",
      workspaceId: "workspace-board",
    },
  ],
  summary: {
    blockedSectionCount: 2,
    decision: "hold",
    finalDecisionHash: "sha256:final-decision",
    nextAction: "Resolve blocked closeout items before the board can approve release closure.",
    packetHash: "sha256:packet",
    packetScore: 30,
    readySectionCount: 0,
    sectionCount: 3,
    status: "blocked",
    watchSectionCount: 1,
  },
  workspaceId: "workspace-board",
} as BoardReleaseCloseoutExecutivePacketReport;

const archiveManifests = {
  generatedAt,
  summary: {
    blockedCount: 1,
    bundleHash: "sha256:bundle",
    evidenceHash: "sha256:evidence",
    manifestCount: 4,
    nextAction: "Resolve blocked observability closeout signals before board release closure.",
    ownerAcknowledgementHash: "sha256:ack",
    readinessGateHash: "sha256:gates",
    readyCount: 2,
    status: "blocked",
    watchCount: 1,
  },
  workspaceId: "workspace-board",
} as BoardReleaseCloseoutArchiveManifestReport;

const remediation = {
  generatedAt,
  summary: {
    blockedCount: 2,
    completedCount: 1,
    criticalCount: 2,
    nextAction: "Resolve blocked observability closeout signals before board release closure.",
    openCount: 2,
    overdueCount: 0,
    planCount: 5,
    remediationHash: "sha256:remediation",
    status: "blocked",
  },
  workspaceId: "workspace-board",
} as BoardReleaseCloseoutVarianceRemediationReport;

const report = createBoardReleaseArchiveIntelligenceIndexReport({
  archiveManifests,
  executivePacket,
  generatedAt,
  remediation,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.indexCount, 3);
assert.equal(report.summary.heldCount, 3);
assert.equal(report.summary.deferredCount, 0);
assert.equal(report.summary.approvedCount, 0);
assert.equal(report.summary.blockedCount, 2);
assert.equal(report.summary.watchCount, 1);
assert.equal(report.rows[0]?.indexKind, "readiness");
assert.equal(report.rows.find((row) => row.indexKind === "archive")?.finalDecisionOutcome, "held");
assert.match(report.rows[0]?.correlationHash ?? "", /^sha256:/);
assert.match(report.summary.intelligenceHash, /^sha256:/);
assert.match(
  report.csvContent,
  /index_id,index_kind,title,status,score,final_decision_outcome,executive_packet_hash,final_decision_hash,archive_bundle_hash,remediation_hash,section_hash,source_evidence_hash,correlation_hash,next_action/,
);
assert.match(report.jsonContent, /"finalDecisionOutcome": "held"/);
assert.equal(report.csvFileName, "workspace-board-board-release-archive-intelligence-index-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-archive-intelligence-index-20260529.json");

console.log("board release archive intelligence index smoke passed");
