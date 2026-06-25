import { cellKey } from "@/features/workbooks/addresses";
import type {
  ChartDefinition,
  SheetData,
} from "@/features/workbooks/types";
import { getChartPoints } from "@/features/spreadsheet/chart-data";

export type StackedChartPoint = {
  label: string;
  total: number;
  values: Array<{
    series: string;
    value: number;
  }>;
};

export type WaterfallPoint = {
  label: string;
  value: number;
  start: number;
  end: number;
  kind: "increase" | "decrease" | "total";
};

export type HistogramBin = {
  label: string;
  start: number;
  end: number;
  count: number;
};

export type BoxWhiskerPoint = {
  label: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
  count: number;
};

export type HierarchyChartPoint = {
  path: string[];
  label: string;
  value: number;
};

export type SurfaceChartCell = {
  rowLabel: string;
  columnLabel: string;
  value: number;
  rowIndex: number;
  columnIndex: number;
};

function parseNumericValue(value: string) {
  const numericValue = Number(String(value).replace(/[$,%]/g, ""));

  return Number.isFinite(numericValue) ? numericValue : null;
}

function getCellValue(
  sheet: SheetData,
  computedValues: Record<string, string>,
  rowIndex: number,
  columnIndex: number,
) {
  const key = cellKey(rowIndex, columnIndex);

  return computedValues[key] ?? sheet.cells[key]?.raw ?? "";
}

function getNumericCellsInRange(
  sheet: SheetData,
  computedValues: Record<string, string>,
  chart: ChartDefinition,
) {
  const values: number[] = [];

  for (
    let rowIndex = chart.range.startRowIndex;
    rowIndex <= chart.range.endRowIndex;
    rowIndex += 1
  ) {
    for (
      let columnIndex = chart.range.startColumnIndex;
      columnIndex <= chart.range.endColumnIndex;
      columnIndex += 1
    ) {
      const value = parseNumericValue(
        getCellValue(sheet, computedValues, rowIndex, columnIndex),
      );

      if (value !== null) {
        values.push(value);
      }
    }
  }

  return values;
}

function rangeHasHeaderRow(
  sheet: SheetData,
  computedValues: Record<string, string>,
  chart: ChartDefinition,
  firstValueColumnIndex: number,
) {
  if (chart.range.startRowIndex >= chart.range.endRowIndex) {
    return false;
  }

  for (
    let columnIndex = firstValueColumnIndex;
    columnIndex <= chart.range.endColumnIndex;
    columnIndex += 1
  ) {
    const firstRowValue = getCellValue(
      sheet,
      computedValues,
      chart.range.startRowIndex,
      columnIndex,
    );

    if (firstRowValue.trim() && parseNumericValue(firstRowValue) === null) {
      return true;
    }
  }

  return false;
}

export function getStackedChartPoints(
  sheet: SheetData,
  computedValues: Record<string, string>,
  chart: ChartDefinition,
) {
  const points: StackedChartPoint[] = [];
  const hasLabelColumn = chart.range.endColumnIndex > chart.range.startColumnIndex;
  const firstValueColumnIndex = hasLabelColumn
    ? chart.range.startColumnIndex + 1
    : chart.range.startColumnIndex;
  const hasHeader = rangeHasHeaderRow(
    sheet,
    computedValues,
    chart,
    firstValueColumnIndex,
  );
  const firstDataRowIndex = hasHeader
    ? chart.range.startRowIndex + 1
    : chart.range.startRowIndex;
  const seriesNames = Array.from(
    { length: chart.range.endColumnIndex - firstValueColumnIndex + 1 },
    (_, index) => {
      const columnIndex = firstValueColumnIndex + index;
      const header = hasHeader
        ? getCellValue(sheet, computedValues, chart.range.startRowIndex, columnIndex)
        : "";

      return header.trim() || `Series ${index + 1}`;
    },
  ).slice(0, 8);

  for (
    let rowIndex = firstDataRowIndex;
    rowIndex <= chart.range.endRowIndex;
    rowIndex += 1
  ) {
    const values = seriesNames.flatMap((series, index) => {
      const columnIndex = firstValueColumnIndex + index;
      const value = parseNumericValue(
        getCellValue(sheet, computedValues, rowIndex, columnIndex),
      );

      return value === null ? [] : [{ series, value }];
    });
    const total = values.reduce((sum, item) => sum + Math.max(item.value, 0), 0);

    if (values.length === 0) {
      continue;
    }

    points.push({
      label: hasLabelColumn
        ? getCellValue(sheet, computedValues, rowIndex, chart.range.startColumnIndex) ||
          `Row ${rowIndex + 1}`
        : `Row ${rowIndex + 1}`,
      total,
      values,
    });
  }

  return points.slice(0, 24);
}

export function getWaterfallPoints(
  sheet: SheetData,
  computedValues: Record<string, string>,
  chart: ChartDefinition,
) {
  let cumulative = 0;

  return getChartPoints(sheet, computedValues, chart).map((point) => {
    const isTotal = /total|ending|closing/i.test(point.label);
    const start = isTotal ? 0 : cumulative;
    const end = isTotal ? point.value : cumulative + point.value;

    cumulative = end;

    return {
      label: point.label,
      value: point.value,
      start,
      end,
      kind: isTotal ? "total" : point.value >= 0 ? "increase" : "decrease",
    } satisfies WaterfallPoint;
  });
}

export function getHistogramBins(
  sheet: SheetData,
  computedValues: Record<string, string>,
  chart: ChartDefinition,
) {
  const values = getNumericCellsInRange(sheet, computedValues, chart);

  if (values.length === 0) {
    return [];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const binCount = Math.min(Math.max(Math.ceil(Math.sqrt(values.length)), 4), 12);
  const span = max - min || 1;
  const binSize = span / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => {
    const start = min + index * binSize;
    const end = index === binCount - 1 ? max : start + binSize;

    return {
      label: `${start.toFixed(1)}-${end.toFixed(1)}`,
      start,
      end,
      count: 0,
    } satisfies HistogramBin;
  });

  values.forEach((value) => {
    const index =
      value === max ? binCount - 1 : Math.floor((value - min) / binSize);
    const bin = bins[Math.min(Math.max(index, 0), binCount - 1)];

    if (bin) {
      bin.count += 1;
    }
  });

  return bins;
}

function quantile(sortedValues: number[], probability: number) {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = (sortedValues.length - 1) * probability;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  return (
    (sortedValues[lower] ?? 0) * (1 - weight) +
    (sortedValues[upper] ?? sortedValues[lower] ?? 0) * weight
  );
}

export function getBoxWhiskerPoints(
  sheet: SheetData,
  computedValues: Record<string, string>,
  chart: ChartDefinition,
) {
  const hasHeader = rangeHasHeaderRow(
    sheet,
    computedValues,
    chart,
    chart.range.startColumnIndex,
  );
  const firstDataRowIndex = hasHeader
    ? chart.range.startRowIndex + 1
    : chart.range.startRowIndex;
  const points: BoxWhiskerPoint[] = [];

  for (
    let columnIndex = chart.range.startColumnIndex;
    columnIndex <= chart.range.endColumnIndex;
    columnIndex += 1
  ) {
    const values: number[] = [];

    for (
      let rowIndex = firstDataRowIndex;
      rowIndex <= chart.range.endRowIndex;
      rowIndex += 1
    ) {
      const value = parseNumericValue(
        getCellValue(sheet, computedValues, rowIndex, columnIndex),
      );

      if (value !== null) {
        values.push(value);
      }
    }

    if (values.length < 2) {
      continue;
    }

    const sortedValues = [...values].sort((left, right) => left - right);
    const label =
      (hasHeader
        ? getCellValue(sheet, computedValues, chart.range.startRowIndex, columnIndex)
        : "") || `Series ${points.length + 1}`;

    points.push({
      label,
      min: sortedValues[0] ?? 0,
      q1: quantile(sortedValues, 0.25),
      median: quantile(sortedValues, 0.5),
      q3: quantile(sortedValues, 0.75),
      max: sortedValues.at(-1) ?? 0,
      mean: values.reduce((sum, value) => sum + value, 0) / values.length,
      count: values.length,
    });
  }

  return points.slice(0, 8);
}

export function getHierarchyChartPoints(
  sheet: SheetData,
  computedValues: Record<string, string>,
  chart: ChartDefinition,
) {
  const points: HierarchyChartPoint[] = [];

  for (
    let rowIndex = chart.range.startRowIndex;
    rowIndex <= chart.range.endRowIndex;
    rowIndex += 1
  ) {
    let valueColumnIndex = chart.range.endColumnIndex;
    let value = parseNumericValue(
      getCellValue(sheet, computedValues, rowIndex, valueColumnIndex),
    );

    while (value === null && valueColumnIndex > chart.range.startColumnIndex) {
      valueColumnIndex -= 1;
      value = parseNumericValue(
        getCellValue(sheet, computedValues, rowIndex, valueColumnIndex),
      );
    }

    if (value === null || value <= 0) {
      continue;
    }

    const path = Array.from(
      { length: valueColumnIndex - chart.range.startColumnIndex },
      (_, index) =>
        getCellValue(
          sheet,
          computedValues,
          rowIndex,
          chart.range.startColumnIndex + index,
        ).trim(),
    ).filter(Boolean);
    const label = path.at(-1) ?? `Row ${rowIndex + 1}`;

    points.push({
      path: path.length > 0 ? path : [label],
      label,
      value,
    });
  }

  return points.slice(0, 36);
}

export function getSurfaceChartCells(
  sheet: SheetData,
  computedValues: Record<string, string>,
  chart: ChartDefinition,
) {
  const cells: SurfaceChartCell[] = [];
  const hasHeader =
    chart.range.endRowIndex > chart.range.startRowIndex &&
    chart.range.endColumnIndex > chart.range.startColumnIndex;
  const firstDataRowIndex = hasHeader
    ? chart.range.startRowIndex + 1
    : chart.range.startRowIndex;
  const firstDataColumnIndex = hasHeader
    ? chart.range.startColumnIndex + 1
    : chart.range.startColumnIndex;

  for (
    let rowIndex = firstDataRowIndex;
    rowIndex <= chart.range.endRowIndex;
    rowIndex += 1
  ) {
    for (
      let columnIndex = firstDataColumnIndex;
      columnIndex <= chart.range.endColumnIndex;
      columnIndex += 1
    ) {
      const value = parseNumericValue(
        getCellValue(sheet, computedValues, rowIndex, columnIndex),
      );

      if (value === null) {
        continue;
      }

      cells.push({
        rowLabel: hasHeader
          ? getCellValue(sheet, computedValues, rowIndex, chart.range.startColumnIndex) ||
            `Row ${rowIndex + 1}`
          : `Row ${rowIndex + 1}`,
        columnLabel: hasHeader
          ? getCellValue(sheet, computedValues, chart.range.startRowIndex, columnIndex) ||
            `Column ${columnIndex + 1}`
          : `Column ${columnIndex + 1}`,
        value,
        rowIndex: rowIndex - firstDataRowIndex,
        columnIndex: columnIndex - firstDataColumnIndex,
      });
    }
  }

  return cells.slice(0, 144);
}
