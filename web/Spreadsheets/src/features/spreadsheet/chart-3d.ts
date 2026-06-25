import {
  getChartPoints,
  type ChartPoint,
} from "@/features/spreadsheet/chart-data";
import {
  getStackedChartPoints,
  getSurfaceChartCells,
  type StackedChartPoint,
  type SurfaceChartCell,
} from "@/features/spreadsheet/chart-variant-data";
import type { EffectiveChartFormat } from "@/features/spreadsheet/chart-formatting";
import type { ChartDefinition, SheetData } from "@/features/workbooks/types";

const width = 720;
const height = 420;
const plot = {
  left: 72,
  top: 72,
  right: 672,
  bottom: 336,
};

export function supportsThreeDimensionalChart(chart: ChartDefinition) {
  return (
    chart.type === "bar" ||
    chart.type === "stacked-bar" ||
    chart.type === "stacked-100-bar" ||
    chart.type === "pie" ||
    chart.type === "surface"
  );
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hexToRgb(color: string) {
  const normalized = /^#[0-9a-f]{6}$/i.test(color) ? color : "#2563eb";

  return {
    blue: Number.parseInt(normalized.slice(5, 7), 16),
    green: Number.parseInt(normalized.slice(3, 5), 16),
    red: Number.parseInt(normalized.slice(1, 3), 16),
  };
}

function rgbToHex(value: number) {
  return Math.min(Math.max(Math.round(value), 0), 255)
    .toString(16)
    .padStart(2, "0");
}

function shadeColor(color: string, amount: number) {
  const rgb = hexToRgb(color);
  const shift = amount * 255;

  return `#${rgbToHex(rgb.red + shift)}${rgbToHex(rgb.green + shift)}${rgbToHex(
    rgb.blue + shift,
  )}`;
}

function dimensions(format: EffectiveChartFormat) {
  const depth = Math.min(Math.max(format.threeDimensional.depthPercent, 20), 500);
  const rotationX = Math.abs(format.threeDimensional.rotationX) / 90;
  const rotationY = format.threeDimensional.rotationY / 90;
  const perspective = format.threeDimensional.perspective / 240;

  return {
    depthX: 10 + depth * 0.045 + rotationY * 16 + perspective * 12,
    depthY: 8 + depth * 0.035 + rotationX * 14 + perspective * 10,
    surfaceHeight: 24 + depth * 0.18,
  };
}

function axes() {
  return `<line x1="${plot.left}" y1="${plot.bottom}" x2="${plot.right}" y2="${plot.bottom}" stroke="#94a3b8"/>
  <line x1="${plot.left}" y1="${plot.top}" x2="${plot.left}" y2="${plot.bottom}" stroke="#94a3b8"/>`;
}

function gridlines(show: boolean) {
  if (!show) {
    return "";
  }

  return [0.25, 0.5, 0.75]
    .map((level) => {
      const y = plot.top + (plot.bottom - plot.top) * level;

      return `<line x1="${plot.left}" y1="${y}" x2="${plot.right}" y2="${y}" stroke="#94a3b8" stroke-opacity="0.16"/>`;
    })
    .join("\n  ");
}

function barPrism({
  color,
  depthX,
  depthY,
  height: barHeight,
  width: barWidth,
  x,
  y,
}: {
  color: string;
  depthX: number;
  depthY: number;
  height: number;
  width: number;
  x: number;
  y: number;
}) {
  const right = x + barWidth;
  const bottom = y + barHeight;
  const topFace = `${x},${y} ${x + depthX},${y - depthY} ${right + depthX},${y - depthY} ${right},${y}`;
  const sideFace = `${right},${y} ${right + depthX},${y - depthY} ${right + depthX},${bottom - depthY} ${right},${bottom}`;

  return `<polygon points="${topFace}" fill="${shadeColor(color, 0.16)}"/>
  <polygon points="${sideFace}" fill="${shadeColor(color, -0.16)}"/>
  <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="2" fill="${color}"/>`;
}

function render3DBars({
  color,
  format,
  points,
}: {
  color: string;
  format: EffectiveChartFormat;
  points: ChartPoint[];
}) {
  const positivePoints = points.filter((point) => point.value >= 0);
  const max = Math.max(...positivePoints.map((point) => point.value), 1);
  const bandWidth = (plot.right - plot.left) / Math.max(positivePoints.length, 1);
  const barWidth = Math.max(Math.min(bandWidth * 0.5, 34), 8);
  const { depthX, depthY } = dimensions(format);

  return `${gridlines(format.showGridlines)}
  ${axes()}
  ${positivePoints
    .map((point, index) => {
      const barHeight = Math.max(
        (point.value / max) * (plot.bottom - plot.top - depthY),
        2,
      );
      const x = plot.left + bandWidth * index + (bandWidth - barWidth) / 2;
      const y = plot.bottom - barHeight;

      return `<g data-chart-3d="bar">
  ${barPrism({ color, depthX, depthY, height: barHeight, width: barWidth, x, y })}
  <text x="${x + barWidth / 2}" y="${plot.bottom + 18}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#475569">${escapeXml(point.label.slice(0, 12))}</text>
</g>`;
    })
    .join("\n  ")}`;
}

function positiveTotal(point: StackedChartPoint) {
  return point.values.reduce((sum, item) => sum + Math.max(item.value, 0), 0);
}

function render3DStackedBars({
  colors,
  format,
  percentage,
  points,
}: {
  colors: string[];
  format: EffectiveChartFormat;
  percentage: boolean;
  points: StackedChartPoint[];
}) {
  const max = percentage ? 1 : Math.max(...points.map(positiveTotal), 1);
  const bandWidth = (plot.right - plot.left) / Math.max(points.length, 1);
  const barWidth = Math.max(Math.min(bandWidth * 0.5, 34), 8);
  const plotHeight = plot.bottom - plot.top;
  const { depthX, depthY } = dimensions(format);

  return `${gridlines(format.showGridlines)}
  ${axes()}
  ${points
    .map((point, pointIndex) => {
      const x = plot.left + bandWidth * pointIndex + (bandWidth - barWidth) / 2;
      const total = Math.max(positiveTotal(point), 1);
      let yCursor = plot.bottom;
      const segments = point.values
        .map((item, valueIndex) => {
          const normalizedValue = Math.max(item.value, 0);
          const segmentValue = percentage ? normalizedValue / total : normalizedValue;
          const segmentHeight = Math.max(
            (segmentValue / max) * (plotHeight - depthY),
            normalizedValue > 0 ? 2 : 0,
          );

          yCursor -= segmentHeight;
          return barPrism({
            color: colors[valueIndex % colors.length] ?? "#2563eb",
            depthX,
            depthY,
            height: segmentHeight,
            width: barWidth,
            x,
            y: yCursor,
          });
        })
        .join("\n  ");

      return `<g data-chart-3d="stacked-bar">
  ${segments}
  <text x="${x + barWidth / 2}" y="${plot.bottom + 18}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#475569">${escapeXml(point.label.slice(0, 12))}</text>
</g>`;
    })
    .join("\n  ")}`;
}

function polarPoint(cx: number, cy: number, rx: number, ry: number, angle: number) {
  return {
    x: cx + rx * Math.cos(angle),
    y: cy + ry * Math.sin(angle),
  };
}

function pieSlicePath({
  centerX,
  centerY,
  endAngle,
  radiusX,
  radiusY,
  startAngle,
}: {
  centerX: number;
  centerY: number;
  endAngle: number;
  radiusX: number;
  radiusY: number;
  startAngle: number;
}) {
  const start = polarPoint(centerX, centerY, radiusX, radiusY, startAngle);
  const end = polarPoint(centerX, centerY, radiusX, radiusY, endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  return `M ${centerX} ${centerY} L ${start.x} ${start.y} A ${radiusX} ${radiusY} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function render3DPie(points: ChartPoint[], colors: string[], format: EffectiveChartFormat) {
  const positivePoints = points.filter((point) => point.value > 0);
  const total = positivePoints.reduce((sum, point) => sum + point.value, 0) || 1;
  const { depthY } = dimensions(format);
  const centerX = 360;
  const centerY = 196;
  const radiusX = 148;
  const radiusY = 82;
  let startAngle = -Math.PI / 2;

  const slices = positivePoints
    .map((point, index) => {
      const angle = (point.value / total) * Math.PI * 2;
      const endAngle = startAngle + angle;
      const color = colors[index % colors.length] ?? "#2563eb";
      const topPath = pieSlicePath({
        centerX,
        centerY,
        endAngle,
        radiusX,
        radiusY,
        startAngle,
      });
      const bottomPath = pieSlicePath({
        centerX,
        centerY: centerY + depthY,
        endAngle,
        radiusX,
        radiusY,
        startAngle,
      });
      const labelPoint = polarPoint(
        centerX,
        centerY - 4,
        radiusX * 0.68,
        radiusY * 0.68,
        startAngle + angle / 2,
      );

      startAngle = endAngle;
      return `<g data-chart-3d="pie">
  <path d="${bottomPath}" fill="${shadeColor(color, -0.18)}"/>
  <path d="${topPath}" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
  <text x="${labelPoint.x}" y="${labelPoint.y}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#ffffff">${escapeXml(point.label.slice(0, 12))}</text>
</g>`;
    })
    .join("\n  ");

  return `<ellipse cx="${centerX}" cy="${centerY + depthY}" rx="${radiusX}" ry="${radiusY}" fill="#0f172a" opacity="0.08"/>
  ${slices}`;
}

function projectSurfacePoint({
  cell,
  columnCount,
  format,
  rowCount,
  valueMax,
  valueMin,
}: {
  cell: SurfaceChartCell;
  columnCount: number;
  format: EffectiveChartFormat;
  rowCount: number;
  valueMax: number;
  valueMin: number;
}) {
  const { surfaceHeight } = dimensions(format);
  const cellWidth = 52;
  const cellDepth = 22;
  const valueRatio = (cell.value - valueMin) / (valueMax - valueMin || 1);
  const originX = 260 - rowCount * 14;
  const originY = 288 + columnCount * 4;

  return {
    x: originX + cell.columnIndex * cellWidth + cell.rowIndex * 24,
    y:
      originY +
      cell.rowIndex * cellDepth -
      cell.columnIndex * 10 -
      valueRatio * surfaceHeight,
  };
}

function render3DSurface(cells: SurfaceChartCell[], format: EffectiveChartFormat) {
  const maxRow = Math.max(...cells.map((cell) => cell.rowIndex), 0) + 1;
  const maxColumn = Math.max(...cells.map((cell) => cell.columnIndex), 0) + 1;
  const values = cells.map((cell) => cell.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return cells
    .slice()
    .sort(
      (left, right) =>
        left.rowIndex + left.columnIndex - (right.rowIndex + right.columnIndex),
    )
    .map((cell) => {
      const point = projectSurfacePoint({
        cell,
        columnCount: maxColumn,
        format,
        rowCount: maxRow,
        valueMax: max,
        valueMin: min,
      });
      const intensity = (cell.value - min) / (max - min || 1);
      const hue = 210 - intensity * 170;
      const color = `hsl(${hue} 72% ${72 - intensity * 28}%)`;
      const polygon = `${point.x},${point.y} ${point.x + 52},${point.y - 10} ${point.x + 76},${point.y + 12} ${point.x + 24},${point.y + 22}`;

      return `<polygon data-chart-3d="surface" points="${polygon}" fill="${color}" stroke="#ffffff" stroke-opacity="0.72"/>`;
    })
    .join("\n  ");
}

export function renderThreeDimensionalChartSvgBody({
  chart,
  colors,
  computedValues,
  format,
  primaryColor,
  sheet,
}: {
  chart: ChartDefinition;
  colors: string[];
  computedValues: Record<string, string>;
  format: EffectiveChartFormat;
  primaryColor: string;
  sheet: SheetData;
}) {
  if (!format.threeDimensional.enabled || !supportsThreeDimensionalChart(chart)) {
    return null;
  }

  if (chart.type === "stacked-bar" || chart.type === "stacked-100-bar") {
    const points = getStackedChartPoints(sheet, computedValues, chart);

    return points.length
      ? render3DStackedBars({
          colors,
          format,
          percentage: chart.type === "stacked-100-bar",
          points,
        })
      : "";
  }

  if (chart.type === "pie") {
    const points = getChartPoints(sheet, computedValues, chart);

    return points.length ? render3DPie(points, colors, format) : "";
  }

  if (chart.type === "surface") {
    const cells = getSurfaceChartCells(sheet, computedValues, chart);

    return cells.length ? render3DSurface(cells, format) : "";
  }

  const points = getChartPoints(sheet, computedValues, chart);

  return points.length
    ? render3DBars({ color: primaryColor, format, points })
    : "";
}
