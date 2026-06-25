import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ContentScheduleSummary } from "@/db/content-planner";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { TeamWorkspaceManagementSummary } from "@/db/team-workspace-management";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import { createEnterpriseContentOperationsCalendar } from "@/features/content-planner/enterprise-content-operations-calendar";

describe("enterprise content operations calendar", () => {
  test("creates campaign capacity plans, dependency heatmaps, staffing signals, and recovery playbooks", () => {
    const center = createEnterpriseContentOperationsCalendar({
      campaigns: [
        createCampaign({
          id: "campaign-launch",
          name: "Spring launch",
          launchAt: "2026-05-24T10:00:00.000Z",
          deliverables: [
            createDeliverable({
              id: "deliverable-social",
              projectId: "project-social",
              projectName: "Spring social",
              channel: "Instagram",
              status: "planned",
              approvalStatus: "changes-requested",
            }),
            createDeliverable({
              id: "deliverable-email",
              projectId: "project-email",
              projectName: "Spring email",
              channel: "Email",
              status: "in-progress",
              approvalStatus: "in-review",
            }),
            createDeliverable({
              id: "deliverable-web",
              projectId: "project-web",
              projectName: "Spring website",
              channel: "Website",
              status: "done",
              approvalStatus: "approved",
            }),
            createDeliverable({
              id: "deliverable-video",
              projectId: "project-video",
              projectName: "Spring video",
              channel: "YouTube",
              status: "planned",
              approvalStatus: "approved",
            }),
          ],
        }),
      ],
      contentScheduleItems: [
        createScheduleItem({
          id: "schedule-web",
          projectId: "project-web",
          channel: "Website",
          status: "planned",
          scheduledAt: "2026-05-23T09:00:00.000Z",
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
          taskDueAt: "2026-05-22T09:00:00.000Z",
          taskStatus: "in-progress",
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
              role: "member",
            }),
            createMember({
              id: "member-blake",
              userId: "user-blake",
              email: "blake@example.com",
              role: "admin",
            }),
          ],
          pendingInvites: [
            {
              id: "invite-casey",
              workspaceId: "workspace-growth",
              email: "casey@example.com",
              role: "member",
              expiresAt: "2026-05-25T09:00:00.000Z",
              createdAt: "2026-05-19T09:00:00.000Z",
            },
          ],
        }),
      ],
      auditLogs: [
        createAuditLog({
          id: "audit-schedule",
          action: "content.scheduled",
          targetId: "campaign-launch",
          summary: "Website launch item scheduled.",
        }),
      ],
      now: "2026-05-19T10:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.campaigns, 1);
    assert.equal(center.totals.deliverables, 4);
    assert.equal(center.totals.scheduledItems, 1);
    assert.equal(center.totals.capacityPlans, 1);
    assert.equal(center.totals.dependencyHeatmapCells, 4);
    assert.equal(center.totals.staffingSignals, 3);
    assert.equal(center.totals.recoveryPlaybooks, 1);
    assert.equal(center.totals.publicationGaps, 3);

    const capacity = center.capacityPlans[0];
    assert.equal(capacity?.campaignName, "Spring launch");
    assert.equal(capacity?.daysToLaunch, 5);
    assert.equal(capacity?.unscheduledDeliverables, 3);
    assert.equal(capacity?.status, "review");
    assert.ok(capacity?.detail.includes("3 unscheduled"));

    const socialHeatmap = center.dependencyHeatmap.find(
      (cell) => cell.channel === "Instagram",
    );
    assert.equal(socialHeatmap?.status, "blocked");
    assert.equal(socialHeatmap?.blockers.includes("approval"), true);
    assert.equal(socialHeatmap?.blockers.includes("schedule"), true);
    assert.equal(socialHeatmap?.openTasks, 1);

    const alexSignal = center.staffingSignals.find(
      (signal) => signal.ownerName === "Alex",
    );
    assert.equal(alexSignal?.status, "blocked");
    assert.equal(alexSignal?.overdueTasks, 1);
    assert.ok(alexSignal?.campaignIds.includes("campaign-launch"));

    const inviteSignal = center.staffingSignals.find(
      (signal) => signal.kind === "pending-invite",
    );
    assert.equal(inviteSignal?.ownerName, "casey@example.com");
    assert.equal(inviteSignal?.status, "review");

    const playbook = center.recoveryPlaybooks[0];
    assert.equal(playbook?.status, "blocked");
    assert.ok(
      playbook?.steps.some((step) => step.includes("Schedule 3 remaining")),
    );
    assert.ok(
      center.nextActions.some((action) => action.includes("Spring launch")),
    );

    const packet = decodePacket(playbook?.dataUrl ?? "");
    assert.equal(
      packet.kind,
      "essence-studio.enterprise-content-operations-calendar",
    );
    assert.equal(packet.campaign.id, "campaign-launch");
    assert.equal(packet.capacityPlan.unscheduledDeliverables, 3);
    assert.equal(packet.dependencyHeatmap.length, 4);
    assert.equal(packet.staffingSignals.length, 3);
  });
});

function decodePacket(dataUrl: string) {
  const [, payload = ""] = dataUrl.split(",");

  return JSON.parse(decodeURIComponent(payload)) as {
    kind: string;
    campaign: { id: string };
    capacityPlan: { unscheduledDeliverables: number };
    dependencyHeatmap: unknown[];
    staffingSignals: unknown[];
  };
}

function createCampaign(
  overrides: Partial<CampaignBoardSummary> = {},
): CampaignBoardSummary {
  return {
    id: "campaign-1",
    name: "Campaign",
    brief: "Launch campaign brief.",
    goal: "Drive launch demand.",
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

function createScheduleItem(
  overrides: Partial<ContentScheduleSummary> = {},
): ContentScheduleSummary {
  return {
    id: "schedule-1",
    projectId: "project-1",
    projectName: "Project",
    title: "Scheduled post",
    channel: "Instagram",
    caption: "Launch caption",
    status: "planned",
    scheduledAt: "2026-05-23T09:00:00.000Z",
    createdAt: "2026-05-19T09:00:00.000Z",
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
    authorName: "Owner",
    body: "Review task",
    resolved: false,
    taskStatus: "todo",
    taskAssigneeName: "Alex",
    taskDueAt: "2026-05-20T09:00:00.000Z",
    createdAt: "2026-05-19T08:00:00.000Z",
    updatedAt: "2026-05-19T09:00:00.000Z",
    ...overrides,
  };
}

function createWorkspace(
  overrides: Partial<TeamWorkspaceManagementSummary> = {},
): TeamWorkspaceManagementSummary {
  return {
    id: "workspace-1",
    ownerId: "owner-1",
    name: "Workspace",
    role: "admin",
    pendingInviteCount: 0,
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-19T09:00:00.000Z",
    members: [createMember()],
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
    workspaceId: "workspace-growth",
    userId: "user-1",
    email: "alex@example.com",
    role: "member",
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-19T09:00:00.000Z",
    ...overrides,
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit-1",
    action: "content.scheduled",
    targetType: "content",
    targetId: "campaign-1",
    summary: "Content scheduled.",
    actorEmail: "ops@example.com",
    metadata: {},
    createdAt: "2026-05-19T09:00:00.000Z",
    ...overrides,
  };
}
