"use client";

import type {
  BoxWhiskerPoint,
  HistogramBin,
  StackedChartPoint,
  WaterfallPoint,
} from "@/features/spreadsheet/chart-variant-data";
import type { EffectiveChartFormat } from "@/features/spreadsheet/chart-formatting";
import { formatChartValue } from "@/features/spreadsheet/components/chart-renderers";
import {
  chartColor,
  scaleLinear,
  variantChartHeight as height,
  variantChartPadding as padding,
  variantChartWidth as width,
  variantGridlines,
} from "@/features/spreadsheet/components/chart-variants/variant-chart-utils";

function positiveTotal(point: StackedChartPoint) {
  return point.values.reduce((sum, item) => sum + Math.max(item.value, 0), 0);
}

export function StackedBarChart({
  colors,
  format,
  points,
  percentage,
  showAxes,
  showDataLabels,
}: {
  colors: string[];
  format: EffectiveChartFormat;
  points: StackedChartPoint[];
  percentage?: boolean;
  showAxes: boolean;
  showDataLabels: boolean;
}) {
  const plotHeight = height - padding * 2;
  const max = percentage ? 1 : Math.max(...points.map(positiveTotal), 1);
  const bandWidth = (width - padding * 2) / points.length;
  const barWidth = Math.max(Math.min(bandWidth * 0.58, 26), 6);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={percentage ? "100 percent stacked bar chart" : "Stacked bar chart"}
      className={`h-40 w-full ${showAxes ? "border-b border-l" : ""}`}
    >
      {variantGridlines(format.showGridlines)}
      {points.map((point, pointIndex) => {
        const total = Math.max(positiveTotal(point), 1);
        let yCursor = height - padding;
        const x = padding + bandWidth * pointIndex + (bandWidth - barWidth) / 2;

        return (
          <g key={`${point.label}-${pointIndex}`}>
            {point.values.map((item, valueIndex) => {
              const normalizedValue = Math.max(item.value, 0);
              const segmentValue = percentage
                ? normalizedValue / total
                : normalizedValue;
              const segmentHeight = Math.max(
                (segmentValue / max) * plotHeight,
                normalizedValue > 0 ? 2 : 0,
              );

              yCursor -= segmentHeight;

              return (
                <rect
                  key={`${item.series}-${valueIndex}`}
                  x={x}
                  y={yCursor}
                  width={barWidth}
                  height={segmentHeight}
                  fill={chartColor(colors, valueIndex)}
                />
              );
            })}
            {showDataLabels ? (
              <text
                x={x + barWidth / 2}
                y={Math.max(yCursor - 4, 10)}
                textAnchor="middle"
                fill="currentColor"
                className="font-mono text-[9px]"
              >
                {percentage ? "100%" : formatChartValue(total)}
              </text>
            ) : null}
            {showAxes ? (
              <text
                x={x + barWidth / 2}
                y={height - 2}
                textAnchor="middle"
                fill="currentColor"
                className="text-[8px]"
              >
                {point.label.slice(0, 8)}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export function WaterfallChart({
  format,
  points,
  showAxes,
  showDataLabels,
}: {
  format: EffectiveChartFormat;
  points: WaterfallPoint[];
  showAxes: boolean;
  showDataLabels: boolean;
}) {
  const values = points.flatMap((point) => [point.start, point.end, 0]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const zeroY = scaleLinear(0, min, max, height - padding, padding);
  const bandWidth = (width - padding * 2) / points.length;
  const barWidth = Math.max(Math.min(bandWidth * 0.56, 24), 6);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Waterfall chart"
      className={`h-40 w-full ${showAxes ? "border-b border-l" : ""}`}
    >
      {variantGridlines(format.showGridlines)}
      <line
        x1={padding}
        y1={zeroY}
        x2={width - padding}
        y2={zeroY}
        stroke="currentColor"
        strokeOpacity="0.25"
      />
      {points.map((point, index) => {
        const x = padding + bandWidth * index + (bandWidth - barWidth) / 2;
        const startY = scaleLinear(point.start, min, max, height - padding, padding);
        const endY = scaleLinear(point.end, min, max, height - padding, padding);
        const y = Math.min(startY, endY);
        const barHeight = Math.max(Math.abs(endY - startY), 2);
        const color =
          point.kind === "total"
            ? format.primaryColor ?? "#2563eb"
            : point.kind === "increase"
              ? "#16a34a"
              : "#dc2626";

        return (
          <g key={`${point.label}-${index}`}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx="2"
              fill={color}
            />
            {index < points.length - 1 ? (
              <line
                x1={x + barWidth}
                y1={endY}
                x2={x + bandWidth}
                y2={endY}
                stroke="currentColor"
                strokeDasharray="3 3"
                strokeOpacity="0.28"
              />
            ) : null}
            {showDataLabels ? (
              <text
                x={x + barWidth / 2}
                y={Math.max(y - 4, 10)}
                textAnchor="middle"
                fill="currentColor"
                className="font-mono text-[9px]"
              >
                {formatChartValue(point.value)}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export function FunnelChart({
  colors,
  points,
  showDataLabels,
}: {
  colors: string[];
  points: Array<{ label: string; value: number }>;
  showDataLabels: boolean;
}) {
  const positivePoints = points.filter((point) => point.value > 0).slice(0, 8);
  const max = Math.max(...positivePoints.map((point) => point.value), 1);
  const rowHeight = height / Math.max(positivePoints.length, 1);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Funnel chart"
      className="h-40 w-full"
    >
      {positivePoints.map((point, index) => {
        const topWidth = (point.value / max) * (width - 32);
        const nextValue = positivePoints[index + 1]?.value ?? point.value * 0.72;
        const bottomWidth = (nextValue / max) * (width - 32);
        const y = index * rowHeight + 4;
        const xTop = (width - topWidth) / 2;
        const xBottom = (width - bottomWidth) / 2;
        const polygon = `${xTop},${y} ${xTop + topWidth},${y} ${xBottom + bottomWidth},${y + rowHeight - 6} ${xBottom},${y + rowHeight - 6}`;

        return (
          <g key={`${point.label}-${index}`}>
            <polygon points={polygon} fill={chartColor(colors, index)} opacity="0.86" />
            {showDataLabels ? (
              <text
                x={width / 2}
                y={y + rowHeight / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                className="font-mono text-[10px]"
              >
                {point.label.slice(0, 14)} {formatChartValue(point.value)}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export function HistogramChart({
  bins,
  format,
  showAxes,
}: {
  bins: HistogramBin[];
  format: EffectiveChartFormat;
  showAxes: boolean;
}) {
  const max = Math.max(...bins.map((bin) => bin.count), 1);
  const bandWidth = (width - padding * 2) / bins.length;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Histogram chart"
      className={`h-40 w-full ${showAxes ? "border-b border-l" : ""}`}
    >
      {variantGridlines(format.showGridlines)}
      {bins.map((bin, index) => {
        const barHeight = Math.max((bin.count / max) * (height - padding * 2), 2);
        const x = padding + bandWidth * index;
        const y = height - padding - barHeight;

        return (
          <rect
            key={`${bin.label}-${index}`}
            x={x}
            y={y}
            width={Math.max(bandWidth - 1, 2)}
            height={barHeight}
            fill={format.primaryColor ?? "currentColor"}
            opacity="0.72"
          />
        );
      })}
    </svg>
  );
}

export function BoxWhiskerChart({
  format,
  points,
  showAxes,
}: {
  format: EffectiveChartFormat;
  points: BoxWhiskerPoint[];
  showAxes: boolean;
}) {
  const min = Math.min(...points.map((point) => point.min));
  const max = Math.max(...points.map((point) => point.max));
  const bandWidth = (width - padding * 2) / points.length;
  const boxWidth = Math.max(Math.min(bandWidth * 0.48, 24), 8);
  const y = (value: number) => scaleLinear(value, min, max, height - padding, padding);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Box and whisker chart"
      className={`h-40 w-full ${showAxes ? "border-b border-l" : ""}`}
    >
      {variantGridlines(format.showGridlines)}
      {points.map((point, index) => {
        const x = padding + bandWidth * index + bandWidth / 2;
        const q3Y = y(point.q3);
        const q1Y = y(point.q1);

        return (
          <g key={`${point.label}-${index}`}>
            <line
              x1={x}
              y1={y(point.max)}
              x2={x}
              y2={y(point.min)}
              stroke="currentColor"
              strokeOpacity="0.62"
            />
            <line
              x1={x - boxWidth / 2}
              y1={y(point.max)}
              x2={x + boxWidth / 2}
              y2={y(point.max)}
              stroke="currentColor"
            />
            <line
              x1={x - boxWidth / 2}
              y1={y(point.min)}
              x2={x + boxWidth / 2}
              y2={y(point.min)}
              stroke="currentColor"
            />
            <rect
              x={x - boxWidth / 2}
              y={q3Y}
              width={boxWidth}
              height={Math.max(q1Y - q3Y, 2)}
              fill={format.primaryColor ?? "currentColor"}
              fillOpacity="0.2"
              stroke="currentColor"
            />
            <line
              x1={x - boxWidth / 2}
              y1={y(point.median)}
              x2={x + boxWidth / 2}
              y2={y(point.median)}
              stroke="currentColor"
              strokeWidth="2"
            />
            <circle
              cx={x}
              cy={y(point.mean)}
              r="2.5"
              fill={format.secondaryColor ?? "#dc2626"}
            />
          </g>
        );
      })}
    </svg>
  );
}
