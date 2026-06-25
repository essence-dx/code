import type {
  DataConnectedReportChartBlock,
  DataConnectedReportDashboard,
  DataConnectedReportExecutivePacket,
  DataConnectedReportRefreshPlan,
  DataConnectedReportStaleWarning,
  DataConnectedReportStatus,
} from "@/features/reports/data-connected-report-dashboards-types";

export function createExecutivePacket(input: {
  generatedAt: string;
  status: DataConnectedReportStatus;
  score: number;
  dashboards: DataConnectedReportDashboard[];
  chartBlocks: DataConnectedReportChartBlock[];
  refreshPlans: DataConnectedReportRefreshPlan[];
  staleSourceWarnings: DataConnectedReportStaleWarning[];
  nextActions: string[];
}): DataConnectedReportExecutivePacket {
  const payload = {
    generatedAt: input.generatedAt,
    status: input.status,
    score: input.score,
    dashboards: input.dashboards.map((dashboard) => ({
      id: dashboard.id,
      title: dashboard.title,
      audience: dashboard.audience,
      status: dashboard.status,
      score: dashboard.score,
      exportReady: dashboard.exportReady,
      blockIds: dashboard.blockIds,
    })),
    chartBlocks: input.chartBlocks.map((block) => ({
      id: block.id,
      title: block.title,
      chartType: block.chartType,
      sourceId: block.sourceId,
      dataPoints: block.dataPoints,
    })),
    refreshPlans: input.refreshPlans,
    staleSourceWarnings: input.staleSourceWarnings,
    nextActions: input.nextActions,
  };
  const json = JSON.stringify(payload, null, 2);

  return {
    fileName: "data-report-dashboard-executive-packet.json",
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
    status: input.status,
    generatedAt: input.generatedAt,
    dashboardIds: input.dashboards.map((dashboard) => dashboard.id),
    chartBlockIds: input.chartBlocks.map((block) => block.id),
    staleWarningIds: input.staleSourceWarnings.map((warning) => warning.id),
  };
}
