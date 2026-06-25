import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";
import { createCollaborativeProofingCompareRooms } from "@/features/review/collaborative-proofing-compare-rooms";

describe("collaborative proofing compare rooms", () => {
  test("creates visual snapshots, decision trails, signed approval snapshots, and rollback packets", () => {
    const center = createCollaborativeProofingCompareRooms({
      projects: [
        createProject({
          id: "project-launch",
          name: "Launch concept",
          approvalStatus: "changes-requested",
          thumbnail: "data:image/png;base64,current",
        }),
        createProject({
          id: "project-approved",
          name: "Approved story",
          approvalStatus: "approved",
          thumbnail: "data:image/png;base64,approved-current",
        }),
      ],
      projectVersions: [
        createVersion({
          id: "version-launch-new",
          projectId: "project-launch",
          name: "Launch concept v2",
          thumbnail: "data:image/png;base64,version-new",
          createdAt: "2026-05-19T08:00:00.000Z",
        }),
        createVersion({
          id: "version-launch-old",
          projectId: "project-launch",
          name: "Launch concept v1",
          thumbnail: "data:image/png;base64,version-old",
          createdAt: "2026-05-18T08:00:00.000Z",
        }),
        createVersion({
          id: "version-approved",
          projectId: "project-approved",
          name: "Approved story v1",
          thumbnail: "data:image/png;base64,approved-version",
          createdAt: "2026-05-19T07:00:00.000Z",
        }),
      ],
      reviewTasks: [
        createReviewTask({
          id: "task-cta",
          projectId: "project-launch",
          projectName: "Launch concept",
          body: "Move CTA above the fold before approval.",
          taskStatus: "todo",
          resolved: false,
        }),
        createReviewTask({
          id: "task-copy",
          projectId: "project-launch",
          projectName: "Launch concept",
          body: "Tighten the headline and keep benefit language.",
          taskStatus: "done",
          resolved: true,
        }),
      ],
      projectHandoffPackets: [
        createHandoffPacket({
          projectId: "project-launch",
          projectName: "Launch concept",
          approvalStatus: "changes-requested",
          status: "blocked",
        }),
        createHandoffPacket({
          projectId: "project-approved",
          projectName: "Approved story",
          approvalStatus: "approved",
          status: "ready",
        }),
      ],
      auditLogs: [
        createAuditLog({
          id: "audit-launch-approval",
          targetId: "project-launch",
          action: "approval.updated",
          summary: "Changes requested after stakeholder proof.",
        }),
        createAuditLog({
          id: "audit-approved-approval",
          targetId: "project-approved",
          action: "approval.updated",
          summary: "Approved for publish.",
        }),
      ],
      now: "2026-05-19T12:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.rooms, 2);
    assert.equal(center.totals.visualSnapshots, 2);
    assert.equal(center.totals.decisionTrailItems, 6);
    assert.equal(center.totals.signedApprovalSnapshots, 2);
    assert.equal(center.totals.rollbackPackets, 2);
    assert.equal(center.totals.blockedRooms, 1);

    const launch = center.rooms.find(
      (room) => room.projectId === "project-launch",
    );
    assert.equal(launch?.status, "blocked");
    assert.ok(launch?.nextAction.includes("Resolve"));
    assert.equal(launch?.visualSnapshot.status, "ready");
    assert.ok(launch?.visualSnapshot.changedFields.includes("thumbnail"));
    assert.equal(launch?.decisionTrail.items.length, 4);
    assert.equal(launch?.signedApprovalSnapshot.status, "blocked");
    assert.match(launch?.signedApprovalSnapshot.signature ?? "", /^proof-/);
    assert.equal(launch?.rollbackPacket.status, "ready");

    const rollback = decodePacket(launch?.rollbackPacket.dataUrl ?? "");
    assert.equal(rollback.kind, "essence-studio.proofing-rollback-packet");
    assert.equal(rollback.projectId, "project-launch");
    assert.equal(rollback.versionId, "version-launch-new");

    const approved = center.rooms.find(
      (room) => room.projectId === "project-approved",
    );
    assert.equal(approved?.status, "ready");
    assert.equal(approved?.signedApprovalSnapshot.status, "ready");
  });
});

function decodePacket(dataUrl: string) {
  const [, payload = ""] = dataUrl.split(",");

  return JSON.parse(decodeURIComponent(payload)) as {
    kind: string;
    projectId: string;
    versionId: string;
  };
}

function createProject(
  overrides: Partial<ProjectSummary> & Pick<ProjectSummary, "id" | "name">,
): ProjectSummary {
  return {
    id: overrides.id,
    name: overrides.name,
    width: 1080,
    height: 1080,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: overrides.thumbnail ?? null,
    publicShareId: null,
    editShareId: "share-edit",
    editSharePermission: "comment",
    approvalStatus: overrides.approvalStatus ?? "in-review",
    starred: false,
    deletedAt: null,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-05-19T10:00:00.000Z",
  };
}

function createVersion(
  overrides: ProjectVersionSummary,
): ProjectVersionSummary {
  return overrides;
}

function createReviewTask(
  overrides: Partial<ReviewTaskSummary> &
    Pick<ReviewTaskSummary, "id" | "projectId" | "projectName" | "body">,
): ReviewTaskSummary {
  return {
    id: overrides.id,
    projectId: overrides.projectId,
    projectName: overrides.projectName,
    pageId: "page-1",
    elementId: null,
    authorName: "Reviewer",
    body: overrides.body,
    resolved: overrides.resolved ?? false,
    taskStatus: overrides.taskStatus ?? "todo",
    taskAssigneeName: overrides.taskAssigneeName ?? "Design owner",
    taskDueAt: overrides.taskDueAt ?? "2026-05-20T10:00:00.000Z",
    createdAt: overrides.createdAt ?? "2026-05-19T09:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-05-19T09:30:00.000Z",
  };
}

function createHandoffPacket(input: {
  projectId: string;
  projectName: string;
  approvalStatus: ProjectSummary["approvalStatus"];
  status: ProjectHandoffPacket["status"];
}): ProjectHandoffPacket {
  return {
    projectId: input.projectId,
    projectName: input.projectName,
    updatedAt: "2026-05-19T10:00:00.000Z",
    approvalStatus: input.approvalStatus,
    packetScore: input.status === "ready" ? 96 : 44,
    status: input.status,
    nextAction:
      input.status === "ready"
        ? "Ready for approval handoff."
        : "Resolve proofing notes before approval.",
    readinessReport: null,
    exportBundle: {
      status: "ready",
      completedCount: 1,
      storedArtifactCount: 1,
      failedCount: 0,
      latestFormatLabel: "PNG",
      latestArtifactName: "proof.png",
      latestCompletedAt: "2026-05-19T10:00:00.000Z",
      totalStoredBytes: 1200,
    },
    stakeholderNotes: {
      totalCount: input.status === "ready" ? 0 : 2,
      unresolvedCount: input.status === "ready" ? 0 : 1,
      openTaskCount: input.status === "ready" ? 0 : 1,
      overdueTaskCount: 0,
      latestNoteAt: "2026-05-19T09:30:00.000Z",
    },
    approvalHistory: [
      {
        id: `approval-${input.projectId}`,
        summary:
          input.approvalStatus === "approved"
            ? "Approved for publish."
            : "Changes requested after proof.",
        actorEmail: "reviewer@example.com",
        approvalStatus: input.approvalStatus,
        createdAt: "2026-05-19T10:00:00.000Z",
      },
    ],
    checklist: [],
  };
}

function createAuditLog(input: {
  id: string;
  targetId: string;
  action: string;
  summary: string;
}): WorkspaceAuditLogSummary {
  return {
    id: input.id,
    action: input.action,
    targetType: "project",
    targetId: input.targetId,
    summary: input.summary,
    actorEmail: "reviewer@example.com",
    metadata: {},
    createdAt: "2026-05-19T10:10:00.000Z",
  };
}
