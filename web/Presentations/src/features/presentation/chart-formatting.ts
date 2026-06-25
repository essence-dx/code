import type {
  ChartDatum,
  ChartSeries,
  ChartSeriesDatum,
  ChartType,
  PresentationElement,
} from "./types"

export const CHART_MIN_ITEMS = 1
export const CHART_MAX_ITEMS = 8
export const CHART_MAX_SERIES = 4

export const defaultChartPalette = [
  "#2563eb",
  "#16a34a",
  "#f97316",
  "#7c3aed",
  "#dc2626",
  "#0891b2",
  "#ca8a04",
  "#475569",
]

export const chartTypeLabels: Record<ChartType, string> = {
  bar: "Bar",
  horizontalBar: "Horizontal bar",
  line: "Line",
  area: "Area",
  pie: "Pie",
  donut: "Donut",
}

const defaultData: ChartDatum[] = [
  { label: "Q1", value: 42, color: defaultChartPalette[0] },
  { label: "Q2", value: 64, color: defaultChartPalette[1] },
  { label: "Q3", value: 56, color: defaultChartPalette[2] },
  { label: "Q4", value: 78, color: defaultChartPalette[3] },
]

function clampChartValue(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1_000_000, value))
}

function colorAt(index: number, color: string | undefined) {
  const trimmed = color?.trim()
  return trimmed || defaultChartPalette[index % defaultChartPalette.length]
}

export function defaultChartData() {
  return defaultData.map((datum) => ({ ...datum }))
}

function defaultSeriesId(index: number) {
  return `series-${index + 1}`
}

export function normalizeChartData(data: ChartDatum[] | undefined) {
  const source = data?.length ? data : defaultChartData()

  return source
    .slice(0, CHART_MAX_ITEMS)
    .map((datum, index) => ({
      label: datum.label?.trim() || `Item ${index + 1}`,
      value: clampChartValue(Number(datum.value)),
      color: colorAt(index, datum.color),
    }))
    .filter((datum) => datum.label)
}

function normalizeSeriesData(
  data: ChartSeriesDatum[] | undefined,
  fallback: ChartDatum[],
) {
  const source = data?.length
    ? data
    : fallback.map((datum) => ({
        label: datum.label,
        value: datum.value,
      }))

  return source
    .slice(0, CHART_MAX_ITEMS)
    .map((datum, index) => ({
      label: datum.label?.trim() || fallback[index]?.label || `Item ${index + 1}`,
      value: clampChartValue(Number(datum.value)),
    }))
    .filter((datum) => datum.label)
}

export function normalizeChartSeries(
  series: ChartSeries[] | undefined,
  fallbackData = defaultChartData(),
) {
  const fallback = normalizeChartData(fallbackData)

  return (series ?? [])
    .slice(0, CHART_MAX_SERIES)
    .map((item, index) => ({
      id: item.id?.trim() || defaultSeriesId(index),
      name: item.name?.trim() || `Series ${index + 1}`,
      color: colorAt(index, item.color),
      data: normalizeSeriesData(item.data, fallback),
    }))
    .filter((item) => item.data.length)
}

export function defaultChartSeries(data = defaultChartData()) {
  const normalized = normalizeChartData(data)

  return [
    {
      id: "series-1",
      name: "Series 1",
      color: normalized[0]?.color ?? defaultChartPalette[0],
      data: normalized.map((datum) => ({
        label: datum.label,
        value: datum.value,
      })),
    },
  ] satisfies ChartSeries[]
}

export function chartData(element: PresentationElement) {
  const normalized = normalizeChartData(element.chartData)
  return normalized.length ? normalized : defaultChartData()
}

export function chartSeries(element: PresentationElement) {
  const normalized = normalizeChartSeries(element.chartSeries, chartData(element))

  return normalized.length ? normalized : defaultChartSeries(chartData(element))
}

export function hasMultiSeriesChart(element: PresentationElement) {
  return (
    element.chartType !== "pie" &&
    element.chartType !== "donut" &&
    chartSeries(element).length > 1
  )
}

export function chartSeriesCategories(element: PresentationElement) {
  const categories: string[] = []

  for (const series of chartSeries(element)) {
    for (const datum of series.data) {
      if (!categories.includes(datum.label)) {
        categories.push(datum.label)
      }
    }
  }

  return categories.slice(0, CHART_MAX_ITEMS)
}

export function chartMaxValue(element: PresentationElement) {
  if (hasMultiSeriesChart(element)) {
    return Math.max(
      1,
      ...chartSeries(element).flatMap((series) =>
        series.data.map((datum) => datum.value),
      ),
    )
  }

  return Math.max(1, ...chartData(element).map((datum) => datum.value))
}

export function chartDataToTsv(element: PresentationElement) {
  return chartData(element)
    .map((datum) => [datum.label, datum.value, datum.color].join("\t"))
    .join("\n")
}

export function chartDataFromTsv(value: string) {
  return normalizeChartData(
    value
      .split(/\r?\n/)
      .map((line, index) => {
        const [label = "", rawValue = "0", color] = line.split("\t")

        return {
          label: label.trim() || `Item ${index + 1}`,
          value: clampChartValue(Number(rawValue)),
          color: colorAt(index, color),
        }
      })
      .filter((datum) => datum.label || datum.value > 0),
  )
}

function rowsFromTsv(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.split("\t").map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean))
}

function chartSeriesFromDataRows(data: ChartDatum[], existing?: ChartSeries[]) {
  const existingSeries = existing?.[0]

  return normalizeChartSeries([
    {
      id: existingSeries?.id || "series-1",
      name: existingSeries?.name || "Series 1",
      color: existingSeries?.color || data[0]?.color || defaultChartPalette[0],
      data: data.map((datum) => ({
        label: datum.label,
        value: datum.value,
      })),
    },
  ])
}

export function chartSeriesFromTsv(
  value: string,
  existing?: ChartSeries[],
): ChartSeries[] {
  const rows = rowsFromTsv(value)
  if (!rows.length) return defaultChartSeries()

  const firstRow = rows[0] ?? []
  const oldSingleSeriesShape =
    firstRow.length <= 3 &&
    rows.every((row) => row.length <= 3 && Number.isFinite(Number(row[1] ?? 0)))

  if (oldSingleSeriesShape) {
    return chartSeriesFromDataRows(chartDataFromTsv(value), existing)
  }

  const headerRow = firstRow
  const hasColorRow = (rows[1]?.[0] ?? "").toLowerCase() === "color"
  const colorRow = hasColorRow ? rows[1] : undefined
  const dataRows = rows.slice(hasColorRow ? 2 : 1)
  const seriesCount = Math.min(CHART_MAX_SERIES, Math.max(1, headerRow.length - 1))

  return normalizeChartSeries(
    Array.from({ length: seriesCount }, (_, seriesIndex) => {
      const columnIndex = seriesIndex + 1
      const existingSeries = existing?.[seriesIndex]

      return {
        id: existingSeries?.id || defaultSeriesId(seriesIndex),
        name:
          headerRow[columnIndex]?.trim() ||
          existingSeries?.name ||
          `Series ${columnIndex}`,
        color:
          colorRow?.[columnIndex]?.trim() ||
          existingSeries?.color ||
          defaultChartPalette[seriesIndex % defaultChartPalette.length],
        data: dataRows.map((row, rowIndex) => ({
          label: row[0]?.trim() || `Item ${rowIndex + 1}`,
          value: clampChartValue(Number(row[columnIndex] ?? 0)),
        })),
      }
    }),
  )
}

export function chartDataFromSeries(series: ChartSeries[] | undefined) {
  const [firstSeries] = normalizeChartSeries(series)
  if (!firstSeries) return defaultChartData()

  return normalizeChartData(
    firstSeries.data.map((datum, index) => ({
      label: datum.label,
      value: datum.value,
      color: firstSeries.color || defaultChartPalette[index % defaultChartPalette.length],
    })),
  )
}

export function chartSeriesToTsv(element: PresentationElement) {
  const series = chartSeries(element)
  const categories = chartSeriesCategories(element)

  return [
    ["Category", ...series.map((item) => item.name)].join("\t"),
    ["Color", ...series.map((item) => item.color)].join("\t"),
    ...categories.map((category) =>
      [
        category,
        ...series.map(
          (item) =>
            item.data.find((datum) => datum.label === category)?.value ?? 0,
        ),
      ].join("\t"),
    ),
  ].join("\n")
}

export function chartText(element: PresentationElement) {
  if (hasMultiSeriesChart(element)) {
    return chartSeries(element)
      .flatMap((series) =>
        series.data.map(
          (datum) => `${series.name} - ${datum.label}: ${datum.value}`,
        ),
      )
      .join("\n")
  }

  return chartData(element)
    .map((datum) => `${datum.label}: ${datum.value}`)
    .join("\n")
}
