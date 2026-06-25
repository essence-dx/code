import { strict as assert } from "node:assert";
import * as XLSX from "xlsx";
import { workbookChartToSvg } from "@/features/spreadsheet/chart-export";
import { getWorkbookCompatibilityIssues } from "@/features/spreadsheet/workbook-compatibility";
import { cellKey } from "@/features/workbooks/addresses";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";
import {
  workbookDocumentToXlsx,
  xlsxToWorkbookDocument,
} from "@/features/workbooks/xlsx";
import type { ChartDefinition } from "@/features/workbooks/types";

const decoder = new TextDecoder();

function readPackage(buffer: ArrayBuffer) {
  return XLSX.CFB.read(new Uint8Array(buffer), { type: "buffer" });
}

function getPackageText(cfb: unknown, path: string) {
  const file = XLSX.CFB.find(cfb, `/${path}`);
  const content = file?.content;

  assert.ok(content, `Expected ${path} to exist`);

  return decoder.decode(content as Uint8Array);
}

const document = createDefaultWorkbookDocument();
const sheet = document.sheets[0];

assert.ok(sheet, "default workbook has a sheet");

sheet.cells = {
  ...sheet.cells,
  [cellKey(0, 0)]: { raw: "Month" },
  [cellKey(0, 1)]: { raw: "Revenue" },
  [cellKey(0, 2)]: { raw: "Cost" },
  [cellKey(1, 0)]: { raw: "Jan" },
  [cellKey(1, 1)]: { raw: "14" },
  [cellKey(1, 2)]: { raw: "8" },
  [cellKey(2, 0)]: { raw: "Feb" },
  [cellKey(2, 1)]: { raw: "18" },
  [cellKey(2, 2)]: { raw: "10" },
  [cellKey(3, 0)]: { raw: "Mar" },
  [cellKey(3, 1)]: { raw: "22" },
  [cellKey(3, 2)]: { raw: "12" },
};

const barChart: ChartDefinition = {
  id: "chart_3d_bar",
  sheetId: sheet.id,
  title: "3D revenue",
  type: "bar",
  range: {
    startRowIndex: 0,
    startColumnIndex: 0,
    endRowIndex: 3,
    endColumnIndex: 2,
  },
  format: {
    dataTable: {
      enabled: true,
      showLegendKeys: true,
    },
    threeDimensional: {
      depthPercent: 180,
      enabled: true,
      perspective: 45,
      rotationX: 25,
      rotationY: 35,
    },
  },
};
const surfaceChart: ChartDefinition = {
  id: "chart_3d_surface",
  sheetId: sheet.id,
  title: "3D surface",
  type: "surface",
  range: {
    startRowIndex: 0,
    startColumnIndex: 0,
    endRowIndex: 3,
    endColumnIndex: 2,
  },
  format: {
    threeDimensional: {
      depthPercent: 120,
      enabled: true,
      perspective: 30,
      rotationX: 20,
      rotationY: 30,
    },
  },
};

document.charts = [barChart, surfaceChart];

const barSvg = workbookChartToSvg({
  chart: barChart,
  computedValues: {},
  sheet,
});
const surfaceSvg = workbookChartToSvg({
  chart: surfaceChart,
  computedValues: {},
  sheet,
});

assert.match(barSvg, /data-chart-3d="bar"/, "bar SVG renders projected 3D faces");
assert.match(
  surfaceSvg,
  /data-chart-3d="surface"/,
  "surface SVG renders projected 3D mesh",
);

const exported = workbookDocumentToXlsx(document);
const packageFile = readPackage(exported);
const chartXml = getPackageText(packageFile, "xl/charts/essence3dChart1.xml");
const surfaceXml = getPackageText(packageFile, "xl/charts/essence3dChart2.xml");
const drawingXml = getPackageText(packageFile, "xl/drawings/essence3dDrawing1.xml");

assert.match(chartXml, /<c:bar3DChart\b/, "exports native bar3D chart XML");
assert.match(chartXml, /<c:dTable\b/, "exports data table marker");
assert.match(chartXml, /<c:rotY val="35"/, "exports 3D rotation metadata");
assert.match(surfaceXml, /<c:surface3DChart\b/, "exports native surface3D chart XML");
assert.match(drawingXml, /3D revenue/, "exports native drawing anchor");

const reimported = xlsxToWorkbookDocument(exported);
const reimportedBarChart = reimported.nativeObjects.find(
  (object) => object.kind === "chart" && object.chart?.chartType === "bar3D",
);
const reimportedSurfaceChart = reimported.nativeObjects.find(
  (object) =>
    object.kind === "chart" && object.chart?.chartType === "surface3D",
);

assert.equal(
  reimportedBarChart?.chart?.threeDimensional?.rotationY,
  35,
  "reimports native 3D rotation metadata",
);
assert.equal(
  reimportedBarChart?.chart?.hasDataTable,
  true,
  "reimports native data table marker",
);
assert.equal(
  reimportedSurfaceChart?.chart?.threeDimensional?.enabled,
  true,
  "reimports generated native surface3D metadata",
);
assert.ok(
  reimportedBarChart?.packagePaths.includes("xl/charts/essence3dChart1.xml"),
  "indexes generated chart package path",
);

const compatibilityIssue = getWorkbookCompatibilityIssues(document).find(
  (issue) => issue.id === "chart-3d-compatibility-metadata",
);

assert.ok(
  compatibilityIssue?.details.includes("native chart/drawing OOXML"),
  "compatibility copy reports native 3D chart export support",
);

console.log("3D chart rendering and round-trip checks passed.");
