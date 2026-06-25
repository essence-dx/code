import { cellKey, parseCellKey } from "@/features/workbooks/addresses";
import type {
  ChartRange,
  FormulaWatch,
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";

export const FORMULA_WATCH_LIMIT = 100;

export type FormulaWatchRow = FormulaWatch & {
  sheetName: string;
  range: ChartRange;
  formula: string;
  value: string;
  isActiveSheet: boolean;
};

function watchKey(sheetId: string, key: string) {
  return `${sheetId}:${key}`;
}

function isSheetProtected(document: WorkbookDocument, sheetId: string) {
  return (document.sheetProtections ?? []).some(
    (protection) => protection.sheetId === sheetId,
  );
}

function getSheet(document: WorkbookDocument, sheetId: string) {
  return document.sheets.find((sheet) => sheet.id === sheetId) ?? null;
}

function rangeForCell(key: string): ChartRange | null {
  const position = parseCellKey(key);

  if (!position) {
    return null;
  }

  return {
    startRowIndex: position.rowIndex,
    startColumnIndex: position.columnIndex,
    endRowIndex: position.rowIndex,
    endColumnIndex: position.columnIndex,
  };
}

export function getFormulaWatchCellKeysForRange({
  document,
  sheet,
  range,
}: {
  document: WorkbookDocument;
  sheet: SheetData;
  range: ChartRange;
}) {
  const existing = new Set(
    (document.formulaWatches ?? []).map((watch) =>
      watchKey(watch.sheetId, watch.cellKey),
    ),
  );
  const remainingSlots = Math.max(
    FORMULA_WATCH_LIMIT - (document.formulaWatches ?? []).length,
    0,
  );
  const keys: string[] = [];

  if (remainingSlots === 0) {
    return keys;
  }

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
      const key = cellKey(rowIndex, columnIndex);
      const raw = sheet.cells[key]?.raw ?? "";

      if (raw.startsWith("=") && !existing.has(watchKey(sheet.id, key))) {
        keys.push(key);
      }

      if (keys.length >= remainingSlots) {
        return keys;
      }
    }
  }

  return keys;
}

export function getFormulaWatchableCellCount({
  document,
  sheetId,
  range,
}: {
  document: WorkbookDocument;
  sheetId: string;
  range: ChartRange;
}) {
  const sheet = getSheet(document, sheetId);

  if (!sheet) {
    return 0;
  }

  return getFormulaWatchCellKeysForRange({ document, sheet, range }).length;
}

export function getFormulaWatchRows({
  document,
  activeSheetId,
  computedValues,
}: {
  document: WorkbookDocument;
  activeSheetId: string;
  computedValues: Record<string, string>;
}): FormulaWatchRow[] {
  return (document.formulaWatches ?? []).flatMap((watch) => {
    const sheet = getSheet(document, watch.sheetId);
    const range = rangeForCell(watch.cellKey);

    if (!sheet || !range) {
      return [];
    }

    const cell = sheet.cells[watch.cellKey];
    const isActiveSheet = watch.sheetId === activeSheetId;
    const formulaIsHidden =
      isSheetProtected(document, watch.sheetId) && cell?.style?.formulaHidden;

    return [
      {
        ...watch,
        sheetName: sheet.name,
        range,
        formula: formulaIsHidden ? "Formula hidden" : (cell?.raw ?? ""),
        value: isActiveSheet
          ? (computedValues[watch.cellKey] ?? cell?.raw ?? "")
          : "Open sheet to calculate",
        isActiveSheet,
      },
    ];
  });
}
