import { strict as assert } from "node:assert";
import { applyWorkspaceReleaseRunbookTransition, type WorkspaceReleaseRunbookRecord } from "@/features/workspaces/release-runbook";

const record: WorkspaceReleaseRunbookRecord = {
  attachments: [],
  auditLogHref: "/projects?workspaceId=workspace-runbook#audit",
  batchId: "batch-runbook",
  blockerCount: 1,
  checklistEvidence: ["Resolve the release blocker."],
  comments: [],
  completedAt: null,
  detail: "Public link review needs approval.",
  dueAt: "2026-05-17T03:00:00.000Z",
  id: "record-runbook",
  milestoneId: "milestone-runbook",
  ownerEmail: "owner@example.com",
  ownerName: "Owner",
  ownerUserId: "user-owner",
  projectId: "project-runbook",
  projectName: "Runbook Scene",
  sourceKey: "project-runbook:review-gate:publicLink",
  status: "blocked",
  title: "Public link review",
  transitionHistory: [],
  workspaceId: "workspace-runbook",
};
const transitioned = applyWorkspaceReleaseRunbookTransition(record, {
  actorName: "Editor",
  actorUserId: "user-editor",
  attachment: {
    id: "attachment-evidence",
    label: "Review evidence",
    url: "https://example.com/evidence.png",
  },
  comment: {
    body: "Reviewer approved after embed smoke passed.",
    id: "comment-review",
  },
  nextOwner: {
    email: "editor@example.com",
    name: "Editor",
    userId: "user-editor",
  },
  nextStatus: "complete",
  note: "Release gate resolved.",
  now: "2026-05-17T03:10:00.000Z",
  transitionId: "transition-complete",
});

assert.equal(transitioned.status, "complete");
assert.equal(transitioned.completedAt, "2026-05-17T03:10:00.000Z");
assert.equal(transitioned.ownerUserId, "user-editor");
assert.equal(transitioned.comments.length, 1);
assert.equal(transitioned.attachments.length, 1);
assert.equal(transitioned.transitionHistory.length, 1);
assert.equal(transitioned.transitionHistory[0]?.fromStatus, "blocked");
assert.equal(transitioned.transitionHistory[0]?.toStatus, "complete");
assert.equal(transitioned.transitionHistory[0]?.fromOwnerUserId, "user-owner");
assert.equal(transitioned.transitionHistory[0]?.toOwnerUserId, "user-editor");

console.log("workspace release runbook transition smoke passed");
