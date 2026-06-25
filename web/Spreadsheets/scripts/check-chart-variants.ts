import { strict as assert } from "node:assert";
import {
  getBoxWhiskerPoints,
  getHierarchyChartPoints,
  getHistogramBins,
  getStackedChartPoints,
  getSurfaceChartCells,
  getWaterfallPoints,
} from "@/features/spreadsheet/chart-variant-data";
import { workbookChartToSvg } from "@/features/spreadsheet/chart-export";
import {
  addChartToDocument,
  updateChartAnchorInDocument,
} from "@/features/spreadsheet/state/chart-state";
import {
  moveInsertedObjectAnchor,
  resizeInsertedObjectAnchor,
} from "@/features/spreadsheet/worksheet-object-transform";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";
import { normalizeWorkbookDocument } from "@/features/workbooks/serialization";
import type { ChartDefinition, SheetData } from "@/features/workbooks/types";

const sheet: SheetData = {
  id: "sheet_1",
  name: "Chart data",
  rowCount: 20,
  columnCount: 8,
  columnWidths: {},
  hiddenRows: [],
  hiddenColumns: [],
  showGridlines: true,
  rowGroups: [],
  columnGroups: [],
  mergedCells: [],
  cells: {
    A1: { raw: "Region" },
    B1: { raw: "Q1" },
    C1: { raw: "Q2" },
    D1: { raw: "Q3" },
    A2: { raw: "North" },
    B2: { raw: "10" },
    C2: { raw: "14" },
    D2: { raw: "18" },
    A3: { raw: "South" },
    B3: { raw: "8" },
    C3: { raw: "12" },
    D3: { raw: "16" },
    A4: { raw: "East" },
    B4: { raw: "6" },
    C4: { raw: "9" },
    D4: { raw: "15" },
    A5: { raw: "West" },
    B5: { raw: "4" },
    C5: { raw: "11" },
    D5: { raw: "13" },
    E1: { raw: "Category" },
    F1: { raw: "Product" },
    G1: { raw: "Value" },
    E2: { raw: "Hardware" },
    F2: { raw: "Laptops" },
    G2: { raw: "32" },
    E3: { raw: "Hardware" },
    F3: { raw: "Monitors" },
    G3: { raw: "18" },
    E4: { raw: "Services" },
    F4: { raw: "Support" },
    G4: { raw: "20" },
    E5: { raw: "Services" },
    F5: { raw: "Training" },
    G5: { raw: "12" },
  },
};

const computedValues: Record<string, string> = {};
const categoryRange = {
  startRowIndex: 0,
  startColumnIndex: 0,
  endRowIndex: 4,
  endColumnIndex: 3,
};
const hierarchyRange = {
  startRowIndex: 0,
  startColumnIndex: 4,
  endRowIndex: 4,
  endColumnIndex: 6,
};
const chartTypes: ChartDefinition["type"][] = [
  "stacked-bar",
  "stacked-100-bar",
  "waterfall",
  "funnel",
  "histogram",
  "box-whisker",
  "treemap",
  "sunburst",
  "surface",
  "map",
];

const stackedChart: ChartDefinition = {
  id: "chart_stacked",
  sheetId: sheet.id,
  title: "Stacked",
  type: "stacked-bar",
  range: categoryRange,
};

const stackedPoints = getStackedChartPoints(sheet, computedValues, stackedChart);

assert.equal(stackedPoints.length, 4, "stacked chart reads category rows");
assert.deepEqual(
  stackedPoints[0]?.values.map((item) => item.series),
  ["Q1", "Q2", "Q3"],
  "stacked chart reads series headers",
);
assert.equal(stackedPoints[0]?.total, 42, "stacked chart totals positive values");

const waterfallPoints = getWaterfallPoints(sheet, computedValues, {
  ...stackedChart,
  type: "waterfall",
  range: {
    ...categoryRange,
    endColumnIndex: 1,
  },
});

assert.equal(waterfallPoints.at(-1)?.end, 28, "waterfall chart accumulates values");
assert.ok(getHistogramBins(sheet, computedValues, stackedChart).length >= 4);
assert.equal(
  getBoxWhiskerPoints(sheet, computedValues, stackedChart).length,
  3,
  "box and whisker chart creates one box per numeric series",
);
assert.equal(
  getHierarchyChartPoints(sheet, computedValues, {
    ...stackedChart,
    type: "treemap",
    range: hierarchyRange,
  }).length,
  4,
  "hierarchy chart reads label paths and values",
);
assert.equal(
  getSurfaceChartCells(sheet, computedValues, stackedChart).length,
  12,
  "surface chart reads a numeric matrix",
);

const document = createDefaultWorkbookDocument();

document.activeSheetId = sheet.id;
document.sheets = [sheet];

for (const type of chartTypes) {
  const range =
    type === "treemap" || type === "sunburst" ? hierarchyRange : categoryRange;
  const chart: ChartDefinition = {
    id: `chart_${type}`,
    sheetId: sheet.id,
    title: `${type} chart`,
    type,
    range,
  };
  const svg = workbookChartToSvg({
    chart,
    computedValues,
    sheet,
  });

  assert.match(svg, /<svg/, `${type} exports an SVG`);
  assert.doesNotMatch(
    svg,
    /No numeric values found/,
    `${type} exports real chart geometry`,
  );

  document.charts.push(chart);
}

const normalized = normalizeWorkbookDocument(document);

assert.deepEqual(
  normalized.charts.map((chart) => chart.type),
  chartTypes,
  "workbook normalization preserves advanced chart variants",
);
assert.ok(
  normalized.charts.every((chart) => chart.anchor),
  "workbook normalization creates worksheet chart anchors",
);

addChartToDocument(document, "waterfall", categoryRange);

assert.equal(
  document.charts.at(-1)?.title,
  "Waterfall chart",
  "chart state creates advanced chart titles",
);

const insertedChart = document.charts.at(-1);

assert(insertedChart?.anchor, "chart state creates worksheet chart anchors");

const originalChartRowIndex = insertedChart.anchor.rowIndex;
const originalChartOffsetY = insertedChart.anchor.offsetY;
const movedAnchor = moveInsertedObjectAnchor({
  deltaX: -48,
  deltaY: 24,
  object: { anchor: insertedChart.anchor },
  sheet,
});

updateChartAnchorInDocument(document, insertedChart.id, movedAnchor);

const movedChart = document.charts.at(-1);

assert(movedChart?.anchor, "chart anchor updates are stored");
assert.ok(
  movedChart.anchor.rowIndex > originalChartRowIndex ||
    movedChart.anchor.offsetY !== originalChartOffsetY,
  "chart anchors can move inside the worksheet object canvas",
);

const movedChartWidth = movedChart.anchor.width;
const movedChartHeight = movedChart.anchor.height;
const resizedAnchor = resizeInsertedObjectAnchor({
  deltaX: 40,
  deltaY: 30,
  handle: "southEast",
  object: { anchor: movedChart.anchor },
  sheet,
});

updateChartAnchorInDocument(document, insertedChart.id, resizedAnchor);

const resizedChart = document.charts.at(-1);

assert.equal(
  resizedChart?.anchor?.width,
  movedChartWidth + 40,
  "chart object handles can widen chart anchors",
);
assert.equal(
  resizedChart?.anchor?.height,
  movedChartHeight + 30,
  "chart object handles can heighten chart anchors",
);

console.log("Chart variant checks passed.");
