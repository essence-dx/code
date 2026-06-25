import {
  chartData,
  chartSeries,
  chartTypeLabels,
  defaultChartPalette,
  hasMultiSeriesChart,
} from "./chart-formatting"
import type { ChartType, PresentationElement } from "./types"

export type PptxNativeChartType = "area" | "bar" | "doughnut" | "line" | "pie"

export type PptxChartExportMode =
  | {
      chartType: PptxNativeChartType
      detail: string
      label: string
      mode: "native"
    }
  | {
      chartType: PptxNativeChartType
      detail: string
      label: string
      mode: "static"
      reason: "rotation"
    }

function normalizedRotation(value: number) {
  return Math.round((((value % 360) + 360) % 360) * 10) / 10
}

function chartColor(value: string | undefined, fallback: string) {
  const normalized = value?.trim()
  if (!normalized) return fallback

  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(normalized)
  if (!hex) return fallback

  const valuePart = hex[1]
  return valuePart.length === 3
    ? valuePart
        .split("")
        .map((character) => `${character}${character}`)
        .join("")
        .toUpperCase()
    : valuePart.toUpperCase()
}

export function pptxNativeChartType(chartType: ChartType): PptxNativeChartType {
  if (chartType === "donut") return "doughnut"
  if (chartType === "horizontalBar") return "bar"

  return chartType
}

export function pptxChartTitle(element: PresentationElement) {
  return element.content.trim() || `${chartTypeLabels[element.chartType]} chart`
}

export function pptxChartDataSeries(element: PresentationElement) {
  if (hasMultiSeriesChart(element)) {
    const categories = new Set<string>()
    const series = chartSeries(element)

    series.forEach((item) =>
      item.data.forEach((datum) => {
        categories.add(datum.label)
      }),
    )

    const labels = Array.from(categories)

    return series.map((item) => ({
      labels,
      name: item.name,
      values: labels.map(
        (label) =>
          item.data.find((datum) => datum.label === label)?.value ?? 0,
      ),
    }))
  }

  const data = chartData(element)

  return [
    {
      labels: data.map((datum) => datum.label),
      name: pptxChartTitle(element),
      values: data.map((datum) => datum.value),
    },
  ]
}

export function pptxChartColorValues(element: PresentationElement) {
  if (hasMultiSeriesChart(element)) {
    return chartSeries(element).map((series, index) =>
      chartColor(series.color, chartColor(defaultChartPalette[index], "2563EB")),
    )
  }

  return chartData(element).map((datum, index) =>
    chartColor(datum.color, chartColor(defaultChartPalette[index], "2563EB")),
  )
}

export function pptxChartExportMode(
  element: PresentationElement,
): PptxChartExportMode {
  const chartType = pptxNativeChartType(element.chartType)
  const label = `${chartTypeLabels[element.chartType]} chart`

  if (normalizedRotation(element.rotation) !== 0) {
    return {
      chartType,
      detail:
        "Rotated charts keep their exact slide appearance as artwork because native Office chart rotation is not exported yet.",
      label,
      mode: "static",
      reason: "rotation",
    }
  }

  return {
    chartType,
    detail:
      "Chart data, labels, colors, legend state, and value labels export as an editable Office chart.",
    label,
    mode: "native",
  }
}

export function isPptxNativeChartElement(element: PresentationElement) {
  return pptxChartExportMode(element).mode === "native"
}
