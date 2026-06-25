import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ContentScheduleSummary } from "@/db/content-planner";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { TeamWorkspaceManagementSummary } from "@/db/team-workspace-management";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import { createProductionCapacityForecastingCenter } from "@/features/operations/production-capacity-forecasting";

describe("production capacity forecasting", () => {
  test("forecasts team, campaign, export, publishing, and scenario recovery pressure", () => {
    const center = createProductionCapacityForecastingCenter({
      campaigns: [
        createCampaign({
          id: "campaign-launch",
          name: "Launch sprint",
          launchAt: "2026-05-21T10:00:00.000Z",
          deliverables: [
            createDeliverable({
              id: "deliverable-social",
              projectId: "project-social",
              projectName: "Launch social",
              channel: "Instagram",
              status: "planned",
              approvalStatus: "changes-requested",
            }),
            createDeliverable({
              id: "deliverable-email",
              projectId: "project-email",
              projectName: "Launch email",
              channel: "Email",
              status: "in-progress",
              approvalStatus: "in-review",
            }),
            createDeliverable({
              id: "deliverable-web",
              projectId: "project-web",
              projectName: "Launch website",
              channel: "Website",
              status: "done",
              approvalStatus: "approved",
            }),
            createDeliverable({
              id: "deliverable-video",
              projectId: "project-video",
              projectName: "Launch video",
              channel: "YouTube",
              status: "planned",
              approvalStatus: "approved",
            }),
          ],
        }),
      ],
      contentScheduleItems: [
        createScheduleItem({
          id: "schedule-social",
          projectId: "project-social",
          projectName: "Launch social",
          channel: "Instagram",
          status: "planned",
          scheduledAt: "2026-05-18T09:00:00.000Z",
        }),
        createScheduleItem({
          id: "schedule-web",
          projectId: "project-web",
          projectName: "Launch website",
          channel: "Website",
          status: "planned",
          scheduledAt: "2026-05-20T09:00:00.000Z",
        }),
        createScheduleItem({
          id: "schedule-email",
          projectId: "project-email",
          projectName: "Launch email",
          channel: "Email",
          status: "cancelled",
          scheduledAt: "2026-05-20T11:00:00.000Z",
        }),
      ],
      serverExportJobs: [
        createExportJob({
          id: "export-social",
          projectId: "project-social",
          projectName: "Launch social",
          status: "queued",
          progress: 15,
        }),
        createExportJob({
          id: "export-email",
          projectId: "project-email",
          projectName: "Launch email",
          status: "running",
          progress: 45,
        }),
        createExportJob({
          id: "export-video",
          projectId: "project-video",
          projectName: "Launch video",
          status: "failed",
          progress: 65,
          failureMessage: "Renderer timed out.",
        }),
      ],
      reviewTasks: [
        createReviewTask({
          id: "task-social",
          projectId: "project-social",
          projectName: "Launch social",
          taskAssigneeName: "Alex",
          taskDueAt: "2026-05-18T08:00:00.000Z",
          taskStatus: "todo",
        }),
        createReviewTask({
          id: "task-email",
          projectId: "project-email",
          projectName: "Launch email",
          taskAssigneeName: "Alex",
          taskDueAt: "2026-05-20T08:00:00.000Z",
          taskStatus: "in-progress",
        }),
      ],
      teamManagement: [
        createWorkspace({
          members: [
            createMember({
              id: "member-alex",
              userId: "user-alex",
              email: "alex@example.com",
              role: "member",
            }),
          ],
          pendingInvites: [
            {
              id: "invite-casey",
              workspaceId: "workspace-growth",
              email: "casey@example.com",
              role: "member",
              expiresAt: "2026-05-26T10:00:00.000Z",
              createdAt: "2026-05-19T10:00:00.000Z",
            },
          ],
        }),
      ],
      auditLogs: [
        createAuditLog({
          id: "audit-campaign",
          targetId: "campaign-launch",
          summary: "Launch sprint capacity reviewed.",
        }),
        createAuditLog({
          id: "audit-export",
          targetId: "export-video",
          targetType: "server_export_job",
          summary: "Launch video export failed.",
        }),
      ],
      now: "2026-05-19T10:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.campaigns, 1);
    assert.equal(center.totals.teamMembers, 1);
    assert.equal(center.totals.pendingInvites, 1);
    assert.equal(center.totals.exportQueueItems, 3);
    assert.equal(center.totals.publishingQueueItems, 2);
    assert.equal(center.totals.blockedQueues, 2);
    assert.equal(center.totals.scenarioRecoveryPlans, 3);

    const campaign = center.campaignForecasts[0];
    assert.equal(campaign?.campaignId, "campaign-launch");
    assert.equal(campaign?.status, "blocked");
    assert.equal(campaign?.daysToLaunch, 2);
    assert.equal(campaign?.remainingDeliverables, 3);
    assert.equal(campaign?.unscheduledDeliverables, 2);
    assert.equal(campaign?.approvalBlockers, 2);
    assert.equal(campaign?.exportQueueItems, 3);
    assert.ok((campaign?.capacityUsedPercent ?? 0) > 100);

    const team = center.teamForecasts.find(
      (forecast) => forecast.ownerName === "Alex",
    );
    assert.equal(team?.status, "blocked");
    assert.equal(team?.assignedTasks, 2);
    assert.equal(team?.overdueTasks, 1);
    assert.equal(team?.forecastUnits, 4);

    const exportQueue = center.queueForecasts.find(
      (queue) => queue.kind === "exports",
    );
    assert.equal(exportQueue?.status, "blocked");
    assert.equal(exportQueue?.activeItems, 2);
    assert.equal(exportQueue?.blockedItems, 1);
    assert.ok(
      exportQueue?.recoverySteps.some((step) => step.includes("Retry failed")),
    );

    const publishingQueue = center.queueForecasts.find(
      (queue) => queue.kind === "publishing",
    );
    assert.equal(publishingQueue?.status, "blocked");
    assert.equal(publishingQueue?.activeItems, 2);
    assert.equal(publishingQueue?.blockedItems, 1);
    assert.ok(
      publishingQueue?.recoverySteps.some((step) =>
        step.includes("Reschedule overdue"),
      ),
    );

    assert.ok(
      center.scenarioRecoveryPlans.some(
        (plan) => plan.scenario === "deadline-compression",
      ),
    );
    assert.ok(
      center.nextActions.some((action) => action.includes("Launch sprint")),
    );

    const packet = decodePacket(center.scenarioRecoveryPlans[0]?.dataUrl ?? "");
    assert.equal(packet.kind, "essence-studio.production-capacity-forecasting");
    assert.equal(packet.status, "blocked");
    assert.ok(packet.scenarioRecoveryPlanIds.length >= 1);
  });
});

function decodePacket(dataUrl: string) {
  const [, payload = ""] = dataUrl.split(",");

  return JSON.parse(decodeURIComponent(payload)) as {
    kind: string;
    status: string;
    scenarioRecoveryPlanIds: string[];
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

function createExportJob(
  overrides: Partial<ServerExportJobSummary> = {},
): ServerExportJobSummary {
  return {
    id: "export-1",
    projectId: "project-1",
    projectName: "Project",
    format: "pdf",
    formatLabel: "PDF",
    fileName: "project.pdf",
    status: "queued",
    progress: 0,
    artifactName: null,
    artifactMimeType: null,
    artifactSizeBytes: null,
    artifactDataUrl: null,
    failureMessage: null,
    createdAt: "2026-05-19T08:00:00.000Z",
    updatedAt: "2026-05-19T09:00:00.000Z",
    completedAt: null,
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
    id: "workspace-growth",
    ownerId: "owner-1",
    name: "Growth team",
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
    targetType: "campaign",
    targetId: "campaign-1",
    summary: "Capacity reviewed.",
    actorEmail: "ops@example.com",
    metadata: {},
    createdAt: "2026-05-19T09:00:00.000Z",
    ...overrides,
  };
}
