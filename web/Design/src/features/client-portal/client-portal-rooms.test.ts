import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ProjectSummary } from "@/features/editor/types";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";
import { createClientPortalCenter } from "@/features/client-portal/client-portal-rooms";

const now = new Date("2026-05-16T12:00:00.000Z");

describe("client portal rooms", () => {
  test("creates a ready room for approval-safe reviewer access", () => {
    const center = createClientPortalCenter({
      projects: [createProject()],
      reviewTasks: [
        createReviewTask({
          taskStatus: "done",
          resolved: true,
        }),
      ],
      projectHandoffPackets: [createPacket()],
      auditLogs: [createAuditLog()],
      now,
    });

    assert.equal(center.status, "ready");
    assert.equal(center.rooms[0]?.viewMode, "review-room");
    assert.equal(center.rooms[0]?.canComment, true);
    assert.equal(center.totals.handoffDownloads, 1);
    assert.match(center.rooms[0]?.handoffDownload.dataUrl ?? "", /^data:/);
  });

  test("blocks rooms with edit-share risk and overdue scoped comments", () => {
    const center = createClientPortalCenter({
      projects: [
        createProject({
          editSharePermission: "edit",
          approvalStatus: "changes-requested",
        }),
      ],
      reviewTasks: [
        createReviewTask({
          taskStatus: "todo",
          taskDueAt: "2026-05-14T12:00:00.000Z",
          resolved: false,
        }),
      ],
      projectHandoffPackets: [],
      auditLogs: [],
      now,
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.rooms[0]?.viewMode, "editable-risk");
    assert.equal(center.totals.openComments, 1);
    assert.ok(center.nextActions[0]?.includes("Switch the reviewer link"));
  });
});

function createProject(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: "project-1",
    name: "Client campaign",
    width: 1080,
    height: 1080,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: null,
    publicShareId: null,
    editShareId: "edit-1",
    editSharePermission: "comment",
    approvalStatus: "approved",
    starred: false,
    deletedAt: null,
    updatedAt: "2026-05-16T10:00:00.000Z",
    createdAt: "2026-05-15T10:00:00.000Z",
    ...overrides,
  };
}

function createReviewTask(
  overrides: Partial<ReviewTaskSummary> = {},
): ReviewTaskSummary {
  return {
    id: "comment-1",
    projectId: "project-1",
    projectName: "Client campaign",
    pageId: "page-1",
    elementId: null,
    authorName: "Reviewer",
    body: "Looks good.",
    resolved: true,
    taskStatus: "none",
    taskAssigneeName: null,
    taskDueAt: null,
    createdAt: "2026-05-16T10:00:00.000Z",
    updatedAt: "2026-05-16T10:00:00.000Z",
    ...overrides,
  };
}

function createPacket(
  overrides: Partial<ProjectHandoffPacket> = {},
): ProjectHandoffPacket {
  return {
    projectId: "project-1",
    projectName: "Client campaign",
    updatedAt: "2026-05-16T10:00:00.000Z",
    approvalStatus: "approved",
    packetScore: 100,
    status: "ready",
    nextAction: "Ready for handoff.",
    readinessReport: null,
    exportBundle: {
      status: "ready",
      completedCount: 1,
      storedArtifactCount: 1,
      failedCount: 0,
      latestFormatLabel: "PDF",
      latestArtifactName: "client-campaign.pdf",
      latestCompletedAt: "2026-05-16T10:00:00.000Z",
      totalStoredBytes: 1200,
    },
    stakeholderNotes: {
      totalCount: 0,
      unresolvedCount: 0,
      openTaskCount: 0,
      overdueTaskCount: 0,
      latestNoteAt: null,
    },
    approvalHistory: [],
    checklist: [
      {
        id: "readiness",
        label: "Readiness",
        complete: true,
        detail: "Ready.",
      },
      {
        id: "exports",
        label: "Exports",
        complete: true,
        detail: "Ready.",
      },
      {
        id: "notes",
        label: "Notes",
        complete: true,
        detail: "Ready.",
      },
      {
        id: "approval",
        label: "Approval",
        complete: true,
        detail: "Ready.",
      },
    ],
    ...overrides,
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit-1",
    action: "approval.updated",
    targetType: "project",
    targetId: "project-1",
    summary: "Approved Client campaign.",
    actorEmail: "reviewer@example.com",
    metadata: {},
    createdAt: "2026-05-16T10:00:00.000Z",
    ...overrides,
  };
}
