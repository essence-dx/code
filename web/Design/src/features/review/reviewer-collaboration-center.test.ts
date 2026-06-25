import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";
import { createReviewerCollaborationCenter } from "@/features/review/reviewer-collaboration-center";

const now = new Date("2026-05-16T12:00:00.000Z");

describe("reviewer collaboration center", () => {
  test("reports ready review collaboration when links, approvals, assignments, and audit events are healthy", () => {
    const center = createReviewerCollaborationCenter({
      projects: [
        createProject({
          id: "comment-project",
          editShareId: "comment-link",
          editSharePermission: "comment",
          approvalStatus: "approved",
        }),
        createProject({
          id: "view-project",
          editShareId: "view-link",
          editSharePermission: "view",
          approvalStatus: "approved",
        }),
      ],
      templates: [createTemplate({ approvalStatus: "approved" })],
      campaigns: [
        createCampaign({
          deliverables: [
            createDeliverable({ approvalStatus: "approved", status: "done" }),
          ],
        }),
      ],
      reviewTasks: [createReviewTask({ taskStatus: "done" })],
      auditLogs: [createAuditLog({ action: "approval.updated" })],
      now,
    });

    assert.equal(center.status, "ready");
    assert.equal(center.totals.reviewOnlyLinks, 2);
    assert.equal(center.totals.approvalQueue, 0);
    assert.equal(center.totals.openTasks, 0);
    assert.equal(center.totals.approvalEvents, 1);
  });

  test("surfaces blocked review work when editable links, overdue tasks, and changes-requested approvals exist", () => {
    const center = createReviewerCollaborationCenter({
      projects: [
        createProject({
          editShareId: "edit-risk",
          editSharePermission: "edit",
          approvalStatus: "changes-requested",
        }),
      ],
      templates: [createTemplate({ approvalStatus: "draft" })],
      campaigns: [
        createCampaign({
          deliverables: [
            createDeliverable({ approvalStatus: "changes-requested" }),
          ],
        }),
      ],
      reviewTasks: [
        createReviewTask({
          taskStatus: "todo",
          taskAssigneeName: null,
          taskDueAt: "2026-05-15T00:00:00.000Z",
        }),
      ],
      auditLogs: [],
      now,
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.editableShareRisks, 1);
    assert.equal(center.totals.overdueTasks, 1);
    assert.ok(center.approvalQueue.length >= 3);
    assert.ok(center.nextActions.length > 0);
  });
});

function createProject(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: "project-1",
    name: "Launch design",
    width: 1080,
    height: 1080,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: null,
    publicShareId: null,
    editShareId: null,
    editSharePermission: "view",
    approvalStatus: "approved",
    starred: false,
    deletedAt: null,
    updatedAt: "2026-05-16T00:00:00.000Z",
    createdAt: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}

function createTemplate(
  overrides: Partial<DesignTemplateSummary> = {},
): DesignTemplateSummary {
  return {
    id: "template-1",
    name: "Launch template",
    creatorName: "Studio",
    creatorEmail: null,
    width: 1080,
    height: 1080,
    thumbnail: null,
    isBrandTemplate: false,
    isTeamTemplate: true,
    approvalStatus: "approved",
    marketplaceStatus: "published",
    marketplaceCollection: "launch",
    marketplaceSeason: null,
    marketplaceReviewNote: "",
    marketplacePublishedAt: "2026-05-16T00:00:00.000Z",
    marketplaceUseCount: 1,
    marketplaceViewCount: 1,
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}

function createCampaign(
  overrides: Partial<CampaignBoardSummary> = {},
): CampaignBoardSummary {
  return {
    id: "campaign-1",
    name: "Launch campaign",
    brief: "Launch the product.",
    goal: "Drive signups",
    audience: "Operators",
    status: "active",
    primaryBrandColor: "#111111",
    brandLogoName: "Logo",
    brandFontFamily: "Inter",
    launchAt: "2026-05-16T00:00:00.000Z",
    deliverables: [createDeliverable()],
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}

function createDeliverable(
  overrides: Partial<CampaignBoardSummary["deliverables"][number]> = {},
): CampaignBoardSummary["deliverables"][number] {
  return {
    id: "deliverable-1",
    projectId: "project-1",
    projectName: "Launch design",
    projectThumbnail: null,
    projectWidth: 1080,
    projectHeight: 1080,
    projectSourceProjectId: null,
    projectVariantProfileId: null,
    projectVariantName: null,
    role: "Hero deliverable",
    channel: "Social",
    status: "planned",
    approvalStatus: "approved",
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}

function createReviewTask(
  overrides: Partial<ReviewTaskSummary> = {},
): ReviewTaskSummary {
  return {
    id: "task-1",
    projectId: "project-1",
    projectName: "Launch design",
    pageId: "page-1",
    elementId: null,
    authorName: "Reviewer",
    body: "Review the launch design.",
    resolved: false,
    taskStatus: "todo",
    taskAssigneeName: "Mira",
    taskDueAt: "2026-05-20T00:00:00.000Z",
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
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
    summary: "Approval updated to approved.",
    actorEmail: "owner@example.com",
    metadata: {},
    createdAt: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}
