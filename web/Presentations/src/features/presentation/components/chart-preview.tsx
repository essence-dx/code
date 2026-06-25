"use client"

import {
  chartData,
  chartMaxValue,
  chartSeries,
  chartSeriesCategories,
  hasMultiSeriesChart,
} from "../chart-formatting"
import { pieLabelPoint, pieSlicePath, pieSlices } from "../chart-pie"
import type { PresentationElement } from "../types"

type ChartPreviewProps = {
  element: PresentationElement
}

function chartPoint(index: number, count: number, value: number, maxValue: number) {
  const left = 12
  const right = 88
  const bottom = 78
  const top = 14
  const x = count <= 1 ? 50 : left + (index / (count - 1)) * (right - left)
  const y = bottom - (value / maxValue) * (bottom - top)

  return { x, y }
}

export function ChartPreview({ element }: ChartPreviewProps) {
  const data = chartData(element)
  const series = chartSeries(element)
  const categories = chartSeriesCategories(element)
  const multiSeries = hasMultiSeriesChart(element)
  const maxValue = chartMaxValue(element)
  const barWidth = Math.max(
    3,
    multiSeries ? 50 / (categories.length * series.length) : 58 / data.length,
  )
  const axisColor = element.chartAxisColor || "#94a3b8"
  const slices = pieSlices(data)
  const isRadialChart =
    element.chartType === "pie" || element.chartType === "donut"
  const legendItems = multiSeries
    ? series.map((item) => ({ color: item.color, label: item.name }))
    : data.map((datum) => ({ color: datum.color, label: datum.label }))

  return (
    <span className="block size-full overflow-hidden rounded-[inherit]">
      <svg
        aria-label="Chart"
        className="size-full"
        preserveAspectRatio="none"
        role="img"
        viewBox="0 0 100 100"
      >
        <rect width="100" height="100" fill={element.background || "#ffffff"} />
        {isRadialChart ? (
          <g>
            {slices.map((slice) =>
              slice.percent >= 0.999 ? (
                <circle
                  key={`${slice.datum.label}-${slice.index}`}
                  cx="42"
                  cy="52"
                  fill={slice.datum.color}
                  r="28"
                  stroke="#ffffff"
                  strokeWidth="1"
                />
              ) : (
                <path
                  key={`${slice.datum.label}-${slice.index}`}
                  d={pieSlicePath(42, 52, 28, slice.startAngle, slice.endAngle)}
                  fill={slice.datum.color}
                  stroke="#ffffff"
                  strokeWidth="1"
                />
              ),
            )}
            {element.chartShowValues
              ? slices.map((slice) => {
                  const point = pieLabelPoint(
                    42,
                    52,
                    18,
                    slice.startAngle,
                    slice.endAngle,
                  )

                  return (
                    <text
                      key={`value-${slice.datum.label}-${slice.index}`}
                      fill="#ffffff"
                      fontSize="5"
                      fontWeight="700"
                      textAnchor="middle"
                      x={point.x}
                      y={point.y}
                    >
                      {Math.round(slice.percent * 100)}%
                    </text>
                  )
                })
              : null}
            {element.chartType === "donut" ? (
              <circle
                cx="42"
                cy="52"
                fill={element.background || "#ffffff"}
                r="13"
                stroke="#ffffff"
                strokeWidth="1"
              />
            ) : null}
          </g>
        ) : (
          <>
            <line x1="10" x2="90" y1="80" y2="80" stroke={axisColor} strokeWidth="0.8" />
            <line x1="10" x2="10" y1="12" y2="80" stroke={axisColor} strokeWidth="0.8" />
          </>
        )}
        {element.chartType === "line" || element.chartType === "area" ? (
          <>
            {(multiSeries ? series : [{ color: data[0]?.color ?? "#2563eb", data, id: "series-1", name: "Series 1" }]).map((item) => {
              const lineData = multiSeries
                ? categories.map((category) => ({
                    label: category,
                    value:
                      item.data.find((datum) => datum.label === category)
                        ?.value ?? 0,
                  }))
                : data
              const points = lineData
                .map((datum, index) => {
                  const point = chartPoint(
                    index,
                    lineData.length,
                    datum.value,
                    maxValue,
                  )

                  return `${point.x},${point.y}`
                })
                .join(" ")

              return (
                <g key={item.id}>
                  {element.chartType === "area" ? (
                    <polygon
                      fill={item.color}
                      opacity={multiSeries ? "0.12" : "0.18"}
                      points={["12,78", points, "88,78"].join(" ")}
                    />
                  ) : null}
                  <polyline
                    fill="none"
                    points={points}
                    stroke={item.color}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={multiSeries ? "1.7" : "2.2"}
                  />
                  {lineData.map((datum, index) => {
                    const point = chartPoint(
                      index,
                      lineData.length,
                      datum.value,
                      maxValue,
                    )

                    return (
                      <g key={`${item.id}-${datum.label}-${index}`}>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          fill={item.color}
                          r={multiSeries ? "1.9" : "2.4"}
                          stroke="#ffffff"
                          strokeWidth="0.8"
                        />
                        {element.chartShowValues && !multiSeries ? (
                          <text
                            fill={element.color}
                            fontSize="5"
                            textAnchor="middle"
                            x={point.x}
                            y={Math.max(8, point.y - 4)}
                          >
                            {datum.value}
                          </text>
                        ) : null}
                        {!multiSeries ? (
                          <text
                            fill={element.color}
                            fontSize="4.5"
                            textAnchor="middle"
                            x={point.x}
                            y="90"
                          >
                            {datum.label}
                          </text>
                        ) : null}
                      </g>
                    )
                  })}
                </g>
              )
            })}
            {multiSeries
              ? categories.map((category, index) => {
                  const point = chartPoint(index, categories.length, 0, 1)

                  return (
                    <text
                      key={`category-${category}`}
                      fill={element.color}
                      fontSize="4.3"
                      textAnchor="middle"
                      x={point.x}
                      y="90"
                    >
                      {category.slice(0, 6)}
                    </text>
                  )
                })
              : null}
          </>
        ) : element.chartType === "horizontalBar" ? (
          (multiSeries ? categories : data.map((datum) => datum.label)).flatMap((category, index) => {
            const slotHeight = 62 / (multiSeries ? categories.length : data.length)
            const groupHeight = Math.max(4, slotHeight * 0.68)
            const barHeight = Math.max(
              2.6,
              multiSeries ? groupHeight / series.length - 1 : slotHeight * 0.55,
            )
            const yBase = 16 + index * slotHeight + (slotHeight - groupHeight) / 2
            const values = multiSeries
              ? series.map((item) => ({
                  color: item.color,
                  label: item.name,
                  value:
                    item.data.find((datum) => datum.label === category)
                      ?.value ?? 0,
                }))
              : [data[index]]

            return values.flatMap((datum, seriesIndex) => {
              if (!datum) return []
              const y = yBase + seriesIndex * (barHeight + 1)
              const width = Math.max(1, (datum.value / maxValue) * 66)

              return (
                <g key={`${category}-${datum.label}-${seriesIndex}`}>
                <rect
                  fill={datum.color}
                  height={barHeight}
                  rx="1.6"
                  width={width}
                  x="18"
                  y={y}
                />
                <text
                  fill={element.color}
                  fontSize="4.3"
                  textAnchor="end"
                  x="16"
                  y={yBase + groupHeight / 2 + 1.5}
                >
                  {category.slice(0, 7)}
                </text>
                {element.chartShowValues && !multiSeries ? (
                  <text
                    fill={element.color}
                    fontSize="5"
                    x={Math.min(88, 20 + width)}
                    y={y + barHeight / 2 + 1.7}
                  >
                    {datum.value}
                  </text>
                ) : null}
              </g>
              )
            })
          })
        ) : element.chartType === "bar" ? (
          (multiSeries ? categories : data.map((datum) => datum.label)).flatMap((category, index) => {
            const slotWidth = 70 / (multiSeries ? categories.length : data.length)
            const xBase = 15 + index * slotWidth
            const values = multiSeries
              ? series.map((item) => ({
                  color: item.color,
                  label: item.name,
                  value:
                    item.data.find((datum) => datum.label === category)
                      ?.value ?? 0,
                }))
              : [data[index]]

            return values.flatMap((datum, seriesIndex) => {
              if (!datum) return []
              const groupWidth = multiSeries ? barWidth * series.length : barWidth
              const x =
                xBase +
                (slotWidth - groupWidth) / 2 +
                seriesIndex * barWidth
              const height = Math.max(1, (datum.value / maxValue) * 62)
              const y = 80 - height

              return (
                <g key={`${category}-${datum.label}-${seriesIndex}`}>
                <rect
                  fill={datum.color}
                  height={height}
                  rx="1.6"
                  width={barWidth}
                  x={x}
                  y={y}
                />
                {element.chartShowValues && !multiSeries ? (
                  <text
                    fill={element.color}
                    fontSize="5"
                    textAnchor="middle"
                    x={x + barWidth / 2}
                    y={Math.max(8, y - 3)}
                  >
                    {datum.value}
                  </text>
                ) : null}
                <text
                  fill={element.color}
                  fontSize="4.5"
                  textAnchor="middle"
                  x={xBase + slotWidth / 2}
                  y="90"
                >
                  {category.slice(0, 7)}
                </text>
              </g>
              )
            })
          })
        ) : null}
        {element.chartShowLegend ? (
          <g>
            {legendItems.slice(0, 4).map((datum, index) => (
              <g key={`legend-${datum.label}-${index}`}>
                <rect
                  fill={datum.color}
                  height="2.8"
                  width="2.8"
                  x={58 + index * 9.5}
                  y="6"
                />
                <text
                  fill={element.color}
                  fontSize="3.7"
                  x={62 + index * 9.5}
                  y="8.7"
                >
                  {datum.label.slice(0, 5)}
                </text>
              </g>
            ))}
          </g>
        ) : null}
      </svg>
    </span>
  )
}
