import { columnLabel, parseCellKey } from "@/features/workbooks/addresses";
import {
  getEffectiveHiddenColumns,
  getEffectiveHiddenRows,
} from "@/features/spreadsheet/outline-groups";
import { getEffectiveSheetPrintSettings } from "@/features/workbooks/print-settings";
import type {
  ChartRange,
  SheetData,
  SheetPrintSettings,
} from "@/features/workbooks/types";

export type SheetPrintPageRange = {
  pageNumber: number;
  label: string;
  rowLabel: string;
  columnLabel: string;
  range: ChartRange;
};

function clampPrintArea(sheet: SheetData, printArea: ChartRange) {
  const startRowIndex = Math.min(
    Math.max(printArea.startRowIndex, 0),
    sheet.rowCount - 1,
  );
  const startColumnIndex = Math.min(
    Math.max(printArea.startColumnIndex, 0),
    sheet.columnCount - 1,
  );

  return {
    startRowIndex,
    startColumnIndex,
    endRowIndex: Math.min(
      Math.max(printArea.endRowIndex, startRowIndex),
      sheet.rowCount - 1,
    ),
    endColumnIndex: Math.min(
      Math.max(printArea.endColumnIndex, startColumnIndex),
      sheet.columnCount - 1,
    ),
  };
}

function getVisibleIndexes(
  startIndex: number,
  endIndex: number,
  hidden: Set<number>,
) {
  return Array.from(
    { length: endIndex - startIndex + 1 },
    (_, offset) => startIndex + offset,
  ).filter((index) => !hidden.has(index));
}

function segmentIndexes(indexes: number[], pageBreaks: number[]) {
  const pageBreakSet = new Set(pageBreaks);

  return indexes.reduce<number[][]>(
    (segments, index, offset) => {
      if (
        offset > 0 &&
        pageBreakSet.has(index) &&
        segments[segments.length - 1]?.length
      ) {
        segments.push([]);
      }

      segments[segments.length - 1]?.push(index);

      return segments;
    },
    [[]],
  );
}

function formatRowLabel(rows: number[]) {
  const first = rows[0] ?? 0;
  const last = rows[rows.length - 1] ?? first;

  return first === last ? `Row ${first + 1}` : `Rows ${first + 1}-${last + 1}`;
}

function formatColumnLabel(columns: number[]) {
  const first = columns[0] ?? 0;
  const last = columns[columns.length - 1] ?? first;
  const firstLabel = columnLabel(first);
  const lastLabel = columnLabel(last);

  return first === last
    ? `Column ${firstLabel}`
    : `Columns ${firstLabel}-${lastLabel}`;
}

export function getSheetPrintExportRange(
  sheet: SheetData,
  printArea?: ChartRange,
) {
  if (printArea) {
    return clampPrintArea(sheet, printArea);
  }

  let maxRowIndex = 0;
  let maxColumnIndex = 0;

  Object.entries(sheet.cells).forEach(([key, cell]) => {
    if (!cell.raw && !cell.style && !cell.richTextRuns?.length) {
      return;
    }

    const position = parseCellKey(key);

    if (!position) {
      return;
    }

    maxRowIndex = Math.max(maxRowIndex, position.rowIndex);
    maxColumnIndex = Math.max(maxColumnIndex, position.columnIndex);
  });

  return {
    startRowIndex: 0,
    startColumnIndex: 0,
    endRowIndex: Math.min(sheet.rowCount - 1, maxRowIndex),
    endColumnIndex: Math.min(sheet.columnCount - 1, maxColumnIndex),
  };
}

export function getSheetPrintVisibleIndexes(
  sheet: SheetData,
  printSettings?: SheetPrintSettings,
) {
  const settings = getEffectiveSheetPrintSettings(sheet.id, printSettings);
  const hiddenRows = getEffectiveHiddenRows(sheet);
  const hiddenColumns = getEffectiveHiddenColumns(sheet);
  const exportRange = getSheetPrintExportRange(sheet, settings.printArea);

  return {
    exportRange,
    visibleRows: getVisibleIndexes(
      exportRange.startRowIndex,
      exportRange.endRowIndex,
      hiddenRows,
    ),
    visibleColumns: getVisibleIndexes(
      exportRange.startColumnIndex,
      exportRange.endColumnIndex,
      hiddenColumns,
    ),
  };
}

export function getSheetPrintPageRanges(
  sheet: SheetData,
  printSettings?: SheetPrintSettings,
) {
  const settings = getEffectiveSheetPrintSettings(sheet.id, printSettings);
  const { exportRange, visibleRows, visibleColumns } =
    getSheetPrintVisibleIndexes(sheet, settings);
  const rowSegments = segmentIndexes(
    visibleRows.length ? visibleRows : [exportRange.startRowIndex],
    settings.rowPageBreaks,
  );
  const columnSegments = segmentIndexes(
    visibleColumns.length ? visibleColumns : [exportRange.startColumnIndex],
    settings.columnPageBreaks,
  );
  let pageNumber = 1;

  return rowSegments.flatMap((rows) =>
    columnSegments.map((columns) => {
      const rowLabel = formatRowLabel(rows);
      const columnText = formatColumnLabel(columns);

      return {
        pageNumber: pageNumber++,
        label: `${rowLabel}, ${columnText}`,
        rowLabel,
        columnLabel: columnText,
        range: {
          startRowIndex: rows[0] ?? exportRange.startRowIndex,
          endRowIndex: rows[rows.length - 1] ?? exportRange.startRowIndex,
          startColumnIndex: columns[0] ?? exportRange.startColumnIndex,
          endColumnIndex:
            columns[columns.length - 1] ?? exportRange.startColumnIndex,
        },
      };
    }),
  );
}
