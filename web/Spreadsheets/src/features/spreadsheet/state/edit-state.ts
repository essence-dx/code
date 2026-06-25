import { cellKey } from "@/features/workbooks/addresses";
import { canonicalizeFormulaInput } from "@/features/spreadsheet/formula-locale";
import { shiftFormulaReferences } from "@/features/spreadsheet/formula-references";
import { clearCellRaw } from "@/features/spreadsheet/state/cell-state";
import { getActiveSheet } from "@/features/spreadsheet/state/document-state";
import { replaceRawText } from "@/features/spreadsheet/state/naming-state";
import {
  forEachCellInRange,
  isCellKeyInRange,
  selectionToRange,
  type CellRange,
  type CellSelection,
} from "@/features/spreadsheet/state/selection-state";
import type {
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";

export function updateCellRaw(
  sheet: SheetData,
  selection: CellSelection,
  raw: string,
) {
  const key = cellKey(selection.rowIndex, selection.columnIndex);
  const normalizedRaw = canonicalizeFormulaInput(raw);

  if (!normalizedRaw) {
    clearCellRaw(sheet, key);
    return;
  }

  const current = sheet.cells[key];

  sheet.cells[key] = {
    ...current,
    raw: normalizedRaw,
    richTextRuns:
      current?.raw === normalizedRaw ? current.richTextRuns : undefined,
  };
}

export function updateRangeRaw(
  sheet: SheetData,
  range: CellRange,
  raw: string,
  anchor: CellSelection = {
    rowIndex: range.startRowIndex,
    columnIndex: range.startColumnIndex,
  },
) {
  const normalizedRaw = canonicalizeFormulaInput(raw);

  forEachCellInRange(range, (rowIndex, columnIndex) => {
    updateCellRaw(
      sheet,
      { rowIndex, columnIndex },
      getSelectionWideRaw({
        anchor,
        columnIndex,
        normalizedRaw,
        rowIndex,
      }),
    );
  });
}

export function getSelectionWideRaw({
  anchor,
  columnIndex,
  normalizedRaw,
  rowIndex,
}: {
  anchor: CellSelection;
  columnIndex: number;
  normalizedRaw: string;
  rowIndex: number;
}) {
  if (!normalizedRaw.startsWith("=")) {
    return normalizedRaw;
  }

  return shiftFormulaReferences({
    formula: normalizedRaw,
    columnOffset: columnIndex - anchor.columnIndex,
    rowOffset: rowIndex - anchor.rowIndex,
  });
}

export function replaceCellTextInSheet(input: {
  sheet: SheetData;
  target: CellSelection;
  query: string;
  replacement: string;
}) {
  const key = cellKey(input.target.rowIndex, input.target.columnIndex);
  const current = input.sheet.cells[key];

  if (!current) {
    return;
  }

  const nextRaw = replaceRawText(
    current.raw,
    input.query,
    input.replacement,
    false,
  );

  if (nextRaw === current.raw) {
    return;
  }

  const normalizedRaw = canonicalizeFormulaInput(nextRaw);

  if (!normalizedRaw) {
    clearCellRaw(input.sheet, key);
    return;
  }

  input.sheet.cells[key] = {
    ...current,
    raw: normalizedRaw,
    richTextRuns: undefined,
  };
}

export function replaceAllTextInSheet(input: {
  sheet: SheetData;
  query: string;
  replacement: string;
}) {
  for (const [key, current] of Object.entries(input.sheet.cells)) {
    const nextRaw = replaceRawText(
      current.raw,
      input.query,
      input.replacement,
      true,
    );

    if (nextRaw === current.raw) {
      continue;
    }

    const normalizedRaw = canonicalizeFormulaInput(nextRaw);

    if (!normalizedRaw) {
      clearCellRaw(input.sheet, key);
      continue;
    }

    input.sheet.cells[key] = {
      ...current,
      raw: normalizedRaw,
      richTextRuns: undefined,
    };
  }
}

export function getSingleCellEditRange(selection: CellSelection) {
  return selectionToRange(selection);
}

export function clearRangeContentFromDocument(
  document: WorkbookDocument,
  range: CellRange,
) {
  const sheet = getActiveSheet(document);

  forEachCellInRange(range, (rowIndex, columnIndex) => {
    clearCellRaw(sheet, cellKey(rowIndex, columnIndex));
  });
  document.sparklines = (document.sparklines ?? []).filter(
    (sparkline) =>
      sparkline.sheetId !== document.activeSheetId ||
      !isCellKeyInRange(sparkline.targetCellKey, range),
  );
}
