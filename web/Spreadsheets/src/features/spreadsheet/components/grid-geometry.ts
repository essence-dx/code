import type {
  CellRange,
  CellSelection,
  FillRangeMode,
} from "@/features/spreadsheet/state/selection-state";
import type {
  MergedCellRange,
  SheetData,
} from "@/features/workbooks/types";

export const DEFAULT_COLUMN_WIDTH = 112;
export const MIN_COLUMN_WIDTH = 72;
export const MAX_COLUMN_WIDTH = 360;
export const DEFAULT_ROW_HEIGHT = 32;
export const WRAPPED_ROW_HEIGHT = 72;
export const HEADER_HEIGHT = 32;
export const ROW_HEADER_WIDTH = 48;
export const DEFAULT_FONT_SIZE = 14;

export type VisibleMergeGeometry = {
  anchorRowIndex: number;
  anchorColumnIndex: number;
  columnSpan: number;
  height: number;
};

export function isCellInRange(
  rowIndex: number,
  columnIndex: number,
  range: CellRange,
) {
  return (
    rowIndex >= range.startRowIndex &&
    rowIndex <= range.endRowIndex &&
    columnIndex >= range.startColumnIndex &&
    columnIndex <= range.endColumnIndex
  );
}

export function getFillDragRange(
  sourceRange: CellRange,
  target: CellSelection,
): { range: CellRange; mode: FillRangeMode } | null {
  const downDelta = target.rowIndex - sourceRange.endRowIndex;
  const rightDelta = target.columnIndex - sourceRange.endColumnIndex;

  if (downDelta <= 0 && rightDelta <= 0) {
    return null;
  }

  if (downDelta >= rightDelta) {
    return {
      mode: "seriesDown",
      range: {
        ...sourceRange,
        endRowIndex: target.rowIndex,
      },
    };
  }

  return {
    mode: "seriesRight",
    range: {
      ...sourceRange,
      endColumnIndex: target.columnIndex,
    },
  };
}

export function getColumnWidth(sheet: SheetData, columnIndex: number) {
  return sheet.columnWidths[String(columnIndex)] ?? DEFAULT_COLUMN_WIDTH;
}

export function clampColumnWidth(width: number) {
  return Math.min(Math.max(Math.round(width), MIN_COLUMN_WIDTH), MAX_COLUMN_WIDTH);
}

export function scaleSize(size: number, scale: number) {
  return Math.round(size * scale);
}

export function getRowHeight(sheet: SheetData, rowIndex: number) {
  return Object.entries(sheet.cells).some(([key, cell]) => {
    if (
      !cell.style?.wrap &&
      !cell.style?.verticalText &&
      !cell.style?.textRotation
    ) {
      return false;
    }

    return Number(key.match(/\d+$/)?.[0]) === rowIndex + 1;
  })
    ? WRAPPED_ROW_HEIGHT
    : DEFAULT_ROW_HEIGHT;
}

export function hasVariableRowHeights(sheet: SheetData) {
  return Object.values(sheet.cells).some(
    (cell) =>
      cell.style?.wrap ||
      cell.style?.verticalText ||
      cell.style?.textRotation,
  );
}

export function getVisibleRowsHeight(
  sheet: SheetData,
  visibleRowIndexes: number[],
  zoomScale: number,
) {
  if (!hasVariableRowHeights(sheet)) {
    return visibleRowIndexes.length * scaleSize(DEFAULT_ROW_HEIGHT, zoomScale);
  }

  return visibleRowIndexes.reduce(
    (total, rowIndex) => total + scaleSize(getRowHeight(sheet, rowIndex), zoomScale),
    0,
  );
}

export function getVisibleRowsHeightBefore(
  sheet: SheetData,
  visibleRowIndexes: number[],
  rowPosition: number,
  zoomScale: number,
) {
  if (!hasVariableRowHeights(sheet)) {
    return rowPosition * scaleSize(DEFAULT_ROW_HEIGHT, zoomScale);
  }

  return visibleRowIndexes
    .slice(0, rowPosition)
    .reduce(
      (total, rowIndex) => total + scaleSize(getRowHeight(sheet, rowIndex), zoomScale),
      0,
    );
}

export function getMergedCell(
  sheet: SheetData,
  rowIndex: number,
  columnIndex: number,
) {
  return (
    (sheet.mergedCells ?? []).find((range) =>
      isCellInRange(rowIndex, columnIndex, range),
    ) ?? null
  );
}

function getVisibleIndexesInRange(
  indexes: number[],
  startIndex: number,
  endIndex: number,
) {
  return indexes.filter((index) => index >= startIndex && index <= endIndex);
}

export function getVisibleMergeGeometry(
  sheet: SheetData,
  range: MergedCellRange,
  visibleRowIndexes: number[],
  visibleColumnIndexes: number[],
  zoomScale: number,
): VisibleMergeGeometry | null {
  const rows = getVisibleIndexesInRange(
    visibleRowIndexes,
    range.startRowIndex,
    range.endRowIndex,
  );
  const columns = getVisibleIndexesInRange(
    visibleColumnIndexes,
    range.startColumnIndex,
    range.endColumnIndex,
  );

  if (rows.length === 0 || columns.length === 0) {
    return null;
  }

  return {
    anchorRowIndex: rows[0],
    anchorColumnIndex: columns[0],
    columnSpan: columns.length,
    height: rows.reduce(
      (total, rowIndex) => total + scaleSize(getRowHeight(sheet, rowIndex), zoomScale),
      0,
    ),
  };
}

export function getFrozenRowTop(
  sheet: SheetData,
  visibleRowIndexes: number[],
  frozenVirtualRowIndex: number,
  zoomScale: number,
) {
  const frozenRowsHeight = visibleRowIndexes
    .slice(0, frozenVirtualRowIndex)
    .reduce(
      (total, rowIndex) => total + scaleSize(getRowHeight(sheet, rowIndex), zoomScale),
      0,
    );

  return scaleSize(HEADER_HEIGHT, zoomScale) + frozenRowsHeight;
}

export function getFrozenColumnStyle(
  isFrozen: boolean,
  inlineStart = 48,
  isRightToLeft = false,
) {
  return isFrozen
    ? {
        [isRightToLeft ? "right" : "left"]: `${inlineStart}px`,
        position: "sticky" as const,
      }
    : undefined;
}
