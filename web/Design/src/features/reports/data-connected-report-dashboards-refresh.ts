import type { ContentScheduleSummary } from "@/db/content-planner";
import type { ContentDatabaseCenter } from "@/features/content-database/content-database";
import type { ProductionDistributionAnalyticsCenter } from "@/features/distribution/production-distribution-analytics";
import type { PublishingChannelCenter } from "@/features/publishing/publishing-channel-depth";
import type {
  DataConnectedReportRefreshPlan,
  DataConnectedReportStaleWarning,
} from "@/features/reports/data-connected-report-dashboards-types";
import {
  addHours,
  ageInHours,
  latestDate,
} from "@/features/reports/data-connected-report-dashboards-utils";

export function createRefreshPlans(input: {
  contentDatabase: ContentDatabaseCenter;
  productionAnalytics: ProductionDistributionAnalyticsCenter;
  publishingChannelCenter: PublishingChannelCenter;
  contentScheduleItems: ContentScheduleSummary[];
  now: Date;
}): DataConnectedReportRefreshPlan[] {
  const latestScheduleUpdatedAt = latestDate(
    input.contentScheduleItems.map((item) => item.updatedAt),
  );

  return [
    createRefreshPlan({
      sourceId: "content-database",
      sourceLabel: "Content database",
      lastRefreshedAt: input.contentDatabase.generatedAt,
      cadenceHours: 12,
      owner: "Content operations",
      now: input.now,
      detail: `${input.contentDatabase.totals.records} reusable records and ${input.contentDatabase.totals.bindings} bindings feed report dashboards.`,
    }),
    createRefreshPlan({
      sourceId: "production-analytics",
      sourceLabel: "Production analytics",
      lastRefreshedAt: input.productionAnalytics.generatedAt,
      cadenceHours: 6,
      owner: "Growth operations",
      now: input.now,
      detail: `${input.productionAnalytics.totals.campaigns} campaigns and ${input.productionAnalytics.totals.publishedItems} published items feed report blocks.`,
    }),
    createRefreshPlan({
      sourceId: "publishing-channel-center",
      sourceLabel: "Publishing channels",
      lastRefreshedAt: latestScheduleUpdatedAt,
      cadenceHours: 6,
      owner: "Publishing operations",
      now: input.now,
      detail: `${input.publishingChannelCenter.totals.published} published items and ${input.publishingChannelCenter.totals.submissions} responses feed channel KPIs.`,
    }),
    createRefreshPlan({
      sourceId: "content-schedule",
      sourceLabel: "Content schedule",
      lastRefreshedAt: latestScheduleUpdatedAt,
      cadenceHours: 24,
      owner: "Campaign operations",
      now: input.now,
      detail: `${input.contentScheduleItems.length} schedule items feed refresh and publishing coverage.`,
    }),
  ];
}

export function createStaleWarnings(
  refreshPlans: DataConnectedReportRefreshPlan[],
  now: Date,
): DataConnectedReportStaleWarning[] {
  return refreshPlans
    .filter((plan) => plan.status !== "ready")
    .map((plan) => {
      const ageHours = plan.lastRefreshedAt
        ? ageInHours(now, plan.lastRefreshedAt)
        : 999;

      return {
        id: `stale-${plan.sourceId}`,
        sourceId: plan.sourceId,
        sourceLabel: plan.sourceLabel,
        severity: ageHours > plan.cadenceHours * 2 ? "blocked" : "review",
        ageHours,
        detail: `${plan.sourceLabel} is ${ageHours} hours old and should refresh every ${plan.cadenceHours} hours.`,
        remediation: `Refresh ${plan.sourceLabel} before sharing executive report exports.`,
      };
    });
}

function createRefreshPlan(input: {
  sourceId: string;
  sourceLabel: string;
  lastRefreshedAt: string | null;
  cadenceHours: number;
  owner: string;
  now: Date;
  detail: string;
}): DataConnectedReportRefreshPlan {
  const nextRefreshAt = input.lastRefreshedAt
    ? addHours(input.lastRefreshedAt, input.cadenceHours)
    : null;
  const stale =
    !input.lastRefreshedAt ||
    ageInHours(input.now, input.lastRefreshedAt) > input.cadenceHours;

  return {
    id: `refresh-${input.sourceId}`,
    sourceId: input.sourceId,
    sourceLabel: input.sourceLabel,
    status: stale ? "review" : "ready",
    cadenceHours: input.cadenceHours,
    lastRefreshedAt: input.lastRefreshedAt,
    nextRefreshAt,
    owner: input.owner,
    detail: input.detail,
  };
}
