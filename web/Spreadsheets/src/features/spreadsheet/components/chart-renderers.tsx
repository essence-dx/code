"use client";

import {
  getBubblePoints,
  getChartPoints,
  getComboPoints,
  getLinearTrendline,
  getScatterPoints,
  getStockPoints,
} from "@/features/spreadsheet/chart-data";
import type { EffectiveChartFormat } from "@/features/spreadsheet/chart-formatting";

export function formatChartValue(value: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(value);
}

function gridlines(width: number, height: number, show: boolean) {
  if (!show) {
    return null;
  }

  return [0.25, 0.5, 0.75].map((level) => (
    <line
      key={level}
      x1="0"
      y1={height * level}
      x2={width}
      y2={height * level}
      stroke="currentColor"
      strokeOpacity="0.12"
    />
  ));
}

function errorBar({
  format,
  x,
  y,
  height,
  value,
  max,
}: {
  format: EffectiveChartFormat;
  x: number;
  y: number;
  height: number;
  value: number;
  max: number;
}) {
  const errorValue =
    format.errorBars.type === "fixed"
      ? format.errorBars.value
      : Math.abs(value) * (format.errorBars.value / 100);
  const delta = Math.max(errorValue / Math.max(max, 1), 0.03);
  const size = Math.min(Math.max(delta * height, 5), 18);

  return (
    <g aria-hidden="true">
      <line
        x1={x}
        y1={Math.max(y - size, 2)}
        x2={x}
        y2={Math.min(y + size, height - 2)}
        stroke="currentColor"
        strokeOpacity="0.55"
      />
      <line x1={x - 4} y1={Math.max(y - size, 2)} x2={x + 4} y2={Math.max(y - size, 2)} stroke="currentColor" strokeOpacity="0.55" />
      <line x1={x - 4} y1={Math.min(y + size, height - 2)} x2={x + 4} y2={Math.min(y + size, height - 2)} stroke="currentColor" strokeOpacity="0.55" />
    </g>
  );
}

function getValueBounds({
  maxOverride,
  minOverride,
  values,
}: {
  maxOverride?: number;
  minOverride?: number;
  values: number[];
}) {
  const naturalMin = Math.min(0, ...values);
  const naturalMax = Math.max(1, ...values);
  const min = minOverride ?? naturalMin;
  const max = maxOverride ?? naturalMax;

  return max <= min ? { max: min + 1, min } : { max, min };
}

function mapValueToHeight({
  availableHeight,
  bounds,
  value,
}: {
  availableHeight: number;
  bounds: { max: number; min: number };
  value: number;
}) {
  return ((value - bounds.min) / (bounds.max - bounds.min)) * availableHeight;
}

function Marker({
  format,
  x,
  y,
}: {
  format: EffectiveChartFormat;
  x: number;
  y: number;
}) {
  if (format.markerStyle === "none") {
    return null;
  }

  if (format.markerStyle === "square") {
    return <rect x={x - 3} y={y - 3} width="6" height="6" fill="currentColor" />;
  }

  return <circle cx={x} cy={y} r="3" fill="currentColor" />;
}

export function BarChart({
  format,
  points,
  showAxes,
  showDataLabels,
}: {
  format: EffectiveChartFormat;
  points: ReturnType<typeof getChartPoints>;
  showAxes: boolean;
  showDataLabels: boolean;
}) {
  const bounds = getValueBounds({
    maxOverride: format.axisBounds.valueMax,
    minOverride: format.axisBounds.valueMin,
    values: points.map((point) => point.value),
  });

  return (
    <div
      className={`flex h-40 items-end gap-2 px-2 pb-2 ${
        showAxes ? "border-b border-l" : ""
      }`}
      style={
        format.showGridlines
          ? {
              backgroundImage:
                "linear-gradient(to top, color-mix(in oklab, currentColor 12%, transparent) 1px, transparent 1px)",
              backgroundSize: "100% 25%",
            }
          : undefined
      }
    >
      {points.map((point) => (
        <div
          key={point.label}
          className="flex min-w-0 flex-1 flex-col items-center gap-1"
        >
          {showDataLabels ? (
            <span
              className={`w-full truncate text-center font-mono text-[10px] ${
                format.dataLabelPosition === "inside"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {formatChartValue(point.value)}
            </span>
          ) : null}
          <div className="relative w-full">
            {format.showErrorBars ? (
              <span
                aria-hidden="true"
                className="absolute left-1/2 top-0 h-6 w-px -translate-x-1/2 bg-current opacity-60 before:absolute before:-left-1 before:top-0 before:h-px before:w-2 before:bg-current after:absolute after:-left-1 after:bottom-0 after:h-px after:w-2 after:bg-current"
              />
            ) : null}
            <div
              className="w-full rounded-t-sm"
              style={{
                backgroundColor: format.primaryColor ?? "currentColor",
                height: `${Math.max(
                  mapValueToHeight({
                    availableHeight: 104,
                    bounds,
                    value: point.value,
                  }),
                  2,
                )}px`,
              }}
            />
          </div>
          {showAxes ? (
            <span className="w-full truncate text-center text-[10px] text-muted-foreground">
              {point.label}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function getValuePointPosition({
  bounds,
  index,
  length,
  value,
  width,
  height,
}: {
  bounds: { max: number; min: number };
  index: number;
  length: number;
  value: number;
  width: number;
  height: number;
}) {
  return {
    x: length <= 1 ? 0 : (index / (length - 1)) * width,
    y:
      height -
      ((value - bounds.min) / (bounds.max - bounds.min)) * (height - 16) -
      8,
  };
}

export function LineChart({
  format,
  points,
  showAxes,
  showDataLabels,
}: {
  format: EffectiveChartFormat;
  points: ReturnType<typeof getChartPoints>;
  showAxes: boolean;
  showDataLabels: boolean;
}) {
  const bounds = getValueBounds({
    maxOverride: format.axisBounds.valueMax,
    minOverride: format.axisBounds.valueMin,
    values: points.map((point) => point.value),
  });
  const width = 280;
  const height = 144;
  const path = points
    .map((point, index) => {
      const { x, y } = getValuePointPosition({
        index,
        length: points.length,
        value: point.value,
        bounds,
        width,
        height,
      });
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`h-40 w-full ${showAxes ? "border-b border-l" : ""}`}
    >
      {gridlines(width, height, format.showGridlines)}
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeDasharray={format.lineStyle === "dashed" ? "6 4" : undefined}
        strokeWidth="3"
      />
      {points.map((point, index) => {
        const { x, y } = getValuePointPosition({
          index,
          length: points.length,
          value: point.value,
          bounds,
          width,
          height,
        });

        return (
          <g key={point.label}>
            {format.showErrorBars
              ? errorBar({
                  format,
                  x,
                  y,
                  height,
                  value: point.value,
                  max: bounds.max - bounds.min,
                })
              : null}
            <Marker format={format} x={x} y={y} />
            {showDataLabels && points.length <= 8 ? (
              <text
                x={x}
                y={
                  format.dataLabelPosition === "inside"
                    ? Math.min(y + 14, height - 4)
                    : Math.max(y - 8, 10)
                }
                textAnchor="middle"
                fill="currentColor"
                className="font-mono text-[10px]"
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

export function AreaChart({
  format,
  points,
  showAxes,
  showDataLabels,
}: {
  format: EffectiveChartFormat;
  points: ReturnType<typeof getChartPoints>;
  showAxes: boolean;
  showDataLabels: boolean;
}) {
  const bounds = getValueBounds({
    maxOverride: format.axisBounds.valueMax,
    minOverride: format.axisBounds.valueMin,
    values: points.map((point) => point.value),
  });
  const width = 280;
  const height = 144;
  const baseline = height - 8;
  const positions = points.map((point, index) =>
    getValuePointPosition({
      index,
      length: points.length,
      value: point.value,
      bounds,
      width,
      height,
    }),
  );
  const linePath = positions
    .map((position, index) => `${index === 0 ? "M" : "L"} ${position.x} ${position.y}`)
    .join(" ");
  const first = positions[0];
  const last = positions.at(-1);
  const areaPath =
    first && last
      ? `${linePath} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`
      : "";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Area chart"
      className={`h-40 w-full ${showAxes ? "border-b border-l" : ""}`}
    >
      {gridlines(width, height, format.showGridlines)}
      <path d={areaPath} fill="currentColor" opacity="0.18" />
      <path
        d={linePath}
        fill="none"
        stroke="currentColor"
        strokeDasharray={format.lineStyle === "dashed" ? "6 4" : undefined}
        strokeWidth="3"
      />
      {points.map((point, index) => {
        const position = positions[index];

        if (!position) {
          return null;
        }

        return (
          <g key={point.label}>
            {format.showErrorBars
              ? errorBar({
                  x: position.x,
                  y: position.y,
                  height,
                  value: point.value,
                  max: bounds.max - bounds.min,
                  format,
                })
              : null}
            <Marker format={format} x={position.x} y={position.y} />
            {showDataLabels && points.length <= 8 ? (
              <text
                x={position.x}
                y={
                  format.dataLabelPosition === "inside"
                    ? Math.min(position.y + 14, height - 4)
                    : Math.max(position.y - 8, 10)
                }
                textAnchor="middle"
                fill="currentColor"
                className="font-mono text-[10px]"
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

export function PieChart({
  format,
  points,
  colors,
  showDataLabels,
  showLegend,
}: {
  format: EffectiveChartFormat;
  points: ReturnType<typeof getChartPoints>;
  colors: string[];
  showDataLabels: boolean;
  showLegend: boolean;
}) {
  const positivePoints = points.filter((point) => point.value > 0);
  const total = positivePoints.reduce((sum, point) => sum + point.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  if (total <= 0) {
    return (
      <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
        Pie charts need positive numeric values.
      </p>
    );
  }

  return (
    <div className={showLegend ? "grid gap-3 sm:grid-cols-[132px_1fr]" : ""}>
      <svg
        viewBox="0 0 120 120"
        role="img"
        aria-label="Pie chart"
        className="h-32 w-32"
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="24"
        />
        {positivePoints.map((point, index) => {
          const length = (point.value / total) * circumference;
          const strokeDashoffset = -offset;

          offset += length;

          return (
            <circle
              key={point.label}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={colors[index % colors.length]}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={strokeDashoffset}
              strokeWidth="24"
              transform="rotate(-90 60 60)"
            />
          );
        })}
        {showDataLabels
          ? positivePoints.slice(0, 4).map((point, index) => (
              <text
                key={`${point.label}-label`}
                x="60"
                y={48 + index * 10}
                textAnchor="middle"
                fill={format.dataLabelPosition === "inside" ? "white" : "currentColor"}
                className="font-mono text-[8px]"
              >
                {Math.round((point.value / total) * 100)}%
              </text>
            ))
          : null}
      </svg>
      {showLegend ? (
        <div className="min-w-0 space-y-2">
          {positivePoints.slice(0, 8).map((point, index) => (
            <div key={point.label} className="flex items-center gap-2 text-xs">
              <span
                className="size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="min-w-0 flex-1 truncate">{point.label}</span>
              <span className="font-mono text-muted-foreground">
                {formatChartValue(point.value)} / {Math.round((point.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function RadarChart({
  points,
  showAxes,
}: {
  points: ReturnType<typeof getChartPoints>;
  showAxes: boolean;
}) {
  const chartPoints = points.slice(0, 12);
  const center = 72;
  const radius = 52;
  const max = Math.max(...chartPoints.map((point) => Math.max(point.value, 0)), 1);
  const gridLevels = [0.25, 0.5, 0.75, 1];
  const getPosition = (index: number, value: number) => {
    const angle = -Math.PI / 2 + (index / chartPoints.length) * Math.PI * 2;
    const scaledRadius = (Math.max(value, 0) / max) * radius;

    return {
      x: center + Math.cos(angle) * scaledRadius,
      y: center + Math.sin(angle) * scaledRadius,
    };
  };

  if (chartPoints.length < 3) {
    return (
      <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
        Radar charts need at least three numeric values.
      </p>
    );
  }

  const polygonPoints = chartPoints
    .map((point, index) => {
      const position = getPosition(index, point.value);
      return `${position.x},${position.y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 144 144"
      role="img"
      aria-label="Radar chart"
      className="h-44 w-full"
    >
      {showAxes
        ? gridLevels.map((level) => {
            const gridPoints = chartPoints
              .map((_, index) => {
                const position = getPosition(index, level * max);
                return `${position.x},${position.y}`;
              })
              .join(" ");

            return (
              <polygon
                key={level}
                points={gridPoints}
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.18"
              />
            );
          })
        : null}
      {showAxes
        ? chartPoints.map((point, index) => {
            const edge = getPosition(index, max);
            const label = getPosition(index, max * 1.18);

            return (
              <g key={`${point.label}-${index}`}>
                <line
                  x1={center}
                  y1={center}
                  x2={edge.x}
                  y2={edge.y}
                  stroke="currentColor"
                  strokeOpacity="0.22"
                />
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="currentColor"
                  className="text-[8px]"
                >
                  {point.label.slice(0, 8)}
                </text>
              </g>
            );
          })
        : null}
      <polygon
        points={polygonPoints}
        fill="currentColor"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="2"
      />
      {chartPoints.map((point, index) => {
        const position = getPosition(index, point.value);

        return (
          <circle
            key={`${point.label}-${point.value}-${index}`}
            cx={position.x}
            cy={position.y}
            r="2.5"
            fill="currentColor"
          />
        );
      })}
    </svg>
  );
}

export function ComboChart({
  format,
  points,
  showAxes,
}: {
  format: EffectiveChartFormat;
  points: ReturnType<typeof getComboPoints>;
  showAxes: boolean;
}) {
  const width = 280;
  const height = 144;
  const baseline = height - 8;
  const columnSeries = format.series.find((series) => series.id === "combo-column");
  const lineSeries = format.series.find((series) => series.id === "combo-line");
  const showColumn = columnSeries?.hidden !== true;
  const showLine = lineSeries?.hidden !== true;
  const lineOnSecondary =
    lineSeries?.axis === "secondary" || format.secondaryAxis;
  const columnBounds = getValueBounds({
    maxOverride: format.axisBounds.valueMax,
    minOverride: format.axisBounds.valueMin,
    values: points.map((point) => point.columnValue),
  });
  const lineBounds = getValueBounds({
    maxOverride: lineOnSecondary
      ? format.axisBounds.secondaryValueMax
      : format.axisBounds.valueMax,
    minOverride: lineOnSecondary
      ? format.axisBounds.secondaryValueMin
      : format.axisBounds.valueMin,
    values: points.map((point) => point.lineValue),
  });
  const bandWidth = width / points.length;
  const barWidth = Math.max(Math.min(bandWidth * 0.48, 18), 4);
  const linePath = points
    .map((point, index) => {
      const x = bandWidth * index + bandWidth / 2;
      const y =
        height -
        mapValueToHeight({
          availableHeight: height - 16,
          bounds: lineBounds,
          value: point.lineValue,
        }) -
        8;

      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Combo chart"
      className={`h-40 w-full ${showAxes ? "border-b border-l" : ""}`}
    >
      {gridlines(width, height, format.showGridlines)}
      {showColumn ? points.map((point, index) => {
        const barHeight = Math.max(
          mapValueToHeight({
            availableHeight: height - 16,
            bounds: columnBounds,
            value: point.columnValue,
          }),
          2,
        );
        const x = bandWidth * index + (bandWidth - barWidth) / 2;

        return (
          <rect
            key={`${point.label}-${point.columnValue}-${index}`}
            x={x}
            y={baseline - barHeight}
            width={barWidth}
            height={barHeight}
            rx="2"
            fill="currentColor"
            style={{
              color:
                columnSeries?.color ?? format.primaryColor ?? "currentColor",
            }}
            opacity="0.28"
          />
        );
      }) : null}
      {showLine ? (
        <path
          d={linePath}
          fill="none"
          stroke={lineSeries?.color ?? format.secondaryColor ?? "currentColor"}
          strokeDasharray={format.lineStyle === "dashed" ? "6 4" : undefined}
          strokeWidth="3"
        />
      ) : null}
      {showLine ? points.map((point, index) => {
        const x = bandWidth * index + bandWidth / 2;
        const y =
          height -
          mapValueToHeight({
            availableHeight: height - 16,
            bounds: lineBounds,
            value: point.lineValue,
          }) -
          8;

        return (
          <g
            key={`${point.label}-${point.lineValue}-${index}`}
            style={{
              color: lineSeries?.color ?? format.secondaryColor ?? "currentColor",
            }}
          >
            <Marker format={format} x={x} y={y} />
          </g>
        );
      }) : null}
      {lineOnSecondary && showAxes ? (
        <line
          x1={width}
          y1="0"
          x2={width}
          y2={height}
          stroke={lineSeries?.color ?? format.secondaryColor ?? "currentColor"}
          strokeOpacity="0.35"
        />
      ) : null}
    </svg>
  );
}

export function StockChart({
  format,
  points,
  showAxes,
}: {
  format: EffectiveChartFormat;
  points: ReturnType<typeof getStockPoints>;
  showAxes: boolean;
}) {
  const width = 280;
  const height = 144;
  const padding = 12;
  const bounds = getValueBounds({
    maxOverride: format.axisBounds.valueMax,
    minOverride: format.axisBounds.valueMin,
    values: points.flatMap((point) => [point.high, point.low]),
  });
  const max = bounds.max;
  const min = bounds.min;
  const span = max - min || 1;
  const bandWidth = (width - padding * 2) / points.length;
  const bodyWidth = Math.max(Math.min(bandWidth * 0.46, 16), 4);
  const mapY = (value: number) =>
    height - padding - ((value - min) / span) * (height - padding * 2);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Stock chart"
      className={`h-40 w-full ${showAxes ? "border-b border-l" : ""}`}
    >
      {gridlines(width, height, format.showGridlines)}
      {points.map((point, index) => {
        const x = padding + bandWidth * index + bandWidth / 2;
        const openY = mapY(point.open);
        const closeY = mapY(point.close);
        const highY = mapY(point.high);
        const lowY = mapY(point.low);
        const bodyY = Math.min(openY, closeY);
        const bodyHeight = Math.max(Math.abs(closeY - openY), 2);
        const color = point.close >= point.open ? "#16a34a" : "#dc2626";

        return (
          <g key={`${point.label}-${point.open}-${point.close}-${index}`}>
            <line
              x1={x}
              y1={highY}
              x2={x}
              y2={lowY}
              stroke={color}
              strokeWidth="2"
            />
            <rect
              x={x - bodyWidth / 2}
              y={bodyY}
              width={bodyWidth}
              height={bodyHeight}
              rx="1"
              fill={color}
              fillOpacity="0.35"
              stroke={color}
              strokeWidth="1.5"
            />
          </g>
        );
      })}
      {showAxes ? (
        <text x={padding} y={12} fill="currentColor" className="font-mono text-[10px]">
          {formatChartValue(min)}-{formatChartValue(max)}
        </text>
      ) : null}
    </svg>
  );
}

export function ScatterChart({
  format,
  points,
  showAxes,
}: {
  format: EffectiveChartFormat;
  points: ReturnType<typeof getScatterPoints>;
  showAxes: boolean;
}) {
  const width = 280;
  const height = 144;
  const padding = 16;
  const trendline = getLinearTrendline(points);
  const xValues = points.map((point) => point.x);
  const yValues = [
    ...points.map((point) => point.y),
    ...(trendline ? [trendline.startY, trendline.endY] : []),
  ];
  const xBounds = getValueBounds({
    maxOverride: format.axisBounds.categoryMax,
    minOverride: format.axisBounds.categoryMin,
    values: xValues,
  });
  const yBounds = getValueBounds({
    maxOverride: format.axisBounds.valueMax,
    minOverride: format.axisBounds.valueMin,
    values: yValues,
  });
  const minX = xBounds.min;
  const maxX = xBounds.max;
  const minY = yBounds.min;
  const maxY = yBounds.max;
  const xSpan = maxX - minX || 1;
  const ySpan = maxY - minY || 1;
  const mapX = (value: number) =>
    padding + ((value - minX) / xSpan) * (width - padding * 2);
  const mapY = (value: number) =>
    height - padding - ((value - minY) / ySpan) * (height - padding * 2);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Scatter chart"
      className={`h-40 w-full ${showAxes ? "border-b border-l" : ""}`}
    >
      {gridlines(width, height, format.showGridlines)}
      {showAxes ? (
        <>
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="currentColor"
            strokeOpacity="0.35"
          />
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={height - padding}
            stroke="currentColor"
            strokeOpacity="0.35"
          />
        </>
      ) : null}
      {format.showTrendline && trendline ? (
        <line
          x1={mapX(trendline.startX)}
          y1={mapY(trendline.startY)}
          x2={mapX(trendline.endX)}
          y2={mapY(trendline.endY)}
          stroke="currentColor"
          strokeDasharray={format.lineStyle === "solid" ? undefined : "5 4"}
          strokeOpacity="0.65"
          strokeWidth="2"
        />
      ) : null}
      {points.map((point) => {
        const x = mapX(point.x);
        const y = mapY(point.y);

        return (
          <g key={`${point.label}-${point.x}-${point.y}`}>
            {format.showErrorBars
              ? errorBar({
                  x,
                  y,
                  height,
                  value: point.y,
                  max: maxY - minY,
                  format,
                })
              : null}
            <Marker format={format} x={x} y={y} />
          </g>
        );
      })}
      {format.trendline.displayEquation && format.showTrendline && trendline ? (
        <text
          x={width - padding}
          y={padding + 10}
          textAnchor="end"
          fill="currentColor"
          className="font-mono text-[9px]"
        >
          y = {formatChartValue(trendline.slope)}x
        </text>
      ) : null}
      {showAxes ? (
        <>
          <text x={padding} y={12} fill="currentColor" className="font-mono text-[10px]">
            y {formatChartValue(minY)}-{formatChartValue(maxY)}
          </text>
          <text
            x={width - padding}
            y={height - 4}
            textAnchor="end"
            fill="currentColor"
            className="font-mono text-[10px]"
          >
            x {formatChartValue(minX)}-{formatChartValue(maxX)}
          </text>
        </>
      ) : null}
    </svg>
  );
}

export function BubbleChart({
  format,
  points,
  showAxes,
}: {
  format: EffectiveChartFormat;
  points: ReturnType<typeof getBubblePoints>;
  showAxes: boolean;
}) {
  const width = 280;
  const height = 144;
  const padding = 16;
  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const sizeValues = points.map((point) => point.size);
  const xBounds = getValueBounds({
    maxOverride: format.axisBounds.categoryMax,
    minOverride: format.axisBounds.categoryMin,
    values: xValues,
  });
  const yBounds = getValueBounds({
    maxOverride: format.axisBounds.valueMax,
    minOverride: format.axisBounds.valueMin,
    values: yValues,
  });
  const minX = xBounds.min;
  const maxX = xBounds.max;
  const minY = yBounds.min;
  const maxY = yBounds.max;
  const minSize = Math.min(...sizeValues);
  const maxSize = Math.max(...sizeValues);
  const xSpan = maxX - minX || 1;
  const ySpan = maxY - minY || 1;
  const sizeSpan = maxSize - minSize;
  const mapX = (value: number) =>
    padding + ((value - minX) / xSpan) * (width - padding * 2);
  const mapY = (value: number) =>
    height - padding - ((value - minY) / ySpan) * (height - padding * 2);
  const mapRadius = (value: number) =>
    sizeSpan === 0 ? 8 : 4 + ((value - minSize) / sizeSpan) * 12;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Bubble chart"
      className={`h-40 w-full ${showAxes ? "border-b border-l" : ""}`}
    >
      {gridlines(width, height, format.showGridlines)}
      {showAxes ? (
        <>
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="currentColor"
            strokeOpacity="0.35"
          />
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={height - padding}
            stroke="currentColor"
            strokeOpacity="0.35"
          />
        </>
      ) : null}
      {points.map((point) => (
        <circle
          key={`${point.label}-${point.x}-${point.y}-${point.size}`}
          cx={mapX(point.x)}
          cy={mapY(point.y)}
          r={mapRadius(point.size)}
          fill="currentColor"
          fillOpacity="0.28"
          stroke="currentColor"
          strokeWidth="2"
        />
      ))}
      {showAxes ? (
        <>
          <text x={padding} y={12} fill="currentColor" className="font-mono text-[10px]">
            y {formatChartValue(minY)}-{formatChartValue(maxY)}
          </text>
          <text
            x={width - padding}
            y={height - 4}
            textAnchor="end"
            fill="currentColor"
            className="font-mono text-[10px]"
          >
            x {formatChartValue(minX)}-{formatChartValue(maxX)}
          </text>
        </>
      ) : null}
    </svg>
  );
}

export function ChartLegend({
  items,
}: {
  items: Array<{ label: string; color: string }>;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {items.slice(0, 8).map((item) => (
        <span
          key={`${item.label}-${item.color}`}
          className="inline-flex min-w-0 items-center gap-1.5"
        >
          <span
            className="size-2 shrink-0 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          <span className="max-w-24 truncate">{item.label}</span>
        </span>
      ))}
    </div>
  );
}
