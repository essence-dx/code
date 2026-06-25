import type { ContentScheduleSummary } from "@/db/content-planner";
import type { ContentDatabaseCenter } from "@/features/content-database/content-database";
import type { ProductionDistributionAnalyticsCenter } from "@/features/distribution/production-distribution-analytics";
import type { PublishingChannelCenter } from "@/features/publishing/publishing-channel-depth";
import { createChartBlocks } from "@/features/reports/data-connected-report-dashboards-blocks";
import { createExecutivePacket } from "@/features/reports/data-connected-report-dashboards-packet";
import {
  createRefreshPlans,
  createStaleWarnings,
} from "@/features/reports/data-connected-report-dashboards-refresh";
import type {
  DataConnectedReportChartBlock,
  DataConnectedReportDashboard,
  DataConnectedReportDashboardCenter,
  DataConnectedReportRefreshPlan,
  DataConnectedReportStaleWarning,
} from "@/features/reports/data-connected-report-dashboards-types";
import {
  aggregateStatus,
  average,
  normalizeDate,
  scoreToStatus,
  unique,
} from "@/features/reports/data-connected-report-dashboards-utils";

export type {
  DataConnectedReportBlockKind,
  DataConnectedReportChartBlock,
  DataConnectedReportDashboard,
  DataConnectedReportDashboardCenter,
  DataConnectedReportDataPoint,
  DataConnectedReportExecutivePacket,
  DataConnectedReportRefreshPlan,
  DataConnectedReportStaleWarning,
  DataConnectedReportStatus,
} from "@/features/reports/data-connected-report-dashboards-types";

export function createDataConnectedReportDashboardCenter(input: {
  contentDatabase: ContentDatabaseCenter;
  productionAnalytics: ProductionDistributionAnalyticsCenter;
  publishingChannelCenter: PublishingChannelCenter;
  contentScheduleItems: ContentScheduleSummary[];
  now?: Date | string;
}): DataConnectedReportDashboardCenter {
  const now = normalizeDate(input.now);
  const generatedAt = now.toISOString();
  const refreshPlans = createRefreshPlans({ ...input, now });
  const staleSourceWarnings = createStaleWarnings(refreshPlans, now);
  const chartBlocks = createChartBlocks({
    ...input,
    refreshPlans,
    staleSourceWarnings,
  });
  const dashboards = createDashboards({
    chartBlocks,
    refreshPlans,
    staleSourceWarnings,
    contentDatabase: input.contentDatabase,
    productionAnalytics: input.productionAnalytics,
    publishingChannelCenter: input.publishingChannelCenter,
  });
  const score = average([
    input.contentDatabase.score,
    input.productionAnalytics.score,
    input.publishingChannelCenter.score,
    average(dashboards.map((dashboard) => dashboard.score)),
    staleSourceWarnings.length
      ? Math.max(40, 100 - staleSourceWarnings.length * 18)
      : 100,
  ]);
  const status = aggregateStatus([
    ...dashboards.map((dashboard) => dashboard.status),
    ...refreshPlans.map((plan) => plan.status),
    ...staleSourceWarnings.map((warning) => warning.severity),
  ]);
  const nextActions = createNextActions({
    staleSourceWarnings,
    dashboards,
  });

  return {
    generatedAt,
    status,
    score,
    dashboards,
    chartBlocks,
    refreshPlans,
    staleSourceWarnings,
    executivePacket: createExecutivePacket({
      generatedAt,
      status,
      score,
      dashboards,
      chartBlocks,
      refreshPlans,
      staleSourceWarnings,
      nextActions,
    }),
    nextActions,
    totals: {
      dashboards: dashboards.length,
      chartBlocks: chartBlocks.length,
      refreshPlans: refreshPlans.length,
      staleWarnings: staleSourceWarnings.length,
      exportReadyDashboards: dashboards.filter(
        (dashboard) => dashboard.exportReady,
      ).length,
    },
  };
}

function createDashboards(input: {
  chartBlocks: DataConnectedReportChartBlock[];
  refreshPlans: DataConnectedReportRefreshPlan[];
  staleSourceWarnings: DataConnectedReportStaleWarning[];
  contentDatabase: ContentDatabaseCenter;
  productionAnalytics: ProductionDistributionAnalyticsCenter;
  publishingChannelCenter: PublishingChannelCenter;
}): DataConnectedReportDashboard[] {
  const staleWarningIds = input.staleSourceWarnings.map(
    (warning) => warning.id,
  );

  return [
    createDashboard({
      id: "executive-distribution-dashboard",
      title: "Executive distribution dashboard",
      audience: "Leadership",
      sourceScore: average([
        input.productionAnalytics.score,
        input.publishingChannelCenter.score,
      ]),
      blockIds: [
        "chart-distribution-funnel",
        "chart-channel-performance",
        "chart-campaign-attribution",
        "kpi-audience-response",
      ],
      refreshPlanIds: [
        "refresh-production-analytics",
        "refresh-publishing-channel-center",
      ],
      staleWarningIds,
      summary:
        "Leadership-ready view of funnel coverage, channel performance, and campaign response.",
    }),
    createDashboard({
      id: "channel-report-dashboard",
      title: "Channel report dashboard",
      audience: "Publishing team",
      sourceScore: input.publishingChannelCenter.score,
      blockIds: [
        "chart-channel-performance",
        "kpi-published-output",
        "chart-refresh-readiness",
      ],
      refreshPlanIds: [
        "refresh-publishing-channel-center",
        "refresh-content-schedule",
      ],
      staleWarningIds,
      summary:
        "Reusable channel report for planned, published, and refresh-ready distribution work.",
    }),
    createDashboard({
      id: "content-source-dashboard",
      title: "Content source dashboard",
      audience: "Content and campaign team",
      sourceScore: input.contentDatabase.score,
      blockIds: [
        "chart-content-source-influence",
        "kpi-content-records",
        "chart-executive-risk",
      ],
      refreshPlanIds: ["refresh-content-database"],
      staleWarningIds: staleWarningIds.filter((id) =>
        id.includes("content-database"),
      ),
      summary:
        "Traceable report view connecting reusable content variables to campaign outcomes.",
    }),
  ];
}

function createDashboard(input: {
  id: string;
  title: string;
  audience: string;
  sourceScore: number;
  blockIds: string[];
  refreshPlanIds: string[];
  staleWarningIds: string[];
  summary: string;
}): DataConnectedReportDashboard {
  const status = input.staleWarningIds.length
    ? "review"
    : scoreToStatus(input.sourceScore);
  const score = Math.max(
    0,
    input.sourceScore - input.staleWarningIds.length * 8,
  );

  return {
    id: input.id,
    title: input.title,
    audience: input.audience,
    status,
    score,
    exportReady: status !== "blocked" && score >= 75,
    blockIds: input.blockIds,
    refreshPlanIds: input.refreshPlanIds,
    staleWarningIds: input.staleWarningIds,
    summary: input.summary,
  };
}

function createNextActions(input: {
  staleSourceWarnings: DataConnectedReportStaleWarning[];
  dashboards: DataConnectedReportDashboard[];
}) {
  const actions = input.staleSourceWarnings.map(
    (warning) =>
      `Refresh ${warning.sourceLabel} before exporting executive packets.`,
  );
  const blockedDashboards = input.dashboards.filter(
    (dashboard) => dashboard.status === "blocked",
  );
  const reviewDashboards = input.dashboards.filter(
    (dashboard) => dashboard.status === "review",
  );

  if (blockedDashboards.length) {
    actions.push(
      `Repair ${blockedDashboards.length} blocked report dashboard${blockedDashboards.length === 1 ? "" : "s"}.`,
    );
  }

  if (reviewDashboards.length) {
    actions.push(
      `Review ${reviewDashboards.length} report dashboard${reviewDashboards.length === 1 ? "" : "s"} before client sharing.`,
    );
  }

  if (!actions.length) {
    actions.push("Export the executive report packet for stakeholder review.");
  }

  return unique(actions).slice(0, 6);
}
