import type { SheetData } from "@/features/workbooks/types";
import { MAX_COLUMNS, MAX_ROWS } from "@/features/spreadsheet/state/constants";
import {
  shiftOutlineGroupsForDeletedIndexes,
  shiftOutlineGroupsForInsertedIndexes,
} from "@/features/spreadsheet/state/outline-state";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";
import {
  remapCells,
  remapIndexes,
  shiftColumnWidths,
  shiftMergedCellsForDeletedColumns,
  shiftMergedCellsForDeletedRows,
  shiftMergedCellsForInsertedColumns,
  shiftMergedCellsForInsertedRows,
} from "@/features/spreadsheet/state/sheet-transforms";

export function setSheetColumnWidth(
  sheet: SheetData,
  columnIndex: number,
  width: number,
) {
  const nextWidth = Math.min(Math.max(Math.round(width), 72), 360);

  sheet.columnWidths[String(columnIndex)] = nextWidth;
}

export function getRowsInRange(range: CellRange) {
  return Array.from(
    { length: range.endRowIndex - range.startRowIndex + 1 },
    (_, offset) => range.startRowIndex + offset,
  );
}

export function getColumnsInRange(range: CellRange) {
  return Array.from(
    { length: range.endColumnIndex - range.startColumnIndex + 1 },
    (_, offset) => range.startColumnIndex + offset,
  );
}

export function getHiddenRowsAfterHiding(
  sheet: SheetData,
  range: CellRange,
) {
  const selectedRows = getRowsInRange(range);

  if (selectedRows.length >= sheet.rowCount) {
    return null;
  }

  const hiddenRows = new Set([...(sheet.hiddenRows ?? []), ...selectedRows]);

  if (hiddenRows.size >= sheet.rowCount) {
    return null;
  }

  return Array.from(hiddenRows).sort((left, right) => left - right);
}

export function getHiddenColumnsAfterHiding(
  sheet: SheetData,
  range: CellRange,
) {
  const selectedColumns = getColumnsInRange(range);

  if (selectedColumns.length >= sheet.columnCount) {
    return null;
  }

  const hiddenColumns = new Set([
    ...(sheet.hiddenColumns ?? []),
    ...selectedColumns,
  ]);

  if (hiddenColumns.size >= sheet.columnCount) {
    return null;
  }

  return Array.from(hiddenColumns).sort((left, right) => left - right);
}

export function hideRowsInRange(sheet: SheetData, range: CellRange) {
  const hiddenRows = getHiddenRowsAfterHiding(sheet, range);

  if (hiddenRows) {
    sheet.hiddenRows = hiddenRows;
  }
}

export function hideColumnsInRange(sheet: SheetData, range: CellRange) {
  const hiddenColumns = getHiddenColumnsAfterHiding(sheet, range);

  if (hiddenColumns) {
    sheet.hiddenColumns = hiddenColumns;
  }
}

export function unhideSheetRowsAndColumns(sheet: SheetData) {
  sheet.hiddenRows = [];
  sheet.hiddenColumns = [];
}

export function insertRowsForRange(sheet: SheetData, range: CellRange) {
  const requestedCount = range.endRowIndex - range.startRowIndex + 1;
  const count = Math.min(requestedCount, MAX_ROWS - sheet.rowCount);

  if (count <= 0) {
    return;
  }

  const insertAt = range.startRowIndex;
  sheet.rowCount += count;
  remapCells(sheet, (rowIndex, columnIndex) => ({
    rowIndex: rowIndex >= insertAt ? rowIndex + count : rowIndex,
    columnIndex,
  }));
  sheet.hiddenRows = remapIndexes(
    sheet.hiddenRows ?? [],
    (rowIndex) => (rowIndex >= insertAt ? rowIndex + count : rowIndex),
    sheet.rowCount,
  );
  sheet.rowGroups = shiftOutlineGroupsForInsertedIndexes(
    sheet.rowGroups ?? [],
    insertAt,
    count,
    sheet.rowCount,
  );
  sheet.mergedCells = shiftMergedCellsForInsertedRows(
    sheet.mergedCells ?? [],
    insertAt,
    count,
  );
}

export function deleteRowsForRange(sheet: SheetData, range: CellRange) {
  const count = range.endRowIndex - range.startRowIndex + 1;
  const deleteStart = range.startRowIndex;
  const deleteEnd = range.endRowIndex;

  remapCells(sheet, (rowIndex, columnIndex) => {
    if (rowIndex >= deleteStart && rowIndex <= deleteEnd) {
      return null;
    }

    return {
      rowIndex: rowIndex > deleteEnd ? rowIndex - count : rowIndex,
      columnIndex,
    };
  });
  sheet.rowCount = Math.max(1, sheet.rowCount - count);
  sheet.hiddenRows = remapIndexes(
    sheet.hiddenRows ?? [],
    (rowIndex) => {
      if (rowIndex >= deleteStart && rowIndex <= deleteEnd) {
        return null;
      }

      return rowIndex > deleteEnd ? rowIndex - count : rowIndex;
    },
    sheet.rowCount,
  );
  sheet.rowGroups = shiftOutlineGroupsForDeletedIndexes(
    sheet.rowGroups ?? [],
    deleteStart,
    deleteEnd,
    count,
    sheet.rowCount,
  );
  sheet.mergedCells = shiftMergedCellsForDeletedRows(
    sheet.mergedCells ?? [],
    deleteStart,
    deleteEnd,
    count,
  );
}

export function insertColumnsForRange(sheet: SheetData, range: CellRange) {
  const requestedCount = range.endColumnIndex - range.startColumnIndex + 1;
  const count = Math.min(requestedCount, MAX_COLUMNS - sheet.columnCount);

  if (count <= 0) {
    return;
  }

  const insertAt = range.startColumnIndex;
  sheet.columnCount += count;
  remapCells(sheet, (rowIndex, columnIndex) => ({
    rowIndex,
    columnIndex: columnIndex >= insertAt ? columnIndex + count : columnIndex,
  }));
  shiftColumnWidths(sheet, (columnIndex) =>
    columnIndex >= insertAt ? columnIndex + count : columnIndex,
  );
  sheet.hiddenColumns = remapIndexes(
    sheet.hiddenColumns ?? [],
    (columnIndex) =>
      columnIndex >= insertAt ? columnIndex + count : columnIndex,
    sheet.columnCount,
  );
  sheet.columnGroups = shiftOutlineGroupsForInsertedIndexes(
    sheet.columnGroups ?? [],
    insertAt,
    count,
    sheet.columnCount,
  );
  sheet.mergedCells = shiftMergedCellsForInsertedColumns(
    sheet.mergedCells ?? [],
    insertAt,
    count,
  );
}

export function deleteColumnsForRange(sheet: SheetData, range: CellRange) {
  const count = range.endColumnIndex - range.startColumnIndex + 1;
  const deleteStart = range.startColumnIndex;
  const deleteEnd = range.endColumnIndex;

  remapCells(sheet, (rowIndex, columnIndex) => {
    if (columnIndex >= deleteStart && columnIndex <= deleteEnd) {
      return null;
    }

    return {
      rowIndex,
      columnIndex: columnIndex > deleteEnd ? columnIndex - count : columnIndex,
    };
  });
  shiftColumnWidths(sheet, (columnIndex) => {
    if (columnIndex >= deleteStart && columnIndex <= deleteEnd) {
      return null;
    }

    return columnIndex > deleteEnd ? columnIndex - count : columnIndex;
  });
  sheet.columnCount = Math.max(1, sheet.columnCount - count);
  sheet.hiddenColumns = remapIndexes(
    sheet.hiddenColumns ?? [],
    (columnIndex) => {
      if (columnIndex >= deleteStart && columnIndex <= deleteEnd) {
        return null;
      }

      return columnIndex > deleteEnd ? columnIndex - count : columnIndex;
    },
    sheet.columnCount,
  );
  sheet.columnGroups = shiftOutlineGroupsForDeletedIndexes(
    sheet.columnGroups ?? [],
    deleteStart,
    deleteEnd,
    count,
    sheet.columnCount,
  );
  sheet.mergedCells = shiftMergedCellsForDeletedColumns(
    sheet.mergedCells ?? [],
    deleteStart,
    deleteEnd,
    count,
  );
}
