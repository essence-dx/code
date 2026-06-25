"use client";

import type {
  HierarchyChartPoint,
  SurfaceChartCell,
} from "@/features/spreadsheet/chart-variant-data";
import { formatChartValue } from "@/features/spreadsheet/components/chart-renderers";
import {
  chartColor,
  variantChartHeight as height,
  variantChartWidth as width,
} from "@/features/spreadsheet/components/chart-variants/variant-chart-utils";

function groupHierarchy(points: HierarchyChartPoint[]) {
  const groups = new Map<
    string,
    { label: string; value: number; items: HierarchyChartPoint[] }
  >();

  points.forEach((point) => {
    const groupLabel = point.path[0] ?? point.label;
    const group = groups.get(groupLabel) ?? {
      label: groupLabel,
      value: 0,
      items: [],
    };

    group.value += point.value;
    group.items.push(point);
    groups.set(groupLabel, group);
  });

  return Array.from(groups.values()).sort((left, right) => right.value - left.value);
}

export function TreemapChart({
  colors,
  points,
  showDataLabels,
}: {
  colors: string[];
  points: HierarchyChartPoint[];
  showDataLabels: boolean;
}) {
  const groups = groupHierarchy(points);
  const total = groups.reduce((sum, group) => sum + group.value, 0) || 1;
  let xCursor = 0;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Treemap chart"
      className="h-40 w-full rounded-md"
    >
      {groups.map((group, index) => {
        const rectWidth = (group.value / total) * width;
        const itemTotal = group.items.reduce((sum, item) => sum + item.value, 0) || 1;
        let yCursor = 0;
        const rect = (
          <g key={`${group.label}-${index}`}>
            <rect
              x={xCursor}
              y="0"
              width={rectWidth}
              height={height}
              fill={chartColor(colors, index)}
              opacity="0.16"
            />
            {group.items.slice(0, 8).map((item, itemIndex) => {
              const itemHeight = (item.value / itemTotal) * height;
              const itemY = yCursor;

              yCursor += itemHeight;

              return (
                <rect
                  key={`${item.label}-${itemIndex}`}
                  x={xCursor}
                  y={itemY}
                  width={rectWidth}
                  height={Math.max(itemHeight - 1, 1)}
                  fill={chartColor(colors, index + itemIndex)}
                  opacity={0.42 + (itemIndex % 3) * 0.14}
                />
              );
            })}
            {showDataLabels && rectWidth > 34 ? (
              <text
                x={xCursor + 4}
                y="14"
                fill="white"
                className="text-[9px] font-semibold"
              >
                {group.label.slice(0, 12)}
              </text>
            ) : null}
          </g>
        );

        xCursor += rectWidth;
        return rect;
      })}
    </svg>
  );
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

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

export function SunburstChart({
  colors,
  points,
}: {
  colors: string[];
  points: HierarchyChartPoint[];
}) {
  const groups = groupHierarchy(points);
  const total = groups.reduce((sum, group) => sum + group.value, 0) || 1;
  const center = 72;
  let startAngle = -Math.PI / 2;

  return (
    <svg viewBox="0 0 144 144" role="img" aria-label="Sunburst chart" className="h-44 w-full">
      {groups.map((group, groupIndex) => {
        const groupAngle = (group.value / total) * Math.PI * 2;
        const groupStart = startAngle;
        const groupEnd = startAngle + groupAngle;
        let itemStart = groupStart;

        startAngle = groupEnd;

        return (
          <g key={`${group.label}-${groupIndex}`}>
            <path
              d={ringPath(center, center, 18, 42, groupStart, groupEnd)}
              fill={chartColor(colors, groupIndex)}
            />
            {group.items.map((item, itemIndex) => {
              const itemAngle = (item.value / group.value) * groupAngle;
              const path = ringPath(
                center,
                center,
                46,
                66,
                itemStart,
                itemStart + itemAngle,
              );

              itemStart += itemAngle;

              return (
                <path
                  key={`${item.label}-${itemIndex}`}
                  d={path}
                  fill={chartColor(colors, groupIndex + itemIndex + 1)}
                  opacity="0.82"
                />
              );
            })}
          </g>
        );
      })}
      <circle
        cx={center}
        cy={center}
        r="14"
        fill="var(--background)"
        stroke="currentColor"
        strokeOpacity="0.12"
      />
    </svg>
  );
}

export function SurfaceChart({
  cells,
}: {
  cells: SurfaceChartCell[];
}) {
  const maxRow = Math.max(...cells.map((cell) => cell.rowIndex), 0) + 1;
  const maxColumn = Math.max(...cells.map((cell) => cell.columnIndex), 0) + 1;
  const values = cells.map((cell) => cell.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const cellWidth = width / maxColumn;
  const cellHeight = height / maxRow;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Surface chart"
      className="h-40 w-full rounded-md"
    >
      {cells.map((cell) => {
        const intensity = (cell.value - min) / (max - min || 1);
        const hue = 210 - intensity * 170;

        return (
          <rect
            key={`${cell.rowIndex}-${cell.columnIndex}`}
            x={cell.columnIndex * cellWidth}
            y={cell.rowIndex * cellHeight}
            width={Math.max(cellWidth - 1, 1)}
            height={Math.max(cellHeight - 1, 1)}
            fill={`hsl(${hue} 72% ${72 - intensity * 28}%)`}
          />
        );
      })}
    </svg>
  );
}

export function MapStyleChart({
  colors,
  points,
}: {
  colors: string[];
  points: Array<{ label: string; value: number }>;
}) {
  const mapPoints = points.slice(0, 18);
  const values = mapPoints.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return (
    <div className="grid h-40 grid-cols-3 gap-1">
      {mapPoints.map((point, index) => {
        const intensity = (point.value - min) / (max - min || 1);

        return (
          <div
            key={`${point.label}-${index}`}
            className="flex min-w-0 flex-col justify-between rounded-sm border p-1 text-[10px]"
            style={{
              backgroundColor: chartColor(
                colors,
                Math.floor(intensity * (colors.length - 1)),
              ),
              color: intensity > 0.48 ? "white" : "inherit",
              opacity: 0.46 + intensity * 0.48,
            }}
          >
            <span className="truncate font-medium">{point.label}</span>
            <span className="font-mono">{formatChartValue(point.value)}</span>
          </div>
        );
      })}
    </div>
  );
}
