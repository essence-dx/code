import {
  mergeChartFormat,
  normalizeChartFormat,
} from "@/features/spreadsheet/chart-formatting";
import { getChartDataTable } from "@/features/spreadsheet/chart-data-table";
import { workbookChartToSvg } from "@/features/spreadsheet/chart-export";
import { updateChartFormatInDocument } from "@/features/spreadsheet/state/chart-state";
import { normalizeWorkbookDocument } from "@/features/workbooks/serialization";
import { defaultWorkbookTheme } from "@/features/workbooks/workbook-themes";
import type {
  ChartDefinition,
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const merged = mergeChartFormat(undefined, {
  axisTitles: {
    category: "Month",
    value: "Revenue",
  },
  legendPosition: "right",
  primaryColor: "#2563eb",
  showGridlines: false,
  showTrendline: true,
  axisBounds: {
    valueMin: 0,
    valueMax: 20,
  },
  errorBars: {
    enabled: true,
    type: "fixed",
    value: 2,
  },
  series: [
    {
      id: "series-1",
      color: "#16a34a",
      name: "Revenue",
    },
  ],
  dataTable: {
    enabled: true,
    showLegendKeys: true,
  },
  threeDimensional: {
    enabled: true,
    rotationX: 25,
    rotationY: 35,
    perspective: 45,
    depthPercent: 140,
  },
});

assert(merged?.axisTitles?.category === "Month", "category axis title is kept");
assert(merged?.axisTitles?.value === "Revenue", "value axis title is kept");
assert(merged?.legendPosition === "right", "legend position is persisted");
assert(merged?.primaryColor === "#2563eb", "series color is persisted");
assert(merged?.showGridlines === false, "gridline override is persisted");
assert(Boolean(merged?.trendline?.enabled), "trendline toggle is persisted");
assert(merged?.axisBounds?.valueMax === 20, "axis bounds persist");
assert(merged?.errorBars?.value === 2, "error bar value persists");
assert(merged?.series?.[0]?.name === "Revenue", "series edits persist");
assert(Boolean(merged?.dataTable?.enabled), "data table toggle is persisted");
assert(
  merged?.threeDimensional?.rotationY === 35,
  "3D rotation metadata is persisted",
);

const normalized = normalizeChartFormat({
  axisTitles: {
    category: "  Category axis  ",
    value: "  Value axis  ",
  },
  dataLabelPosition: "inside",
  legendPosition: "right",
  lineStyle: "dashed",
  markerStyle: "square",
  primaryColor: "#16a34a",
  secondaryAxis: true,
  secondaryColor: "#dc2626",
  errorBars: {
    enabled: true,
    type: "percentage",
    value: 12,
  },
  showGridlines: false,
  trendline: {
    displayEquation: true,
    enabled: true,
    type: "linear",
  },
  axisBounds: {
    valueMin: -5,
    valueMax: 25,
    secondaryValueMax: 100,
  },
  series: [
    {
      id: "combo-line",
      axis: "secondary",
      chartType: "line",
      color: "#0891b2",
      name: "Forecast",
    },
  ],
  dataTable: {
    enabled: true,
    showLegendKeys: false,
  },
  threeDimensional: {
    enabled: true,
    rotationX: 120,
    rotationY: -120,
    perspective: 999,
    depthPercent: 10,
  },
});

assert(normalized?.axisTitles?.category === "Category axis", "axis titles trim");
assert(normalized?.dataLabelPosition === "inside", "label position normalizes");
assert(normalized?.lineStyle === "dashed", "line style normalizes");
assert(normalized?.markerStyle === "square", "marker style normalizes");
assert(Boolean(normalized?.secondaryAxis), "secondary axis normalizes");
assert(Boolean(normalized?.errorBars?.enabled), "error bars normalize");
assert(normalized?.axisBounds?.valueMin === -5, "axis bounds normalize");
assert(Boolean(normalized?.trendline?.displayEquation), "trendline normalizes");
assert(normalized?.series?.[0]?.axis === "secondary", "series normalizes");
assert(normalized?.dataTable?.showLegendKeys === false, "data table options normalize");
assert(normalized?.threeDimensional?.rotationX === 90, "3D rotation clamps");
assert(normalized?.threeDimensional?.rotationY === -90, "3D rotation clamps negative");
assert(normalized?.threeDimensional?.perspective === 240, "3D perspective clamps");
assert(normalized?.threeDimensional?.depthPercent === 20, "3D depth clamps");

const sheet: SheetData = {
  id: "sheet_1",
  name: "Sheet 1",
  rowCount: 20,
  columnCount: 12,
  columnWidths: {},
  hiddenRows: [],
  hiddenColumns: [],
  showGridlines: true,
  rowGroups: [],
  columnGroups: [],
  mergedCells: [],
  cells: {
    A1: { raw: "Month" },
    B1: { raw: "Revenue" },
    C1: { raw: "Cost" },
    A2: { raw: "Jan" },
    B2: { raw: "10" },
    C2: { raw: "6" },
    A3: { raw: "Feb" },
    B3: { raw: "12" },
    C3: { raw: "7" },
  },
};
const chart: ChartDefinition = {
  id: "chart_1",
  sheetId: sheet.id,
  title: "Revenue chart",
  type: "line",
  range: {
    startRowIndex: 0,
    startColumnIndex: 0,
    endRowIndex: 2,
    endColumnIndex: 2,
  },
};
const document: WorkbookDocument = {
  version: 1,
  metadata: {
    description: "",
    favorite: false,
    folderName: "",
    isTemplate: false,
    lastOpenedAt: "2026-05-15T00:00:00.000Z",
    tags: [],
    updatedAt: "2026-05-15T00:00:00.000Z",
  },
  activeSheetId: sheet.id,
  versionHistory: [],
  versionRestores: [],
  customViews: [],
  formulaWatches: [],
  whatIfScenarios: [],
  theme: defaultWorkbookTheme,
  cellStyles: [],
  queries: [],
  macroProjects: [],
  unsupportedParts: [],
  nativeObjects: [],
  automationScripts: [],
  workbookProtection: null,
  sheets: [sheet],
  charts: [chart],
  sparklines: [],
  insertedObjects: [],
  tables: [],
  tableSlicers: [],
  tableTimelines: [],
  pivotTables: [],
  conditionalFormats: [],
  dataValidations: [],
  filters: [],
  filterPresets: [],
  cellNotes: [],
  commentNotifications: [],
  cellLinks: [],
  namedRanges: [],
  sheetProtections: [],
  sheetPrintSettings: [],
};

updateChartFormatInDocument(document, chart.id, {
  axisTitles: { value: "Net revenue" },
  dataTable: { enabled: true, showLegendKeys: false },
  markerStyle: "square",
  primaryColor: "#0891b2",
  threeDimensional: {
    enabled: true,
    rotationX: 30,
    rotationY: 45,
    perspective: 35,
    depthPercent: 120,
  },
});

const normalizedDocument = normalizeWorkbookDocument(document);
const normalizedChart = normalizedDocument.charts[0];
const dataTable = getChartDataTable({
  chart: normalizedChart!,
  computedValues: {},
  sheet,
});
const chartSvg = workbookChartToSvg({
  chart: normalizedChart!,
  computedValues: {},
  sheet,
});

assert(
  normalizedChart?.format?.axisTitles?.value === "Net revenue",
  "chart format survives workbook normalization",
);
assert(
  normalizedChart?.format?.markerStyle === "square",
  "marker style survives workbook normalization",
);
assert(
  normalizedChart?.format?.primaryColor === "#0891b2",
  "series color survives workbook normalization",
);
assert(
  normalizedChart?.format?.dataTable?.enabled === true,
  "chart data table survives workbook normalization",
);
assert(
  normalizedChart?.format?.threeDimensional?.rotationY === 45,
  "3D metadata survives workbook normalization",
);
assert(dataTable.headers.length === 2, "chart data table reads series headers");
assert(dataTable.rows.length === 2, "chart data table reads source rows");
assert(
  chartSvg.includes("Category") && chartSvg.includes("Revenue"),
  "chart SVG export includes data table content",
);

console.log("Chart formatting checks passed.");
