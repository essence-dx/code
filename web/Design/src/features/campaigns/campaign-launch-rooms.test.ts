import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ContentScheduleSummary } from "@/db/content-planner";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  ProjectAuditDimension,
  ProjectAuditSummary,
} from "@/features/projects/project-audit-center";
import { createPublishingChannelCenter } from "@/features/publishing/publishing-channel-depth";
import { createCampaignLaunchRoomCenter } from "@/features/campaigns/campaign-launch-rooms";

describe("campaign launch rooms", () => {
  test("creates ready cross-format launch rooms with signoff, channel readiness, and command packets", () => {
    const social = createDeliverable({
      id: "social-deliverable",
      projectId: "social-project",
      projectName: "Launch social post",
      channel: "Social",
      approvalStatus: "approved",
      status: "done",
    });
    const website = createDeliverable({
      id: "website-deliverable",
      projectId: "website-project",
      projectName: "Launch website",
      channel: "Website",
      approvalStatus: "approved",
      status: "done",
    });
    const email = createDeliverable({
      id: "email-deliverable",
      projectId: "email-project",
      projectName: "Launch email",
      channel: "Email",
      approvalStatus: "approved",
      status: "done",
    });
    const campaign = createCampaign({
      id: "campaign-ready",
      name: "Spring launch",
      launchAt: "2026-05-24T09:00:00.000Z",
      deliverables: [social, website, email],
    });
    const scheduleItems = [
      createSchedule({
        id: "schedule-social",
        projectId: social.projectId,
        channel: "Instagram",
        caption: "Social launch caption",
        scheduledAt: "2026-05-22T09:00:00.000Z",
      }),
      createSchedule({
        id: "schedule-website",
        projectId: website.projectId,
        channel: "Website",
        caption: "Website launch note",
        scheduledAt: "2026-05-24T09:00:00.000Z",
      }),
      createSchedule({
        id: "schedule-email",
        projectId: email.projectId,
        channel: "Email",
        caption: "Email send note",
        scheduledAt: "2026-05-25T09:00:00.000Z",
      }),
    ];
    const center = createCampaignLaunchRoomCenter({
      now: new Date("2026-05-18T12:00:00.000Z"),
      campaigns: [campaign],
      contentScheduleItems: scheduleItems,
      reviewTasks: [
        createReviewTask({
          projectId: social.projectId ?? "social-project",
          projectName: social.projectName ?? "Launch social post",
          taskStatus: "done",
        }),
      ],
      projectAudits: [
        createAudit({
          projectId: social.projectId ?? "social-project",
          projectName: social.projectName ?? "Launch social post",
        }),
        createAudit({
          projectId: website.projectId ?? "website-project",
          projectName: website.projectName ?? "Launch website",
        }),
        createAudit({
          projectId: email.projectId ?? "email-project",
          projectName: email.projectName ?? "Launch email",
        }),
      ],
      publishingChannelCenter: createPublishingChannelCenter({
        projects: [],
        contentScheduleItems: scheduleItems,
        campaigns: [campaign],
        websitePublishes: [],
        websiteFormSubmissions: [],
      }),
      auditLogs: [
        createAuditLog({
          targetId: campaign.id,
          summary: "Approved final launch campaign signoff.",
        }),
      ],
    });

    const room = center.rooms[0];

    assert.equal(center.status, "ready");
    assert.equal(center.totals.readyRooms, 1);
    assert.equal(room?.status, "ready");
    assert.equal(room?.stakeholderSignoff.status, "ready");
    assert.equal(room?.channelReadiness.status, "ready");
    assert.equal(room?.rolloutTimeline.status, "ready");
    assert.equal(room?.channelReadiness.channels.length, 3);
    assert.ok(
      room?.rolloutTimeline.milestones.some(
        (milestone) => milestone.id === "launch",
      ),
    );
    assert.ok(
      room?.launchCommandPacket.commands.some(
        (command) => command.kind === "launch",
      ),
    );
    assert.ok(
      room?.launchCommandPacket.dataUrl.startsWith("data:application/json"),
    );
  });

  test("blocks launch rooms when signoff and channel scheduling are missing", () => {
    const social = createDeliverable({
      id: "social-deliverable",
      projectId: "social-project",
      projectName: "Launch social post",
      channel: "Social",
      approvalStatus: "changes-requested",
      status: "in-progress",
    });
    const email = createDeliverable({
      id: "email-deliverable",
      projectId: "email-project",
      projectName: "Launch email",
      channel: "Email",
      approvalStatus: "in-review",
      status: "planned",
    });
    const campaign = createCampaign({
      id: "campaign-blocked",
      name: "Blocked launch",
      launchAt: null,
      deliverables: [social, email],
    });
    const center = createCampaignLaunchRoomCenter({
      now: new Date("2026-05-18T12:00:00.000Z"),
      campaigns: [campaign],
      contentScheduleItems: [],
      reviewTasks: [
        createReviewTask({
          projectId: social.projectId ?? "social-project",
          projectName: social.projectName ?? "Launch social post",
          taskStatus: "todo",
          taskDueAt: "2026-05-16T12:00:00.000Z",
        }),
      ],
      projectAudits: [
        createAudit({
          projectId: social.projectId ?? "social-project",
          projectName: social.projectName ?? "Launch social post",
          overallScore: 58,
          status: "fix",
          dimensions: [
            createAuditDimension({
              id: "accessibility",
              status: "fix",
              score: 42,
            }),
          ],
        }),
      ],
      publishingChannelCenter: createPublishingChannelCenter({
        projects: [],
        contentScheduleItems: [],
        campaigns: [campaign],
        websitePublishes: [],
        websiteFormSubmissions: [],
      }),
      auditLogs: [],
    });

    const room = center.rooms[0];

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.blockedRooms, 1);
    assert.equal(room?.stakeholderSignoff.status, "blocked");
    assert.equal(room?.channelReadiness.status, "blocked");
    assert.equal(room?.rolloutTimeline.status, "blocked");
    assert.equal(room?.totals.unscheduledDeliverables, 2);
    assert.ok(
      room?.nextActions.some((action) =>
        action.includes("Resolve stakeholder signoff"),
      ),
    );
    assert.ok(
      room?.launchCommandPacket.commands.some(
        (command) => command.status === "blocked",
      ),
    );
  });
});

function createCampaign(
  overrides: Partial<CampaignBoardSummary> = {},
): CampaignBoardSummary {
  return {
    id: "campaign-1",
    name: "Launch campaign",
    brief: "Launch a cross-format product campaign.",
    goal: "Drive signups",
    audience: "Creators",
    status: "active",
    primaryBrandColor: "#2563eb",
    brandLogoName: "Core mark",
    brandFontFamily: "Geist",
    launchAt: "2026-05-24T09:00:00.000Z",
    deliverables: [],
    createdAt: "2026-05-10T09:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
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
    createdAt: "2026-05-10T09:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createSchedule(
  overrides: Partial<ContentScheduleSummary> = {},
): ContentScheduleSummary {
  return {
    id: "schedule-1",
    projectId: "project-1",
    projectName: "Launch design",
    title: "Launch item",
    channel: "Instagram",
    caption: "Launch note",
    status: "planned",
    scheduledAt: "2026-05-24T09:00:00.000Z",
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createReviewTask(
  overrides: Partial<ReviewTaskSummary> = {},
): ReviewTaskSummary {
  return {
    id: "review-task-1",
    projectId: "project-1",
    projectName: "Launch design",
    pageId: "page-1",
    elementId: null,
    authorName: "Amina",
    body: "Approve launch creative.",
    resolved: true,
    taskStatus: "done",
    taskAssigneeName: "Stakeholder",
    taskDueAt: "2026-05-21T09:00:00.000Z",
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createAudit(
  overrides: Partial<ProjectAuditSummary> = {},
): ProjectAuditSummary {
  return {
    projectId: "project-1",
    projectName: "Launch design",
    updatedAt: "2026-05-18T09:00:00.000Z",
    overallScore: 92,
    status: "ready",
    dimensions: [
      createAuditDimension({ id: "accessibility", score: 92 }),
      createAuditDimension({ id: "brand", score: 94 }),
    ],
    ...overrides,
  };
}

function createAuditDimension(
  overrides: Partial<ProjectAuditDimension> = {},
): ProjectAuditDimension {
  return {
    id: "accessibility",
    label: "Accessibility",
    status: "ready",
    score: 92,
    detail: "Checks look ready.",
    ...overrides,
  } as ProjectAuditDimension;
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit-log-1",
    action: "approval.updated",
    targetType: "campaign",
    targetId: "campaign-1",
    summary: "Approved campaign.",
    actorEmail: "admin@example.com",
    metadata: {},
    createdAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}
