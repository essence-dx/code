import assert from "node:assert/strict";
import { createBoardAuditEvidenceAcceptanceWorkflow } from "@/features/projects/board-audit-evidence-acceptance";
import { createBoardAuditEvidenceAttachmentManifest } from "@/features/projects/board-audit-evidence-manifest";
import { createBoardAuditEvidenceReadinessDigest } from "@/features/projects/board-audit-evidence-readiness-digest";
import { createBoardAuditEvidenceVerificationReport } from "@/features/projects/board-audit-evidence-verification";
import { createBoardEvidenceCloseoutReport } from "@/features/projects/board-evidence-closeout-report";
import { createBoardEvidencePacketLockReport } from "@/features/projects/board-evidence-packet-lock";
import {
  applyBoardAuditTaskPersistence,
  createBoardAuditFollowUpTasksReport,
} from "@/features/projects/board-audit-follow-up-tasks";

const generatedAt = "2026-05-20T10:00:00.000Z";

const taskReport = applyBoardAuditTaskPersistence(
  createBoardAuditFollowUpTasksReport({
    decisionLedger: {
      decisions: [
        {
          id: "decision-1",
          nextAction: "Resolve launch decision.",
          owner: "Board Chair",
          score: 30,
          source: "replay-audit",
          sourceHash: "sha256:decision-source",
          sourceId: "replay-row-1",
          status: "blocked",
          title: "Launch decision",
        },
      ],
    },
    executiveDigest: null,
    freshnessMonitor: null,
    generatedAt,
    reviewerWorkload: null,
    workspaceId: "workspace-board",
  }),
  [
    {
      closedAt: "2026-05-20T09:00:00.000Z",
      closeoutNote: "Decision source attached to replay export.",
      dueAt: "2026-05-19T15:00:00.000Z",
      ownerEmail: "chair@example.com",
      ownerName: "Board Chair",
      ownerUserId: "user-chair",
      status: "closed",
      taskId: "decision:decision-1",
      updatedAt: generatedAt,
    },
  ],
);

const manifest = createBoardAuditEvidenceAttachmentManifest({
  evidenceFiles: [
    {
      byteSize: 1200,
      contentHash: "sha256:replay-export",
      kind: "replay-audit",
      label: "Board decision replay audit",
      path: "replay/board-decision-replay-audit.json",
      status: "ready",
    },
  ],
  generatedAt,
  report: taskReport,
  workspaceId: "workspace-board",
});

const verification = createBoardAuditEvidenceVerificationReport({
  generatedAt,
  manifest,
  signedPacketVerification: {
    rows: [
      {
        contentHash: "sha256:replay-export",
        status: "ready",
        verificationState: "verified",
      },
    ],
  },
  workspaceId: "workspace-board",
});

const acceptance = createBoardAuditEvidenceAcceptanceWorkflow({
  acceptances: [
    {
      acknowledgedAt: "2026-05-20T10:30:00.000Z",
      note: "Replay export evidence accepted for board closeout.",
      ownerEmail: "chair@example.com",
      ownerName: "Board Chair",
      ownerUserId: "user-chair",
      rejectionReason: null,
      status: "accepted",
      taskId: "decision:decision-1",
    },
  ],
  generatedAt,
  manifest,
  verification,
  workspaceId: "workspace-board",
});

const readiness = createBoardAuditEvidenceReadinessDigest({
  acceptance,
  generatedAt,
  manifest,
  verification,
  workspaceId: "workspace-board",
});

const packetLock = createBoardEvidencePacketLockReport({
  acceptance,
  generatedAt,
  lockActor: {
    email: "chair@example.com",
    name: "Board Chair",
    userId: "user-chair",
  },
  releasePromotionId: "release-2026-05-20",
  workspaceId: "workspace-board",
});

const closeout = createBoardEvidenceCloseoutReport({
  acceptance,
  generatedAt,
  manifest,
  packetLock,
  readiness,
  verification,
  workspaceId: "workspace-board",
});

assert.equal(closeout.summary.status, "ready");
assert.equal(closeout.summary.closeoutScore, 100);
assert.equal(closeout.summary.sectionCount, 5);
assert.equal(closeout.summary.blockedSectionCount, 0);
assert.equal(closeout.summary.attachmentFileCount, 1);
assert.equal(closeout.summary.auditTrailCount, 1);
assert.equal(closeout.summary.verificationCheckCount, 0);
assert.equal(closeout.sections.find((section) => section.id === "manifest")?.fileCount, 1);
assert.match(closeout.sections.find((section) => section.id === "lock")?.sourceHash ?? "", /^sha256:/);
assert.match(closeout.jsonContent, /"packetLock"/);
assert.match(closeout.csvContent, /section_id,status,score,records,files,source_hash,next_action/);
assert.equal(closeout.jsonFileName, "workspace-board-board-evidence-closeout-report-20260520.json");
assert.equal(closeout.csvFileName, "workspace-board-board-evidence-closeout-report-20260520.csv");

console.log("board evidence closeout report smoke passed");
