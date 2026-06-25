import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import { createLiveCollaborationSessionReconciliationCenter } from "@/features/collaboration/live-collaboration-session-reconciliation";
import { createProductionCollaborationRoomCenter } from "@/features/collaboration/production-collaboration-rooms";
import type { ProjectSummary } from "@/features/editor/types";
import type { WorkspaceProjectPresenceSummary } from "@/db/project-presence";

describe("production collaboration rooms", () => {
  test("turns live collaboration sessions into goal-led rooms with handoffs, owned conflicts, async updates, and evidence bundles", () => {
    const sessionReconciliation =
      createLiveCollaborationSessionReconciliationCenter({
        projects: [createProject()],
        presence: [
          createPresence({
            userId: "user-a",
            userName: "Avery",
            cursorX: 100,
            cursorY: 100,
            lastSeenAt: "2026-05-19T10:59:45.000Z",
          }),
          createPresence({
            userId: "user-b",
            userName: "Blake",
            cursorX: 112,
            cursorY: 110,
            lastSeenAt: "2026-05-19T10:59:50.000Z",
          }),
          createPresence({
            userId: "user-c",
            userName: "Casey",
            pageId: "page-footer",
            cursorX: 400,
            cursorY: 420,
            lastSeenAt: "2026-05-19T10:40:00.000Z",
          }),
        ],
        reviewTasks: [
          createTask({
            id: "task-lock",
            elementId: "hero-headline",
            taskAssigneeName: "Blake",
            taskStatus: "in-progress",
            body: "Own final headline review before launch handoff.",
          }),
          createTask({
            id: "task-async",
            pageId: "page-footer",
            taskAssigneeName: "Casey",
            taskStatus: "todo",
            body: "Confirm footer disclaimer after reconnect.",
          }),
        ],
        auditLogs: [
          createAuditLog({
            id: "audit-comment",
            action: "approval.updated",
            summary: "Avery requested final launch review.",
            targetId: "project-launch",
            actorEmail: "avery@example.com",
            createdAt: "2026-05-19T10:58:00.000Z",
          }),
          createAuditLog({
            id: "audit-operation-conflict",
            action: "collaboration.operation.conflicted",
            summary: "Blake hit a stale sync operation.",
            targetId: "project-launch",
            actorEmail: "blake@example.com",
            metadata: {
              operationId: "op-stale-headline",
              operationKind: "autosave-sync",
              actorName: "Blake",
              pageId: "page-hero",
              elementIds: ["hero-headline"],
              baseUpdatedAt: "2026-05-19T10:54:00.000Z",
              remoteUpdatedAt: "2026-05-19T10:58:00.000Z",
              clientRevision: 12,
              projectId: "project-launch",
            },
            createdAt: "2026-05-19T10:58:40.000Z",
          }),
        ],
        now: "2026-05-19T11:00:00.000Z",
      });

    const center = createProductionCollaborationRoomCenter({
      sessionReconciliation,
      reviewTasks: [
        createTask({
          id: "task-lock",
          elementId: "hero-headline",
          taskAssigneeName: "Blake",
          taskStatus: "in-progress",
          body: "Own final headline review before launch handoff.",
        }),
        createTask({
          id: "task-async",
          pageId: "page-footer",
          taskAssigneeName: "Casey",
          taskStatus: "todo",
          body: "Confirm footer disclaimer after reconnect.",
        }),
      ],
      auditLogs: [
        createAuditLog({
          id: "audit-comment",
          action: "approval.updated",
          summary: "Avery requested final launch review.",
          targetId: "project-launch",
          actorEmail: "avery@example.com",
          createdAt: "2026-05-19T10:58:00.000Z",
        }),
        createAuditLog({
          id: "audit-operation-conflict",
          action: "collaboration.operation.conflicted",
          summary: "Blake hit a stale sync operation.",
          targetId: "project-launch",
          actorEmail: "blake@example.com",
          metadata: {
            operationId: "op-stale-headline",
            operationKind: "autosave-sync",
            actorName: "Blake",
            pageId: "page-hero",
            elementIds: ["hero-headline"],
            baseUpdatedAt: "2026-05-19T10:54:00.000Z",
            remoteUpdatedAt: "2026-05-19T10:58:00.000Z",
            clientRevision: 12,
            projectId: "project-launch",
          },
          createdAt: "2026-05-19T10:58:40.000Z",
        }),
      ],
      now: "2026-05-19T11:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.rooms, 1);
    assert.equal(center.totals.sessionGoals, 1);
    assert.equal(center.totals.roleHandoffs, 4);
    assert.equal(center.totals.conflictOwners, 4);
    assert.equal(center.totals.asyncUpdates, 4);
    assert.equal(center.totals.evidenceBundles, 1);

    const room = center.rooms[0];
    assert.equal(room?.projectName, "Launch campaign");
    assert.equal(room?.sessionGoal.status, "blocked");
    assert.ok(room?.sessionGoal.title.includes("Resolve"));
    assert.ok(
      room?.roleHandoffs.some(
        (handoff) =>
          handoff.role === "reviewer" &&
          handoff.ownerName === "Blake" &&
          handoff.status === "blocked",
      ),
    );
    assert.ok(
      room?.roleHandoffs.some(
        (handoff) =>
          handoff.role === "facilitator" && handoff.ownerName === "Blake",
      ),
    );
    assert.ok(
      room?.conflictOwnership.some(
        (ownership) =>
          ownership.kind === "operation" &&
          ownership.ownerName === "Blake" &&
          ownership.target === "hero-headline",
      ),
    );
    assert.ok(
      room?.conflictOwnership.some(
        (ownership) =>
          ownership.kind === "reconnect" && ownership.ownerName === "Casey",
      ),
    );
    assert.ok(
      room?.asyncUpdates.some(
        (update) =>
          update.kind === "review-task" &&
          update.ownerName === "Casey" &&
          update.summary.includes("footer disclaimer"),
      ),
    );
    assert.ok(
      room?.asyncUpdates.some(
        (update) =>
          update.kind === "audit" &&
          update.summary === "Avery requested final launch review.",
      ),
    );
    assert.ok(
      center.nextActions.some((action) =>
        action.includes("Assign Blake to resolve autosave-sync"),
      ),
    );

    const bundle = decodeBundle(room?.evidenceBundle.dataUrl ?? "");
    assert.equal(bundle.kind, "essence-studio.production-collaboration-room");
    assert.equal(bundle.room.projectId, "project-launch");
    assert.equal(bundle.conflictOwnership.length, 4);
    assert.equal(bundle.asyncUpdates.length, 4);
    assert.ok(bundle.sourcePackets.sessionReplayPacketId);
  });
});

function decodeBundle(dataUrl: string) {
  const [, payload = ""] = dataUrl.split(",");

  return JSON.parse(decodeURIComponent(payload)) as {
    kind: string;
    room: { projectId: string };
    conflictOwnership: unknown[];
    asyncUpdates: unknown[];
    sourcePackets: { sessionReplayPacketId: string };
  };
}

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
    createdAt: "2026-05-19T09:00:00.000Z",
    updatedAt: "2026-05-19T10:55:00.000Z",
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
    lastSeenAt: "2026-05-19T10:59:45.000Z",
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
    taskDueAt: "2026-05-20T09:00:00.000Z",
    createdAt: "2026-05-19T09:00:00.000Z",
    updatedAt: "2026-05-19T10:30:00.000Z",
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
    createdAt: "2026-05-19T10:58:00.000Z",
    ...overrides,
  };
}
