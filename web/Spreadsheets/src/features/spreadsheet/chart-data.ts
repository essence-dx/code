import { cellKey } from "@/features/workbooks/addresses";
import type {
  ChartDefinition,
  SheetData,
} from "@/features/workbooks/types";

export type ChartPoint = {
  label: string;
  value: number;
};

export type ScatterPoint = {
  label: string;
  x: number;
  y: number;
};

export type BubblePoint = ScatterPoint & {
  size: number;
};

export type ComboPoint = {
  label: string;
  columnValue: number;
  lineValue: number;
};

export type StockPoint = {
  label: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type LinearTrendline = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  slope: number;
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

export function getChartPoints(
  sheet: SheetData,
  computedValues: Record<string, string>,
  chart: ChartDefinition,
) {
  const points: ChartPoint[] = [];
  const hasLabelColumn = chart.range.endColumnIndex > chart.range.startColumnIndex;
  const valueColumnIndex = hasLabelColumn
    ? chart.range.startColumnIndex + 1
    : chart.range.startColumnIndex;

  for (
    let rowIndex = chart.range.startRowIndex;
    rowIndex <= chart.range.endRowIndex;
    rowIndex += 1
  ) {
    const labelKey = cellKey(rowIndex, chart.range.startColumnIndex);
    const valueKey = cellKey(rowIndex, valueColumnIndex);
    const rawValue = computedValues[valueKey] ?? sheet.cells[valueKey]?.raw ?? "";
    const numericValue = parseNumericValue(rawValue);

    if (numericValue === null) {
      continue;
    }

    points.push({
      label: hasLabelColumn
        ? computedValues[labelKey] || sheet.cells[labelKey]?.raw || `Row ${rowIndex + 1}`
        : `Row ${rowIndex + 1}`,
      value: numericValue,
    });
  }

  return points.slice(0, 24);
}

export function getScatterPoints(
  sheet: SheetData,
  computedValues: Record<string, string>,
  chart: ChartDefinition,
) {
  const points: ScatterPoint[] = [];
  const xColumnIndex = chart.range.startColumnIndex;
  const yColumnIndex = Math.min(
    chart.range.startColumnIndex + 1,
    chart.range.endColumnIndex,
  );

  if (xColumnIndex === yColumnIndex) {
    return points;
  }

  for (
    let rowIndex = chart.range.startRowIndex;
    rowIndex <= chart.range.endRowIndex;
    rowIndex += 1
  ) {
    const x = parseNumericValue(
      getCellValue(sheet, computedValues, rowIndex, xColumnIndex),
    );
    const y = parseNumericValue(
      getCellValue(sheet, computedValues, rowIndex, yColumnIndex),
    );

    if (x === null || y === null) {
      continue;
    }

    points.push({
      label: `Row ${rowIndex + 1}`,
      x,
      y,
    });
  }

  return points.slice(0, 60);
}

export function getBubblePoints(
  sheet: SheetData,
  computedValues: Record<string, string>,
  chart: ChartDefinition,
) {
  const points: BubblePoint[] = [];
  const xColumnIndex = chart.range.startColumnIndex;
  const yColumnIndex = chart.range.startColumnIndex + 1;
  const sizeColumnIndex = chart.range.startColumnIndex + 2;

  if (sizeColumnIndex > chart.range.endColumnIndex) {
    return points;
  }

  for (
    let rowIndex = chart.range.startRowIndex;
    rowIndex <= chart.range.endRowIndex;
    rowIndex += 1
  ) {
    const x = parseNumericValue(
      getCellValue(sheet, computedValues, rowIndex, xColumnIndex),
    );
    const y = parseNumericValue(
      getCellValue(sheet, computedValues, rowIndex, yColumnIndex),
    );
    const size = parseNumericValue(
      getCellValue(sheet, computedValues, rowIndex, sizeColumnIndex),
    );

    if (x === null || y === null || size === null || size <= 0) {
      continue;
    }

    points.push({
      label: `Row ${rowIndex + 1}`,
      x,
      y,
      size,
    });
  }

  return points.slice(0, 60);
}

export function getComboPoints(
  sheet: SheetData,
  computedValues: Record<string, string>,
  chart: ChartDefinition,
) {
  const points: ComboPoint[] = [];
  const labelColumnIndex = chart.range.startColumnIndex;
  const columnValueIndex = chart.range.startColumnIndex + 1;
  const lineValueIndex = chart.range.startColumnIndex + 2;

  if (lineValueIndex > chart.range.endColumnIndex) {
    return points;
  }

  for (
    let rowIndex = chart.range.startRowIndex;
    rowIndex <= chart.range.endRowIndex;
    rowIndex += 1
  ) {
    const columnValue = parseNumericValue(
      getCellValue(sheet, computedValues, rowIndex, columnValueIndex),
    );
    const lineValue = parseNumericValue(
      getCellValue(sheet, computedValues, rowIndex, lineValueIndex),
    );

    if (columnValue === null || lineValue === null) {
      continue;
    }

    points.push({
      label:
        getCellValue(sheet, computedValues, rowIndex, labelColumnIndex) ||
        `Row ${rowIndex + 1}`,
      columnValue,
      lineValue,
    });
  }

  return points.slice(0, 24);
}

export function getStockPoints(
  sheet: SheetData,
  computedValues: Record<string, string>,
  chart: ChartDefinition,
) {
  const points: StockPoint[] = [];
  const hasLabelColumn =
    chart.range.endColumnIndex - chart.range.startColumnIndex >= 4;
  const openColumnIndex = hasLabelColumn
    ? chart.range.startColumnIndex + 1
    : chart.range.startColumnIndex;
  const highColumnIndex = openColumnIndex + 1;
  const lowColumnIndex = openColumnIndex + 2;
  const closeColumnIndex = openColumnIndex + 3;

  if (closeColumnIndex > chart.range.endColumnIndex) {
    return points;
  }

  for (
    let rowIndex = chart.range.startRowIndex;
    rowIndex <= chart.range.endRowIndex;
    rowIndex += 1
  ) {
    const open = parseNumericValue(
      getCellValue(sheet, computedValues, rowIndex, openColumnIndex),
    );
    const high = parseNumericValue(
      getCellValue(sheet, computedValues, rowIndex, highColumnIndex),
    );
    const low = parseNumericValue(
      getCellValue(sheet, computedValues, rowIndex, lowColumnIndex),
    );
    const close = parseNumericValue(
      getCellValue(sheet, computedValues, rowIndex, closeColumnIndex),
    );

    if (open === null || high === null || low === null || close === null) {
      continue;
    }

    points.push({
      label: hasLabelColumn
        ? getCellValue(sheet, computedValues, rowIndex, chart.range.startColumnIndex) ||
          `Row ${rowIndex + 1}`
        : `Row ${rowIndex + 1}`,
      open,
      high: Math.max(open, high, low, close),
      low: Math.min(open, high, low, close),
      close,
    });
  }

  return points.slice(0, 24);
}

export function getLinearTrendline(points: ScatterPoint[]) {
  if (points.length < 2) {
    return null;
  }

  const xMean =
    points.reduce((total, point) => total + point.x, 0) / points.length;
  const yMean =
    points.reduce((total, point) => total + point.y, 0) / points.length;
  const denominator = points.reduce(
    (total, point) => total + (point.x - xMean) ** 2,
    0,
  );

  if (denominator === 0) {
    return null;
  }

  const slope =
    points.reduce(
      (total, point) => total + (point.x - xMean) * (point.y - yMean),
      0,
    ) / denominator;
  const intercept = yMean - slope * xMean;
  const xValues = points.map((point) => point.x);
  const startX = Math.min(...xValues);
  const endX = Math.max(...xValues);

  return {
    startX,
    startY: slope * startX + intercept,
    endX,
    endY: slope * endX + intercept,
    slope,
  } satisfies LinearTrendline;
}
