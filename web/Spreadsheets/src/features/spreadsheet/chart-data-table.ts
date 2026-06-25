import { cellKey } from "@/features/workbooks/addresses";
import type { ChartDefinition, SheetData } from "@/features/workbooks/types";

export type ChartDataTable = {
  headers: string[];
  rows: Array<{
    label: string;
    values: string[];
  }>;
  truncated: boolean;
};

function cellValue(
  sheet: SheetData,
  computedValues: Record<string, string>,
  rowIndex: number,
  columnIndex: number,
) {
  const key = cellKey(rowIndex, columnIndex);

  return (computedValues[key] ?? sheet.cells[key]?.raw ?? "").trim();
}

export function getChartDataTable({
  chart,
  computedValues,
  maxRows = 8,
  maxSeries = 5,
  sheet,
}: {
  chart: ChartDefinition;
  computedValues: Record<string, string>;
  maxRows?: number;
  maxSeries?: number;
  sheet: SheetData;
}): ChartDataTable {
  const hasHeaderRow = chart.range.endRowIndex > chart.range.startRowIndex;
  const hasLabelColumn = chart.range.endColumnIndex > chart.range.startColumnIndex;
  const firstSeriesColumn = hasLabelColumn
    ? chart.range.startColumnIndex + 1
    : chart.range.startColumnIndex;
  const firstDataRow = hasHeaderRow
    ? chart.range.startRowIndex + 1
    : chart.range.startRowIndex;
  const lastSeriesColumn = Math.min(
    chart.range.endColumnIndex,
    firstSeriesColumn + Math.max(maxSeries, 1) - 1,
  );
  const lastDataRow = Math.min(
    chart.range.endRowIndex,
    firstDataRow + Math.max(maxRows, 1) - 1,
  );
  const headers = Array.from(
    { length: Math.max(lastSeriesColumn - firstSeriesColumn + 1, 0) },
    (_, index) => {
      const columnIndex = firstSeriesColumn + index;
      const header = hasHeaderRow
        ? cellValue(sheet, computedValues, chart.range.startRowIndex, columnIndex)
        : "";

      return header || `Series ${index + 1}`;
    },
  );
  const rows = Array.from(
    { length: Math.max(lastDataRow - firstDataRow + 1, 0) },
    (_, index) => {
      const rowIndex = firstDataRow + index;
      const label = hasLabelColumn
        ? cellValue(sheet, computedValues, rowIndex, chart.range.startColumnIndex)
        : "";

      return {
        label: label || `Row ${rowIndex + 1}`,
        values: headers.map((_, headerIndex) =>
          cellValue(sheet, computedValues, rowIndex, firstSeriesColumn + headerIndex),
        ),
      };
    },
  );

  return {
    headers,
    rows,
    truncated:
      lastDataRow < chart.range.endRowIndex ||
      lastSeriesColumn < chart.range.endColumnIndex,
  };
}
