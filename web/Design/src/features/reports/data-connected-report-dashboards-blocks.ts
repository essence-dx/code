import type { ContentDatabaseCenter } from "@/features/content-database/content-database";
import type { ProductionDistributionAnalyticsCenter } from "@/features/distribution/production-distribution-analytics";
import type { PublishingChannelCenter } from "@/features/publishing/publishing-channel-depth";
import type {
  DataConnectedReportChartBlock,
  DataConnectedReportRefreshPlan,
  DataConnectedReportStaleWarning,
  DataConnectedReportStatus,
} from "@/features/reports/data-connected-report-dashboards-types";
import {
  aggregateStatus,
  mapAnalyticsStatus,
  mapContentStatus,
  reportChartPalette,
  scoreToStatus,
  statusScore,
} from "@/features/reports/data-connected-report-dashboards-utils";

export function createChartBlocks(input: {
  contentDatabase: ContentDatabaseCenter;
  productionAnalytics: ProductionDistributionAnalyticsCenter;
  publishingChannelCenter: PublishingChannelCenter;
  refreshPlans: DataConnectedReportRefreshPlan[];
  staleSourceWarnings: DataConnectedReportStaleWarning[];
}): DataConnectedReportChartBlock[] {
  return [
    createDistributionFunnelBlock(input.productionAnalytics),
    createChannelPerformanceBlock(input.productionAnalytics),
    createCampaignAttributionBlock(input.productionAnalytics),
    createContentSourceInfluenceBlock({
      contentDatabase: input.contentDatabase,
      productionAnalytics: input.productionAnalytics,
    }),
    createKpiBlock({
      id: "kpi-published-output",
      title: "Published output",
      sourceId: "publishing-channel-center",
      sourceLabel: "Publishing channels",
      value: input.publishingChannelCenter.totals.published,
      target: Math.max(1, input.publishingChannelCenter.totals.planned),
    }),
    createKpiBlock({
      id: "kpi-audience-response",
      title: "Audience response",
      sourceId: "publishing-channel-center",
      sourceLabel: "Publishing channels",
      value: input.publishingChannelCenter.totals.submissions,
      target: Math.max(
        1,
        Math.ceil(input.publishingChannelCenter.totals.views * 0.03),
      ),
    }),
    createKpiBlock({
      id: "kpi-content-records",
      title: "Content records",
      sourceId: "content-database",
      sourceLabel: "Content database",
      value: input.contentDatabase.totals.readyRecords,
      target: Math.max(1, input.contentDatabase.totals.records),
      status: mapContentStatus(input.contentDatabase.status),
    }),
    createRefreshReadinessBlock(input.refreshPlans),
    createExecutiveRiskBlock(input.staleSourceWarnings),
  ];
}

function createDistributionFunnelBlock(
  analytics: ProductionDistributionAnalyticsCenter,
): DataConnectedReportChartBlock {
  return {
    id: "chart-distribution-funnel",
    title: "Distribution funnel",
    kind: "bar",
    chartType: "bar",
    status: mapAnalyticsStatus(analytics.status),
    reusable: true,
    sourceId: "production-analytics",
    sourceLabel: "Production analytics",
    dataPoints: analytics.funnelStages.map((stage, index) => ({
      label: stage.label,
      value: stage.current,
      color: reportChartPalette[index % reportChartPalette.length],
    })),
    summary:
      "Reusable funnel block for source, variant, publish, export, and response coverage.",
  };
}

function createChannelPerformanceBlock(
  analytics: ProductionDistributionAnalyticsCenter,
): DataConnectedReportChartBlock {
  return {
    id: "chart-channel-performance",
    title: "Channel performance",
    kind: "bar",
    chartType: "bar",
    status: mapAnalyticsStatus(analytics.status),
    reusable: true,
    sourceId: "production-analytics",
    sourceLabel: "Production analytics",
    dataPoints: analytics.channelAttribution.map((channel, index) => ({
      label: channel.label,
      value: channel.score,
      color: reportChartPalette[index % reportChartPalette.length],
    })),
    summary:
      "Reusable channel score block for social, website, email, and export reporting.",
  };
}

function createCampaignAttributionBlock(
  analytics: ProductionDistributionAnalyticsCenter,
): DataConnectedReportChartBlock {
  return {
    id: "chart-campaign-attribution",
    title: "Campaign attribution",
    kind: "line",
    chartType: "line",
    status: mapAnalyticsStatus(analytics.status),
    reusable: true,
    sourceId: "production-analytics",
    sourceLabel: "Production analytics",
    dataPoints: analytics.campaignAttribution.map((campaign, index) => ({
      label: campaign.campaignName,
      value: campaign.conversionRate || campaign.score,
      color: reportChartPalette[index % reportChartPalette.length],
    })),
    summary:
      "Reusable campaign attribution block for stakeholder-ready growth reports.",
  };
}

function createContentSourceInfluenceBlock(input: {
  contentDatabase: ContentDatabaseCenter;
  productionAnalytics: ProductionDistributionAnalyticsCenter;
}): DataConnectedReportChartBlock {
  return {
    id: "chart-content-source-influence",
    title: "Content source influence",
    kind: "donut",
    chartType: "donut",
    status: mapContentStatus(input.contentDatabase.status),
    reusable: true,
    sourceId: "content-database",
    sourceLabel: "Content database",
    dataPoints: input.productionAnalytics.sourceInfluence.map(
      (source, index) => ({
        label: source.label,
        value:
          source.attributedVariants +
          source.scheduledPublishes +
          source.formSubmissions,
        color: reportChartPalette[index % reportChartPalette.length],
      }),
    ),
    summary:
      "Reusable content influence block linking variables to variants, publishes, and responses.",
  };
}

function createRefreshReadinessBlock(
  refreshPlans: DataConnectedReportRefreshPlan[],
): DataConnectedReportChartBlock {
  return {
    id: "chart-refresh-readiness",
    title: "Refresh readiness",
    kind: "bar",
    chartType: "bar",
    status: aggregateStatus(refreshPlans.map((plan) => plan.status)),
    reusable: true,
    sourceId: "refresh-plans",
    sourceLabel: "Refresh plans",
    dataPoints: refreshPlans.map((plan, index) => ({
      label: plan.sourceLabel,
      value: statusScore(plan.status),
      color: reportChartPalette[index % reportChartPalette.length],
    })),
    summary:
      "Reusable refresh block showing which sources are ready for report export.",
  };
}

function createExecutiveRiskBlock(
  staleSourceWarnings: DataConnectedReportStaleWarning[],
): DataConnectedReportChartBlock {
  return {
    id: "chart-executive-risk",
    title: "Executive risk",
    kind: "bar",
    chartType: "bar",
    status: staleSourceWarnings.length ? "review" : "ready",
    reusable: true,
    sourceId: "executive-packet",
    sourceLabel: "Executive packet",
    dataPoints: [
      {
        label: "Stale sources",
        value: staleSourceWarnings.length,
        color: "#f97316",
      },
      {
        label: "Blocked dashboards",
        value: 0,
        color: "#ef4444",
      },
    ],
    summary: "Reusable risk block for executive packet review before export.",
  };
}

function createKpiBlock(input: {
  id: string;
  title: string;
  sourceId: string;
  sourceLabel: string;
  value: number;
  target: number;
  status?: DataConnectedReportStatus;
}): DataConnectedReportChartBlock {
  const percent = Math.round((input.value / input.target) * 100);

  return {
    id: input.id,
    title: input.title,
    kind: "kpi",
    chartType: "kpi",
    status: input.status ?? scoreToStatus(percent),
    reusable: true,
    sourceId: input.sourceId,
    sourceLabel: input.sourceLabel,
    dataPoints: [
      { label: "Current", value: input.value, color: "#0f766e" },
      { label: "Target", value: input.target, color: "#64748b" },
    ],
    summary: `${input.value} current against ${input.target} target.`,
  };
}
