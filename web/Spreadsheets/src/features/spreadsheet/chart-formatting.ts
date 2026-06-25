import type { ChartDefinition, ChartFormat } from "@/features/workbooks/types";

export const chartColorSwatches = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#111827",
  "#64748b",
] as const;

export type ChartFormatUpdate = Partial<ChartFormat>;
export type EffectiveChartFormat = ReturnType<typeof getEffectiveChartFormat>;

export function getEffectiveChartFormat(chart: ChartDefinition): Required<
  Omit<
    ChartFormat,
    | "axisBounds"
    | "axisTitles"
    | "dataTable"
    | "errorBars"
    | "primaryColor"
    | "secondaryColor"
    | "series"
    | "threeDimensional"
    | "trendline"
  >
> & {
  axisBounds: NonNullable<ChartFormat["axisBounds"]>;
  axisTitles: Required<NonNullable<ChartFormat["axisTitles"]>>;
  dataTable: {
    enabled: boolean;
    showLegendKeys: boolean;
  };
  errorBars: {
    enabled: boolean;
    type: "fixed" | "percentage";
    value: number;
  };
  primaryColor?: string;
  secondaryColor?: string;
  series: NonNullable<ChartFormat["series"]>;
  threeDimensional: {
    depthPercent: number;
    enabled: boolean;
    perspective: number;
    rightAngleAxes: boolean;
    rotationX: number;
    rotationY: number;
  };
  trendline: {
    displayEquation: boolean;
    enabled: boolean;
    type: "linear";
  };
} {
  const showErrorBars = chart.format?.errorBars?.enabled ?? chart.format?.showErrorBars ?? false;
  const showTrendline =
    chart.format?.trendline?.enabled ?? chart.format?.showTrendline ?? false;

  return {
    axisBounds: {
      categoryMax: chart.format?.axisBounds?.categoryMax,
      categoryMin: chart.format?.axisBounds?.categoryMin,
      secondaryValueMax: chart.format?.axisBounds?.secondaryValueMax,
      secondaryValueMin: chart.format?.axisBounds?.secondaryValueMin,
      valueMax: chart.format?.axisBounds?.valueMax,
      valueMin: chart.format?.axisBounds?.valueMin,
    },
    axisTitles: {
      category: chart.format?.axisTitles?.category ?? "",
      secondaryValue: chart.format?.axisTitles?.secondaryValue ?? "",
      value: chart.format?.axisTitles?.value ?? "",
    },
    dataLabelPosition: chart.format?.dataLabelPosition ?? "outside",
    dataTable: {
      enabled: chart.format?.dataTable?.enabled ?? false,
      showLegendKeys: chart.format?.dataTable?.showLegendKeys ?? true,
    },
    errorBars: {
      enabled: showErrorBars,
      type: chart.format?.errorBars?.type ?? "percentage",
      value: chart.format?.errorBars?.value ?? 8,
    },
    legendPosition: chart.format?.legendPosition ?? "bottom",
    lineStyle: chart.format?.lineStyle ?? "solid",
    markerStyle: chart.format?.markerStyle ?? "circle",
    primaryColor: chart.format?.primaryColor,
    secondaryAxis: chart.format?.secondaryAxis ?? false,
    secondaryColor: chart.format?.secondaryColor,
    series: chart.format?.series ?? [],
    showErrorBars,
    showGridlines: chart.format?.showGridlines ?? true,
    showTrendline,
    threeDimensional: {
      enabled: chart.format?.threeDimensional?.enabled ?? false,
      depthPercent: chart.format?.threeDimensional?.depthPercent ?? 100,
      perspective: chart.format?.threeDimensional?.perspective ?? 30,
      rightAngleAxes: chart.format?.threeDimensional?.rightAngleAxes ?? false,
      rotationX: chart.format?.threeDimensional?.rotationX ?? 20,
      rotationY: chart.format?.threeDimensional?.rotationY ?? 20,
    },
    trendline: {
      displayEquation: chart.format?.trendline?.displayEquation ?? false,
      enabled: showTrendline,
      type: "linear",
    },
  };
}

export function mergeChartFormat(
  currentFormat: ChartFormat | undefined,
  updates: ChartFormatUpdate,
) {
  const axisTitles =
    updates.axisTitles || currentFormat?.axisTitles
      ? {
          ...(currentFormat?.axisTitles ?? {}),
          ...(updates.axisTitles ?? {}),
        }
      : undefined;
  const nextFormat: ChartFormat = {
    ...(currentFormat ?? {}),
    ...updates,
    axisTitles,
  };

  return pruneChartFormat(nextFormat);
}

export function normalizeChartFormat(value: unknown): ChartFormat | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const candidate = value as ChartFormat;

  return pruneChartFormat({
    axisBounds: normalizeAxisBounds(candidate.axisBounds),
    axisTitles: normalizeAxisTitles(candidate.axisTitles),
    dataLabelPosition:
      candidate.dataLabelPosition === "inside" ||
      candidate.dataLabelPosition === "outside"
        ? candidate.dataLabelPosition
        : undefined,
    dataTable: normalizeDataTable(candidate.dataTable),
    errorBars: normalizeErrorBars(candidate.errorBars, candidate.showErrorBars),
    legendPosition:
      candidate.legendPosition === "bottom" || candidate.legendPosition === "right"
        ? candidate.legendPosition
        : undefined,
    lineStyle:
      candidate.lineStyle === "solid" || candidate.lineStyle === "dashed"
        ? candidate.lineStyle
        : undefined,
    markerStyle:
      candidate.markerStyle === "circle" ||
      candidate.markerStyle === "square" ||
      candidate.markerStyle === "none"
        ? candidate.markerStyle
        : undefined,
    primaryColor: normalizeChartColor(candidate.primaryColor),
    secondaryAxis: candidate.secondaryAxis === true ? true : undefined,
    secondaryColor: normalizeChartColor(candidate.secondaryColor),
    series: normalizeChartSeries(candidate.series),
    showGridlines: candidate.showGridlines === false ? false : undefined,
    trendline: normalizeTrendline(candidate.trendline, candidate.showTrendline),
    threeDimensional: normalizeThreeDimensional(candidate.threeDimensional),
  });
}

function normalizeAxisBounds(
  axisBounds: ChartFormat["axisBounds"],
): ChartFormat["axisBounds"] {
  if (typeof axisBounds !== "object" || axisBounds === null) {
    return undefined;
  }

  return {
    categoryMax: normalizeOptionalNumber(axisBounds.categoryMax),
    categoryMin: normalizeOptionalNumber(axisBounds.categoryMin),
    secondaryValueMax: normalizeOptionalNumber(axisBounds.secondaryValueMax),
    secondaryValueMin: normalizeOptionalNumber(axisBounds.secondaryValueMin),
    valueMax: normalizeOptionalNumber(axisBounds.valueMax),
    valueMin: normalizeOptionalNumber(axisBounds.valueMin),
  };
}

function normalizeAxisTitles(
  axisTitles: ChartFormat["axisTitles"],
): ChartFormat["axisTitles"] {
  if (typeof axisTitles !== "object" || axisTitles === null) {
    return undefined;
  }

  return {
    category: normalizeChartText(axisTitles.category, 60),
    secondaryValue: normalizeChartText(axisTitles.secondaryValue, 60),
    value: normalizeChartText(axisTitles.value, 60),
  };
}

function normalizeChartText(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : undefined;
}

function normalizeChartColor(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized : undefined;
}

function normalizeDataTable(
  value: ChartFormat["dataTable"],
): ChartFormat["dataTable"] {
  if (typeof value !== "object" || value === null || value.enabled !== true) {
    return undefined;
  }

  return {
    enabled: true,
    showLegendKeys: value.showLegendKeys === false ? false : undefined,
  };
}

function normalizeErrorBars(
  value: ChartFormat["errorBars"],
  legacyEnabled: ChartFormat["showErrorBars"],
): ChartFormat["errorBars"] {
  if (
    (typeof value !== "object" || value === null || value.enabled !== true) &&
    legacyEnabled !== true
  ) {
    return undefined;
  }

  return {
    enabled: true,
    type: value?.type === "fixed" ? "fixed" : "percentage",
    value: normalizeNumber(value?.value, value?.type === "fixed" ? 0 : 1, 100),
  };
}

function normalizeChartSeries(
  value: ChartFormat["series"],
): ChartFormat["series"] {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const series = value.flatMap((item) => {
    if (typeof item !== "object" || item === null || typeof item.id !== "string") {
      return [];
    }

    const id = item.id.trim().slice(0, 80);

    if (!id) {
      return [];
    }

    return [
      {
        id,
        axis:
          item.axis === "primary" || item.axis === "secondary"
            ? item.axis
            : undefined,
        chartType:
          item.chartType === "area" ||
          item.chartType === "bar" ||
          item.chartType === "line"
            ? item.chartType
            : undefined,
        color: normalizeChartColor(item.color),
        hidden: item.hidden === true ? true : undefined,
        name: normalizeChartText(item.name, 60),
      },
    ];
  });

  return series.length ? series.slice(0, 16) : undefined;
}

function normalizeThreeDimensional(
  value: ChartFormat["threeDimensional"],
): ChartFormat["threeDimensional"] {
  if (typeof value !== "object" || value === null || value.enabled !== true) {
    return undefined;
  }

  return {
    enabled: true,
    depthPercent: normalizeNumber(value.depthPercent, 20, 500),
    perspective: normalizeNumber(value.perspective, 0, 240),
    rightAngleAxes: value.rightAngleAxes === true ? true : undefined,
    rotationX: normalizeNumber(value.rotationX, -90, 90),
    rotationY: normalizeNumber(value.rotationY, -90, 90),
  };
}

function normalizeNumber(value: unknown, min: number, max: number) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return undefined;
  }

  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function normalizeOptionalNumber(value: unknown) {
  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : undefined;
}

function normalizeTrendline(
  value: ChartFormat["trendline"],
  legacyEnabled: ChartFormat["showTrendline"],
): ChartFormat["trendline"] {
  if (
    (typeof value !== "object" || value === null || value.enabled !== true) &&
    legacyEnabled !== true
  ) {
    return undefined;
  }

  return {
    displayEquation: value?.displayEquation === true ? true : undefined,
    enabled: true,
    type: "linear",
  };
}

function pruneChartFormat(format: ChartFormat) {
  const nextFormat: ChartFormat = {};
  const axisBounds = normalizeAxisBounds(format.axisBounds);
  const axisTitles = {
    category: normalizeChartText(format.axisTitles?.category, 60),
    secondaryValue: normalizeChartText(format.axisTitles?.secondaryValue, 60),
    value: normalizeChartText(format.axisTitles?.value, 60),
  };

  if (
    axisBounds &&
    Object.values(axisBounds).some((value) => value !== undefined)
  ) {
    nextFormat.axisBounds = axisBounds;
  }

  if (
    axisTitles.category ||
    axisTitles.secondaryValue ||
    axisTitles.value
  ) {
    nextFormat.axisTitles = axisTitles;
  }

  if (format.dataLabelPosition && format.dataLabelPosition !== "outside") {
    nextFormat.dataLabelPosition = format.dataLabelPosition;
  }

  if (format.dataTable?.enabled) {
    nextFormat.dataTable = normalizeDataTable(format.dataTable);
  }

  if (format.errorBars?.enabled || format.showErrorBars) {
    nextFormat.errorBars = normalizeErrorBars(
      format.errorBars,
      format.showErrorBars,
    );
  }

  if (format.legendPosition && format.legendPosition !== "bottom") {
    nextFormat.legendPosition = format.legendPosition;
  }

  if (format.lineStyle && format.lineStyle !== "solid") {
    nextFormat.lineStyle = format.lineStyle;
  }

  if (format.markerStyle && format.markerStyle !== "circle") {
    nextFormat.markerStyle = format.markerStyle;
  }

  if (format.primaryColor) {
    nextFormat.primaryColor = normalizeChartColor(format.primaryColor);
  }

  if (format.secondaryAxis) {
    nextFormat.secondaryAxis = true;
  }

  if (format.secondaryColor) {
    nextFormat.secondaryColor = normalizeChartColor(format.secondaryColor);
  }

  const series = normalizeChartSeries(format.series);

  if (series) {
    nextFormat.series = series;
  }

  if (format.showGridlines === false) {
    nextFormat.showGridlines = false;
  }

  const trendline = normalizeTrendline(
    format.trendline,
    format.showTrendline,
  );

  if (trendline) {
    nextFormat.trendline = trendline;
  }

  if (format.threeDimensional?.enabled) {
    nextFormat.threeDimensional = normalizeThreeDimensional(
      format.threeDimensional,
    );
  }

  return Object.keys(nextFormat).length > 0 ? nextFormat : undefined;
}
