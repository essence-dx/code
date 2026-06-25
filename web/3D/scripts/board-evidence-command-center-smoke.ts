import assert from "node:assert/strict";
import {
  applyBoardAuditTaskPersistence,
  createBoardAuditFollowUpTasksReport,
} from "@/features/projects/board-audit-follow-up-tasks";
import { createBoardAuditEvidenceAcceptanceWorkflow } from "@/features/projects/board-audit-evidence-acceptance";
import { createBoardAuditEvidenceAttachmentManifest } from "@/features/projects/board-audit-evidence-manifest";
import { createBoardAuditEvidenceReadinessDigest } from "@/features/projects/board-audit-evidence-readiness-digest";
import { createBoardAuditEvidenceVerificationReport } from "@/features/projects/board-audit-evidence-verification";
import { createBoardEvidenceCommandCenter } from "@/features/projects/board-evidence-command-center";

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

const readiness = createBoardAuditEvidenceReadinessDigest({
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

const commandCenter = createBoardEvidenceCommandCenter({
  acceptance,
  generatedAt,
  manifest,
  readiness,
  verification,
  workspaceId: "workspace-board",
});

assert.equal(commandCenter.summary.status, "blocked");
assert.equal(commandCenter.summary.commandScore, 63);
assert.equal(commandCenter.summary.stageCount, 4);
assert.equal(commandCenter.summary.blockedStageCount, 4);
assert.equal(commandCenter.summary.actionCount, 4);
assert.match(commandCenter.summary.nextAction, /Attach exported evidence file/);
assert.deepEqual(
  commandCenter.stages.map((stage) => stage.id),
  ["manifest", "verification", "acceptance", "readiness"],
);
assert.equal(commandCenter.actions[0]?.stageId, "manifest");
assert.equal(commandCenter.actions[0]?.priority, "critical");
assert.match(commandCenter.actions.find((action) => action.stageId === "acceptance")?.label ?? "", /acceptance/);
assert.match(commandCenter.csvContent, /stage_id,status,score,priority,next_action/);
assert.match(commandCenter.jsonContent, /"actions"/);
assert.equal(commandCenter.csvFileName, "workspace-board-board-evidence-command-center-20260520.csv");

console.log("board evidence command center smoke passed");
