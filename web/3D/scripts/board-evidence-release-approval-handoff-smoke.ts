import assert from "node:assert/strict";
import { createBoardEvidenceReleaseApprovalHandoffReport } from "@/features/projects/board-evidence-release-approval-handoff";
import type { BoardEvidenceCloseoutReport } from "@/features/projects/board-evidence-closeout-report";
import type { BoardEvidencePacketLockReport } from "@/features/projects/board-evidence-packet-lock";
import type { WorkspaceMemberRow } from "@/features/workspaces/types";

const generatedAt = "2026-05-20T10:00:00.000Z";

const packetLock: BoardEvidencePacketLockReport = {
  csvContent: "",
  csvDataUri: "",
  csvFileName: "",
  generatedAt,
  jsonContent: "",
  jsonDataUri: "",
  jsonFileName: "",
  lockActor: {
    email: "owner@example.com",
    name: "Workspace Owner",
    userId: "user-owner",
  },
  releasePromotionId: "release-2026-05-20",
  rows: [
    {
      acceptanceStatus: "accepted",
      acknowledgedAt: "2026-05-20T09:00:00.000Z",
      lockHash: "sha256:locked-row",
      lockState: "locked",
      nextAction: "Accepted evidence row is frozen for release promotion.",
      ownerName: "Evidence Owner",
      taskId: "decision:ready",
      title: "Ready board evidence",
      verificationStatus: "verified",
    },
    {
      acceptanceStatus: "rejected",
      acknowledgedAt: null,
      lockHash: null,
      lockState: "blocked",
      nextAction: "Attach corrected replay export before promotion.",
      ownerName: "Release Manager",
      taskId: "decision:blocked",
      title: "Blocked board evidence",
      verificationStatus: "missing",
    },
  ],
  summary: {
    blockedCount: 1,
    lockScore: 50,
    lockedCount: 1,
    nextAction: "Attach corrected replay export before promotion.",
    openCount: 0,
    promotionBlocked: true,
    status: "blocked",
    taskCount: 2,
  },
  workspaceId: "workspace-board",
};

const closeout: BoardEvidenceCloseoutReport = {
  csvContent: "",
  csvDataUri: "",
  csvFileName: "",
  generatedAt,
  jsonContent: "",
  jsonDataUri: "",
  jsonFileName: "",
  sections: [
    {
      fileCount: 1,
      id: "lock",
      nextAction: "Attach corrected replay export before promotion.",
      recordCount: 1,
      score: 50,
      sourceHash: "sha256:packet-lock",
      status: "blocked",
      title: "Packet lock",
    },
  ],
  summary: {
    attachmentFileCount: 1,
    auditTrailCount: 2,
    blockedSectionCount: 1,
    closeoutScore: 50,
    nextAction: "Attach corrected replay export before promotion.",
    readySectionCount: 4,
    sectionCount: 5,
    status: "blocked",
    verificationCheckCount: 1,
    watchSectionCount: 0,
  },
  workspaceId: "workspace-board",
};

const members: WorkspaceMemberRow[] = [
  {
    email: "owner@example.com",
    id: "member-owner",
    joinedAt: generatedAt,
    name: "Workspace Owner",
    role: "owner",
    userId: "user-owner",
  },
  {
    email: "admin@example.com",
    id: "member-admin",
    joinedAt: generatedAt,
    name: "Release Admin",
    role: "admin",
    userId: "user-admin",
  },
  {
    email: "editor@example.com",
    id: "member-editor",
    joinedAt: generatedAt,
    name: "Evidence Owner",
    role: "editor",
    userId: "user-editor",
  },
];

const handoff = createBoardEvidenceReleaseApprovalHandoffReport({
  closeout,
  generatedAt,
  members,
  packetLock,
  releasePromotionId: "release-2026-05-20",
  workspaceId: "workspace-board",
});

assert.equal(handoff.summary.status, "blocked");
assert.equal(handoff.summary.signerCount, 4);
assert.equal(handoff.summary.dependencyBlockerCount, 3);
assert.equal(handoff.summary.handoffScore, 40);
assert.equal(handoff.summary.nextAction, "Attach corrected replay export before promotion.");
assert.equal(handoff.signers[0]?.role, "accountable");
assert.equal(handoff.signers[0]?.dueAt, "2026-05-22T10:00:00.000Z");
assert.equal(handoff.signers.find((signer) => signer.role === "packet-owner")?.name, "Evidence Owner");
assert.equal(handoff.signers.find((signer) => signer.name === "Release Manager")?.email, null);
assert.equal(handoff.dependencies.filter((dependency) => dependency.status === "blocked").length, 3);
assert.match(handoff.jsonContent, /"releasePromotionId": "release-2026-05-20"/);
assert.match(handoff.csvContent, /signer_id,role,status,name,email,due_at,dependency_count,next_action/);
assert.equal(handoff.jsonFileName, "workspace-board-board-evidence-release-approval-handoff-20260520.json");
assert.equal(handoff.csvFileName, "workspace-board-board-evidence-release-approval-handoff-20260520.csv");

console.log("board evidence release approval handoff smoke passed");
