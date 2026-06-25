import { cellKey, columnLabel } from "@/features/workbooks/addresses";
import {
  forEachCellInRange,
  type CellRange,
} from "@/features/spreadsheet/state/selection-state";
import { getActiveSheet } from "@/features/spreadsheet/state/document-state";
import { parseNumericCellValue } from "@/features/spreadsheet/analysis-toolpak-statistics";
import type {
  CellStyle,
  ChartRange,
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";

const headerStyle: CellStyle = {
  background: "#dbeafe",
  bold: true,
  foreground: "#1e3a8a",
};

const labelStyle: CellStyle = {
  bold: true,
  foreground: "#334155",
};

export function getNumericValuesFromRange({
  computedValues,
  range,
  sheet,
}: {
  computedValues: Record<string, string>;
  range: CellRange;
  sheet: SheetData;
}) {
  const values: number[] = [];

  forEachCellInRange(range, (rowIndex, columnIndex) => {
    const key = cellKey(rowIndex, columnIndex);
    const textValue = computedValues[key] ?? sheet.cells[key]?.raw ?? "";
    const numericValue = parseNumericCellValue(textValue);

    if (numericValue !== null) {
      values.push(numericValue);
    }
  });

  return values;
}

export type NumericColumnSeries = {
  label: string;
  valuesByRow: (number | null)[];
};

export function getNumericColumnSeriesFromRange({
  computedValues,
  range,
  sheet,
}: {
  computedValues: Record<string, string>;
  range: CellRange;
  sheet: SheetData;
}) {
  const columns: NumericColumnSeries[] = [];

  for (
    let columnIndex = range.startColumnIndex;
    columnIndex <= range.endColumnIndex;
    columnIndex += 1
  ) {
    const valuesByRow: (number | null)[] = [];

    for (
      let rowIndex = range.startRowIndex;
      rowIndex <= range.endRowIndex;
      rowIndex += 1
    ) {
      const key = cellKey(rowIndex, columnIndex);
      const textValue = computedValues[key] ?? sheet.cells[key]?.raw ?? "";

      valuesByRow.push(parseNumericCellValue(textValue));
    }

    if (valuesByRow.some((value) => value !== null)) {
      columns.push({
        label: `Column ${columnLabel(columnIndex)}`,
        valuesByRow,
      });
    }
  }

  return columns;
}

export function createAnalysisOutputRange(
  sheet: SheetData,
  sourceRange: CellRange,
  rowCount: number,
  columnCount: number,
): ChartRange | null {
  const rightStartColumnIndex = sourceRange.endColumnIndex + 2;
  const endColumnOffset = columnCount - 1;

  if (
    rightStartColumnIndex + endColumnOffset < sheet.columnCount &&
    sourceRange.startRowIndex + rowCount < sheet.rowCount
  ) {
    return {
      startRowIndex: sourceRange.startRowIndex,
      startColumnIndex: rightStartColumnIndex,
      endRowIndex: sourceRange.startRowIndex + rowCount,
      endColumnIndex: rightStartColumnIndex + endColumnOffset,
    };
  }

  if (
    sourceRange.endRowIndex + 2 + rowCount >= sheet.rowCount ||
    sourceRange.startColumnIndex + endColumnOffset >= sheet.columnCount
  ) {
    return null;
  }

  return {
    startRowIndex: sourceRange.endRowIndex + 2,
    startColumnIndex: sourceRange.startColumnIndex,
    endRowIndex: sourceRange.endRowIndex + 2 + rowCount,
    endColumnIndex: sourceRange.startColumnIndex + endColumnOffset,
  };
}

export function writeAnalysisTableToDocument({
  document,
  headers,
  outputRange,
  rows,
}: {
  document: WorkbookDocument;
  headers: string[];
  outputRange: ChartRange;
  rows: string[][];
}) {
  const sheet = getActiveSheet(document);
  const startRowIndex = outputRange.startRowIndex;
  const startColumnIndex = outputRange.startColumnIndex;

  headers.forEach((header, columnOffset) => {
    sheet.cells[cellKey(startRowIndex, startColumnIndex + columnOffset)] = {
      raw: header,
      style: headerStyle,
    };
  });

  rows.forEach((row, rowOffset) => {
    const rowIndex = startRowIndex + rowOffset + 1;

    row.forEach((value, columnOffset) => {
      sheet.cells[cellKey(rowIndex, startColumnIndex + columnOffset)] = {
        raw: value,
        style: columnOffset === 0 ? labelStyle : undefined,
      };
    });
  });

  return outputRange;
}
