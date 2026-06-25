import { cellKey } from "@/features/workbooks/addresses";
import type { SheetData, WorkbookDocument } from "@/features/workbooks/types";
import { canonicalizeFormulaInput } from "@/features/spreadsheet/formula-locale";
import {
  parseClipboardGrid,
  serializeClipboardGrid,
  transposeClipboardGrid,
} from "@/features/spreadsheet/clipboard";
import {
  clonePastedCell,
  createSpreadsheetClipboardPayload,
} from "@/features/spreadsheet/cell-clipboard";
import { pasteSpreadsheetClipboardMetadata } from "@/features/spreadsheet/clipboard-metadata-paste";
import type {
  PasteSpecialMode,
  SpreadsheetClipboardPayload,
} from "@/features/spreadsheet/cell-clipboard";
import { clearCellRaw } from "@/features/spreadsheet/state/cell-state";
import {
  getTargetRangeForSize,
  type CellRange,
  type CellSelection,
} from "@/features/spreadsheet/state/selection-state";

export type ClipboardTextPastePlan = {
  rows: string[][];
  targetRange: CellRange;
  endSelection: CellSelection;
};

export type ClipboardCellsPastePlan = {
  displayValues: string[][];
  targetRange: CellRange;
  endSelection: CellSelection;
};

export type VisibleCellsCopyPlan = {
  displayValues: string[][];
  targetStart: CellSelection;
  targetRange: CellRange;
};

export function createClipboardTextPastePlan(
  sheet: SheetData,
  selection: CellSelection,
  text: string,
  options: { transpose?: boolean } = {},
): ClipboardTextPastePlan | null {
  const rows = options.transpose
    ? transposeClipboardGrid(parseClipboardGrid(text))
    : parseClipboardGrid(text);

  if (rows.length === 0) {
    return null;
  }

  const columnCount = Math.max(...rows.map((row) => row.length));
  const targetRange = getTargetRangeForSize(
    sheet,
    selection,
    rows.length,
    columnCount,
  );

  if (!targetRange) {
    return null;
  }

  return {
    rows,
    targetRange,
    endSelection: {
      rowIndex: selection.rowIndex + rows.length - 1,
      columnIndex: selection.columnIndex + columnCount - 1,
    },
  };
}

export function pasteClipboardTextRowsIntoSheet(
  sheet: SheetData,
  selection: CellSelection,
  rows: string[][],
) {
  rows.forEach((row, rowOffset) => {
    row.forEach((raw, columnOffset) => {
      const rowIndex = selection.rowIndex + rowOffset;
      const columnIndex = selection.columnIndex + columnOffset;

      if (rowIndex >= sheet.rowCount || columnIndex >= sheet.columnCount) {
        return;
      }

      const key = cellKey(rowIndex, columnIndex);

      const normalizedRaw = canonicalizeFormulaInput(raw);

      if (normalizedRaw) {
        sheet.cells[key] = {
          ...sheet.cells[key],
          raw: normalizedRaw,
        };
      } else {
        clearCellRaw(sheet, key);
      }
    });
  });
}

export function createClipboardCellsPastePlan(
  sheet: SheetData,
  selection: CellSelection,
  payload: SpreadsheetClipboardPayload,
): ClipboardCellsPastePlan | null {
  if (payload.cells.length === 0) {
    return null;
  }

  const columnCount = Math.max(...payload.cells.map((row) => row.length));
  const targetRange = getTargetRangeForSize(
    sheet,
    selection,
    payload.cells.length,
    columnCount,
  );

  if (!targetRange) {
    return null;
  }

  return {
    displayValues: parseClipboardGrid(payload.text),
    targetRange,
    endSelection: {
      rowIndex: selection.rowIndex + payload.cells.length - 1,
      columnIndex: selection.columnIndex + columnCount - 1,
    },
  };
}

export function pasteClipboardCellsIntoSheet({
  document,
  sheet,
  selection,
  payload,
  displayValues,
  mode = "all",
}: {
  document?: WorkbookDocument;
  sheet: SheetData;
  selection: CellSelection;
  payload: SpreadsheetClipboardPayload;
  displayValues: string[][];
  mode?: PasteSpecialMode;
}) {
  payload.cells.forEach((row, rowOffset) => {
    row.forEach((cell, columnOffset) => {
      const rowIndex = selection.rowIndex + rowOffset;
      const columnIndex = selection.columnIndex + columnOffset;

      if (rowIndex >= sheet.rowCount || columnIndex >= sheet.columnCount) {
        return;
      }

      const key = cellKey(rowIndex, columnIndex);

      if (!cell) {
        if (mode !== "formats") {
          clearCellRaw(sheet, key);
        }
        return;
      }

      const nextCell = clonePastedCell({
        source: cell,
        current: sheet.cells[key],
        displayValue: displayValues[rowOffset]?.[columnOffset] ?? cell.raw,
        rowOffset: rowIndex - (payload.sourceRange.startRowIndex + rowOffset),
        columnOffset:
          columnIndex - (payload.sourceRange.startColumnIndex + columnOffset),
        mode,
      });

      if (nextCell) {
        sheet.cells[key] = nextCell;
      } else {
        clearCellRaw(sheet, key);
      }
    });
  });

  if (document && mode === "all") {
    pasteSpreadsheetClipboardMetadata({
      document,
      metadata: payload.metadata,
      sourceRange: payload.sourceRange,
      targetSheetId: sheet.id,
      targetStart: selection,
    });
  }
}

export function createVisibleCellsCopyPlan(
  sheet: SheetData,
  selectedRange: CellRange,
  payload: SpreadsheetClipboardPayload,
): VisibleCellsCopyPlan | null {
  if (payload.cells.length === 0) {
    return null;
  }

  const rowCount = payload.cells.length;
  const columnCount = Math.max(...payload.cells.map((row) => row.length));
  const targetStart = {
    rowIndex: selectedRange.startRowIndex,
    columnIndex: selectedRange.endColumnIndex + 1,
  };
  const targetRange = getTargetRangeForSize(
    sheet,
    targetStart,
    rowCount,
    columnCount,
  );

  if (
    !targetRange ||
    targetRange.endRowIndex - targetRange.startRowIndex + 1 < rowCount ||
    targetRange.endColumnIndex - targetRange.startColumnIndex + 1 < columnCount
  ) {
    return null;
  }

  return {
    displayValues: parseClipboardGrid(payload.text),
    targetStart,
    targetRange,
  };
}

export function copyVisibleCellsIntoSheet({
  sheet,
  payload,
  plan,
}: {
  sheet: SheetData;
  payload: SpreadsheetClipboardPayload;
  plan: VisibleCellsCopyPlan;
}) {
  payload.cells.forEach((row, rowOffset) => {
    row.forEach((cell, columnOffset) => {
      const key = cellKey(
        plan.targetStart.rowIndex + rowOffset,
        plan.targetStart.columnIndex + columnOffset,
      );
      const raw = canonicalizeFormulaInput(
        plan.displayValues[rowOffset]?.[columnOffset] ?? cell?.raw ?? "",
      );

      if (!raw && !cell?.style && !cell?.richTextRuns?.length) {
        clearCellRaw(sheet, key);
        return;
      }

      sheet.cells[key] = {
        raw,
        ...(cell?.style ? { style: structuredClone(cell.style) } : {}),
        ...(cell?.richTextRuns
          ? { richTextRuns: structuredClone(cell.richTextRuns) }
          : {}),
      };
    });
  });
}

export function getRangeClipboardText({
  sheet,
  range,
  computedValues,
  hideHiddenFormulas,
}: {
  sheet: SheetData;
  range: CellRange;
  computedValues: Record<string, string>;
  hideHiddenFormulas: boolean;
}) {
  const values: string[][] = [];

  for (
    let rowIndex = range.startRowIndex;
    rowIndex <= range.endRowIndex;
    rowIndex += 1
  ) {
    const row: string[] = [];

    for (
      let columnIndex = range.startColumnIndex;
      columnIndex <= range.endColumnIndex;
      columnIndex += 1
    ) {
      const key = cellKey(rowIndex, columnIndex);
      const cell = sheet.cells[key];
      const raw =
        hideHiddenFormulas &&
        cell?.style?.formulaHidden &&
        cell.raw.startsWith("=")
          ? ""
          : cell?.raw;

      row.push(computedValues[key] ?? raw ?? "");
    }

    values.push(row);
  }

  return serializeClipboardGrid(values);
}

export function getRangeClipboardPayload({
  document,
  sheet,
  range,
  computedValues,
  hideHiddenFormulas,
}: {
  document?: WorkbookDocument;
  sheet: SheetData;
  range: CellRange;
  computedValues: Record<string, string>;
  hideHiddenFormulas: boolean;
}) {
  return createSpreadsheetClipboardPayload(sheet, range, computedValues, {
    document,
    hideHiddenFormulas,
  });
}
