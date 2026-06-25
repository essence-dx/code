import { cellKey, parseCellKey } from "@/features/workbooks/addresses";
import {
  getEffectiveHiddenColumns,
  getEffectiveHiddenRows,
} from "@/features/spreadsheet/outline-groups";
import type {
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";

export type CellSelection = {
  rowIndex: number;
  columnIndex: number;
};

export type CellRange = {
  startRowIndex: number;
  startColumnIndex: number;
  endRowIndex: number;
  endColumnIndex: number;
};

export type SortCriterion = {
  columnIndex: number;
  direction: "asc" | "desc";
  customOrder?: import("@/features/spreadsheet/sort-orders").SortCustomOrder;
  sortOn?: import("@/features/spreadsheet/sort-orders").SortOn;
};

export type FillRangeMode =
  | "down"
  | "right"
  | "series"
  | "seriesDown"
  | "seriesRight";

export type SelectionBoundary =
  | "rowStart"
  | "rowEnd"
  | "sheetStart"
  | "usedEnd";

export type SelectionJumpDirection = "up" | "down" | "left" | "right";

export type RangeSelectionPlan = {
  sheetId: string;
  selected: CellSelection;
  rangeAnchor: CellSelection;
};

export function nearestVisibleIndex(
  index: number,
  maxIndex: number,
  hiddenIndexes: number[],
) {
  const hidden = new Set(hiddenIndexes);
  const clamped = Math.min(Math.max(index, 0), maxIndex - 1);

  if (!hidden.has(clamped)) {
    return clamped;
  }

  for (let offset = 1; offset < maxIndex; offset += 1) {
    const next = clamped + offset;
    const previous = clamped - offset;

    if (next < maxIndex && !hidden.has(next)) {
      return next;
    }

    if (previous >= 0 && !hidden.has(previous)) {
      return previous;
    }
  }

  return clamped;
}

export function clampSelection(selection: CellSelection, sheet: SheetData) {
  return {
    rowIndex: nearestVisibleIndex(
      selection.rowIndex,
      sheet.rowCount,
      Array.from(getEffectiveHiddenRows(sheet)),
    ),
    columnIndex: nearestVisibleIndex(
      selection.columnIndex,
      sheet.columnCount,
      Array.from(getEffectiveHiddenColumns(sheet)),
    ),
  };
}

export function normalizeRange(
  start: CellSelection,
  end: CellSelection,
): CellRange {
  return {
    startRowIndex: Math.min(start.rowIndex, end.rowIndex),
    startColumnIndex: Math.min(start.columnIndex, end.columnIndex),
    endRowIndex: Math.max(start.rowIndex, end.rowIndex),
    endColumnIndex: Math.max(start.columnIndex, end.columnIndex),
  };
}

export function selectionToRange(selection: CellSelection): CellRange {
  return {
    startRowIndex: selection.rowIndex,
    startColumnIndex: selection.columnIndex,
    endRowIndex: selection.rowIndex,
    endColumnIndex: selection.columnIndex,
  };
}

export function getMovedSelection(
  selected: CellSelection,
  rowDelta: number,
  columnDelta: number,
) {
  return {
    rowIndex: selected.rowIndex + rowDelta,
    columnIndex: selected.columnIndex + columnDelta,
  };
}

export function forEachCellInRange(
  range: CellRange,
  callback: (rowIndex: number, columnIndex: number) => void,
) {
  for (
    let rowIndex = range.startRowIndex;
    rowIndex <= range.endRowIndex;
    rowIndex += 1
  ) {
    for (
      let columnIndex = range.startColumnIndex;
      columnIndex <= range.endColumnIndex;
      columnIndex += 1
    ) {
      callback(rowIndex, columnIndex);
    }
  }
}

export function rangesOverlap(left: CellRange, right: CellRange) {
  return !(
    left.endRowIndex < right.startRowIndex ||
    left.startRowIndex > right.endRowIndex ||
    left.endColumnIndex < right.startColumnIndex ||
    left.startColumnIndex > right.endColumnIndex
  );
}

export function isSingleCellRange(range: CellRange) {
  return (
    range.startRowIndex === range.endRowIndex &&
    range.startColumnIndex === range.endColumnIndex
  );
}

export function isCellKeyInRange(key: string, range: CellRange) {
  const position = parseCellKey(key);

  return Boolean(
    position &&
      position.rowIndex >= range.startRowIndex &&
      position.rowIndex <= range.endRowIndex &&
      position.columnIndex >= range.startColumnIndex &&
      position.columnIndex <= range.endColumnIndex,
  );
}

export function getTargetRangeForSize(
  sheet: SheetData,
  start: CellSelection,
  rowCount: number,
  columnCount: number,
) {
  if (rowCount <= 0 || columnCount <= 0) {
    return null;
  }

  const endRowIndex = Math.min(sheet.rowCount - 1, start.rowIndex + rowCount - 1);
  const endColumnIndex = Math.min(
    sheet.columnCount - 1,
    start.columnIndex + columnCount - 1,
  );

  if (endRowIndex < start.rowIndex || endColumnIndex < start.columnIndex) {
    return null;
  }

  return {
    startRowIndex: start.rowIndex,
    startColumnIndex: start.columnIndex,
    endRowIndex,
    endColumnIndex,
  };
}

function isCellFilled(sheet: SheetData, rowIndex: number, columnIndex: number) {
  return Boolean(sheet.cells[cellKey(rowIndex, columnIndex)]?.raw);
}

export function getUsedRangeEnd(sheet: SheetData): CellSelection {
  let rowIndex = 0;
  let columnIndex = 0;

  for (const [key, cell] of Object.entries(sheet.cells)) {
    if (!cell.raw) {
      continue;
    }

    const position = parseCellKey(key);

    if (!position) {
      continue;
    }

    rowIndex = Math.max(rowIndex, position.rowIndex);
    columnIndex = Math.max(columnIndex, position.columnIndex);
  }

  return {
    rowIndex: Math.min(rowIndex, sheet.rowCount - 1),
    columnIndex: Math.min(columnIndex, sheet.columnCount - 1),
  };
}

export function getBoundarySelection(
  sheet: SheetData,
  selected: CellSelection,
  boundary: SelectionBoundary,
) {
  const boundarySelection = {
    rowStart: { rowIndex: selected.rowIndex, columnIndex: 0 },
    rowEnd: {
      rowIndex: selected.rowIndex,
      columnIndex: sheet.columnCount - 1,
    },
    sheetStart: { rowIndex: 0, columnIndex: 0 },
    usedEnd: getUsedRangeEnd(sheet),
  } satisfies Record<SelectionBoundary, CellSelection>;

  return boundarySelection[boundary];
}

export function getRangeSelectionPlan(
  document: WorkbookDocument,
  sheetId: string,
  range: CellRange,
): RangeSelectionPlan | null {
  const targetSheet = document.sheets.find((sheet) => sheet.id === sheetId);

  if (!targetSheet) {
    return null;
  }

  return {
    sheetId,
    selected: clampSelection(
      {
        rowIndex: range.startRowIndex,
        columnIndex: range.startColumnIndex,
      },
      targetSheet,
    ),
    rangeAnchor: clampSelection(
      {
        rowIndex: range.endRowIndex,
        columnIndex: range.endColumnIndex,
      },
      targetSheet,
    ),
  };
}

export function jumpToFilledBoundary(
  sheet: SheetData,
  selected: CellSelection,
  direction: SelectionJumpDirection,
): CellSelection {
  const rowDelta = direction === "down" ? 1 : direction === "up" ? -1 : 0;
  const columnDelta = direction === "right" ? 1 : direction === "left" ? -1 : 0;
  const maxRowIndex = sheet.rowCount - 1;
  const maxColumnIndex = sheet.columnCount - 1;
  const currentFilled = isCellFilled(
    sheet,
    selected.rowIndex,
    selected.columnIndex,
  );
  let rowIndex = selected.rowIndex;
  let columnIndex = selected.columnIndex;
  let crossedBlankAfterFilled = false;

  function canStep() {
    const nextRowIndex = rowIndex + rowDelta;
    const nextColumnIndex = columnIndex + columnDelta;

    return (
      nextRowIndex >= 0 &&
      nextRowIndex <= maxRowIndex &&
      nextColumnIndex >= 0 &&
      nextColumnIndex <= maxColumnIndex
    );
  }

  while (canStep()) {
    const nextRowIndex = rowIndex + rowDelta;
    const nextColumnIndex = columnIndex + columnDelta;
    const nextFilled = isCellFilled(sheet, nextRowIndex, nextColumnIndex);

    if (currentFilled && !crossedBlankAfterFilled) {
      if (nextFilled) {
        rowIndex = nextRowIndex;
        columnIndex = nextColumnIndex;
        continue;
      }

      crossedBlankAfterFilled = true;
      rowIndex = nextRowIndex;
      columnIndex = nextColumnIndex;
      continue;
    }

    rowIndex = nextRowIndex;
    columnIndex = nextColumnIndex;

    if (nextFilled) {
      break;
    }
  }

  return { rowIndex, columnIndex };
}
