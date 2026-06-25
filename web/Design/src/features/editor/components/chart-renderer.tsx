"use client";

import type { CSSProperties } from "react";

import {
  createChartGeometry,
  getChartMaxValue,
  getChartTotal,
  getDonutCenter,
  getDonutOuterRadius,
  getDonutSegments,
  getLineChartPoints,
  normalizeChartData,
} from "@/features/editor/chart";
import { resolveChartData } from "@/features/editor/chart-data-binding";
import type { DesignElement } from "@/features/editor/types";

type ChartRendererProps = {
  element: Extract<DesignElement, { type: "chart" }>;
  baseStyle: CSSProperties;
  pageElements?: readonly DesignElement[];
};

type ChartOnlyElement = Extract<DesignElement, { type: "chart" }>;

export function ChartRenderer({
  element,
  baseStyle,
  pageElements,
}: ChartRendererProps) {
  const chartElement = {
    ...element,
    data: resolveChartData(element, pageElements),
  };

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${chartElement.width} ${chartElement.height}`}
      preserveAspectRatio="none"
      style={baseStyle}
    >
      <rect
        x={0}
        y={0}
        width={chartElement.width}
        height={chartElement.height}
        fill={chartElement.backgroundColor}
      />
      {chartElement.chartType === "donut" ? (
        <DonutChartRenderer element={chartElement} />
      ) : chartElement.chartType === "line" ? (
        <LineChartRenderer element={chartElement} />
      ) : (
        <BarChartRenderer element={chartElement} />
      )}
    </svg>
  );
}

function BarChartRenderer({ element }: { element: ChartOnlyElement }) {
  const data = normalizeChartData(element.data);
  const geometry = createChartGeometry(element);
  const maxValue = getChartMaxValue(data);
  const gap = Math.max(6, geometry.plot.width / (data.length * 6));
  const barWidth = Math.max(
    1,
    (geometry.plot.width - gap * (data.length - 1)) / data.length,
  );

  return (
    <>
      <ChartAxis element={element} geometry={geometry} />
      {data.map((item, index) => {
        const barHeight = (item.value / maxValue) * geometry.plot.height;
        const x = geometry.plot.x + index * (barWidth + gap);
        const y = geometry.plot.bottom - barHeight;

        return (
          <g key={`${item.label}-${index}`}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={Math.min(8, barWidth / 4)}
              fill={item.color}
            />
            {element.showValues ? (
              <text
                x={x + barWidth / 2}
                y={Math.max(element.fontSize, y - 6)}
                fill={element.textColor}
                fontSize={element.fontSize}
                textAnchor="middle"
              >
                {item.value}
              </text>
            ) : null}
            {element.showLabels ? (
              <text
                x={x + barWidth / 2}
                y={element.height - element.fontSize * 0.8}
                fill={element.textColor}
                fontSize={element.fontSize}
                textAnchor="middle"
              >
                {item.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </>
  );
}

function LineChartRenderer({ element }: { element: ChartOnlyElement }) {
  const data = normalizeChartData(element.data);
  const geometry = createChartGeometry(element);
  const points = getLineChartPoints(data, geometry);
  const pointString = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <>
      <ChartAxis element={element} geometry={geometry} />
      {points.length > 1 ? (
        <polyline
          points={pointString}
          fill="none"
          stroke={points[0].color}
          strokeWidth={element.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {points.map((point, index) => (
        <g key={`${point.label}-${index}`}>
          <circle
            cx={point.x}
            cy={point.y}
            r={Math.max(4, element.strokeWidth + 2)}
            fill={point.color}
            stroke={element.backgroundColor}
            strokeWidth={2}
          />
          {element.showValues ? (
            <text
              x={point.x}
              y={Math.max(element.fontSize, point.y - 10)}
              fill={element.textColor}
              fontSize={element.fontSize}
              textAnchor="middle"
            >
              {point.value}
            </text>
          ) : null}
          {element.showLabels ? (
            <text
              x={point.x}
              y={element.height - element.fontSize * 0.8}
              fill={element.textColor}
              fontSize={element.fontSize}
              textAnchor="middle"
            >
              {point.label}
            </text>
          ) : null}
        </g>
      ))}
    </>
  );
}

function DonutChartRenderer({ element }: { element: ChartOnlyElement }) {
  const segments = getDonutSegments(element);
  const center = getDonutCenter(element);
  const radius = getDonutOuterRadius(element);
  const total = getChartTotal(segments);
  const legendX = element.width * 0.64;
  const legendY = Math.max(element.fontSize * 2, center.y - radius * 0.65);

  return (
    <>
      {segments.map((segment, index) => (
        <path
          key={`${segment.label}-${index}`}
          d={segment.path}
          fill={segment.color}
        />
      ))}
      {element.showValues ? (
        <text
          x={center.x}
          y={center.y}
          fill={element.textColor}
          fontSize={element.fontSize * 1.4}
          fontWeight={700}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {total}
        </text>
      ) : null}
      {segments.map((segment, index) => (
        <g
          key={`legend-${segment.label}-${index}`}
          transform={`translate(${legendX} ${
            legendY + index * element.fontSize * 1.8
          })`}
        >
          <rect
            x={0}
            y={-element.fontSize * 0.75}
            width={element.fontSize}
            height={element.fontSize}
            rx={3}
            fill={segment.color}
          />
          {element.showLabels ? (
            <text
              x={element.fontSize * 1.5}
              y={0}
              fill={element.textColor}
              fontSize={element.fontSize}
              dominantBaseline="middle"
            >
              {segment.label}
            </text>
          ) : null}
          {element.showValues ? (
            <text
              x={element.width - legendX - 8}
              y={0}
              fill={element.textColor}
              fontSize={element.fontSize}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {segment.value}
            </text>
          ) : null}
        </g>
      ))}
    </>
  );
}

function ChartAxis({
  element,
  geometry,
}: {
  element: ChartOnlyElement;
  geometry: ReturnType<typeof createChartGeometry>;
}) {
  if (!element.showAxis) return null;

  return (
    <g stroke={element.axisColor} strokeWidth={1.5}>
      <line
        x1={geometry.plot.x}
        y1={geometry.plot.y}
        x2={geometry.plot.x}
        y2={geometry.plot.bottom}
      />
      <line
        x1={geometry.plot.x}
        y1={geometry.plot.bottom}
        x2={geometry.plot.x + geometry.plot.width}
        y2={geometry.plot.bottom}
      />
    </g>
  );
}
