import { cellKey, parseCellKey } from "@/features/workbooks/addresses";
import { evaluateWorkbook } from "@/features/spreadsheet/formula-engine";
import {
  cloneDocument,
  getActiveSheet,
} from "@/features/spreadsheet/state/document-state";
import { updateCellRaw } from "@/features/spreadsheet/state/edit-state";
import {
  forEachCellInRange,
  type CellRange,
} from "@/features/spreadsheet/state/selection-state";
import type {
  CellStyle,
  ChartRange,
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";

const maxInputValues = 50;

const headerStyle: CellStyle = {
  background: "#fef9c3",
  bold: true,
  foreground: "#713f12",
};

export type DataTableRequest = {
  formulaCellKey: string;
  inputCellKey: string;
};

export type DataTableResult = {
  message: string;
  outputRange?: ChartRange;
  rowCount: number;
  success: boolean;
};

type DataTablePlan = {
  outputRange: ChartRange;
  rows: { inputValue: string; resultValue: string }[];
};

function normalizeCellReference(value: string) {
  const position = parseCellKey(value);

  return position ? cellKey(position.rowIndex, position.columnIndex) : null;
}

function createOutputRange(
  sheet: SheetData,
  sourceRange: CellRange,
  rowCount: number,
): ChartRange | null {
  const rightStartColumnIndex = sourceRange.endColumnIndex + 2;

  if (
    rightStartColumnIndex + 1 < sheet.columnCount &&
    sourceRange.startRowIndex + rowCount < sheet.rowCount
  ) {
    return {
      startRowIndex: sourceRange.startRowIndex,
      startColumnIndex: rightStartColumnIndex,
      endRowIndex: sourceRange.startRowIndex + rowCount,
      endColumnIndex: rightStartColumnIndex + 1,
    };
  }

  if (
    sourceRange.endRowIndex + 2 + rowCount >= sheet.rowCount ||
    sourceRange.startColumnIndex + 1 >= sheet.columnCount
  ) {
    return null;
  }

  return {
    startRowIndex: sourceRange.endRowIndex + 2,
    startColumnIndex: sourceRange.startColumnIndex,
    endRowIndex: sourceRange.endRowIndex + 2 + rowCount,
    endColumnIndex: sourceRange.startColumnIndex + 1,
  };
}

function getInputValues(document: WorkbookDocument, sourceRange: CellRange) {
  const sheet = getActiveSheet(document);
  const values: string[] = [];

  forEachCellInRange(sourceRange, (rowIndex, columnIndex) => {
    const raw = sheet.cells[cellKey(rowIndex, columnIndex)]?.raw ?? "";

    if (!raw.trim() || raw.trim().startsWith("=")) {
      return;
    }

    values.push(raw.slice(0, 5000));
  });

  return values.slice(0, maxInputValues);
}

function evaluateFormulaForInput({
  activeSheetId,
  document,
  formulaCellKey,
  inputCellKey,
  inputValue,
}: {
  activeSheetId: string;
  document: WorkbookDocument;
  formulaCellKey: string;
  inputCellKey: string;
  inputValue: string;
}) {
  const draft = cloneDocument(document);
  const sheet = getActiveSheet(draft);
  const inputPosition = parseCellKey(inputCellKey);

  if (!inputPosition) {
    return null;
  }

  updateCellRaw(sheet, inputPosition, inputValue);

  return evaluateWorkbook(draft, activeSheetId)[formulaCellKey] ?? "";
}

export function createOneVariableDataTablePlan({
  activeSheetId,
  document,
  formulaCellKey,
  inputCellKey,
  sourceRange,
}: DataTableRequest & {
  activeSheetId: string;
  document: WorkbookDocument;
  sourceRange: CellRange;
}): { error: string; plan?: never } | { error: null; plan: DataTablePlan } {
  const sheet = getActiveSheet(document);
  const normalizedFormulaCellKey = normalizeCellReference(formulaCellKey);
  const normalizedInputCellKey = normalizeCellReference(inputCellKey);

  if (!normalizedFormulaCellKey || !normalizedInputCellKey) {
    return { error: "Use valid active-sheet cell references." };
  }

  if (normalizedFormulaCellKey === normalizedInputCellKey) {
    return { error: "The formula cell and input cell must be different." };
  }

  if (!sheet.cells[normalizedFormulaCellKey]?.raw.startsWith("=")) {
    return { error: "The formula cell must contain a formula." };
  }

  if (sheet.cells[normalizedInputCellKey]?.raw.startsWith("=")) {
    return { error: "The input cell must be a normal editable value." };
  }

  const inputValues = getInputValues(document, sourceRange);

  if (inputValues.length === 0) {
    return { error: "Select one or more non-formula input values." };
  }

  const outputRange = createOutputRange(sheet, sourceRange, inputValues.length);

  if (!outputRange) {
    return { error: "There is not enough worksheet space for the data table." };
  }

  const rows = inputValues.map((inputValue) => ({
    inputValue,
    resultValue:
      evaluateFormulaForInput({
        activeSheetId,
        document,
        formulaCellKey: normalizedFormulaCellKey,
        inputCellKey: normalizedInputCellKey,
        inputValue,
      }) ?? "",
  }));

  return {
    error: null,
    plan: {
      outputRange,
      rows,
    },
  };
}

export function writeOneVariableDataTableToDocument(
  document: WorkbookDocument,
  plan: DataTablePlan,
) {
  const sheet = getActiveSheet(document);
  const startRowIndex = plan.outputRange.startRowIndex;
  const startColumnIndex = plan.outputRange.startColumnIndex;

  sheet.cells[cellKey(startRowIndex, startColumnIndex)] = {
    raw: "Input",
    style: headerStyle,
  };
  sheet.cells[cellKey(startRowIndex, startColumnIndex + 1)] = {
    raw: "Result",
    style: headerStyle,
  };

  plan.rows.forEach((row, rowOffset) => {
    const rowIndex = startRowIndex + rowOffset + 1;

    sheet.cells[cellKey(rowIndex, startColumnIndex)] = {
      raw: row.inputValue,
    };
    sheet.cells[cellKey(rowIndex, startColumnIndex + 1)] = {
      raw: row.resultValue,
    };
  });

  return plan.outputRange;
}
