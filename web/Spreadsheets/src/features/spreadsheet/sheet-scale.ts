import { columnLabel, parseCellKey } from "@/features/workbooks/addresses";
import type { SheetData, SheetScaleMode } from "@/features/workbooks/types";

export const EXCEL_MAX_ROWS = 1_048_576;
export const EXCEL_MAX_COLUMNS = 16_384;
export const STANDARD_SHEET_ROWS = 1_000;
export const STANDARD_SHEET_COLUMNS = 52;
export const MATERIALIZED_ROW_LIMIT = 5_000;
export const MATERIALIZED_COLUMN_LIMIT = 100;

export type SheetBounds = {
  startRowIndex: number;
  startColumnIndex: number;
  endRowIndex: number;
  endColumnIndex: number;
};

export type SheetScaleSummary = {
  mode: SheetScaleMode;
  totalRows: number;
  totalColumns: number;
  cellSlots: number;
  populatedCells: number;
  usedRangeLabel: string;
  exportRowCount: number;
  exportColumnCount: number;
  exportsUseUsedRange: boolean;
};

export function clampSheetRowCount(
  value: unknown,
  fallback = STANDARD_SHEET_ROWS,
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(Math.floor(parsed), 1), EXCEL_MAX_ROWS);
}

export function clampSheetColumnCount(
  value: unknown,
  fallback = STANDARD_SHEET_COLUMNS,
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(Math.floor(parsed), 1), EXCEL_MAX_COLUMNS);
}

export function resolveSheetScaleMode({
  scaleMode,
  rowCount,
  columnCount,
}: {
  scaleMode?: SheetScaleMode;
  rowCount: number;
  columnCount: number;
}): SheetScaleMode {
  if (scaleMode === "excel") {
    return "excel";
  }

  return rowCount > MATERIALIZED_ROW_LIMIT ||
    columnCount > MATERIALIZED_COLUMN_LIMIT
    ? "excel"
    : "standard";
}

export function isExcelScaleSheet(sheet: Pick<SheetData, "columnCount" | "rowCount" | "scaleMode">) {
  return (
    sheet.scaleMode === "excel" ||
    sheet.rowCount > MATERIALIZED_ROW_LIMIT ||
    sheet.columnCount > MATERIALIZED_COLUMN_LIMIT
  );
}

export function enableExcelScaleForSheet(sheet: SheetData) {
  sheet.rowCount = EXCEL_MAX_ROWS;
  sheet.columnCount = EXCEL_MAX_COLUMNS;
  sheet.scaleMode = "excel";
}

export function getSheetUsedBounds(sheet: Pick<SheetData, "cells" | "columnCount" | "rowCount">): SheetBounds {
  let minRowIndex = Number.POSITIVE_INFINITY;
  let minColumnIndex = Number.POSITIVE_INFINITY;
  let maxRowIndex = -1;
  let maxColumnIndex = -1;

  for (const [key, cell] of Object.entries(sheet.cells)) {
    if (!cell.raw.trim() && !cell.style && !cell.richTextRuns?.length) {
      continue;
    }

    const position = parseCellKey(key);

    if (
      !position ||
      position.rowIndex >= sheet.rowCount ||
      position.columnIndex >= sheet.columnCount
    ) {
      continue;
    }

    minRowIndex = Math.min(minRowIndex, position.rowIndex);
    minColumnIndex = Math.min(minColumnIndex, position.columnIndex);
    maxRowIndex = Math.max(maxRowIndex, position.rowIndex);
    maxColumnIndex = Math.max(maxColumnIndex, position.columnIndex);
  }

  if (maxRowIndex < 0 || maxColumnIndex < 0) {
    return {
      startRowIndex: 0,
      startColumnIndex: 0,
      endRowIndex: 0,
      endColumnIndex: 0,
    };
  }

  return {
    startRowIndex: minRowIndex,
    startColumnIndex: minColumnIndex,
    endRowIndex: maxRowIndex,
    endColumnIndex: maxColumnIndex,
  };
}

export function getDelimitedExportBounds(sheet: SheetData): SheetBounds {
  if (isExcelScaleSheet(sheet)) {
    return getSheetUsedBounds(sheet);
  }

  return {
    startRowIndex: 0,
    startColumnIndex: 0,
    endRowIndex: Math.max(0, sheet.rowCount - 1),
    endColumnIndex: Math.max(0, sheet.columnCount - 1),
  };
}

export function formatSheetBounds(bounds: SheetBounds) {
  const start = `${columnLabel(bounds.startColumnIndex)}${bounds.startRowIndex + 1}`;
  const end = `${columnLabel(bounds.endColumnIndex)}${bounds.endRowIndex + 1}`;

  return start === end ? start : `${start}:${end}`;
}

export function getSheetScaleSummary(sheet: SheetData): SheetScaleSummary {
  const exportBounds = getDelimitedExportBounds(sheet);
  const exportRowCount =
    exportBounds.endRowIndex - exportBounds.startRowIndex + 1;
  const exportColumnCount =
    exportBounds.endColumnIndex - exportBounds.startColumnIndex + 1;

  return {
    mode: isExcelScaleSheet(sheet) ? "excel" : "standard",
    totalRows: sheet.rowCount,
    totalColumns: sheet.columnCount,
    cellSlots: sheet.rowCount * sheet.columnCount,
    populatedCells: Object.keys(sheet.cells).length,
    usedRangeLabel: formatSheetBounds(getSheetUsedBounds(sheet)),
    exportRowCount,
    exportColumnCount,
    exportsUseUsedRange: isExcelScaleSheet(sheet),
  };
}
