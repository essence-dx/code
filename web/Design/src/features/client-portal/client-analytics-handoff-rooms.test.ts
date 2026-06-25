import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ContentScheduleSummary } from "@/db/content-planner";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { DataConnectedReportDashboardCenter } from "@/features/reports/data-connected-report-dashboards";
import type { ProductionDistributionAnalyticsCenter } from "@/features/distribution/production-distribution-analytics";
import type { ProjectSummary } from "@/features/editor/types";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";
import { createClientPortalCenter } from "@/features/client-portal/client-portal-rooms";
import { createClientAnalyticsHandoffRooms } from "@/features/client-portal/client-analytics-handoff-rooms";

const now = new Date("2026-05-19T09:00:00.000Z");

describe("client analytics handoff rooms", () => {
  test("creates stakeholder-safe analytics rooms with approval context, delivery timeline, and evidence bundles", () => {
    const project = createProject();
    const reviewTask = createReviewTask();
    const handoffPacket = createPacket();
    const auditLogs = [
      createAuditLog({
        id: "approval-log",
        action: "approval.updated",
        targetId: project.id,
        summary: "Approved Launch client report.",
        actorEmail: "internal-reviewer@example.com",
      }),
    ];
    const clientPortal = createClientPortalCenter({
      projects: [project],
      reviewTasks: [reviewTask],
      projectHandoffPackets: [handoffPacket],
      auditLogs,
      now,
    });

    const center = createClientAnalyticsHandoffRooms({
      clientPortal,
      productionAnalytics: createProductionAnalytics(project.id),
      reportDashboards: createReportDashboards(),
      campaigns: [createCampaign(project.id)],
      contentScheduleItems: [createScheduleItem(project.id)],
      projectHandoffPackets: [handoffPacket],
      reviewTasks: [reviewTask],
      auditLogs,
      now,
    });

    assert.equal(center.status, "ready");
    assert.equal(center.totals.rooms, 1);
    assert.equal(center.totals.safeViews, 1);
    assert.equal(center.totals.analyticsSnapshots, 1);
    assert.equal(center.totals.approvalContexts, 1);
    assert.equal(center.totals.evidenceBundles, 1);
    assert.ok(center.totals.deliveryMilestones >= 4);

    const room = center.rooms[0];
    assert.equal(room?.stakeholderView.safeShare, true);
    assert.equal(room?.stakeholderView.rawActorEmailsExposed, false);
    assert.ok(
      room?.stakeholderView.redactions.includes(
        "Internal actor emails are redacted from the client bundle.",
      ),
    );
    assert.equal(room?.analyticsSnapshot.websiteViews, 240);
    assert.equal(room?.analyticsSnapshot.exportReadyDashboards, 1);
    assert.equal(room?.approvalContext.approvalStatus, "approved");
    assert.equal(room?.approvalContext.openTasks, 0);
    assert.ok(
      room?.deliveryTimeline.milestones.some(
        (milestone) => milestone.kind === "scheduled-publish",
      ),
    );

    const bundleJson = decodeEvidenceBundle(room?.evidenceBundle.dataUrl ?? "");
    assert.equal(bundleJson.kind, "essence-studio.client-analytics-handoff");
    assert.equal(bundleJson.room.projectId, project.id);
    assert.equal(bundleJson.room.analyticsSnapshot.websiteViews, 240);
    assert.equal(bundleJson.room.stakeholderView.rawActorEmailsExposed, false);
    assert.ok(
      !JSON.stringify(bundleJson).includes("internal-reviewer@example.com"),
    );
    assert.ok(
      center.nextActions.some((action) =>
        action.includes("ready for client analytics handoff"),
      ),
    );
  });
});

function decodeEvidenceBundle(dataUrl: string) {
  const [, payload = ""] = dataUrl.split(",");

  return JSON.parse(decodeURIComponent(payload)) as {
    kind: string;
    room: {
      projectId: string;
      analyticsSnapshot: {
        websiteViews: number;
      };
      stakeholderView: {
        rawActorEmailsExposed: boolean;
      };
    };
  };
}

function createProject(
  overrides: Partial<ProjectSummary> = {},
): ProjectSummary {
  return {
    id: "project-client",
    name: "Launch client report",
    width: 1440,
    height: 1080,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: null,
    publicShareId: null,
    editShareId: "client-room",
    editSharePermission: "comment",
    approvalStatus: "approved",
    starred: false,
    deletedAt: null,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-19T08:00:00.000Z",
    ...overrides,
  };
}

function createReviewTask(
  overrides: Partial<ReviewTaskSummary> = {},
): ReviewTaskSummary {
  return {
    id: "comment-1",
    projectId: "project-client",
    projectName: "Launch client report",
    pageId: "page-1",
    elementId: null,
    authorName: "Client reviewer",
    body: "Final numbers look approved.",
    resolved: true,
    taskStatus: "done",
    taskAssigneeName: "Designer",
    taskDueAt: "2026-05-19T08:30:00.000Z",
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-19T08:30:00.000Z",
    ...overrides,
  };
}

function createPacket(
  overrides: Partial<ProjectHandoffPacket> = {},
): ProjectHandoffPacket {
  return {
    projectId: "project-client",
    projectName: "Launch client report",
    updatedAt: "2026-05-19T08:30:00.000Z",
    approvalStatus: "approved",
    packetScore: 96,
    status: "ready",
    nextAction: "Ready for handoff.",
    readinessReport: {
      score: 96,
      status: "ready",
      dimensions: [
        {
          id: "accessibility",
          label: "Accessibility",
          status: "ready",
          score: 96,
          detail: "Ready.",
        },
      ],
    },
    exportBundle: {
      status: "ready",
      completedCount: 2,
      storedArtifactCount: 2,
      failedCount: 0,
      latestFormatLabel: "PDF",
      latestArtifactName: "launch-client-report.pdf",
      latestCompletedAt: "2026-05-19T08:30:00.000Z",
      totalStoredBytes: 4200,
    },
    stakeholderNotes: {
      totalCount: 1,
      unresolvedCount: 0,
      openTaskCount: 0,
      overdueTaskCount: 0,
      latestNoteAt: "2026-05-19T08:30:00.000Z",
    },
    approvalHistory: [],
    checklist: [
      {
        id: "readiness",
        label: "Readiness",
        complete: true,
        detail: "Audit ready.",
      },
      {
        id: "exports",
        label: "Exports",
        complete: true,
        detail: "Exports ready.",
      },
      {
        id: "notes",
        label: "Notes",
        complete: true,
        detail: "Notes resolved.",
      },
      {
        id: "approval",
        label: "Approval",
        complete: true,
        detail: "Approved.",
      },
    ],
    ...overrides,
  };
}

function createCampaign(projectId: string): CampaignBoardSummary {
  return {
    id: "campaign-1",
    name: "Launch campaign",
    brief: "Launch to client stakeholders.",
    goal: "Report outcomes",
    audience: "Client leadership",
    status: "active",
    primaryBrandColor: "#2563eb",
    brandLogoName: null,
    brandFontFamily: null,
    launchAt: "2026-05-20T09:00:00.000Z",
    deliverables: [
      {
        id: "deliverable-1",
        projectId,
        projectName: "Launch client report",
        projectThumbnail: null,
        projectWidth: 1440,
        projectHeight: 1080,
        projectSourceProjectId: null,
        projectVariantProfileId: null,
        projectVariantName: null,
        role: "Client report",
        channel: "Website",
        status: "done",
        approvalStatus: "approved",
        createdAt: "2026-05-18T08:00:00.000Z",
        updatedAt: "2026-05-19T08:00:00.000Z",
      },
    ],
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-19T08:00:00.000Z",
  };
}

function createScheduleItem(projectId: string): ContentScheduleSummary {
  return {
    id: "schedule-1",
    projectId,
    projectName: "Launch client report",
    title: "Client report publish",
    channel: "Website",
    caption: "Final client report",
    status: "published",
    scheduledAt: "2026-05-20T09:00:00.000Z",
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-19T08:00:00.000Z",
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit-1",
    action: "project.updated",
    targetType: "project",
    targetId: "project-client",
    summary: "Updated Launch client report.",
    actorEmail: "internal-reviewer@example.com",
    metadata: {},
    createdAt: "2026-05-19T08:00:00.000Z",
    ...overrides,
  };
}

function createProductionAnalytics(
  projectId: string,
): ProductionDistributionAnalyticsCenter {
  return {
    generatedAt: now.toISOString(),
    status: "ready",
    score: 94,
    funnelStages: [
      {
        id: "audience-response",
        label: "Audience response",
        status: "ready",
        current: 24,
        target: 20,
        conversionRate: 120,
        detail: "Client report exceeded response target.",
      },
    ],
    campaignAttribution: [
      {
        id: "campaign-1",
        campaignId: "campaign-1",
        campaignName: "Launch campaign",
        audience: "Client leadership",
        status: "ready",
        score: 94,
        generatedVariants: 1,
        contentSources: 2,
        scheduledPublishes: 1,
        socialPublishes: 0,
        websitePublishes: 1,
        emailPublishes: 0,
        exportArtifacts: 2,
        formSubmissions: 24,
        websiteViews: 240,
        websiteClicks: 42,
        conversionRate: 10,
        sourceRecordIds: ["source-1"],
        projectIds: [projectId],
        detail: "Launch campaign has client-safe outcome evidence.",
      },
    ],
    sourceInfluence: [],
    channelAttribution: [
      {
        id: "website",
        label: "Website",
        status: "ready",
        score: 94,
        campaigns: 1,
        generatedVariants: 1,
        plannedPublishes: 1,
        publishedItems: 1,
        exportArtifacts: 2,
        websiteViews: 240,
        websiteClicks: 42,
        formSubmissions: 24,
        detail: "Website handoff analytics are client safe.",
      },
    ],
    attributionPacket: {
      fileName: "attribution.json",
      dataUrl: "data:application/json;charset=utf-8,%7B%7D",
    },
    nextActions: [],
    totals: {
      campaigns: 1,
      variants: 1,
      contentSources: 2,
      scheduledPublishes: 1,
      publishedItems: 1,
      websitePublishes: 1,
      emailPublishes: 0,
      socialPublishes: 0,
      exportArtifacts: 2,
      formSubmissions: 24,
      websiteViews: 240,
      websiteClicks: 42,
    },
  };
}

function createReportDashboards(): DataConnectedReportDashboardCenter {
  return {
    generatedAt: now.toISOString(),
    status: "ready",
    score: 92,
    dashboards: [
      {
        id: "executive-distribution-dashboard",
        title: "Executive distribution dashboard",
        audience: "Leadership",
        status: "ready",
        score: 92,
        exportReady: true,
        blockIds: ["chart-campaign-attribution"],
        refreshPlanIds: ["refresh-production-analytics"],
        staleWarningIds: [],
        summary: "Leadership-ready outcomes.",
      },
    ],
    chartBlocks: [
      {
        id: "chart-campaign-attribution",
        title: "Campaign attribution",
        kind: "bar",
        chartType: "bar",
        status: "ready",
        reusable: true,
        sourceId: "production-analytics",
        sourceLabel: "Production analytics",
        dataPoints: [{ label: "Views", value: 240, color: "#2563eb" }],
        summary: "Views and response are ready.",
      },
    ],
    refreshPlans: [
      {
        id: "refresh-production-analytics",
        sourceId: "production-analytics",
        sourceLabel: "Production analytics",
        status: "ready",
        cadenceHours: 24,
        lastRefreshedAt: now.toISOString(),
        nextRefreshAt: "2026-05-20T09:00:00.000Z",
        owner: "Studio",
        detail: "Current analytics are fresh.",
      },
    ],
    staleSourceWarnings: [],
    executivePacket: {
      fileName: "executive-report.json",
      dataUrl: "data:application/json;charset=utf-8,%7B%7D",
      status: "ready",
      generatedAt: now.toISOString(),
      dashboardIds: ["executive-distribution-dashboard"],
      chartBlockIds: ["chart-campaign-attribution"],
      staleWarningIds: [],
    },
    nextActions: [],
    totals: {
      dashboards: 1,
      chartBlocks: 1,
      refreshPlans: 1,
      staleWarnings: 0,
      exportReadyDashboards: 1,
    },
  };
}
