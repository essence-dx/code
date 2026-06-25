import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { ContentScheduleSummary } from "@/db/content-planner";
import type { ContentDatabaseCenter } from "@/features/content-database/content-database";
import type { ProductionDistributionAnalyticsCenter } from "@/features/distribution/production-distribution-analytics";
import type { PublishingChannelCenter } from "@/features/publishing/publishing-channel-depth";
import { createDataConnectedReportDashboardCenter } from "@/features/reports/data-connected-report-dashboards";

describe("data-connected report dashboards", () => {
  test("creates report dashboards with reusable chart blocks, refresh plans, stale warnings, and executive packets", () => {
    const center = createDataConnectedReportDashboardCenter({
      contentDatabase: createContentDatabaseCenter(),
      productionAnalytics: createProductionAnalyticsCenter(),
      publishingChannelCenter: createPublishingChannelCenter(),
      contentScheduleItems: [
        createScheduleItem({
          id: "schedule-social",
          channel: "Instagram",
          status: "published",
          updatedAt: "2026-05-18T08:30:00.000Z",
        }),
      ],
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(center.status, "review");
    assert.equal(center.totals.dashboards, 3);
    assert.equal(center.totals.chartBlocks, 9);
    assert.equal(center.totals.refreshPlans, 4);
    assert.equal(center.totals.staleWarnings, 1);
    assert.ok(
      center.dashboards.some(
        (dashboard) => dashboard.id === "executive-distribution-dashboard",
      ),
    );
    assert.ok(
      center.chartBlocks.some(
        (block) =>
          block.id === "chart-distribution-funnel" &&
          block.reusable &&
          block.dataPoints.length === 5,
      ),
    );
    assert.ok(
      center.refreshPlans.some(
        (plan) =>
          plan.sourceId === "content-database" &&
          plan.status === "review" &&
          plan.nextRefreshAt === "2026-05-18T07:00:00.000Z",
      ),
    );
    assert.ok(
      center.staleSourceWarnings.some((warning) =>
        warning.detail.includes("Content database"),
      ),
    );
    assert.equal(
      center.executivePacket.fileName,
      "data-report-dashboard-executive-packet.json",
    );
    assert.ok(
      center.executivePacket.dataUrl.startsWith(
        "data:application/json;charset=utf-8",
      ),
    );
    assert.ok(
      center.nextActions.some((action) =>
        action.includes("Refresh Content database"),
      ),
    );
  });
});

function createContentDatabaseCenter(): ContentDatabaseCenter {
  return {
    status: "ready",
    score: 90,
    generatedAt: "2026-05-17T19:00:00.000Z",
    records: [
      {
        id: "record-offer",
        kind: "brand-copy",
        label: "Launch offer",
        variableKey: "launch_offer",
        value: "Free starter pack",
        status: "ready",
        targetSurfaces: ["social", "website", "email"],
        sources: [
          {
            type: "campaign",
            id: "campaign-launch",
            label: "Launch campaign",
            field: "brief",
            excerpt: "Launch the starter pack.",
            surfaces: ["social", "website", "email"],
          },
        ],
      },
      {
        id: "record-proof",
        kind: "campaign-variable",
        label: "Proof point",
        variableKey: "proof_point",
        value: "2,000 signups",
        status: "review",
        targetSurfaces: ["website", "email"],
        sources: [
          {
            type: "schedule",
            id: "schedule-social",
            label: "Launch social",
            field: "caption",
            excerpt: "2,000 signups",
            surfaces: ["social"],
          },
        ],
      },
    ],
    bindings: [
      {
        id: "binding-social-offer",
        recordId: "record-offer",
        variableKey: "launch_offer",
        surface: "social",
        surfaceLabel: "Social",
        sourceType: "campaign",
        sourceId: "campaign-launch",
        sourceLabel: "Launch campaign",
        usageCount: 3,
      },
    ],
    surfaceCoverage: [
      {
        surface: "social",
        label: "Social",
        recordCount: 2,
        bindingCount: 1,
        status: "ready",
      },
      {
        surface: "website",
        label: "Website",
        recordCount: 2,
        bindingCount: 1,
        status: "ready",
      },
      {
        surface: "email",
        label: "Email",
        recordCount: 2,
        bindingCount: 1,
        status: "ready",
      },
    ],
    packet: {
      fileName: "content-database.json",
      dataUrl: "data:application/json,%7B%7D",
    },
    nextActions: [],
    totals: {
      records: 2,
      readyRecords: 1,
      reviewRecords: 1,
      blockedRecords: 0,
      variables: 2,
      bindings: 1,
      sources: 2,
      duplicateEvidence: 0,
    },
  };
}

function createProductionAnalyticsCenter(): ProductionDistributionAnalyticsCenter {
  return {
    generatedAt: "2026-05-18T08:00:00.000Z",
    status: "ready",
    score: 88,
    funnelStages: [
      createFunnelStage("content-sources", "Content sources", 5, 5),
      createFunnelStage("campaign-variants", "Campaign variants", 4, 4),
      createFunnelStage("distribution-publishes", "Publishes", 3, 4),
      createFunnelStage("export-artifacts", "Exports", 2, 2),
      createFunnelStage("audience-response", "Responses", 12, 10),
    ],
    campaignAttribution: [
      {
        id: "campaign-attribution-launch",
        campaignId: "campaign-launch",
        campaignName: "Launch campaign",
        audience: "Founders",
        status: "ready",
        score: 92,
        generatedVariants: 4,
        contentSources: 5,
        scheduledPublishes: 3,
        socialPublishes: 2,
        websitePublishes: 1,
        emailPublishes: 1,
        exportArtifacts: 2,
        formSubmissions: 12,
        websiteViews: 800,
        websiteClicks: 96,
        conversionRate: 12,
        sourceRecordIds: ["record-offer", "record-proof"],
        projectIds: ["project-launch"],
        detail: "Launch campaign has full report evidence.",
      },
    ],
    sourceInfluence: [
      {
        id: "source-influence-offer",
        recordId: "record-offer",
        variableKey: "launch_offer",
        label: "Launch offer",
        status: "ready",
        surfaces: ["social", "website", "email"],
        campaignIds: ["campaign-launch"],
        attributedVariants: 4,
        scheduledPublishes: 3,
        formSubmissions: 12,
        detail: "Launch offer drives all launch report surfaces.",
      },
    ],
    channelAttribution: [
      {
        id: "social",
        label: "Social",
        status: "ready",
        score: 86,
        campaigns: 1,
        generatedVariants: 2,
        plannedPublishes: 3,
        publishedItems: 2,
        exportArtifacts: 1,
        websiteViews: 0,
        websiteClicks: 0,
        formSubmissions: 0,
        detail: "Social is publishing launch variants.",
      },
      {
        id: "website",
        label: "Website",
        status: "ready",
        score: 94,
        campaigns: 1,
        generatedVariants: 1,
        plannedPublishes: 1,
        publishedItems: 1,
        exportArtifacts: 1,
        websiteViews: 800,
        websiteClicks: 96,
        formSubmissions: 12,
        detail: "Website has response evidence.",
      },
    ],
    attributionPacket: {
      fileName: "production-distribution-attribution.json",
      dataUrl: "data:application/json,%7B%7D",
    },
    nextActions: [],
    totals: {
      campaigns: 1,
      variants: 4,
      contentSources: 5,
      scheduledPublishes: 3,
      publishedItems: 3,
      websitePublishes: 1,
      emailPublishes: 1,
      socialPublishes: 2,
      exportArtifacts: 2,
      formSubmissions: 12,
      websiteViews: 800,
      websiteClicks: 96,
    },
  };
}

function createPublishingChannelCenter(): PublishingChannelCenter {
  return {
    status: "ready",
    score: 91,
    channels: [],
    presets: [],
    nextActions: [],
    totals: {
      channels: 4,
      planned: 3,
      published: 3,
      deliverables: 4,
      views: 800,
      clicks: 96,
      submissions: 12,
    },
    analyticsWorkspace: {
      status: "ready",
      score: 91,
      goals: [],
      snapshots: [],
      anomalies: [],
      attributionSources: [],
      experiments: [],
      stakeholderPacket: {
        id: "stakeholder-packet",
        title: "Stakeholder packet",
        status: "ready",
        score: 91,
        summary: "Publishing channels are ready.",
        highlights: [],
        risks: [],
        nextActions: [],
      },
    },
  };
}

function createScheduleItem(
  overrides: Partial<ContentScheduleSummary> = {},
): ContentScheduleSummary {
  return {
    id: "schedule-1",
    projectId: "project-1",
    projectName: "Launch design",
    title: "Launch social",
    channel: "Instagram",
    caption: "Launch caption",
    status: "planned",
    scheduledAt: "2026-05-18T09:00:00.000Z",
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T08:00:00.000Z",
    ...overrides,
  };
}

function createFunnelStage(
  id: ProductionDistributionAnalyticsCenter["funnelStages"][number]["id"],
  label: string,
  current: number,
  target: number,
): ProductionDistributionAnalyticsCenter["funnelStages"][number] {
  return {
    id,
    label,
    status: "ready",
    current,
    target,
    conversionRate: Math.round((current / target) * 100),
    detail: `${label} report coverage.`,
  };
}
