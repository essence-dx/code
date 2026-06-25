import { cellKey, parseCellKey } from "@/features/workbooks/addresses";
import type {
  MergedCellRange,
  SheetData,
} from "@/features/workbooks/types";
import type { CellSelection } from "@/features/spreadsheet/state/selection-state";

export function remapCells(
  sheet: SheetData,
  mapPosition: (
    rowIndex: number,
    columnIndex: number,
  ) => CellSelection | null,
) {
  const cells: SheetData["cells"] = {};

  for (const [key, cell] of Object.entries(sheet.cells)) {
    const position = parseCellKey(key);

    if (!position) {
      continue;
    }

    const nextPosition = mapPosition(position.rowIndex, position.columnIndex);

    if (
      !nextPosition ||
      nextPosition.rowIndex < 0 ||
      nextPosition.columnIndex < 0 ||
      nextPosition.rowIndex >= sheet.rowCount ||
      nextPosition.columnIndex >= sheet.columnCount
    ) {
      continue;
    }

    cells[cellKey(nextPosition.rowIndex, nextPosition.columnIndex)] = cell;
  }

  sheet.cells = cells;
}

export function shiftColumnWidths(
  sheet: SheetData,
  mapColumnIndex: (columnIndex: number) => number | null,
) {
  const columnWidths: SheetData["columnWidths"] = {};

  for (const [key, width] of Object.entries(sheet.columnWidths)) {
    const columnIndex = Number(key);

    if (!Number.isInteger(columnIndex)) {
      continue;
    }

    const nextColumnIndex = mapColumnIndex(columnIndex);

    if (
      nextColumnIndex === null ||
      nextColumnIndex < 0 ||
      nextColumnIndex >= sheet.columnCount
    ) {
      continue;
    }

    columnWidths[String(nextColumnIndex)] = width;
  }

  sheet.columnWidths = columnWidths;
}

export function remapIndexes(
  indexes: number[],
  mapIndex: (index: number) => number | null,
  maxIndex: number,
) {
  return Array.from(
    new Set(
      indexes
        .map(mapIndex)
        .filter((index): index is number => index !== null)
        .filter((index) => index >= 0 && index < maxIndex),
    ),
  ).sort((left, right) => left - right);
}

export function shiftMergedCellsForInsertedRows(
  mergedCells: MergedCellRange[],
  insertAt: number,
  count: number,
) {
  return mergedCells.map((range) => {
    if (range.startRowIndex >= insertAt) {
      return {
        ...range,
        startRowIndex: range.startRowIndex + count,
        endRowIndex: range.endRowIndex + count,
      };
    }

    if (range.endRowIndex >= insertAt) {
      return {
        ...range,
        endRowIndex: range.endRowIndex + count,
      };
    }

    return range;
  });
}

export function shiftMergedCellsForInsertedColumns(
  mergedCells: MergedCellRange[],
  insertAt: number,
  count: number,
) {
  return mergedCells.map((range) => {
    if (range.startColumnIndex >= insertAt) {
      return {
        ...range,
        startColumnIndex: range.startColumnIndex + count,
        endColumnIndex: range.endColumnIndex + count,
      };
    }

    if (range.endColumnIndex >= insertAt) {
      return {
        ...range,
        endColumnIndex: range.endColumnIndex + count,
      };
    }

    return range;
  });
}

export function shiftMergedCellsForDeletedRows(
  mergedCells: MergedCellRange[],
  deleteStart: number,
  deleteEnd: number,
  count: number,
) {
  return mergedCells.flatMap((range) => {
    if (range.endRowIndex < deleteStart) {
      return [range];
    }

    if (range.startRowIndex > deleteEnd) {
      return [
        {
          ...range,
          startRowIndex: range.startRowIndex - count,
          endRowIndex: range.endRowIndex - count,
        },
      ];
    }

    return [];
  });
}

export function shiftMergedCellsForDeletedColumns(
  mergedCells: MergedCellRange[],
  deleteStart: number,
  deleteEnd: number,
  count: number,
) {
  return mergedCells.flatMap((range) => {
    if (range.endColumnIndex < deleteStart) {
      return [range];
    }

    if (range.startColumnIndex > deleteEnd) {
      return [
        {
          ...range,
          startColumnIndex: range.startColumnIndex - count,
          endColumnIndex: range.endColumnIndex - count,
        },
      ];
    }

    return [];
  });
}
