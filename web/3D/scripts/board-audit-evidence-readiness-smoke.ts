import assert from "node:assert/strict";
import {
  applyBoardAuditTaskPersistence,
  createBoardAuditFollowUpTasksReport,
} from "@/features/projects/board-audit-follow-up-tasks";
import { createBoardAuditEvidenceAcceptanceWorkflow } from "@/features/projects/board-audit-evidence-acceptance";
import { createBoardAuditEvidenceAttachmentManifest } from "@/features/projects/board-audit-evidence-manifest";
import { createBoardAuditEvidenceReadinessDigest } from "@/features/projects/board-audit-evidence-readiness-digest";
import { createBoardAuditEvidenceVerificationReport } from "@/features/projects/board-audit-evidence-verification";

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
    freshnessMonitor: {
      rows: [
        {
          ageDays: 9,
          id: "packet:old",
          kind: "packet",
          nextAction: "Refresh stale board packet evidence.",
          owner: "Packet owner",
          score: 35,
          sourceHash: "sha256:packet-source",
          sourceId: "approval-history",
          status: "stale",
          title: "Active board packet",
        },
      ],
    },
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
    {
      closedAt: null,
      closeoutNote: "Packet still needs refreshed evidence file.",
      dueAt: "2026-05-19T15:00:00.000Z",
      ownerEmail: "packet@example.com",
      ownerName: "Packet owner",
      ownerUserId: "user-packet",
      status: "blocked",
      taskId: "evidence:packet:old",
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
  sourceFreshness: new Map([
    ["evidence:packet:old", "stale"],
    ["decision:decision-1", "fresh"],
  ]),
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
    {
      acknowledgedAt: "2026-05-20T10:45:00.000Z",
      note: "Packet export is missing and source hash is stale.",
      ownerEmail: "packet@example.com",
      ownerName: "Packet owner",
      ownerUserId: "user-packet",
      rejectionReason: "Missing refreshed packet evidence export.",
      status: "rejected",
      taskId: "evidence:packet:old",
    },
  ],
  generatedAt,
  manifest,
  verification,
  workspaceId: "workspace-board",
});

const digest = createBoardAuditEvidenceReadinessDigest({
  acceptance,
  generatedAt,
  manifest,
  previousDigests: [
    {
      generatedAt: "2026-05-19T10:00:00.000Z",
      readinessScore: 38,
    },
  ],
  verification,
  workspaceId: "workspace-board",
});

assert.equal(digest.summary.status, "blocked");
assert.equal(digest.summary.readinessScore, 58);
assert.equal(digest.summary.scoreDelta, 20);
assert.equal(digest.summary.unresolvedAttachmentRiskCount, 1);
assert.equal(digest.summary.carryForwardCount, 1);
assert.match(digest.summary.nextAction, /Missing refreshed packet evidence export/);
assert.equal(digest.trend[0]?.readinessScore, 38);
assert.equal(digest.trend[1]?.readinessScore, 58);
assert.equal(digest.risks[0]?.taskId, "evidence:packet:old");
assert.match(digest.recommendations[0]?.recommendation ?? "", /Packet owner/);
assert.match(digest.csvContent, /task_id,status,owner,readiness_score,risk_level,recommendation/);
assert.match(digest.jsonContent, /"recommendations"/);
assert.equal(digest.csvFileName, "workspace-board-board-audit-evidence-readiness-20260520.csv");

console.log("board audit evidence readiness smoke passed");
