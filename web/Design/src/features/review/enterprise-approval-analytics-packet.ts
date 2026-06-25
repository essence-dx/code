import type {
  EnterpriseApprovalAnalyticsStatus,
  EnterpriseApprovalAnalyticsWorkspace,
  EnterpriseApprovalBottleneck,
  EnterpriseApprovalExecutivePacket,
  EnterpriseApprovalReviewerForecast,
  EnterpriseApprovalTrendBaseline,
} from "@/features/review/enterprise-approval-analytics-types";

export function createNextApprovalAnalyticsActions(input: {
  bottlenecks: EnterpriseApprovalBottleneck[];
  reviewerForecasts: EnterpriseApprovalReviewerForecast[];
  workspaceAnalytics: EnterpriseApprovalAnalyticsWorkspace[];
}) {
  const bottleneckActions = input.bottlenecks.map(
    (bottleneck) =>
      `${bottleneck.workspaceName}: ${bottleneck.detail} (${bottleneck.subjectNames
        .slice(0, 2)
        .join(", ")})`,
  );
  const forecastActions = input.reviewerForecasts
    .filter((forecast) => forecast.status !== "ready")
    .map(
      (forecast) =>
        `${forecast.workspaceName}: rebalance ${forecast.reviewerName} before ${forecast.forecastNext7Days} forecasted review items stack up.`,
    );
  const workspaceActions = input.workspaceAnalytics
    .filter((workspace) => workspace.status === "review")
    .map(
      (workspace) =>
        `${workspace.workspaceName}: refresh approval movement for ${workspace.pendingSubjects} pending subjects.`,
    );

  return [...bottleneckActions, ...forecastActions, ...workspaceActions].slice(
    0,
    5,
  );
}

export function createApprovalAnalyticsExecutivePacket(input: {
  status: EnterpriseApprovalAnalyticsStatus;
  workspaceAnalytics: EnterpriseApprovalAnalyticsWorkspace[];
  trendBaselines: EnterpriseApprovalTrendBaseline[];
  bottlenecks: EnterpriseApprovalBottleneck[];
  reviewerForecasts: EnterpriseApprovalReviewerForecast[];
  nextActions: string[];
  now: Date;
}): EnterpriseApprovalExecutivePacket {
  const payload = {
    kind: "essence-studio.cross-workspace-approval-analytics",
    version: 1,
    generatedAt: input.now.toISOString(),
    status: input.status,
    workspaceAnalytics: input.workspaceAnalytics,
    trendBaselines: input.trendBaselines,
    bottlenecks: input.bottlenecks,
    reviewerForecasts: input.reviewerForecasts,
    nextActions: input.nextActions,
  };
  const json = JSON.stringify(payload, null, 2);

  return {
    id: "cross-workspace-approval-analytics",
    status: input.status,
    workspaceIds: input.workspaceAnalytics.map(
      (workspace) => workspace.workspaceId,
    ),
    download: {
      fileName: "cross-workspace-approval-analytics.json",
      href: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
      json,
    },
  };
}
