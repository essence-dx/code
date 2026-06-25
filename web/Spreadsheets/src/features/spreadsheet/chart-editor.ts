import { cellKey } from "@/features/workbooks/addresses";
import type { EffectiveChartFormat } from "@/features/spreadsheet/chart-formatting";
import type {
  ChartDefinition,
  ChartFormat,
  SheetData,
} from "@/features/workbooks/types";

export type ChartTemplatePreset = {
  color: string;
  label: string;
  pieColors: string[];
  value: NonNullable<ChartDefinition["template"]>;
};

export const pieColors = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#be185d",
  "#4f46e5",
];

export const chartTemplatePresets: ChartTemplatePreset[] = [
  {
    label: "Std",
    value: "standard",
    color: "var(--primary)",
    pieColors,
  },
  {
    label: "Deck",
    value: "presentation",
    color: "var(--chart-4)",
    pieColors: ["#7c3aed", "#0891b2", "#f59e0b", "#16a34a", "#dc2626"],
  },
  {
    label: "Mono",
    value: "mono",
    color: "var(--foreground)",
    pieColors: ["#111827", "#374151", "#6b7280", "#9ca3af", "#d1d5db"],
  },
];

export const chartFormatTemplatePresets: Array<{
  id: string;
  label: string;
  description: string;
  updates: ChartFormat;
}> = [
  {
    id: "analysis",
    label: "Analysis",
    description: "Grid, trend, outside labels",
    updates: {
      dataLabelPosition: "outside",
      errorBars: { enabled: false },
      legendPosition: "bottom",
      lineStyle: "solid",
      markerStyle: "circle",
      showGridlines: true,
      trendline: { enabled: true, type: "linear" },
    },
  },
  {
    id: "presentation",
    label: "Presentation",
    description: "Bold colors, labels inside",
    updates: {
      dataLabelPosition: "inside",
      errorBars: { enabled: false },
      legendPosition: "right",
      lineStyle: "solid",
      markerStyle: "square",
      primaryColor: "#7c3aed",
      secondaryAxis: true,
      secondaryColor: "#dc2626",
      showGridlines: false,
    },
  },
  {
    id: "quality",
    label: "Quality",
    description: "Error bars and dashed lines",
    updates: {
      errorBars: { enabled: true, type: "percentage", value: 8 },
      lineStyle: "dashed",
      markerStyle: "circle",
      showGridlines: true,
      trendline: { enabled: true, displayEquation: true, type: "linear" },
    },
  },
];

export type ChartSeriesEditorRow = {
  axis: "primary" | "secondary";
  chartType: "area" | "bar" | "line";
  color?: string;
  hidden: boolean;
  id: string;
  label: string;
  name: string;
};

function getCellValue({
  sheet,
  computedValues,
  rowIndex,
  columnIndex,
}: {
  sheet: SheetData;
  computedValues: Record<string, string>;
  rowIndex: number;
  columnIndex: number;
}) {
  const key = cellKey(rowIndex, columnIndex);

  return computedValues[key] ?? sheet.cells[key]?.raw ?? "";
}

function getSeriesOverride(
  format: EffectiveChartFormat,
  id: string,
) {
  return format.series.find((item) => item.id === id);
}

function createSeriesRow({
  defaultAxis = "primary",
  defaultChartType = "bar",
  defaultName,
  format,
  id,
}: {
  defaultAxis?: "primary" | "secondary";
  defaultChartType?: "area" | "bar" | "line";
  defaultName: string;
  format: EffectiveChartFormat;
  id: string;
}): ChartSeriesEditorRow {
  const override = getSeriesOverride(format, id);

  return {
    axis: override?.axis ?? defaultAxis,
    chartType: override?.chartType ?? defaultChartType,
    color: override?.color,
    hidden: override?.hidden === true,
    id,
    label: defaultName,
    name: override?.name ?? defaultName,
  };
}

export function getChartSeriesEditorRows({
  chart,
  computedValues,
  format,
  sheet,
}: {
  chart: ChartDefinition;
  computedValues: Record<string, string>;
  format: EffectiveChartFormat;
  sheet: SheetData;
}) {
  if (chart.type === "combo") {
    return [
      createSeriesRow({
        defaultChartType: "bar",
        defaultName: "Column",
        format,
        id: "combo-column",
      }),
      createSeriesRow({
        defaultAxis: format.secondaryAxis ? "secondary" : "primary",
        defaultChartType: "line",
        defaultName: "Line",
        format,
        id: "combo-line",
      }),
    ];
  }

  if (chart.type === "stacked-bar" || chart.type === "stacked-100-bar") {
    const hasLabelColumn =
      chart.range.endColumnIndex > chart.range.startColumnIndex;
    const firstValueColumnIndex = hasLabelColumn
      ? chart.range.startColumnIndex + 1
      : chart.range.startColumnIndex;
    const hasHeader =
      chart.range.startRowIndex < chart.range.endRowIndex &&
      Array.from(
        { length: chart.range.endColumnIndex - firstValueColumnIndex + 1 },
        (_, index) =>
          getCellValue({
            sheet,
            computedValues,
            rowIndex: chart.range.startRowIndex,
            columnIndex: firstValueColumnIndex + index,
          }),
      ).some((value) => value.trim() && Number.isNaN(Number(value)));

    return Array.from(
      { length: chart.range.endColumnIndex - firstValueColumnIndex + 1 },
      (_, index) => {
        const columnIndex = firstValueColumnIndex + index;
        const header = hasHeader
          ? getCellValue({
              sheet,
              computedValues,
              rowIndex: chart.range.startRowIndex,
              columnIndex,
            })
          : "";

        return createSeriesRow({
          defaultName: header.trim() || `Series ${index + 1}`,
          format,
          id: `series-${columnIndex}`,
        });
      },
    ).slice(0, 8);
  }

  if (chart.type === "stock") {
    return ["Open", "High", "Low", "Close"].map((name, index) =>
      createSeriesRow({
        defaultChartType: "line",
        defaultName: name,
        format,
        id: `stock-${index}`,
      }),
    );
  }

  return [
    createSeriesRow({
      defaultChartType:
        chart.type === "line" || chart.type === "area" ? chart.type : "bar",
      defaultName: chart.title || "Series 1",
      format,
      id: "series-1",
    }),
  ];
}

export function getChartSeriesFormatUpdate(
  format: EffectiveChartFormat,
  row: ChartSeriesEditorRow,
  updates: Partial<ChartSeriesEditorRow>,
) {
  const nextRow = { ...row, ...updates };
  const nextSeries = [
    ...format.series.filter((item) => item.id !== row.id),
    {
      id: row.id,
      axis: nextRow.axis,
      chartType: nextRow.chartType,
      color: nextRow.color,
      hidden: nextRow.hidden,
      name: nextRow.name.trim() || row.label,
    },
  ];

  return { series: nextSeries } satisfies ChartFormat;
}

export function isChartSeriesHidden(
  format: EffectiveChartFormat,
  id: string,
) {
  return getSeriesOverride(format, id)?.hidden === true;
}
