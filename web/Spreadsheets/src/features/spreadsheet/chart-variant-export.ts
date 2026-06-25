import {
  getChartPoints,
  type ChartPoint,
} from "@/features/spreadsheet/chart-data";
import {
  getBoxWhiskerPoints,
  getHierarchyChartPoints,
  getHistogramBins,
  getStackedChartPoints,
  getSurfaceChartCells,
  getWaterfallPoints,
  type BoxWhiskerPoint,
  type HierarchyChartPoint,
  type HistogramBin,
  type StackedChartPoint,
  type SurfaceChartCell,
  type WaterfallPoint,
} from "@/features/spreadsheet/chart-variant-data";
import type { ChartDefinition, SheetData } from "@/features/workbooks/types";

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

function axes() {
  return `<line x1="${plot.left}" y1="${plot.bottom}" x2="${plot.right}" y2="${plot.bottom}" stroke="#94a3b8"/>
  <line x1="${plot.left}" y1="${plot.top}" x2="${plot.left}" y2="${plot.bottom}" stroke="#94a3b8"/>`;
}

function colorAt(colors: string[], index: number) {
  return colors[index % colors.length] ?? "#2563eb";
}

function positiveTotal(point: StackedChartPoint) {
  return point.values.reduce((sum, item) => sum + Math.max(item.value, 0), 0);
}

function renderStackedBars(
  points: StackedChartPoint[],
  colors: string[],
  percentage = false,
) {
  const max = percentage ? 1 : Math.max(...points.map(positiveTotal), 1);
  const bandWidth = (plot.right - plot.left) / points.length;
  const barWidth = Math.max(Math.min(bandWidth * 0.56, 38), 8);
  const plotHeight = plot.bottom - plot.top;

  return `${axes()}
  ${points
    .map((point, pointIndex) => {
      let yCursor = plot.bottom;
      const x = plot.left + bandWidth * pointIndex + (bandWidth - barWidth) / 2;
      const total = Math.max(positiveTotal(point), 1);
      const segments = point.values
        .map((item, valueIndex) => {
          const normalizedValue = Math.max(item.value, 0);
          const segmentValue = percentage ? normalizedValue / total : normalizedValue;
          const segmentHeight = Math.max(
            (segmentValue / max) * plotHeight,
            normalizedValue > 0 ? 2 : 0,
          );

          yCursor -= segmentHeight;

          return `<rect x="${x}" y="${yCursor}" width="${barWidth}" height="${segmentHeight}" fill="${colorAt(colors, valueIndex)}"/>`;
        })
        .join("\n  ");

      return `${segments}
  <text x="${x + barWidth / 2}" y="${plot.bottom + 18}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#475569">${escapeXml(point.label.slice(0, 12))}</text>`;
    })
    .join("\n  ")}`;
}

function renderWaterfall(points: WaterfallPoint[], color: string) {
  const values = points.flatMap((point) => [point.start, point.end, 0]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const zeroY = scaleLinear(0, min, max, plot.bottom, plot.top);
  const bandWidth = (plot.right - plot.left) / points.length;
  const barWidth = Math.max(Math.min(bandWidth * 0.56, 38), 8);

  return `${axes()}
  <line x1="${plot.left}" y1="${zeroY}" x2="${plot.right}" y2="${zeroY}" stroke="#94a3b8" stroke-dasharray="4 4"/>
  ${points
    .map((point, index) => {
      const startY = scaleLinear(point.start, min, max, plot.bottom, plot.top);
      const endY = scaleLinear(point.end, min, max, plot.bottom, plot.top);
      const x = plot.left + bandWidth * index + (bandWidth - barWidth) / 2;
      const fill =
        point.kind === "total" ? color : point.kind === "increase" ? "#16a34a" : "#dc2626";

      return `<rect x="${x}" y="${Math.min(startY, endY)}" width="${barWidth}" height="${Math.max(Math.abs(endY - startY), 2)}" rx="4" fill="${fill}"/>
  <text x="${x + barWidth / 2}" y="${plot.bottom + 18}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#475569">${escapeXml(point.label.slice(0, 12))}</text>`;
    })
    .join("\n  ")}`;
}

function renderFunnel(points: ChartPoint[], colors: string[]) {
  const positivePoints = points.filter((point) => point.value > 0).slice(0, 8);
  const max = Math.max(...positivePoints.map((point) => point.value), 1);
  const rowHeight = (plot.bottom - plot.top) / positivePoints.length;

  return positivePoints
    .map((point, index) => {
      const topWidth = (point.value / max) * (plot.right - plot.left);
      const nextValue = positivePoints[index + 1]?.value ?? point.value * 0.72;
      const bottomWidth = (nextValue / max) * (plot.right - plot.left);
      const y = plot.top + index * rowHeight;
      const xTop = (720 - topWidth) / 2;
      const xBottom = (720 - bottomWidth) / 2;
      const polygon = `${xTop},${y} ${xTop + topWidth},${y} ${xBottom + bottomWidth},${y + rowHeight - 4} ${xBottom},${y + rowHeight - 4}`;

      return `<polygon points="${polygon}" fill="${colorAt(colors, index)}"/>
  <text x="360" y="${y + rowHeight / 2}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="13" fill="#ffffff">${escapeXml(point.label.slice(0, 24))}</text>`;
    })
    .join("\n  ");
}

function renderHistogram(bins: HistogramBin[], color: string) {
  const max = Math.max(...bins.map((bin) => bin.count), 1);
  const bandWidth = (plot.right - plot.left) / bins.length;

  return `${axes()}
  ${bins
    .map((bin, index) => {
      const barHeight = Math.max((bin.count / max) * (plot.bottom - plot.top), 2);
      const x = plot.left + bandWidth * index;
      const y = plot.bottom - barHeight;

      return `<rect x="${x}" y="${y}" width="${Math.max(bandWidth - 2, 3)}" height="${barHeight}" fill="${color}" opacity="0.75"/>`;
    })
    .join("\n  ")}`;
}

function renderBoxWhisker(points: BoxWhiskerPoint[], color: string) {
  const min = Math.min(...points.map((point) => point.min));
  const max = Math.max(...points.map((point) => point.max));
  const bandWidth = (plot.right - plot.left) / points.length;
  const boxWidth = Math.max(Math.min(bandWidth * 0.42, 34), 10);
  const y = (value: number) => scaleLinear(value, min, max, plot.bottom, plot.top);

  return `${axes()}
  ${points
    .map((point, index) => {
      const x = plot.left + bandWidth * index + bandWidth / 2;
      return `<line x1="${x}" y1="${y(point.max)}" x2="${x}" y2="${y(point.min)}" stroke="#334155"/>
  <rect x="${x - boxWidth / 2}" y="${y(point.q3)}" width="${boxWidth}" height="${Math.max(y(point.q1) - y(point.q3), 2)}" fill="${color}" fill-opacity="0.2" stroke="${color}"/>
  <line x1="${x - boxWidth / 2}" y1="${y(point.median)}" x2="${x + boxWidth / 2}" y2="${y(point.median)}" stroke="${color}" stroke-width="3"/>
  <circle cx="${x}" cy="${y(point.mean)}" r="4" fill="#dc2626"/>`;
    })
    .join("\n  ")}`;
}

function groupHierarchy(points: HierarchyChartPoint[]) {
  const groups = new Map<string, { label: string; value: number; items: HierarchyChartPoint[] }>();

  points.forEach((point) => {
    const label = point.path[0] ?? point.label;
    const group = groups.get(label) ?? { label, value: 0, items: [] };

    group.value += point.value;
    group.items.push(point);
    groups.set(label, group);
  });

  return Array.from(groups.values()).sort((left, right) => right.value - left.value);
}

function renderTreemap(points: HierarchyChartPoint[], colors: string[]) {
  const groups = groupHierarchy(points);
  const total = groups.reduce((sum, group) => sum + group.value, 0) || 1;
  let xCursor = plot.left;

  return groups
    .map((group, index) => {
      const rectWidth = (group.value / total) * (plot.right - plot.left);
      const rect = `<rect x="${xCursor}" y="${plot.top}" width="${rectWidth}" height="${plot.bottom - plot.top}" fill="${colorAt(colors, index)}" opacity="0.78"/>
  <text x="${xCursor + 8}" y="${plot.top + 20}" font-family="Arial, sans-serif" font-size="13" fill="#ffffff">${escapeXml(group.label.slice(0, 24))}</text>`;

      xCursor += rectWidth;
      return rect;
    })
    .join("\n  ");
}

function polarPoint(cx: number, cy: number, radius: number, angle: number) {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function ringPath(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
) {
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  const outerStart = polarPoint(cx, cy, outerRadius, startAngle);
  const outerEnd = polarPoint(cx, cy, outerRadius, endAngle);
  const innerStart = polarPoint(cx, cy, innerRadius, startAngle);
  const innerEnd = polarPoint(cx, cy, innerRadius, endAngle);

  return `M ${outerStart.x} ${outerStart.y} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y} Z`;
}

function renderSunburst(points: HierarchyChartPoint[], colors: string[]) {
  const groups = groupHierarchy(points);
  const total = groups.reduce((sum, group) => sum + group.value, 0) || 1;
  const cx = 360;
  const cy = 204;
  let startAngle = -Math.PI / 2;

  return groups
    .map((group, index) => {
      const angle = (group.value / total) * Math.PI * 2;
      const path = ringPath(cx, cy, 62, 128, startAngle, startAngle + angle);

      startAngle += angle;
      return `<path d="${path}" fill="${colorAt(colors, index)}"/>`;
    })
    .join("\n  ");
}

function renderSurface(cells: SurfaceChartCell[]) {
  const maxRow = Math.max(...cells.map((cell) => cell.rowIndex), 0) + 1;
  const maxColumn = Math.max(...cells.map((cell) => cell.columnIndex), 0) + 1;
  const values = cells.map((cell) => cell.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const cellWidth = (plot.right - plot.left) / maxColumn;
  const cellHeight = (plot.bottom - plot.top) / maxRow;

  return cells
    .map((cell) => {
      const intensity = (cell.value - min) / (max - min || 1);
      const hue = 210 - intensity * 170;

      return `<rect x="${plot.left + cell.columnIndex * cellWidth}" y="${plot.top + cell.rowIndex * cellHeight}" width="${Math.max(cellWidth - 1, 1)}" height="${Math.max(cellHeight - 1, 1)}" fill="hsl(${hue} 72% ${72 - intensity * 28}%)"/>`;
    })
    .join("\n  ");
}

function renderMap(points: ChartPoint[], colors: string[]) {
  const mapPoints = points.slice(0, 18);
  const cellWidth = (plot.right - plot.left) / 6;
  const cellHeight = (plot.bottom - plot.top) / 3;
  const values = mapPoints.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return mapPoints
    .map((point, index) => {
      const intensity = (point.value - min) / (max - min || 1);
      const x = plot.left + (index % 6) * cellWidth;
      const y = plot.top + Math.floor(index / 6) * cellHeight;

      return `<rect x="${x}" y="${y}" width="${cellWidth - 4}" height="${cellHeight - 4}" rx="8" fill="${colorAt(colors, Math.floor(intensity * (colors.length - 1)))}" opacity="${0.45 + intensity * 0.5}"/>
  <text x="${x + 8}" y="${y + 22}" font-family="Arial, sans-serif" font-size="12" fill="#111827">${escapeXml(point.label.slice(0, 14))}</text>`;
    })
    .join("\n  ");
}

export function renderChartVariantSvgBody({
  chart,
  colors,
  computedValues,
  primaryColor,
  sheet,
}: {
  chart: ChartDefinition;
  colors: string[];
  computedValues: Record<string, string>;
  primaryColor: string;
  sheet: SheetData;
}) {
  switch (chart.type) {
    case "stacked-bar":
      {
        const points = getStackedChartPoints(sheet, computedValues, chart);
        return points.length ? renderStackedBars(points, colors) : "";
      }
    case "stacked-100-bar":
      {
        const points = getStackedChartPoints(sheet, computedValues, chart);
        return points.length ? renderStackedBars(points, colors, true) : "";
      }
    case "waterfall":
      {
        const points = getWaterfallPoints(sheet, computedValues, chart);
        return points.length ? renderWaterfall(points, primaryColor) : "";
      }
    case "funnel":
      {
        const points = getChartPoints(sheet, computedValues, chart);
        return points.length ? renderFunnel(points, colors) : "";
      }
    case "histogram":
      {
        const bins = getHistogramBins(sheet, computedValues, chart);
        return bins.length ? renderHistogram(bins, primaryColor) : "";
      }
    case "box-whisker":
      {
        const points = getBoxWhiskerPoints(sheet, computedValues, chart);
        return points.length ? renderBoxWhisker(points, primaryColor) : "";
      }
    case "treemap":
      {
        const points = getHierarchyChartPoints(sheet, computedValues, chart);
        return points.length ? renderTreemap(points, colors) : "";
      }
    case "sunburst":
      {
        const points = getHierarchyChartPoints(sheet, computedValues, chart);
        return points.length ? renderSunburst(points, colors) : "";
      }
    case "surface":
      {
        const cells = getSurfaceChartCells(sheet, computedValues, chart);
        return cells.length ? renderSurface(cells) : "";
      }
    case "map":
      {
        const points = getChartPoints(sheet, computedValues, chart);
        return points.length ? renderMap(points, colors) : "";
      }
    default:
      return null;
  }
}
