import * as XLSX from "xlsx";
import { getChartPoints, type ChartPoint } from "@/features/spreadsheet/chart-data";
import { getEffectiveChartFormat } from "@/features/spreadsheet/chart-formatting";
import { getStackedChartPoints } from "@/features/spreadsheet/chart-variant-data";
import { evaluateWorkbook } from "@/features/spreadsheet/formula-engine";
import {
  bytesToText,
  normalizePackagePath,
  rawContentToBytes,
  textToBytes,
  toArrayBuffer,
} from "@/features/workbooks/workbook-unsupported-part-codec";
import type {
  ChartDefinition,
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";

const drawingRelationshipType =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing";
const chartRelationshipType =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart";
const chartContentType =
  "application/vnd.openxmlformats-officedocument.drawingml.chart+xml";
const drawingContentType =
  "application/vnd.openxmlformats-officedocument.drawing+xml";

type GeneratedChartEntry = {
  chart: ChartDefinition;
  chartPath: string;
  drawingRelationshipId: string;
  sheet: SheetData;
  sheetIndex: number;
};

function getCfbFile(cfb: unknown, path: string): { content?: unknown } | null {
  const normalizedPath = normalizePackagePath(path);

  return (
    XLSX.CFB.find(cfb, `/${normalizedPath}`) ??
    XLSX.CFB.find(cfb, normalizedPath)
  );
}

function getCfbText(cfb: unknown, path: string) {
  const file = getCfbFile(cfb, path);
  const bytes = rawContentToBytes(file?.content);

  return bytes ? bytesToText(bytes) : "";
}

function setCfbText(cfb: unknown, path: string, value: string) {
  XLSX.CFB.utils.cfb_add(cfb, `/${normalizePackagePath(path)}`, textToBytes(value));
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isExportable3DChart(chart: ChartDefinition) {
  return (
    chart.format?.threeDimensional?.enabled === true &&
    (chart.type === "bar" ||
      chart.type === "stacked-bar" ||
      chart.type === "stacked-100-bar" ||
      chart.type === "pie" ||
      chart.type === "surface")
  );
}

function relationshipXml(id: string, type: string, target: string) {
  return `<Relationship Id="${escapeXml(id)}" Type="${type}" Target="${escapeXml(
    target,
  )}"/>`;
}

function emptyRelationshipsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;
}

function addRelationship(xml: string, id: string, type: string, target: string) {
  const currentXml = xml.trim() || emptyRelationshipsXml();

  if (currentXml.includes(`Target="${target}"`)) {
    return currentXml;
  }

  return currentXml.replace(
    "</Relationships>",
    `${relationshipXml(id, type, target)}</Relationships>`,
  );
}

function relationshipTarget(xml: string, relationshipId: string) {
  const escapedId = relationshipId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const relationship = new RegExp(
    `<Relationship\\b[^>]*Id="${escapedId}"[^>]*Target="([^"]+)"[^>]*/>`,
  ).exec(xml)?.[1];

  return relationship ?? "";
}

function resolveTarget(basePath: string, target: string) {
  if (target.startsWith("/")) {
    return normalizePackagePath(target);
  }

  const parts = `${basePath}/${target}`.split("/");
  const resolved: string[] = [];

  for (const part of parts) {
    if (!part || part === ".") {
      continue;
    }

    if (part === "..") {
      resolved.pop();
      continue;
    }

    resolved.push(part);
  }

  return normalizePackagePath(resolved.join("/"));
}

function drawingRelationshipPath(drawingPath: string) {
  const fileName = drawingPath.split("/").at(-1) ?? drawingPath;
  const basePath = drawingPath.split("/").slice(0, -1).join("/");

  return `${basePath}/_rels/${fileName}.rels`;
}

function ensureWorksheetNamespace(xml: string) {
  if (xml.includes("xmlns:r=")) {
    return xml;
  }

  return xml.replace(
    /<worksheet\b/,
    '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
  );
}

function addWorksheetDrawingReference(xml: string, relationshipId: string) {
  const withNamespace = ensureWorksheetNamespace(xml);

  if (withNamespace.includes(`r:id="${relationshipId}"`)) {
    return withNamespace;
  }

  return withNamespace.replace(
    "</worksheet>",
    `<drawing r:id="${relationshipId}"/></worksheet>`,
  );
}

function addContentTypeOverride(xml: string, partPath: string, contentType: string) {
  const normalizedPath = `/${normalizePackagePath(partPath)}`;

  if (xml.includes(`PartName="${normalizedPath}"`)) {
    return xml;
  }

  return xml.replace(
    "</Types>",
    `<Override PartName="${normalizedPath}" ContentType="${contentType}"/></Types>`,
  );
}

function chartTag(chart: ChartDefinition) {
  if (chart.type === "pie") {
    return "pie3DChart";
  }

  if (chart.type === "surface") {
    return "surface3DChart";
  }

  return "bar3DChart";
}

function getChartLiteralPoints({
  chart,
  computedValues,
  sheet,
}: {
  chart: ChartDefinition;
  computedValues: Record<string, string>;
  sheet: SheetData;
}): ChartPoint[] {
  if (chart.type === "stacked-bar" || chart.type === "stacked-100-bar") {
    return getStackedChartPoints(sheet, computedValues, chart).map((point) => ({
      label: point.label,
      value: point.values.reduce((sum, item) => sum + Math.max(item.value, 0), 0),
    }));
  }

  return getChartPoints(sheet, computedValues, chart);
}

function literalSeriesXml(chart: ChartDefinition, points: ChartPoint[]) {
  const labels = points
    .map(
      (point, index) =>
        `<c:pt idx="${index}"><c:v>${escapeXml(point.label)}</c:v></c:pt>`,
    )
    .join("");
  const values = points
    .map(
      (point, index) =>
        `<c:pt idx="${index}"><c:v>${Number.isFinite(point.value) ? point.value : 0}</c:v></c:pt>`,
    )
    .join("");

  return `<c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>${escapeXml(
    chart.title || "Series 1",
  )}</c:v></c:tx><c:cat><c:strLit><c:ptCount val="${points.length}"/>${labels}</c:strLit></c:cat><c:val><c:numLit><c:formatCode>General</c:formatCode><c:ptCount val="${points.length}"/>${values}</c:numLit></c:val></c:ser>`;
}

function nativeChartXml({
  chart,
  computedValues,
  sheet,
}: {
  chart: ChartDefinition;
  computedValues: Record<string, string>;
  sheet: SheetData;
}) {
  const format = getEffectiveChartFormat(chart);
  const tag = chartTag(chart);
  const points = getChartLiteralPoints({ chart, computedValues, sheet });
  const series = literalSeriesXml(chart, points);
  const chartBody =
    tag === "pie3DChart"
      ? `<c:${tag}><c:varyColors val="1"/>${series}<c:firstSliceAng val="0"/></c:${tag}>`
      : tag === "surface3DChart"
        ? `<c:${tag}><c:wireframe val="0"/>${series}</c:${tag}>`
        : `<c:${tag}><c:barDir val="col"/><c:grouping val="${
            chart.type === "stacked-bar" || chart.type === "stacked-100-bar"
              ? "stacked"
              : "clustered"
          }"/><c:varyColors val="0"/>${series}<c:shape val="box"/></c:${tag}>`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:date1904 val="0"/>
  <c:chart>
    <c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>${escapeXml(
      chart.title || "3D chart",
    )}</a:t></a:r></a:p></c:rich></c:tx></c:title>
    <c:view3D>
      <c:rotX val="${format.threeDimensional.rotationX}"/>
      <c:rotY val="${format.threeDimensional.rotationY}"/>
      <c:perspective val="${format.threeDimensional.perspective}"/>
      <c:depthPercent val="${format.threeDimensional.depthPercent}"/>
      <c:rAngAx val="${format.threeDimensional.rightAngleAxes ? 1 : 0}"/>
    </c:view3D>
    <c:plotArea><c:layout/>${chartBody}</c:plotArea>
    ${format.dataTable.enabled ? "<c:dTable/>" : ""}
    <c:plotVisOnly val="1"/>
  </c:chart>
</c:chartSpace>`;
}

function drawingAnchorXml(entry: GeneratedChartEntry, index: number) {
  const fallbackColumn = Math.min(12 + index * 2, 20);
  const fallbackRow = Math.min(2 + index * 4, 40);
  const fromColumn = entry.chart.anchor?.columnIndex ?? fallbackColumn;
  const fromRow = entry.chart.anchor?.rowIndex ?? fallbackRow;
  const widthInColumns = Math.max(
    2,
    Math.ceil((entry.chart.anchor?.width ?? 576) / 96),
  );
  const heightInRows = Math.max(
    4,
    Math.ceil((entry.chart.anchor?.height ?? 336) / 24),
  );

  return `<xdr:twoCellAnchor editAs="oneCell">
  <xdr:from><xdr:col>${fromColumn}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${fromRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
  <xdr:to><xdr:col>${fromColumn + widthInColumns}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${fromRow + heightInRows}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
  <xdr:graphicFrame macro="">
    <xdr:nvGraphicFramePr><xdr:cNvPr id="${2000 + index}" name="${escapeXml(
      entry.chart.title || "Essence 3D chart",
    )}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>
    <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="5486400" cy="3200400"/></xdr:xfrm>
    <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="${entry.drawingRelationshipId}"/></a:graphicData></a:graphic>
  </xdr:graphicFrame>
  <xdr:clientData/>
</xdr:twoCellAnchor>`;
}

function emptyDrawingXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"></xdr:wsDr>`;
}

function appendDrawingAnchors(xml: string, entries: GeneratedChartEntry[]) {
  const drawingXml = xml.trim() || emptyDrawingXml();
  const anchors = entries
    .map((entry, index) => drawingAnchorXml(entry, index))
    .join("");

  return drawingXml.replace("</xdr:wsDr>", `${anchors}</xdr:wsDr>`);
}

function getSheetDrawingPath({
  cfb,
  drawingIndex,
  sheetRelsXml,
  worksheetXml,
}: {
  cfb: unknown;
  drawingIndex: number;
  sheetRelsXml: string;
  worksheetXml: string;
}) {
  const existingDrawingRelationshipId =
    /<drawing\b[^>]*r:id="([^"]+)"/.exec(worksheetXml)?.[1] ?? "";
  const existingTarget = existingDrawingRelationshipId
    ? relationshipTarget(sheetRelsXml, existingDrawingRelationshipId)
    : "";

  if (existingTarget) {
    const existingPath = resolveTarget("xl/worksheets", existingTarget);

    if (getCfbFile(cfb, existingPath)) {
      return {
        drawingPath: existingPath,
        sheetRelationshipId: existingDrawingRelationshipId,
        shouldAddWorksheetReference: false,
      };
    }
  }

  return {
    drawingPath: `xl/drawings/essence3dDrawing${drawingIndex}.xml`,
    sheetRelationshipId: `rIdEssence3DChart${drawingIndex}`,
    shouldAddWorksheetReference: true,
  };
}

export function applyGeneratedNative3DChartsToBuffer(
  buffer: ArrayBuffer,
  document: WorkbookDocument,
) {
  const charts = document.charts.filter(isExportable3DChart);

  if (charts.length === 0) {
    return buffer;
  }

  const cfb = XLSX.CFB.read(new Uint8Array(buffer), { type: "buffer" });
  let contentTypesXml = getCfbText(cfb, "[Content_Types].xml");
  const chartsBySheetId = new Map<string, ChartDefinition[]>();

  charts.forEach((chart) => {
    const chartsForSheet = chartsBySheetId.get(chart.sheetId) ?? [];

    chartsForSheet.push(chart);
    chartsBySheetId.set(chart.sheetId, chartsForSheet);
  });

  let chartIndex = 1;
  let drawingIndex = 1;

  document.sheets.forEach((sheet, sheetIndex) => {
    const sheetCharts = chartsBySheetId.get(sheet.id);

    if (!sheetCharts?.length) {
      return;
    }

    const worksheetPath = `xl/worksheets/sheet${sheetIndex + 1}.xml`;
    const worksheetRelsPath = `xl/worksheets/_rels/sheet${sheetIndex + 1}.xml.rels`;
    const worksheetXml = getCfbText(cfb, worksheetPath);
    let sheetRelsXml = getCfbText(cfb, worksheetRelsPath);
    const drawing = getSheetDrawingPath({
      cfb,
      drawingIndex,
      sheetRelsXml,
      worksheetXml,
    });
    const entries = sheetCharts.map((chart) => {
      const chartPath = `xl/charts/essence3dChart${chartIndex}.xml`;
      const computedValues = evaluateWorkbook(document, sheet.id);
      const entry = {
        chart,
        chartPath,
        drawingRelationshipId: `rIdEssenceChart${chartIndex}`,
        sheet,
        sheetIndex,
      };

      setCfbText(
        cfb,
        chartPath,
        nativeChartXml({ chart, computedValues, sheet }),
      );
      contentTypesXml = addContentTypeOverride(
        contentTypesXml,
        chartPath,
        chartContentType,
      );
      chartIndex += 1;

      return entry;
    });
    const drawingRelsPath = drawingRelationshipPath(drawing.drawingPath);
    let drawingRelsXml = getCfbText(cfb, drawingRelsPath);

    entries.forEach((entry) => {
      drawingRelsXml = addRelationship(
        drawingRelsXml,
        entry.drawingRelationshipId,
        chartRelationshipType,
        `../charts/${entry.chartPath.split("/").at(-1)}`,
      );
    });

    setCfbText(cfb, drawingRelsPath, drawingRelsXml);
    setCfbText(
      cfb,
      drawing.drawingPath,
      appendDrawingAnchors(getCfbText(cfb, drawing.drawingPath), entries),
    );
    contentTypesXml = addContentTypeOverride(
      contentTypesXml,
      drawing.drawingPath,
      drawingContentType,
    );

    if (drawing.shouldAddWorksheetReference) {
      sheetRelsXml = addRelationship(
        sheetRelsXml,
        drawing.sheetRelationshipId,
        drawingRelationshipType,
        `../drawings/${drawing.drawingPath.split("/").at(-1)}`,
      );
      setCfbText(cfb, worksheetRelsPath, sheetRelsXml);
      setCfbText(
        cfb,
        worksheetPath,
        addWorksheetDrawingReference(worksheetXml, drawing.sheetRelationshipId),
      );
      drawingIndex += 1;
    }
  });

  setCfbText(cfb, "[Content_Types].xml", contentTypesXml);

  return toArrayBuffer(
    XLSX.CFB.write(cfb, {
      fileType: "zip",
      type: "array",
    }),
  );
}
