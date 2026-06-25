import assert from "node:assert/strict";
import type { BoardAuditEvidenceReadinessDigest } from "@/features/projects/board-audit-evidence-readiness-digest";
import type { BoardEvidenceCloseoutReport } from "@/features/projects/board-evidence-closeout-report";
import type { BoardEvidenceReleaseArchiveRecordReport } from "@/features/projects/board-evidence-release-archive-records";
import { createBoardEvidenceReleaseVarianceReport } from "@/features/projects/board-evidence-release-variance";

const generatedAt = "2026-05-20T10:00:00.000Z";

const archived = {
  generatedAt,
  records: [
    {
      actorEmail: "owner@example.com",
      actorName: "Workspace Owner",
      actorUserId: "user-owner",
      archiveHash: "sha256:archive-seal",
      archiveId: "board-evidence-release-archive:workspace-board:release-2026-05-20:20260520",
      archivedAt: generatedAt,
      closeoutHash: "sha256:previous-closeout",
      closeoutJsonFileName: "workspace-board-board-evidence-closeout-report-20260520.json",
      closeoutStatus: "ready",
      promotionAllowed: true,
      promotionGateHash: "sha256:promotion-gate",
      promotionGateJsonFileName: "workspace-board-board-evidence-release-promotion-gate-20260520.json",
      promotionGateStatus: "ready",
      releasePromotionId: "release-2026-05-20",
      workspaceId: "workspace-board",
    },
  ],
  summary: {
    archiveCount: 1,
    latestArchiveHash: "sha256:archive-seal",
    nextAction: "Board evidence release archive is sealed for release promotion.",
    promotionAllowed: true,
    status: "archived",
  },
  workspaceId: "workspace-board",
} as BoardEvidenceReleaseArchiveRecordReport;

const currentCloseout = {
  csvContent: "section_id,status\nlock,blocked\n",
  jsonContent: JSON.stringify({
    sections: [{ id: "lock", score: 45, status: "blocked" }],
    summary: { closeoutScore: 68, status: "blocked" },
  }),
  jsonFileName: "workspace-board-board-evidence-closeout-report-20260521.json",
  sections: [
    {
      fileCount: 1,
      id: "lock",
      nextAction: "Lock rejected evidence row before promotion.",
      recordCount: 1,
      score: 45,
      sourceHash: "sha256:packet-lock-current",
      status: "blocked",
      title: "Packet lock",
    },
  ],
  summary: {
    attachmentFileCount: 1,
    auditTrailCount: 1,
    blockedSectionCount: 1,
    closeoutScore: 68,
    nextAction: "Lock rejected evidence row before promotion.",
    readySectionCount: 4,
    sectionCount: 5,
    status: "blocked",
    verificationCheckCount: 1,
    watchSectionCount: 0,
  },
  workspaceId: "workspace-board",
} as BoardEvidenceCloseoutReport;

const readiness = {
  generatedAt: "2026-05-21T10:00:00.000Z",
  risks: [
    {
      nextAction: "Lock rejected evidence row before promotion.",
      ownerName: "Release Manager",
      readinessScore: 45,
      riskLevel: "critical",
      status: "blocked",
      taskId: "decision:blocked",
      title: "Blocked board evidence",
    },
  ],
  summary: {
    carryForwardCount: 1,
    nextAction: "Lock rejected evidence row before promotion.",
    readinessScore: 68,
    scoreDelta: -32,
    status: "blocked",
    taskCount: 1,
    trendPointCount: 2,
    unresolvedAttachmentRiskCount: 1,
  },
  workspaceId: "workspace-board",
} as BoardAuditEvidenceReadinessDigest;

const variance = createBoardEvidenceReleaseVarianceReport({
  archive: archived,
  closeout: currentCloseout,
  generatedAt: "2026-05-21T10:00:00.000Z",
  readiness,
  workspaceId: "workspace-board",
});

assert.equal(variance.summary.status, "changed");
assert.equal(variance.summary.varianceCount, 4);
assert.equal(variance.summary.blockerCount, 3);
assert.equal(variance.summary.currentReadinessScore, 68);
assert.equal(variance.summary.nextAction, "Lock rejected evidence row before promotion.");
assert.equal(variance.variances.find((row) => row.id === "closeout-hash")?.status, "changed");
assert.equal(variance.variances.find((row) => row.id === "closeout-status")?.severity, "critical");
assert.equal(variance.variances.find((row) => row.id === "readiness-score")?.delta, -32);
assert.match(variance.csvContent, /variance_id,severity,status,archived_value,current_value,delta,next_action/);
assert.match(variance.jsonContent, /"currentReadinessScore": 68/);
assert.equal(variance.csvFileName, "workspace-board-board-evidence-release-variance-20260521.csv");
assert.equal(variance.jsonFileName, "workspace-board-board-evidence-release-variance-20260521.json");

console.log("board evidence release variance smoke passed");
