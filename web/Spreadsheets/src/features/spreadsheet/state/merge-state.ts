import { cellKey } from "@/features/workbooks/addresses";
import type { WorkbookDocument } from "@/features/workbooks/types";
import { getActiveSheet } from "@/features/spreadsheet/state/document-state";
import {
  forEachCellInRange,
  isSingleCellRange,
  rangesOverlap,
  type CellRange,
} from "@/features/spreadsheet/state/selection-state";

export function mergeRangeInDocument(
  document: WorkbookDocument,
  range: CellRange,
) {
  if (isSingleCellRange(range)) {
    return;
  }

  const sheet = getActiveSheet(document);
  const topLeftKey = cellKey(range.startRowIndex, range.startColumnIndex);
  const coveredKeys = new Set<string>();

  sheet.mergedCells = (sheet.mergedCells ?? []).filter(
    (mergedRange) => !rangesOverlap(mergedRange, range),
  );
  forEachCellInRange(range, (rowIndex, columnIndex) => {
    if (
      rowIndex === range.startRowIndex &&
      columnIndex === range.startColumnIndex
    ) {
      return;
    }

    const key = cellKey(rowIndex, columnIndex);
    coveredKeys.add(key);
    delete sheet.cells[key];
  });
  sheet.cells[topLeftKey] ??= { raw: "" };
  sheet.mergedCells.push({
    id: `merge_${crypto.randomUUID()}`,
    ...range,
  });
  const removedNoteIds = new Set<string>();
  document.cellNotes = (document.cellNotes ?? []).filter((note) => {
    const shouldRemove =
      note.sheetId === document.activeSheetId && coveredKeys.has(note.cellKey);

    if (shouldRemove) {
      removedNoteIds.add(note.id);
    }

    return !shouldRemove;
  });
  document.commentNotifications = (document.commentNotifications ?? []).filter(
    (notification) => !removedNoteIds.has(notification.noteId),
  );
  document.cellLinks = (document.cellLinks ?? []).filter(
    (link) =>
      link.sheetId !== document.activeSheetId || !coveredKeys.has(link.cellKey),
  );
}

export function unmergeRangeInDocument(
  document: WorkbookDocument,
  range: CellRange,
) {
  const sheet = getActiveSheet(document);

  sheet.mergedCells = (sheet.mergedCells ?? []).filter(
    (mergedRange) => !rangesOverlap(mergedRange, range),
  );
}
