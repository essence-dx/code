import { cellKey } from "@/features/workbooks/addresses";
import {
  mergeChartFormat,
  type ChartFormatUpdate,
} from "@/features/spreadsheet/chart-formatting";
import {
  createChartObjectAnchor,
  normalizeChartObjectAnchor,
} from "@/features/spreadsheet/chart-object-anchor";
import { getActiveSheet } from "@/features/spreadsheet/state/document-state";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";
import type {
  ChartDefinition,
  InsertedObjectAnchor,
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";

const chartTitles = {
  bar: "Bar chart",
  line: "Line chart",
  area: "Area chart",
  pie: "Pie chart",
  scatter: "Scatter chart",
  bubble: "Bubble chart",
  radar: "Radar chart",
  combo: "Combo chart",
  stock: "Stock chart",
  "stacked-bar": "Stacked bar chart",
  "stacked-100-bar": "100% stacked bar chart",
  waterfall: "Waterfall chart",
  funnel: "Funnel chart",
  histogram: "Histogram chart",
  "box-whisker": "Box and whisker chart",
  treemap: "Treemap chart",
  sunburst: "Sunburst chart",
  surface: "Surface chart",
  map: "Map chart",
} satisfies Record<ChartDefinition["type"], string>;

export function addChartToDocument(
  document: WorkbookDocument,
  type: ChartDefinition["type"],
  range: CellRange,
) {
  const sheet = getActiveSheet(document);

  document.charts ??= [];
  document.charts.push({
    anchor: createChartObjectAnchor(sheet, range),
    id: `chart_${crypto.randomUUID()}`,
    sheetId: document.activeSheetId,
    title: chartTitles[type],
    type,
    range,
  });
}

export function updateChartAnchorInDocument(
  document: WorkbookDocument,
  chartId: string,
  anchor: Partial<InsertedObjectAnchor>,
) {
  const chart = (document.charts ?? []).find((item) => item.id === chartId);
  const sheet = chart
    ? document.sheets.find((candidate) => candidate.id === chart.sheetId)
    : undefined;

  if (chart && sheet) {
    chart.anchor = normalizeChartObjectAnchor(
      {
        ...(chart.anchor ?? createChartObjectAnchor(sheet, chart.range)),
        ...anchor,
      },
      sheet,
      chart.range,
    );
  }
}

export function deleteChartFromDocument(
  document: WorkbookDocument,
  chartId: string,
) {
  document.charts = (document.charts ?? []).filter((chart) => chart.id !== chartId);
}

export function updateChartTemplateInDocument(
  document: WorkbookDocument,
  chartId: string,
  template: NonNullable<ChartDefinition["template"]>,
) {
  const chart = (document.charts ?? []).find((item) => item.id === chartId);

  if (chart) {
    chart.template = template;
  }
}

export function updateChartFormatInDocument(
  document: WorkbookDocument,
  chartId: string,
  updates: ChartFormatUpdate,
) {
  const chart = (document.charts ?? []).find((item) => item.id === chartId);

  if (chart) {
    chart.format = mergeChartFormat(chart.format, updates);
  }
}

export function renameChartInDocument(
  document: WorkbookDocument,
  chartId: string,
  title: string,
) {
  const chart = (document.charts ?? []).find((item) => item.id === chartId);

  if (chart) {
    chart.title = title.slice(0, 120);
  }
}

function toggleChartBoolean(
  document: WorkbookDocument,
  chartId: string,
  key: "showAxes" | "showDataLabels" | "showLegend",
) {
  const chart = (document.charts ?? []).find((item) => item.id === chartId);

  if (chart) {
    chart[key] = chart[key] === false ? undefined : false;
  }
}

export function toggleChartDataLabelsInDocument(
  document: WorkbookDocument,
  chartId: string,
) {
  toggleChartBoolean(document, chartId, "showDataLabels");
}

export function toggleChartAxesInDocument(
  document: WorkbookDocument,
  chartId: string,
) {
  toggleChartBoolean(document, chartId, "showAxes");
}

export function toggleChartLegendInDocument(
  document: WorkbookDocument,
  chartId: string,
) {
  toggleChartBoolean(document, chartId, "showLegend");
}

export function canAddSparkline(sheet: SheetData, range: CellRange) {
  return range.endColumnIndex < sheet.columnCount - 1;
}

export function addSparklineToDocument(
  document: WorkbookDocument,
  range: CellRange,
) {
  const sheet = getActiveSheet(document);
  const targetCellKey = cellKey(range.startRowIndex, range.endColumnIndex + 1);

  document.sparklines ??= [];
  document.sparklines = document.sparklines.filter(
    (sparkline) =>
      sparkline.sheetId !== sheet.id ||
      sparkline.targetCellKey !== targetCellKey,
  );
  document.sparklines.push({
    id: `sparkline_${crypto.randomUUID()}`,
    sheetId: sheet.id,
    targetCellKey,
    type: "line",
    range,
  });
}

export function deleteSparklineFromDocument(
  document: WorkbookDocument,
  sparklineId: string,
) {
  document.sparklines = (document.sparklines ?? []).filter(
    (sparkline) => sparkline.id !== sparklineId,
  );
}
