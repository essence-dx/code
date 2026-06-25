import { createChartDataFromTable } from "@/features/editor/chart-data-binding";
import {
  createChartElement,
  createShapeElement,
  createTableElement,
  createTextElement,
} from "@/features/editor/document-factory";
import {
  applyDataChartTheme,
  getDataChartTheme,
  type DataChartThemeId,
} from "@/features/editor/data-visualization-themes";
import type { ChartElement, DesignElement, TableElement } from "@/features/editor/types";

export type DataDashboardTemplateId =
  | "executive-kpi"
  | "channel-performance"
  | "report-brief";

export type DataDashboardTemplate = {
  id: DataDashboardTemplateId;
  label: string;
  description: string;
  cells: string[];
  rows: number;
  columns: number;
  chartSpecs: Array<{
    title: string;
    chartType: ChartElement["chartType"];
    valueColumnIndex: number;
  }>;
};

export const dataDashboardTemplates: DataDashboardTemplate[] = [
  {
    id: "executive-kpi",
    label: "Executive KPI dashboard",
    description: "Revenue, pipeline, and conversion cards for leadership.",
    rows: 5,
    columns: 4,
    cells: [
      "Segment",
      "Revenue",
      "Pipeline",
      "Conversion",
      "Organic",
      "42000",
      "86000",
      "8.4",
      "Email",
      "31000",
      "54000",
      "7.1",
      "Paid",
      "52000",
      "92000",
      "5.8",
      "Partner",
      "26000",
      "41000",
      "6.6",
    ],
    chartSpecs: [
      { title: "Revenue by segment", chartType: "bar", valueColumnIndex: 1 },
      { title: "Pipeline mix", chartType: "donut", valueColumnIndex: 2 },
      { title: "Conversion trend", chartType: "line", valueColumnIndex: 3 },
    ],
  },
  {
    id: "channel-performance",
    label: "Channel performance dashboard",
    description: "Compare acquisition, spend, and return across channels.",
    rows: 5,
    columns: 4,
    cells: [
      "Channel",
      "Spend",
      "Leads",
      "ROI",
      "Search",
      "18000",
      "920",
      "3.8",
      "Social",
      "12500",
      "680",
      "2.9",
      "Email",
      "5400",
      "420",
      "5.4",
      "Partner",
      "9200",
      "310",
      "4.1",
    ],
    chartSpecs: [
      { title: "Spend by channel", chartType: "bar", valueColumnIndex: 1 },
      { title: "Lead mix", chartType: "donut", valueColumnIndex: 2 },
      { title: "ROI comparison", chartType: "line", valueColumnIndex: 3 },
    ],
  },
  {
    id: "report-brief",
    label: "Report briefing dashboard",
    description: "A compact findings page with metrics and source table.",
    rows: 5,
    columns: 4,
    cells: [
      "Finding",
      "Impact",
      "Confidence",
      "Priority",
      "Activation",
      "74",
      "88",
      "1",
      "Retention",
      "61",
      "79",
      "2",
      "Pricing",
      "48",
      "66",
      "3",
      "Onboarding",
      "69",
      "84",
      "1",
    ],
    chartSpecs: [
      { title: "Impact by finding", chartType: "bar", valueColumnIndex: 1 },
      { title: "Confidence mix", chartType: "donut", valueColumnIndex: 2 },
      { title: "Priority trend", chartType: "line", valueColumnIndex: 3 },
    ],
  },
];

export function getDataDashboardTemplate(id: unknown) {
  return (
    dataDashboardTemplates.find((template) => template.id === id) ??
    dataDashboardTemplates[0]
  );
}

export function createDataDashboardTemplateElements(input: {
  templateId?: DataDashboardTemplateId;
  themeId?: DataChartThemeId;
  canvasWidth?: number;
} = {}) {
  const template = getDataDashboardTemplate(input.templateId);
  const theme = getDataChartTheme(input.themeId);
  const canvasWidth = input.canvasWidth ?? 1200;
  const left = 72;
  const top = 64;
  const gap = 18;
  const contentWidth = Math.max(780, Math.min(1120, canvasWidth - left * 2));
  const chartWidth = Math.floor((contentWidth - gap * 2) / 3);
  const chartTop = top + 174;
  const table = createTableElement({
    rows: template.rows,
    columns: template.columns,
    cells: template.cells,
    x: left,
    y: chartTop + 322,
    width: contentWidth,
    height: 230,
    fontSize: 14,
    headerFill: theme.axisColor,
    bodyFill: "#ffffff",
    borderColor: theme.axisColor,
    textColor: theme.textColor,
    cellPadding: 10,
    dataSourceKind: "csv-url",
    dataSourcePresetId: template.id,
    dataSourceHeaderName: template.label,
    dataSourceUrl: `local://${template.id}`,
    dataSourceLastSyncedAt: new Date().toISOString(),
    dataSourceStatus: "synced",
    dataSourceMessage: "Generated starter dataset is ready to replace.",
  });

  return [
    createShapeElement({
      x: left - 24,
      y: top - 28,
      width: contentWidth + 48,
      height: 720,
      fill: theme.backgroundColor,
      stroke: theme.axisColor,
      strokeWidth: 2,
      radius: 8,
    }),
    createTextElement({
      content: template.label,
      x: left,
      y: top,
      width: contentWidth * 0.62,
      height: 48,
      fontSize: 34,
      fontWeight: 800,
      color: theme.textColor,
    }),
    createTextElement({
      content: template.description,
      x: left,
      y: top + 54,
      width: contentWidth * 0.72,
      height: 44,
      fontSize: 18,
      fontWeight: 500,
      color: theme.textColor,
      opacity: 0.78,
    }),
    ...createSummaryCards({ left, top: top + 112, gap, chartWidth, theme }),
    ...template.chartSpecs.flatMap((spec, index) =>
      createDashboardChartCard({
        index,
        left,
        top: chartTop,
        gap,
        chartWidth,
        table,
        spec,
        themeId: theme.id,
      }),
    ),
    table,
  ] satisfies DesignElement[];
}

function createSummaryCards({
  left,
  top,
  gap,
  chartWidth,
  theme,
}: {
  left: number;
  top: number;
  gap: number;
  chartWidth: number;
  theme: ReturnType<typeof getDataChartTheme>;
}) {
  return ["Source", "Refresh", "Handoff"].flatMap((label, index) => {
    const x = left + index * (chartWidth + gap);

    return [
      createShapeElement({
        x,
        y: top,
        width: chartWidth,
        height: 44,
        fill: "#ffffff",
        stroke: theme.axisColor,
        strokeWidth: 1,
        radius: 8,
      }),
      createTextElement({
        content: label,
        x: x + 14,
        y: top + 12,
        width: chartWidth - 28,
        height: 22,
        fontSize: 14,
        fontWeight: 800,
        color: theme.textColor,
      }),
    ];
  });
}

function createDashboardChartCard({
  index,
  left,
  top,
  gap,
  chartWidth,
  table,
  spec,
  themeId,
}: {
  index: number;
  left: number;
  top: number;
  gap: number;
  chartWidth: number;
  table: TableElement;
  spec: DataDashboardTemplate["chartSpecs"][number];
  themeId: DataChartThemeId;
}) {
  const x = left + index * (chartWidth + gap);
  const chartData = createChartDataFromTable({
    labelColumnIndex: 0,
    table,
    useFilteredRows: true,
    valueColumnIndex: spec.valueColumnIndex,
  });
  const chart = applyDataChartTheme(
    createChartElement({
      chartType: spec.chartType,
      data: chartData,
      dataSourceTableId: table.id,
      dataSourceLabelColumnIndex: 0,
      dataSourceValueColumnIndex: spec.valueColumnIndex,
      dataSourceUseFilteredRows: true,
      x: x + 14,
      y: top + 52,
      width: chartWidth - 28,
      height: 212,
      showLabels: true,
      showValues: true,
    }),
    themeId,
  );

  return [
    createShapeElement({
      x,
      y: top,
      width: chartWidth,
      height: 286,
      fill: "#ffffff",
      stroke: chart.axisColor,
      strokeWidth: 1,
      radius: 8,
    }),
    createTextElement({
      content: spec.title,
      x: x + 16,
      y: top + 16,
      width: chartWidth - 32,
      height: 26,
      fontSize: 17,
      fontWeight: 800,
      color: chart.textColor,
    }),
    chart,
  ];
}
