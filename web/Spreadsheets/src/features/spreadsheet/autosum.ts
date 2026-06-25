import { cellKey } from "@/features/workbooks/addresses";
import type { CellSelection } from "@/features/spreadsheet/state/selection-state";
import type { SheetData } from "@/features/workbooks/types";

function numericCellValue(
  sheet: SheetData,
  computedValues: Record<string, string>,
  rowIndex: number,
  columnIndex: number,
) {
  const key = cellKey(rowIndex, columnIndex);
  const value = computedValues[key] ?? sheet.cells[key]?.raw ?? "";
  const normalized = String(value).replace(/[$,%\s,]/g, "");
  const numeric = Number(normalized);

  return Number.isFinite(numeric) && normalized !== "" ? numeric : null;
}

function contiguousNumericRangeAbove(
  sheet: SheetData,
  computedValues: Record<string, string>,
  selection: CellSelection,
) {
  let startRowIndex = selection.rowIndex;
  let endRowIndex = selection.rowIndex - 1;

  for (let rowIndex = selection.rowIndex - 1; rowIndex >= 0; rowIndex -= 1) {
    if (
      numericCellValue(sheet, computedValues, rowIndex, selection.columnIndex) ===
      null
    ) {
      break;
    }

    startRowIndex = rowIndex;
  }

  return startRowIndex <= endRowIndex
    ? {
        startKey: cellKey(startRowIndex, selection.columnIndex),
        endKey: cellKey(endRowIndex, selection.columnIndex),
      }
    : null;
}

function contiguousNumericRangeLeft(
  sheet: SheetData,
  computedValues: Record<string, string>,
  selection: CellSelection,
) {
  let startColumnIndex = selection.columnIndex;
  let endColumnIndex = selection.columnIndex - 1;

  for (
    let columnIndex = selection.columnIndex - 1;
    columnIndex >= 0;
    columnIndex -= 1
  ) {
    if (
      numericCellValue(sheet, computedValues, selection.rowIndex, columnIndex) ===
      null
    ) {
      break;
    }

    startColumnIndex = columnIndex;
  }

  return startColumnIndex <= endColumnIndex
    ? {
        startKey: cellKey(selection.rowIndex, startColumnIndex),
        endKey: cellKey(selection.rowIndex, endColumnIndex),
      }
    : null;
}

export function createAutoSumFormula({
  computedValues,
  selection,
  sheet,
}: {
  computedValues: Record<string, string>;
  selection: CellSelection;
  sheet: SheetData;
}) {
  const range =
    contiguousNumericRangeAbove(sheet, computedValues, selection) ??
    contiguousNumericRangeLeft(sheet, computedValues, selection);

  if (!range) {
    return null;
  }

  return range.startKey === range.endKey
    ? `=SUM(${range.startKey})`
    : `=SUM(${range.startKey}:${range.endKey})`;
}
