import { cellKey, parseCellKey } from "@/features/workbooks/addresses";
import { evaluateWorkbook } from "@/features/spreadsheet/formula-engine";
import {
  cloneDocument,
  getActiveSheet,
} from "@/features/spreadsheet/state/document-state";
import { updateCellRaw } from "@/features/spreadsheet/state/edit-state";
import type { WorkbookDocument } from "@/features/workbooks/types";

export function normalizeSolverCellReference(value: string) {
  const position = parseCellKey(value);

  return position ? cellKey(position.rowIndex, position.columnIndex) : null;
}

export function parseSolverNumericValue(value: string) {
  const normalized = value.trim().replace(/[$,\s]/g, "").replace(/%$/, "");
  const numericValue = Number(normalized);

  return Number.isFinite(numericValue) ? numericValue : null;
}

export function formatSolverValue(value: number) {
  if (!Number.isFinite(value)) {
    return "";
  }

  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toPrecision(12)));
}

export function evaluateSolverTargetAt(input: {
  activeSheetId: string;
  changingCellKey: string;
  changingValue: number;
  document: WorkbookDocument;
  targetCellKey: string;
}) {
  const draft = cloneDocument(input.document);

  draft.activeSheetId = input.activeSheetId;

  const sheet = getActiveSheet(draft);
  const changingPosition = parseCellKey(input.changingCellKey);

  if (!changingPosition) {
    return null;
  }

  updateCellRaw(
    sheet,
    changingPosition,
    formatSolverValue(input.changingValue),
  );

  const values = evaluateWorkbook(draft, input.activeSheetId);

  return parseSolverNumericValue(values[input.targetCellKey] ?? "");
}

export function evaluateSolverCellsAt(input: {
  activeSheetId: string;
  document: WorkbookDocument;
  targetCellKey: string;
  valueCellKeys: string[];
  variableValues: Array<{ cellKey: string; value: number }>;
}) {
  const draft = cloneDocument(input.document);

  draft.activeSheetId = input.activeSheetId;

  const sheet = getActiveSheet(draft);

  for (const variable of input.variableValues) {
    const position = parseCellKey(variable.cellKey);

    if (!position) {
      return null;
    }

    updateCellRaw(sheet, position, formatSolverValue(variable.value));
  }

  const values = evaluateWorkbook(draft, input.activeSheetId);
  const cellValues = new Map<string, number | null>();

  for (const key of input.valueCellKeys) {
    cellValues.set(key, parseSolverNumericValue(values[key] ?? ""));
  }

  return {
    targetValue: parseSolverNumericValue(values[input.targetCellKey] ?? ""),
    cellValues,
  };
}
