import { cellKey, parseCellKey } from "@/features/workbooks/addresses";
import {
  metadataHasEntries,
  type ClipboardRange,
  type SpreadsheetClipboardMetadata,
} from "@/features/spreadsheet/clipboard-metadata";
import type { SheetData, WorkbookDocument } from "@/features/workbooks/types";

export function pasteSpreadsheetClipboardMetadata({
  document,
  metadata,
  sourceRange,
  targetSheetId,
  targetStart,
}: {
  document: WorkbookDocument;
  metadata?: SpreadsheetClipboardMetadata;
  sourceRange: ClipboardRange;
  targetSheetId: string;
  targetStart: { rowIndex: number; columnIndex: number };
}) {
  if (!metadata || !metadataHasEntries(metadata)) {
    return;
  }

  const targetSheet = document.sheets.find((sheet) => sheet.id === targetSheetId);

  if (!targetSheet) {
    return;
  }

  const rowOffset = targetStart.rowIndex - sourceRange.startRowIndex;
  const columnOffset = targetStart.columnIndex - sourceRange.startColumnIndex;
  const now = new Date().toISOString();

  pasteCharts({ document, metadata, rowOffset, columnOffset, targetSheet });
  pasteObjects({ document, metadata, rowOffset, columnOffset, targetSheet, now });
  pasteCellNotes({ document, metadata, rowOffset, columnOffset, targetSheet, now });
  pasteCellLinks({ document, metadata, rowOffset, columnOffset, targetSheet, now });
  pasteMergedCells({ metadata, rowOffset, columnOffset, targetSheet });
  pasteConditionalFormats({
    document,
    metadata,
    rowOffset,
    columnOffset,
    targetSheet,
  });
  pasteDataValidations({
    document,
    metadata,
    rowOffset,
    columnOffset,
    targetSheet,
  });
}

function pasteCharts({
  document,
  metadata,
  rowOffset,
  columnOffset,
  targetSheet,
}: {
  document: WorkbookDocument;
  metadata: SpreadsheetClipboardMetadata;
  rowOffset: number;
  columnOffset: number;
  targetSheet: SheetData;
}) {
  document.charts ??= [];
  document.charts.push(
    ...metadata.charts.flatMap((chart) => {
      const range = shiftRange(chart.range, rowOffset, columnOffset);

      if (!rangeFitsSheet(targetSheet, range)) {
        return [];
      }

      return [
        {
          ...structuredClone(chart),
          id: id("chart"),
          sheetId: targetSheet.id,
          range,
        },
      ];
    }),
  );
}

function pasteObjects({
  document,
  metadata,
  rowOffset,
  columnOffset,
  targetSheet,
  now,
}: {
  document: WorkbookDocument;
  metadata: SpreadsheetClipboardMetadata;
  rowOffset: number;
  columnOffset: number;
  targetSheet: SheetData;
  now: string;
}) {
  const nextObjectZIndex = getNextObjectZIndex(document, targetSheet.id);
  document.insertedObjects ??= [];
  document.insertedObjects.push(
    ...metadata.insertedObjects.flatMap((object, index) => {
      const rowIndex = object.anchor.rowIndex + rowOffset;
      const columnIndex = object.anchor.columnIndex + columnOffset;

      if (!pointFitsSheet(targetSheet, rowIndex, columnIndex)) {
        return [];
      }

      return [
        {
          ...structuredClone(object),
          id: id("object"),
          sheetId: targetSheet.id,
          anchor: {
            ...object.anchor,
            rowIndex,
            columnIndex,
          },
          metadata: {
            ...object.metadata,
            updatedAt: now,
          },
          zIndex: nextObjectZIndex + index,
        },
      ];
    }),
  );
}

function pasteCellNotes({
  document,
  metadata,
  rowOffset,
  columnOffset,
  targetSheet,
  now,
}: {
  document: WorkbookDocument;
  metadata: SpreadsheetClipboardMetadata;
  rowOffset: number;
  columnOffset: number;
  targetSheet: SheetData;
  now: string;
}) {
  const notes = metadata.cellNotes.flatMap((note) => {
    const shiftedKey = shiftCellKey(note.cellKey, rowOffset, columnOffset, targetSheet);

    if (!shiftedKey) {
      return [];
    }

    return [
      {
        ...structuredClone(note),
        id: id("note"),
        sheetId: targetSheet.id,
        cellKey: shiftedKey,
        replies: note.replies.map((reply) => ({
          ...structuredClone(reply),
          id: id("comment_reply"),
          updatedAt: now,
        })),
        createdAt: now,
        updatedAt: now,
      },
    ];
  });

  if (notes.length === 0) {
    return;
  }

  const targetKeys = new Set(notes.map((note) => note.cellKey));
  document.cellNotes = (document.cellNotes ?? []).filter(
    (note) => note.sheetId !== targetSheet.id || !targetKeys.has(note.cellKey),
  );
  document.cellNotes.push(...notes);
}

function pasteCellLinks({
  document,
  metadata,
  rowOffset,
  columnOffset,
  targetSheet,
  now,
}: {
  document: WorkbookDocument;
  metadata: SpreadsheetClipboardMetadata;
  rowOffset: number;
  columnOffset: number;
  targetSheet: SheetData;
  now: string;
}) {
  const links = metadata.cellLinks.flatMap((link) => {
    const shiftedKey = shiftCellKey(link.cellKey, rowOffset, columnOffset, targetSheet);

    if (!shiftedKey) {
      return [];
    }

    return [
      {
        ...structuredClone(link),
        id: id("link"),
        sheetId: targetSheet.id,
        cellKey: shiftedKey,
        createdAt: now,
        updatedAt: now,
      },
    ];
  });

  if (links.length === 0) {
    return;
  }

  const targetKeys = new Set(links.map((link) => link.cellKey));
  document.cellLinks = (document.cellLinks ?? []).filter(
    (link) => link.sheetId !== targetSheet.id || !targetKeys.has(link.cellKey),
  );
  document.cellLinks.push(...links);
}

function pasteMergedCells({
  metadata,
  rowOffset,
  columnOffset,
  targetSheet,
}: {
  metadata: SpreadsheetClipboardMetadata;
  rowOffset: number;
  columnOffset: number;
  targetSheet: SheetData;
}) {
  const mergedCells = metadata.mergedCells.flatMap((mergedCell) => {
    const range = shiftRange(mergedCell, rowOffset, columnOffset);

    if (!rangeFitsSheet(targetSheet, range)) {
      return [];
    }

    return [
      {
        ...structuredClone(mergedCell),
        id: id("merge"),
        ...range,
      },
    ];
  });

  if (mergedCells.length === 0) {
    return;
  }

  targetSheet.mergedCells = (targetSheet.mergedCells ?? []).filter(
    (mergedCell) =>
      !mergedCells.some((incoming) => rangesOverlap(mergedCell, incoming)),
  );
  targetSheet.mergedCells.push(...mergedCells);
}

function pasteConditionalFormats({
  document,
  metadata,
  rowOffset,
  columnOffset,
  targetSheet,
}: {
  document: WorkbookDocument;
  metadata: SpreadsheetClipboardMetadata;
  rowOffset: number;
  columnOffset: number;
  targetSheet: SheetData;
}) {
  document.conditionalFormats ??= [];
  document.conditionalFormats.push(
    ...metadata.conditionalFormats.flatMap((rule) => {
      const range = shiftRange(rule.range, rowOffset, columnOffset);

      if (!rangeFitsSheet(targetSheet, range)) {
        return [];
      }

      return [
        {
          ...structuredClone(rule),
          id: id("cf"),
          sheetId: targetSheet.id,
          range,
          sourcePivotTableId: undefined,
          pivotTableScope: undefined,
        },
      ];
    }),
  );
}

function pasteDataValidations({
  document,
  metadata,
  rowOffset,
  columnOffset,
  targetSheet,
}: {
  document: WorkbookDocument;
  metadata: SpreadsheetClipboardMetadata;
  rowOffset: number;
  columnOffset: number;
  targetSheet: SheetData;
}) {
  document.dataValidations ??= [];
  document.dataValidations.push(
    ...metadata.dataValidations.flatMap((rule) => {
      const range = shiftRange(rule.range, rowOffset, columnOffset);

      if (!rangeFitsSheet(targetSheet, range)) {
        return [];
      }

      return [
        {
          ...structuredClone(rule),
          id: id("dv"),
          sheetId: targetSheet.id,
          range,
        },
      ];
    }),
  );
}

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function rangesOverlap(left: ClipboardRange, right: ClipboardRange) {
  return (
    left.startRowIndex <= right.endRowIndex &&
    left.endRowIndex >= right.startRowIndex &&
    left.startColumnIndex <= right.endColumnIndex &&
    left.endColumnIndex >= right.startColumnIndex
  );
}

function shiftCellKey(
  key: string,
  rowOffset: number,
  columnOffset: number,
  sheet: SheetData,
) {
  const parsed = parseCellKey(key);

  if (!parsed) {
    return null;
  }

  const rowIndex = parsed.rowIndex + rowOffset;
  const columnIndex = parsed.columnIndex + columnOffset;

  return pointFitsSheet(sheet, rowIndex, columnIndex)
    ? cellKey(rowIndex, columnIndex)
    : null;
}

function shiftRange(
  range: ClipboardRange,
  rowOffset: number,
  columnOffset: number,
): ClipboardRange {
  return {
    startRowIndex: range.startRowIndex + rowOffset,
    startColumnIndex: range.startColumnIndex + columnOffset,
    endRowIndex: range.endRowIndex + rowOffset,
    endColumnIndex: range.endColumnIndex + columnOffset,
  };
}

function rangeFitsSheet(sheet: SheetData, range: ClipboardRange) {
  return (
    range.startRowIndex >= 0 &&
    range.startColumnIndex >= 0 &&
    range.endRowIndex < sheet.rowCount &&
    range.endColumnIndex < sheet.columnCount
  );
}

function pointFitsSheet(sheet: SheetData, rowIndex: number, columnIndex: number) {
  return (
    rowIndex >= 0 &&
    columnIndex >= 0 &&
    rowIndex < sheet.rowCount &&
    columnIndex < sheet.columnCount
  );
}

function getNextObjectZIndex(document: WorkbookDocument, sheetId: string) {
  return (
    Math.max(
      0,
      ...(document.insertedObjects ?? [])
        .filter((object) => object.sheetId === sheetId)
        .map((object) => object.zIndex),
    ) + 1
  );
}
