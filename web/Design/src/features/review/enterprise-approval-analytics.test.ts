import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { TeamWorkspaceManagementSummary } from "@/db/team-workspace-management";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";
import { createEnterpriseApprovalAnalyticsCenter } from "@/features/review/enterprise-approval-analytics";

describe("enterprise approval analytics center", () => {
  test("builds cross-workspace trends, bottlenecks, reviewer forecasts, and executive packets", () => {
    const center = createEnterpriseApprovalAnalyticsCenter({
      projects: [
        createProject({
          id: "project-launch",
          name: "Launch page",
          approvalStatus: "changes-requested",
        }),
        createProject({
          id: "project-social",
          name: "Social cutdown",
          approvalStatus: "in-review",
        }),
        createProject({
          id: "project-client",
          name: "Client one-pager",
          approvalStatus: "approved",
        }),
      ],
      templates: [
        createTemplate({
          id: "template-client",
          name: "Client launch kit",
          approvalStatus: "draft",
          marketplaceStatus: "review",
        }),
      ],
      campaigns: [
        createCampaign({
          id: "campaign-core",
          name: "Core launch",
          deliverables: [
            createDeliverable({
              id: "deliverable-hero",
              projectId: "project-launch",
              projectName: "Launch page",
              approvalStatus: "changes-requested",
            }),
          ],
        }),
      ],
      reviewTasks: [
        createReviewTask({
          id: "task-overdue",
          projectId: "project-launch",
          projectName: "Launch page",
          taskAssigneeName: "Mira Reviewer",
          taskDueAt: "2026-05-15T00:00:00.000Z",
        }),
        createReviewTask({
          id: "task-soon",
          projectId: "project-social",
          projectName: "Social cutdown",
          taskAssigneeName: "Mira Reviewer",
          taskStatus: "in-progress",
          taskDueAt: "2026-05-19T00:00:00.000Z",
        }),
        createReviewTask({
          id: "task-client",
          projectId: "project-client",
          projectName: "Client one-pager",
          taskAssigneeName: "Client Reviewer",
          taskDueAt: "2026-05-24T00:00:00.000Z",
        }),
      ],
      auditLogs: [
        createAuditLog({
          id: "audit-core-current-1",
          targetType: "project",
          targetId: "project-launch",
          summary: "Launch page moved to changes requested.",
          metadata: { workspaceId: "workspace-core" },
          createdAt: "2026-05-17T10:00:00.000Z",
        }),
        createAuditLog({
          id: "audit-core-current-2",
          targetType: "campaign",
          targetId: "campaign-core",
          summary: "Campaign deliverable moved to review.",
          metadata: { workspaceId: "workspace-core" },
          createdAt: "2026-05-16T10:00:00.000Z",
        }),
        createAuditLog({
          id: "audit-core-previous",
          targetType: "project",
          targetId: "project-social",
          summary: "Social cutdown entered review.",
          metadata: { workspaceId: "workspace-core" },
          createdAt: "2026-05-08T10:00:00.000Z",
        }),
        createAuditLog({
          id: "audit-client-previous",
          targetType: "template",
          targetId: "template-client",
          summary: "Client template entered marketplace review.",
          metadata: { workspaceId: "workspace-client" },
          createdAt: "2026-05-07T10:00:00.000Z",
        }),
      ],
      teamManagement: [
        createWorkspace({
          id: "workspace-core",
          name: "Core Studio",
          role: "owner",
        }),
        createWorkspace({
          id: "workspace-client",
          name: "Client Ops",
          role: "admin",
        }),
      ],
      now: "2026-05-18T09:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.workspaces, 2);
    assert.equal(center.totals.pendingSubjects, 4);
    assert.equal(center.totals.blockedWorkspaces, 1);
    assert.equal(center.totals.reviewerForecasts, 2);

    const coreWorkspace = center.workspaceAnalytics.find(
      (workspace) => workspace.workspaceId === "workspace-core",
    );
    assert.equal(coreWorkspace?.status, "blocked");
    assert.equal(coreWorkspace?.trend.currentApprovalEvents, 2);
    assert.equal(coreWorkspace?.trend.previousApprovalEvents, 1);
    assert.equal(coreWorkspace?.trend.direction, "up");
    assert.equal(coreWorkspace?.overdueReviewTasks, 1);

    assert.equal(
      center.bottlenecks.some(
        (bottleneck) =>
          bottleneck.workspaceId === "workspace-core" &&
          bottleneck.stage === "Reviewer SLA" &&
          bottleneck.subjectNames.includes("Launch page"),
      ),
      true,
    );

    const miraForecast = center.reviewerForecasts.find(
      (forecast) => forecast.reviewerName === "Mira Reviewer",
    );
    assert.equal(miraForecast?.status, "blocked");
    assert.equal(miraForecast?.overdueTasks, 1);
    assert.equal(miraForecast?.forecastNext7Days, 3);

    assert.equal(
      center.nextActions.some((action) => action.includes("Launch page")),
      true,
    );
    assert.equal(
      center.executivePacket.download.fileName,
      "cross-workspace-approval-analytics.json",
    );
    assert.equal(
      center.executivePacket.download.href.startsWith(
        "data:application/json",
      ),
      true,
    );
  });

  test("stays ready when workspace approval trends and reviewer load are healthy", () => {
    const center = createEnterpriseApprovalAnalyticsCenter({
      projects: [createProject({ approvalStatus: "approved" })],
      templates: [createTemplate({ approvalStatus: "approved" })],
      campaigns: [
        createCampaign({
          deliverables: [
            createDeliverable({
              approvalStatus: "approved",
              status: "done",
            }),
          ],
        }),
      ],
      reviewTasks: [
        createReviewTask({
          taskStatus: "done",
          taskDueAt: "2026-05-15T00:00:00.000Z",
        }),
      ],
      auditLogs: [
        createAuditLog({
          metadata: { workspaceId: "workspace-ready" },
          createdAt: "2026-05-17T10:00:00.000Z",
        }),
      ],
      teamManagement: [
        createWorkspace({
          id: "workspace-ready",
          name: "Ready Studio",
          role: "owner",
        }),
      ],
      now: "2026-05-18T09:00:00.000Z",
    });

    assert.equal(center.status, "ready");
    assert.equal(center.totals.pendingSubjects, 0);
    assert.equal(center.totals.blockedWorkspaces, 0);
    assert.equal(center.bottlenecks.length, 0);
    assert.deepEqual(center.nextActions, []);
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
    updatedAt: "2026-05-18T00:00:00.000Z",
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
    launchAt: "2026-05-20T00:00:00.000Z",
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
    role: "Hero",
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
    taskAssigneeName: "Mira Reviewer",
    taskDueAt: "2026-05-20T00:00:00.000Z",
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}

function createWorkspace(
  overrides: Partial<TeamWorkspaceManagementSummary> = {},
): TeamWorkspaceManagementSummary {
  return {
    id: "workspace",
    ownerId: "user-owner",
    name: "Workspace",
    role: "owner",
    pendingInviteCount: 0,
    members: [],
    pendingInvites: [],
    recentActivity: [],
    createdAt: "2026-05-01T09:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
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
