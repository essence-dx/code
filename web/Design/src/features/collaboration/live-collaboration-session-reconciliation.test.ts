import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ProjectSummary } from "@/features/editor/types";
import type { WorkspaceProjectPresenceSummary } from "@/db/project-presence";
import { createLiveCollaborationSessionReconciliationCenter } from "@/features/collaboration/live-collaboration-session-reconciliation";

describe("live collaboration session reconciliation", () => {
  test("builds presence history, reconnect recovery, cursor conflict queues, and evidence packets", () => {
    const center = createLiveCollaborationSessionReconciliationCenter({
      projects: [
        createProject({
          id: "project-launch",
          name: "Launch campaign",
        }),
      ],
      presence: [
        createPresence({
          userId: "user-a",
          userName: "Avery",
          cursorX: 100,
          cursorY: 120,
          lastSeenAt: "2026-05-18T09:59:40.000Z",
        }),
        createPresence({
          userId: "user-b",
          userName: "Blake",
          cursorX: 112,
          cursorY: 128,
          lastSeenAt: "2026-05-18T09:59:45.000Z",
        }),
        createPresence({
          userId: "user-c",
          userName: "Casey",
          pageId: "page-notes",
          cursorX: 400,
          cursorY: 420,
          lastSeenAt: "2026-05-18T09:42:00.000Z",
        }),
      ],
      reviewTasks: [
        createTask({
          id: "task-reconnect",
          taskAssigneeName: "Casey",
          body: "Reconnect before client review.",
        }),
        createTask({
          id: "task-lock",
          elementId: "hero-headline",
          taskAssigneeName: "Blake",
          taskStatus: "in-progress",
          body: "Reviewer is locking headline copy while comments resolve.",
        }),
      ],
      auditLogs: [
        createAuditLog({
          id: "audit-save",
          summary: "Launch campaign saved from collaboration session",
          targetId: "project-launch",
          createdAt: "2026-05-18T09:58:00.000Z",
        }),
        createAuditLog({
          id: "audit-operation-merged",
          action: "collaboration.operation.merged",
          summary: "Avery merged autosave operation.",
          targetId: "project-launch",
          metadata: {
            operationId: "op-merged",
            operationKind: "autosave-sync",
            actorUserId: "user-a",
            actorName: "Avery",
            pageId: "page-hero",
            elementIds: ["hero-headline"],
            baseUpdatedAt: "2026-05-18T09:55:00.000Z",
            clientRevision: 7,
            mergedAt: "2026-05-18T09:58:30.000Z",
          },
          createdAt: "2026-05-18T09:58:30.000Z",
        }),
        createAuditLog({
          id: "audit-operation-conflict",
          action: "collaboration.operation.conflicted",
          summary: "Blake hit a stale operation.",
          targetId: "project-launch",
          metadata: {
            operationId: "op-conflict",
            operationKind: "autosave-sync",
            actorUserId: "user-b",
            actorName: "Blake",
            pageId: "page-hero",
            elementIds: ["hero-headline"],
            baseUpdatedAt: "2026-05-18T09:54:00.000Z",
            clientRevision: 6,
            remoteUpdatedAt: "2026-05-18T09:58:30.000Z",
          },
          createdAt: "2026-05-18T09:58:40.000Z",
        }),
      ],
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.sessions, 1);
    assert.equal(center.totals.participants, 3);
    assert.equal(center.totals.reconnectRecoveries, 1);
    assert.equal(center.totals.cursorConflicts, 1);
    assert.equal(center.totals.operationMerges, 1);
    assert.equal(center.totals.operationConflicts, 1);
    assert.equal(center.totals.reviewerLocks, 1);
    assert.equal(center.totals.replayPackets, 1);

    const session = center.sessions[0];
    assert.equal(session?.projectName, "Launch campaign");
    assert.equal(session?.participants.length, 3);
    assert.equal(session?.presenceHistory[0]?.userName, "Blake");
    assert.equal(session?.operationMergeHistory[0]?.operationId, "op-conflict");
    assert.equal(session?.operationMergeHistory[0]?.status, "conflict");
    assert.equal(session?.reviewerLocks[0]?.assigneeName, "Blake");
    assert.equal(session?.reviewerLocks[0]?.lockTarget, "hero-headline");
    assert.ok(
      session?.cursorConflictQueue[0]?.recoverySteps.some((step) =>
        step.includes("Assign page focus"),
      ),
    );
    assert.ok(session?.sessionReplayPacket.download.href.startsWith("data:"));
    assert.ok(
      session?.sessionReplayPacket.timeline.some(
        (event) => event.kind === "operation" && event.status === "conflict",
      ),
    );
    assert.equal(session?.reconnectRecoveries[0]?.userName, "Casey");
    assert.equal(
      session?.cursorConflictQueue[0]?.participantNames.includes("Avery"),
      true,
    );
    assert.equal(
      session?.cursorConflictQueue[0]?.participantNames.includes("Blake"),
      true,
    );
    assert.equal(
      session?.evidencePacket.auditLogIds.includes("audit-save"),
      true,
    );
    assert.equal(
      session?.evidencePacket.download.href.startsWith("data:application/json"),
      true,
    );
    assert.equal(
      center.nextActions.some((action) => action.includes("Casey")),
      true,
    );
  });

  test("stays ready when active participants are separated and no reconnect recovery is needed", () => {
    const center = createLiveCollaborationSessionReconciliationCenter({
      projects: [createProject()],
      presence: [
        createPresence({
          userId: "user-a",
          userName: "Avery",
          cursorX: 100,
          cursorY: 120,
          lastSeenAt: "2026-05-18T09:59:40.000Z",
        }),
        createPresence({
          userId: "user-b",
          userName: "Blake",
          cursorX: 460,
          cursorY: 480,
          lastSeenAt: "2026-05-18T09:59:45.000Z",
        }),
      ],
      reviewTasks: [],
      auditLogs: [],
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(center.status, "ready");
    assert.equal(center.score, 100);
    assert.equal(center.totals.reconnectRecoveries, 0);
    assert.equal(center.totals.cursorConflicts, 0);
    assert.equal(center.totals.operationConflicts, 0);
    assert.equal(center.totals.reviewerLocks, 0);
    assert.deepEqual(center.nextActions, []);
  });
});

function createProject(
  overrides: Partial<ProjectSummary> = {},
): ProjectSummary {
  return {
    id: "project-launch",
    name: "Launch campaign",
    width: 1080,
    height: 1080,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: null,
    publicShareId: null,
    editShareId: "edit-launch",
    editSharePermission: "edit",
    approvalStatus: "in-review",
    starred: false,
    deletedAt: null,
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-18T09:55:00.000Z",
    ...overrides,
  };
}

function createPresence(
  overrides: Partial<WorkspaceProjectPresenceSummary> = {},
): WorkspaceProjectPresenceSummary {
  return {
    projectId: "project-launch",
    projectName: "Launch campaign",
    userId: "user-a",
    userName: "Avery",
    color: "#0ea5e9",
    pageId: "page-hero",
    cursorX: 100,
    cursorY: 120,
    lastSeenAt: "2026-05-18T09:59:40.000Z",
    ...overrides,
  };
}

function createTask(
  overrides: Partial<ReviewTaskSummary> = {},
): ReviewTaskSummary {
  return {
    id: "task",
    projectId: "project-launch",
    projectName: "Launch campaign",
    pageId: "page-hero",
    elementId: null,
    authorName: "Avery",
    body: "Review task",
    resolved: false,
    taskStatus: "todo",
    taskAssigneeName: "Avery",
    taskDueAt: "2026-05-19T09:00:00.000Z",
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-18T09:30:00.000Z",
    ...overrides,
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit",
    action: "project.renamed",
    targetType: "project",
    targetId: "project-launch",
    summary: "Project updated",
    actorEmail: "owner@example.com",
    metadata: {
      projectId: "project-launch",
    },
    createdAt: "2026-05-18T09:58:00.000Z",
    ...overrides,
  };
}
