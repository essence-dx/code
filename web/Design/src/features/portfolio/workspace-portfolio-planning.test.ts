import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ContentScheduleSummary } from "@/db/content-planner";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { TeamWorkspaceManagementSummary } from "@/db/team-workspace-management";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ProjectSummary } from "@/features/editor/types";
import type { ProjectDependencyGraph } from "@/features/projects/project-dependency-graph";
import { createWorkspacePortfolioPlanningCenter } from "@/features/portfolio/workspace-portfolio-planning";

describe("workspace portfolio planning", () => {
  test("creates goals, owner lanes, dependency maps, and campaign/project outcome tracks", () => {
    const center = createWorkspacePortfolioPlanningCenter({
      projects: [
        createProject({
          id: "project-social",
          name: "Spring social",
          approvalStatus: "changes-requested",
        }),
        createProject({
          id: "project-email",
          name: "Spring email",
          approvalStatus: "approved",
        }),
        createProject({
          id: "project-library",
          name: "Evergreen asset library",
          approvalStatus: "in-review",
        }),
      ],
      campaigns: [
        createCampaign({
          id: "campaign-spring",
          name: "Spring launch",
          goal: "Drive Spring campaign demand.",
          launchAt: "2026-05-24T10:00:00.000Z",
          deliverables: [
            createDeliverable({
              id: "deliverable-social",
              projectId: "project-social",
              projectName: "Spring social",
              status: "planned",
              approvalStatus: "changes-requested",
            }),
            createDeliverable({
              id: "deliverable-email",
              projectId: "project-email",
              projectName: "Spring email",
              channel: "Email",
              status: "done",
              approvalStatus: "approved",
            }),
            createDeliverable({
              id: "deliverable-website",
              projectId: null,
              projectName: null,
              channel: "Website",
              status: "planned",
              approvalStatus: "draft",
            }),
          ],
        }),
      ],
      reviewTasks: [
        createReviewTask({
          id: "task-social",
          projectId: "project-social",
          projectName: "Spring social",
          taskAssigneeName: "Alex",
          taskDueAt: "2026-05-18T09:00:00.000Z",
          taskStatus: "todo",
        }),
        createReviewTask({
          id: "task-email",
          projectId: "project-email",
          projectName: "Spring email",
          taskAssigneeName: "Blake",
          taskDueAt: "2026-05-23T09:00:00.000Z",
          taskStatus: "in-progress",
        }),
      ],
      contentScheduleItems: [
        createScheduleItem({
          id: "schedule-social",
          projectId: "project-social",
          status: "planned",
        }),
        createScheduleItem({
          id: "schedule-email",
          projectId: "project-email",
          channel: "Email",
          status: "published",
        }),
      ],
      teamManagement: [
        createWorkspace({
          id: "workspace-growth",
          name: "Growth team",
          members: [
            createMember({
              id: "member-alex",
              userId: "user-alex",
              email: "alex@example.com",
              role: "admin",
            }),
            createMember({
              id: "member-blake",
              userId: "user-blake",
              email: "blake@example.com",
              role: "member",
            }),
          ],
        }),
      ],
      projectDependencyGraph: createDependencyGraph(),
      auditLogs: [
        createAuditLog({
          id: "audit-portfolio",
          action: "campaign.updated",
          targetId: "campaign-spring",
          summary: "Campaign goal updated.",
        }),
      ],
      now: "2026-05-19T10:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.goals, 2);
    assert.equal(center.totals.ownerLanes, 3);
    assert.equal(center.totals.dependencyMaps, 2);
    assert.equal(center.totals.outcomeTracks, 2);
    assert.equal(center.totals.blockedGoals, 1);

    const campaignGoal = center.goals.find(
      (goal) => goal.campaignIds[0] === "campaign-spring",
    );
    assert.equal(campaignGoal?.title, "Spring launch");
    assert.equal(campaignGoal?.status, "blocked");
    assert.equal(campaignGoal?.ownerName, "Alex");
    assert.equal(campaignGoal?.metrics.approvedDeliverables, 1);
    assert.equal(campaignGoal?.metrics.scheduledDeliverables, 2);
    assert.equal(campaignGoal?.metrics.overdueTasks, 1);
    assert.equal(campaignGoal?.metrics.dependencyRisks, 2);

    const projectGoal = center.goals.find(
      (goal) => goal.projectIds[0] === "project-library",
    );
    assert.equal(projectGoal?.kind, "project");
    assert.equal(projectGoal?.status, "review");

    const alexLane = center.ownerLanes.find(
      (lane) => lane.ownerName === "Alex",
    );
    assert.equal(alexLane?.status, "blocked");
    assert.equal(alexLane?.overdueTasks, 1);
    assert.ok(alexLane?.goalIds.includes(campaignGoal?.id ?? ""));

    const campaignMap = center.dependencyMaps.find(
      (map) => map.goalId === campaignGoal?.id,
    );
    assert.equal(campaignMap?.status, "blocked");
    assert.equal(campaignMap?.riskCount, 2);
    assert.ok(campaignMap?.dependencySummary.includes("2 risks"));

    const campaignOutcome = center.outcomeTracks.find(
      (track) => track.kind === "campaign",
    );
    assert.equal(campaignOutcome?.status, "blocked");
    assert.ok(campaignOutcome?.evidence.includes("1/3 deliverables approved"));

    assert.ok(
      center.nextActions.some((action) => action.includes("Spring launch")),
    );
  });
});

function createProject(
  overrides: Partial<ProjectSummary> = {},
): ProjectSummary {
  return {
    id: "project-1",
    name: "Project",
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
    approvalStatus: "draft",
    starred: false,
    deletedAt: null,
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-19T09:00:00.000Z",
    ...overrides,
  };
}

function createCampaign(
  overrides: Partial<CampaignBoardSummary> = {},
): CampaignBoardSummary {
  return {
    id: "campaign-1",
    name: "Campaign",
    brief: "Campaign brief.",
    goal: "Launch the campaign.",
    audience: "Operators",
    status: "active",
    primaryBrandColor: "#0f172a",
    brandLogoName: "Logo",
    brandFontFamily: "Inter",
    launchAt: "2026-05-24T10:00:00.000Z",
    deliverables: [],
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-19T09:00:00.000Z",
    ...overrides,
  };
}

function createDeliverable(
  overrides: Partial<CampaignBoardSummary["deliverables"][number]> = {},
): CampaignBoardSummary["deliverables"][number] {
  return {
    id: "deliverable-1",
    projectId: "project-1",
    projectName: "Project",
    projectThumbnail: null,
    projectWidth: 1080,
    projectHeight: 1080,
    projectSourceProjectId: null,
    projectVariantProfileId: null,
    projectVariantName: null,
    role: "Post",
    channel: "Instagram",
    status: "planned",
    approvalStatus: "in-review",
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-19T09:00:00.000Z",
    ...overrides,
  };
}

function createReviewTask(
  overrides: Partial<ReviewTaskSummary> = {},
): ReviewTaskSummary {
  return {
    id: "task-1",
    projectId: "project-1",
    projectName: "Project",
    pageId: "page-1",
    elementId: null,
    authorName: "Reviewer",
    body: "Review copy.",
    resolved: false,
    taskStatus: "todo",
    taskAssigneeName: "Alex",
    taskDueAt: "2026-05-23T09:00:00.000Z",
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-19T09:00:00.000Z",
    ...overrides,
  };
}

function createScheduleItem(
  overrides: Partial<ContentScheduleSummary> = {},
): ContentScheduleSummary {
  return {
    id: "schedule-1",
    projectId: "project-1",
    projectName: "Project",
    title: "Scheduled item",
    channel: "Instagram",
    caption: "Launch caption",
    status: "planned",
    scheduledAt: "2026-05-23T09:00:00.000Z",
    createdAt: "2026-05-19T09:00:00.000Z",
    updatedAt: "2026-05-19T09:00:00.000Z",
    ...overrides,
  };
}

function createWorkspace(
  overrides: Partial<TeamWorkspaceManagementSummary> = {},
): TeamWorkspaceManagementSummary {
  return {
    id: "workspace-1",
    ownerId: "user-owner",
    name: "Workspace",
    role: "owner",
    pendingInviteCount: 0,
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-19T09:00:00.000Z",
    members: [],
    pendingInvites: [],
    recentActivity: [],
    ...overrides,
  };
}

function createMember(
  overrides: Partial<TeamWorkspaceManagementSummary["members"][number]> = {},
): TeamWorkspaceManagementSummary["members"][number] {
  return {
    id: "member-1",
    workspaceId: "workspace-1",
    userId: "user-1",
    email: "member@example.com",
    role: "member",
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-19T09:00:00.000Z",
    ...overrides,
  };
}

function createDependencyGraph(): ProjectDependencyGraph {
  return {
    status: "blocked",
    score: 52,
    nodes: [],
    edges: [
      {
        id: "edge-campaign-social",
        type: "campaign",
        sourceNodeId: "campaign:campaign-spring",
        targetNodeId: "project:project-social",
        label: "Campaign deliverable",
        status: "blocked",
      },
    ],
    clusters: [
      {
        projectId: "project-social",
        projectName: "Spring social",
        status: "blocked",
        nodes: [],
        edges: [],
        riskCount: 2,
      },
      {
        projectId: "project-email",
        projectName: "Spring email",
        status: "ready",
        nodes: [],
        edges: [],
        riskCount: 0,
      },
      {
        projectId: "project-library",
        projectName: "Evergreen asset library",
        status: "review",
        nodes: [],
        edges: [],
        riskCount: 1,
      },
    ],
    risks: [
      {
        id: "risk-social-export",
        kind: "failed-export",
        title: "Failed export",
        detail: "Spring social export failed.",
        status: "blocked",
        nodeId: "project:project-social",
        href: "/editor/project-social",
      },
      {
        id: "risk-social-share",
        kind: "editable-public-surface",
        title: "Editable public link",
        detail: "Spring social has editable public access.",
        status: "blocked",
        nodeId: "project:project-social",
        href: "/editor/project-social",
      },
      {
        id: "risk-library",
        kind: "stale-variant",
        title: "Stale library variant",
        detail: "Library variant needs refresh.",
        status: "review",
        nodeId: "project:project-library",
        href: "/editor/project-library",
      },
    ],
    nextActions: ["Retry failed export for Spring social."],
    totals: {
      projects: 3,
      variants: 0,
      packages: 0,
      exports: 0,
      websites: 0,
      campaigns: 1,
      publicLinks: 0,
      risks: 3,
      edges: 1,
    },
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit-1",
    actorEmail: "ops@example.com",
    action: "workspace.updated",
    targetType: "workspace",
    targetId: "workspace-1",
    summary: "Workspace changed.",
    metadata: {},
    createdAt: "2026-05-19T08:30:00.000Z",
    ...overrides,
  };
}
