import { getFormulaWatchCellKeysForRange } from "@/features/spreadsheet/formula-watch";
import { getActiveSheet } from "@/features/spreadsheet/state/document-state";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";
import type { WorkbookDocument } from "@/features/workbooks/types";

export function addFormulaWatchesForRange(
  document: WorkbookDocument,
  range: CellRange,
) {
  const sheet = getActiveSheet(document);
  const keys = getFormulaWatchCellKeysForRange({ document, sheet, range });

  if (keys.length === 0) {
    return;
  }

  const createdAt = new Date().toISOString();

  document.formulaWatches = [
    ...(document.formulaWatches ?? []),
    ...keys.map((key) => ({
      id: `watch_${crypto.randomUUID()}`,
      sheetId: sheet.id,
      cellKey: key,
      createdAt,
    })),
  ];
}

export function deleteFormulaWatchFromDocument(
  document: WorkbookDocument,
  watchId: string,
) {
  document.formulaWatches = (document.formulaWatches ?? []).filter(
    (watch) => watch.id !== watchId,
  );
}
