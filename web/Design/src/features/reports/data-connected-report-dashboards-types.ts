import type { ChartType } from "@/features/editor/types";

export type DataConnectedReportStatus = "ready" | "review" | "blocked";

export type DataConnectedReportBlockKind = "kpi" | "bar" | "line" | "donut";

export type DataConnectedReportDataPoint = {
  label: string;
  value: number;
  color: string;
};

export type DataConnectedReportChartBlock = {
  id: string;
  title: string;
  kind: DataConnectedReportBlockKind;
  chartType: ChartType | "kpi";
  status: DataConnectedReportStatus;
  reusable: boolean;
  sourceId: string;
  sourceLabel: string;
  dataPoints: DataConnectedReportDataPoint[];
  summary: string;
};

export type DataConnectedReportDashboard = {
  id: string;
  title: string;
  audience: string;
  status: DataConnectedReportStatus;
  score: number;
  exportReady: boolean;
  blockIds: string[];
  refreshPlanIds: string[];
  staleWarningIds: string[];
  summary: string;
};

export type DataConnectedReportRefreshPlan = {
  id: string;
  sourceId: string;
  sourceLabel: string;
  status: DataConnectedReportStatus;
  cadenceHours: number;
  lastRefreshedAt: string | null;
  nextRefreshAt: string | null;
  owner: string;
  detail: string;
};

export type DataConnectedReportStaleWarning = {
  id: string;
  sourceId: string;
  sourceLabel: string;
  severity: DataConnectedReportStatus;
  ageHours: number;
  detail: string;
  remediation: string;
};

export type DataConnectedReportExecutivePacket = {
  fileName: string;
  dataUrl: string;
  status: DataConnectedReportStatus;
  generatedAt: string;
  dashboardIds: string[];
  chartBlockIds: string[];
  staleWarningIds: string[];
};

export type DataConnectedReportDashboardCenter = {
  generatedAt: string;
  status: DataConnectedReportStatus;
  score: number;
  dashboards: DataConnectedReportDashboard[];
  chartBlocks: DataConnectedReportChartBlock[];
  refreshPlans: DataConnectedReportRefreshPlan[];
  staleSourceWarnings: DataConnectedReportStaleWarning[];
  executivePacket: DataConnectedReportExecutivePacket;
  nextActions: string[];
  totals: {
    dashboards: number;
    chartBlocks: number;
    refreshPlans: number;
    staleWarnings: number;
    exportReadyDashboards: number;
  };
};
