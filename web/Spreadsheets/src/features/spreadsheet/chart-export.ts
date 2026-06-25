import {
  getBubblePoints,
  getChartPoints,
  getComboPoints,
  getScatterPoints,
  getStockPoints,
  type BubblePoint,
  type ChartPoint,
  type ComboPoint,
  type ScatterPoint,
  type StockPoint,
} from "@/features/spreadsheet/chart-data";
import { getChartDataTable } from "@/features/spreadsheet/chart-data-table";
import { getEffectiveChartFormat } from "@/features/spreadsheet/chart-formatting";
import { renderThreeDimensionalChartSvgBody } from "@/features/spreadsheet/chart-3d";
import { renderChartVariantSvgBody } from "@/features/spreadsheet/chart-variant-export";
import type {
  ChartDefinition,
  SheetData,
} from "@/features/workbooks/types";

const chartColors: Record<
  NonNullable<ChartDefinition["template"]>,
  { primary: string; accents: string[] }
> = {
  standard: {
    primary: "#2563eb",
    accents: ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed"],
  },
  presentation: {
    primary: "#7c3aed",
    accents: ["#7c3aed", "#0891b2", "#f59e0b", "#16a34a", "#dc2626"],
  },
  mono: {
    primary: "#111827",
    accents: ["#111827", "#374151", "#6b7280", "#9ca3af", "#d1d5db"],
  },
};

const width = 720;
const height = 420;
const plot = {
  left: 72,
  top: 72,
  right: 672,
  bottom: 336,
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeFileName(value: string) {
  return (
    value
      .trim()
      .replace(/[^a-z0-9._-]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "chart"
  );
}

function chartTitle(chart: ChartDefinition) {
  return escapeXml(chart.title.trim() || `${chart.type} chart`);
}

function scaleLinear(
  value: number,
  min: number,
  max: number,
  start: number,
  end: number,
) {
  const span = max - min || 1;

  return start + ((value - min) / span) * (end - start);
}

function chartShell(chart: ChartDefinition, body: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${chartTitle(chart)}">
  <rect width="${width}" height="${height}" fill="#ffffff"/>
  <text x="32" y="40" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#111827">${chartTitle(chart)}</text>
  ${body}
</svg>`;
}

function emptyChartSvg(chart: ChartDefinition) {
  return chartShell(
    chart,
    `<rect x="${plot.left}" y="${plot.top}" width="${plot.right - plot.left}" height="${plot.bottom - plot.top}" rx="10" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#64748b">No numeric values found in this range.</text>`,
  );
}

function renderChartDataTableSvg({
  chart,
  computedValues,
  sheet,
  showLegendKeys,
}: {
  chart: ChartDefinition;
  computedValues: Record<string, string>;
  sheet: SheetData;
  showLegendKeys: boolean;
}) {
  const dataTable = getChartDataTable({
    chart,
    computedValues,
    maxRows: 4,
    maxSeries: 4,
    sheet,
  });

  if (dataTable.headers.length === 0 || dataTable.rows.length === 0) {
    return "";
  }

  const tableTop = 344;
  const rowHeight = 14;
  const labelWidth = 130;
  const seriesWidth = (plot.right - plot.left - labelWidth) / dataTable.headers.length;
  const rows = dataTable.rows.slice(0, 4);
  const tableHeight = rowHeight * (rows.length + 1);

  return `<g font-family="Arial, sans-serif" font-size="10">
  <rect x="${plot.left}" y="${tableTop}" width="${plot.right - plot.left}" height="${tableHeight}" rx="4" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="${plot.left + 8}" y="${tableTop + 12}" fill="#64748b">Category</text>
  ${dataTable.headers
    .map((header, index) => {
      const x = plot.left + labelWidth + index * seriesWidth + 8;
      const key = showLegendKeys
        ? `<rect x="${x - 12}" y="${tableTop + 5}" width="7" height="7" rx="1" fill="#2563eb"/>`
        : "";

      return `${key}<text x="${x}" y="${tableTop + 12}" fill="#334155">${escapeXml(header.slice(0, 18))}</text>`;
    })
    .join("\n  ")}
  ${rows
    .map((row, rowIndex) => {
      const y = tableTop + rowHeight * (rowIndex + 1);
      const cells = row.values
        .map((value, valueIndex) => {
          const x = plot.left + labelWidth + valueIndex * seriesWidth + 8;

          return `<text x="${x}" y="${y + 12}" fill="#111827">${escapeXml((value || "-").slice(0, 18))}</text>`;
        })
        .join("\n  ");

      return `<line x1="${plot.left}" y1="${y}" x2="${plot.right}" y2="${y}" stroke="#e2e8f0"/>
  <text x="${plot.left + 8}" y="${y + 12}" fill="#64748b">${escapeXml(row.label.slice(0, 18))}</text>
  ${cells}`;
    })
    .join("\n  ")}
</g>`;
}

function axes() {
  return `<line x1="${plot.left}" y1="${plot.bottom}" x2="${plot.right}" y2="${plot.bottom}" stroke="#94a3b8"/>
  <line x1="${plot.left}" y1="${plot.top}" x2="${plot.left}" y2="${plot.bottom}" stroke="#94a3b8"/>`;
}

function renderBars(points: ChartPoint[], color: string) {
  const max = Math.max(...points.map((point) => point.value), 1);
  const bandWidth = (plot.right - plot.left) / points.length;
  const barWidth = Math.max(Math.min(bandWidth * 0.56, 38), 8);

  return `${axes()}
  ${points
    .map((point, index) => {
      const barHeight = Math.max((point.value / max) * (plot.bottom - plot.top), 2);
      const x = plot.left + bandWidth * index + (bandWidth - barWidth) / 2;
      const y = plot.bottom - barHeight;

      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="${color}"/>
  <text x="${x + barWidth / 2}" y="${plot.bottom + 18}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#475569">${escapeXml(point.label.slice(0, 12))}</text>`;
    })
    .join("\n  ")}`;
}

function linePositions(points: ChartPoint[]) {
  const max = Math.max(...points.map((point) => point.value), 1);

  return points.map((point, index) => ({
    x: scaleLinear(index, 0, Math.max(points.length - 1, 1), plot.left, plot.right),
    y: scaleLinear(point.value, 0, max, plot.bottom, plot.top),
  }));
}

function renderLine(points: ChartPoint[], color: string, fillArea = false) {
  const positions = linePositions(points);
  const path = positions
    .map((position, index) => `${index === 0 ? "M" : "L"} ${position.x} ${position.y}`)
    .join(" ");
  const area = fillArea
    ? `<path d="${path} L ${plot.right} ${plot.bottom} L ${plot.left} ${plot.bottom} Z" fill="${color}" opacity="0.14"/>`
    : "";

  return `${axes()}
  ${area}
  <path d="${path}" fill="none" stroke="${color}" stroke-width="4"/>
  ${positions
    .map(
      (position) =>
        `<circle cx="${position.x}" cy="${position.y}" r="5" fill="${color}"/>`,
    )
    .join("\n  ")}`;
}

function polarPoint(cx: number, cy: number, radius: number, angle: number) {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function renderPie(points: ChartPoint[], colors: string[]) {
  const positivePoints = points.filter((point) => point.value > 0);
  const total = positivePoints.reduce((sum, point) => sum + point.value, 0);
  const cx = 260;
  const cy = 204;
  const radius = 110;
  let startAngle = -Math.PI / 2;

  if (total <= 0) {
    return "";
  }

  const slices = positivePoints
    .map((point, index) => {
      const angle = (point.value / total) * Math.PI * 2;
      const endAngle = startAngle + angle;
      const start = polarPoint(cx, cy, radius, startAngle);
      const end = polarPoint(cx, cy, radius, endAngle);
      const largeArc = angle > Math.PI ? 1 : 0;
      const path = `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;

      startAngle = endAngle;
      return `<path d="${path}" fill="${colors[index % colors.length]}"/>`;
    })
    .join("\n  ");
  const legend = positivePoints
    .slice(0, 8)
    .map((point, index) => {
      const y = 120 + index * 24;

      return `<rect x="440" y="${y - 10}" width="12" height="12" rx="2" fill="${colors[index % colors.length]}"/>
  <text x="460" y="${y}" font-family="Arial, sans-serif" font-size="13" fill="#334155">${escapeXml(point.label.slice(0, 28))}</text>`;
    })
    .join("\n  ");

  return `${slices}
  ${legend}`;
}

function renderRadar(points: ChartPoint[], color: string) {
  const chartPoints = points.slice(0, 12);
  const centerX = 360;
  const centerY = 210;
  const radius = 122;
  const max = Math.max(...chartPoints.map((point) => Math.max(point.value, 0)), 1);
  const polygon = chartPoints
    .map((point, index) => {
      const angle = -Math.PI / 2 + (index / chartPoints.length) * Math.PI * 2;
      const position = polarPoint(
        centerX,
        centerY,
        (Math.max(point.value, 0) / max) * radius,
        angle,
      );

      return `${position.x},${position.y}`;
    })
    .join(" ");

  return `<circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="#cbd5e1"/>
  <polygon points="${polygon}" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="4"/>`;
}

function renderScatter(points: ScatterPoint[], color: string) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return `${axes()}
  ${points
    .map((point) => {
      const x = scaleLinear(point.x, minX, maxX, plot.left, plot.right);
      const y = scaleLinear(point.y, minY, maxY, plot.bottom, plot.top);

      return `<circle cx="${x}" cy="${y}" r="6" fill="${color}"/>`;
    })
    .join("\n  ")}`;
}

function renderBubble(points: BubblePoint[], color: string) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const sizes = points.map((point) => point.size);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const minSize = Math.min(...sizes);
  const maxSize = Math.max(...sizes);

  return `${axes()}
  ${points
    .map((point) => {
      const x = scaleLinear(point.x, minX, maxX, plot.left, plot.right);
      const y = scaleLinear(point.y, minY, maxY, plot.bottom, plot.top);
      const radius = scaleLinear(point.size, minSize, maxSize, 6, 22);

      return `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>`;
    })
    .join("\n  ")}`;
}

function renderCombo(points: ComboPoint[], color: string, lineColor: string) {
  const columnPoints = points.map((point) => ({
    label: point.label,
    value: point.columnValue,
  }));
  const linePoints = points.map((point) => ({
    label: point.label,
    value: point.lineValue,
  }));

  return `${renderBars(columnPoints, color)}
  <g opacity="0.9">${renderLine(linePoints, lineColor, false).replace(axes(), "")}</g>`;
}

function renderStock(points: StockPoint[]) {
  const max = Math.max(...points.map((point) => point.high), 1);
  const min = Math.min(...points.map((point) => point.low), 0);
  const bandWidth = (plot.right - plot.left) / points.length;
  const bodyWidth = Math.max(Math.min(bandWidth * 0.42, 22), 6);

  return `${axes()}
  ${points
    .map((point, index) => {
      const x = plot.left + bandWidth * index + bandWidth / 2;
      const openY = scaleLinear(point.open, min, max, plot.bottom, plot.top);
      const closeY = scaleLinear(point.close, min, max, plot.bottom, plot.top);
      const highY = scaleLinear(point.high, min, max, plot.bottom, plot.top);
      const lowY = scaleLinear(point.low, min, max, plot.bottom, plot.top);
      const color = point.close >= point.open ? "#16a34a" : "#dc2626";

      return `<line x1="${x}" y1="${highY}" x2="${x}" y2="${lowY}" stroke="${color}" stroke-width="3"/>
  <rect x="${x - bodyWidth / 2}" y="${Math.min(openY, closeY)}" width="${bodyWidth}" height="${Math.max(Math.abs(closeY - openY), 2)}" fill="${color}" fill-opacity="0.35" stroke="${color}" stroke-width="2"/>`;
    })
    .join("\n  ")}`;
}

export function createChartFileName(chart: ChartDefinition) {
  return `${safeFileName(chart.title || chart.type)}.svg`;
}

export function workbookChartToSvg({
  sheet,
  computedValues,
  chart,
}: {
  sheet: SheetData;
  computedValues: Record<string, string>;
  chart: ChartDefinition;
}) {
  const template = chart.template ?? "standard";
  const colors = chartColors[template];
  const format = getEffectiveChartFormat(chart);
  const primaryColor = format.primaryColor ?? colors.primary;
  const secondaryColor = format.secondaryColor ?? "#dc2626";
  const accentColors = [primaryColor, ...colors.accents.filter((color) => color !== primaryColor)];
  const points = getChartPoints(sheet, computedValues, chart);
  const threeDimensionalBody = renderThreeDimensionalChartSvgBody({
    chart,
    colors: accentColors,
    computedValues,
    format,
    primaryColor,
    sheet,
  });
  let body = "";
  const variantBody = renderChartVariantSvgBody({
    chart,
    colors: accentColors,
    computedValues,
    primaryColor,
    sheet,
  });

  if (threeDimensionalBody !== null) {
    body = threeDimensionalBody;
  } else if (variantBody !== null) {
    body = variantBody;
  } else if (chart.type === "scatter") {
    const scatterPoints = getScatterPoints(sheet, computedValues, chart);

    body = scatterPoints.length
      ? renderScatter(scatterPoints, primaryColor)
      : "";
  } else if (chart.type === "bubble") {
    const bubblePoints = getBubblePoints(sheet, computedValues, chart);

    body = bubblePoints.length
      ? renderBubble([...bubblePoints], primaryColor)
      : "";
  } else if (chart.type === "combo") {
    const comboPoints = getComboPoints(sheet, computedValues, chart);

    body = comboPoints.length
      ? renderCombo(comboPoints, primaryColor, secondaryColor)
      : "";
  } else if (chart.type === "stock") {
    const stockPoints = getStockPoints(sheet, computedValues, chart);

    body = stockPoints.length ? renderStock(stockPoints) : "";
  } else if (points.length > 0) {
    body =
      chart.type === "line"
        ? renderLine(points, primaryColor)
        : chart.type === "area"
          ? renderLine(points, primaryColor, true)
          : chart.type === "pie"
            ? renderPie(points, accentColors)
            : chart.type === "radar"
              ? points.length >= 3
                ? renderRadar(points, primaryColor)
                : ""
              : renderBars(points, primaryColor);
  }

  if (body.trim() && format.dataTable.enabled) {
    body = `${body}
  ${renderChartDataTableSvg({
    chart,
    computedValues,
    sheet,
    showLegendKeys: format.dataTable.showLegendKeys,
  })}`;
  }

  return body.trim() ? chartShell(chart, body) : emptyChartSvg(chart);
}
