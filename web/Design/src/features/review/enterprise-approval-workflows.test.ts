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
import { createEnterpriseApprovalWorkflowCenter } from "@/features/review/enterprise-approval-workflows";

describe("enterprise approval workflow center", () => {
  test("builds workflow templates with owners, escalations, SLAs, and governance packets", () => {
    const center = createEnterpriseApprovalWorkflowCenter({
      projects: [
        createProject({
          id: "project-launch",
          name: "Launch page",
          approvalStatus: "changes-requested",
          updatedAt: "2026-05-17T09:00:00.000Z",
        }),
        createProject({
          id: "project-social",
          name: "Social cutdown",
          approvalStatus: "in-review",
          updatedAt: "2026-05-18T07:00:00.000Z",
        }),
        createProject({
          id: "project-ready",
          name: "Approved one-pager",
          approvalStatus: "approved",
        }),
      ],
      templates: [
        createTemplate({
          id: "template-launch-kit",
          name: "Launch kit",
          approvalStatus: "draft",
          marketplaceStatus: "review",
          creatorName: "Design Ops",
        }),
      ],
      campaigns: [
        createCampaign({
          id: "campaign-q3",
          name: "Q3 launch",
          deliverables: [
            createDeliverable({
              id: "deliverable-hero",
              projectId: "project-launch",
              projectName: "Launch page",
              role: "Hero",
              approvalStatus: "changes-requested",
            }),
            createDeliverable({
              id: "deliverable-email",
              projectId: "project-email",
              projectName: "Email announcement",
              role: "Email",
              approvalStatus: "in-review",
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
      ],
      auditLogs: [
        createAuditLog({
          id: "audit-approval",
          targetType: "project",
          targetId: "project-launch",
          summary: "Approval moved back to changes requested.",
        }),
      ],
      teamManagement: [
        createWorkspace({
          id: "workspace-core",
          name: "Core Studio",
          members: [
            createMember({
              id: "member-owner",
              workspaceId: "workspace-core",
              email: "owner@example.com",
              role: "owner",
            }),
            createMember({
              id: "member-admin",
              workspaceId: "workspace-core",
              email: "admin@example.com",
              role: "admin",
            }),
          ],
        }),
      ],
      now: "2026-05-18T09:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.workflowTemplates, 3);
    assert.equal(center.totals.pendingSubjects, 5);
    assert.equal(center.totals.overdueReviewerItems, 1);
    assert.equal(center.totals.blockedWorkflows > 0, true);

    const designWorkflow = center.workflowTemplates.find(
      (workflow) => workflow.id === "project-design-approval",
    );
    assert.equal(designWorkflow?.status, "blocked");
    assert.equal(designWorkflow?.reviewerSla.overdueCount, 1);
    assert.equal(designWorkflow?.reviewerSla.dueSoonCount, 1);
    assert.equal(
      designWorkflow?.stageOwners.some(
        (owner) =>
          owner.stage === "Review" && owner.ownerLabel === "Mira Reviewer",
      ),
      true,
    );
    assert.equal(
      designWorkflow?.escalationRules.some((rule) =>
        rule.trigger.includes("overdue reviewer SLA"),
      ),
      true,
    );

    assert.equal(
      center.governanceReports.some(
        (report) => report.id === "reviewer-slas" && report.status === "blocked",
      ),
      true,
    );
    assert.equal(
      center.nextActions.some((action) => action.includes("Launch page")),
      true,
    );
    assert.equal(
      center.governancePacket.download.fileName,
      "enterprise-approval-workflows.json",
    );
    assert.equal(
      center.governancePacket.download.href.startsWith(
        "data:application/json",
      ),
      true,
    );
  });

  test("keeps governance ready when approvals, owners, SLAs, and audit evidence are healthy", () => {
    const center = createEnterpriseApprovalWorkflowCenter({
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
      auditLogs: [createAuditLog()],
      teamManagement: [
        createWorkspace({
          members: [
            createMember({ role: "owner", email: "owner@example.com" }),
            createMember({ role: "admin", email: "admin@example.com" }),
          ],
        }),
      ],
      now: "2026-05-18T09:00:00.000Z",
    });

    assert.equal(center.status, "ready");
    assert.equal(center.totals.pendingSubjects, 0);
    assert.equal(center.totals.blockedWorkflows, 0);
    assert.deepEqual(center.nextActions, []);
    assert.equal(
      center.workflowTemplates.every(
        (workflow) => workflow.escalationRules.length === 0,
      ),
      true,
    );
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
    members: [createMember()],
    pendingInvites: [],
    recentActivity: [],
    createdAt: "2026-05-01T09:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createMember(
  overrides: Partial<TeamWorkspaceManagementSummary["members"][number]> = {},
): TeamWorkspaceManagementSummary["members"][number] {
  return {
    id: "member",
    workspaceId: "workspace",
    userId: "user",
    email: "user@example.com",
    role: "member",
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
