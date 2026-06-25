import { cellKey, parseCellKey } from "@/features/workbooks/addresses";
import { isFormulaBlockedBySecurityPolicy } from "@/features/workbooks/formula-security";
import { getFormulaReferences } from "@/features/spreadsheet/formula-audit";
import type {
  ChartRange,
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";

export type FormulaCheckingSeverity = "warning" | "info";

export type FormulaCheckingIssue = {
  id: string;
  key: string;
  rowIndex: number;
  columnIndex: number;
  severity: FormulaCheckingSeverity;
  title: string;
  details: string;
  formula: string;
};

const MAX_ISSUES = 80;
const MAX_REFERENCE_CELLS_TO_SCAN = 1200;
const externalWorkbookPattern =
  /\[[^\]]+\.(?:csv|ods|xls|xlsx|xlsm|xlsb)[^\]]*\]/i;
const volatileFunctionPattern =
  /\b(NOW|TODAY|RAND|RANDBETWEEN|OFFSET|INDIRECT)\s*\(/i;
const numericTextPattern =
  /^'\s*[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?\s*$/i;

function countReferencedBlankCells(sheet: SheetData, range: ChartRange) {
  let blankCount = 0;
  let scannedCount = 0;

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
      if (!sheet.cells[cellKey(rowIndex, columnIndex)]?.raw) {
        blankCount += 1;
      }

      scannedCount += 1;

      if (scannedCount >= MAX_REFERENCE_CELLS_TO_SCAN) {
        return { blankCount, scannedCount, wasCapped: true };
      }
    }
  }

  return { blankCount, scannedCount, wasCapped: false };
}

function createIssue(input: Omit<FormulaCheckingIssue, "id">) {
  return {
    ...input,
    id: `${input.key}:${input.title}`,
  };
}

function visibleFormula(raw: string, hidden: boolean) {
  return hidden ? "Formula hidden" : raw;
}

export function getFormulaCheckingIssues({
  document,
  sheet,
  sheets,
  computedValues,
  hideHiddenFormulas = false,
}: {
  document?: WorkbookDocument;
  sheet: SheetData;
  sheets: SheetData[];
  computedValues: Record<string, string>;
  hideHiddenFormulas?: boolean;
}) {
  const issues: FormulaCheckingIssue[] = [];

  for (const [key, cell] of Object.entries(sheet.cells)) {
    const position = parseCellKey(key);

    if (!position) {
      continue;
    }

    const raw = cell.raw.trim();
    const hidden = hideHiddenFormulas && cell.style?.formulaHidden === true;

    if (raw.startsWith("'=")) {
      issues.push(
        createIssue({
          key,
          rowIndex: position.rowIndex,
          columnIndex: position.columnIndex,
          severity: "warning",
          title: "Formula stored as text",
          details: "This cell starts with an apostrophe, so it will not calculate.",
          formula: hidden ? "Formula hidden" : raw,
        }),
      );
    } else if (numericTextPattern.test(raw)) {
      issues.push(
        createIssue({
          key,
          rowIndex: position.rowIndex,
          columnIndex: position.columnIndex,
          severity: "info",
          title: "Number stored as text",
          details: "This value is prefixed as text and may not behave as a number in formulas.",
          formula: raw,
        }),
      );
    }

    if (!raw.startsWith("=")) {
      if (issues.length >= MAX_ISSUES) {
        break;
      }

      continue;
    }

    const formula = visibleFormula(raw, hidden);
    const result = computedValues[key] ?? "";

    if (isFormulaBlockedBySecurityPolicy(raw)) {
      issues.push(
        createIssue({
          key,
          rowIndex: position.rowIndex,
          columnIndex: position.columnIndex,
          severity: "warning",
          title: "Formula blocked by security policy",
          details:
            "External-resource and workbook-link formulas are not evaluated in the browser sandbox.",
          formula,
        }),
      );

      if (issues.length >= MAX_ISSUES) {
        break;
      }

      continue;
    }

    if (result.startsWith("#")) {
      issues.push(
        createIssue({
          key,
          rowIndex: position.rowIndex,
          columnIndex: position.columnIndex,
          severity: "warning",
          title: "Formula returns an error",
          details: `The current calculated result is ${result}.`,
          formula,
        }),
      );
    }

    if (externalWorkbookPattern.test(raw)) {
      issues.push(
        createIssue({
          key,
          rowIndex: position.rowIndex,
          columnIndex: position.columnIndex,
          severity: "warning",
          title: "External workbook reference",
          details: "The formula references another workbook, which may not refresh in the browser.",
          formula,
        }),
      );
    }

    if (volatileFunctionPattern.test(raw)) {
      issues.push(
        createIssue({
          key,
          rowIndex: position.rowIndex,
          columnIndex: position.columnIndex,
          severity: "info",
          title: "Volatile formula",
          details: "This formula can recalculate frequently and may affect large workbook performance.",
          formula,
        }),
      );
    }

    const references = getFormulaReferences({
      formula: raw,
      activeSheet: sheet,
      cellPosition: position,
      document,
      sheets,
    });

    for (const reference of references) {
      const referencedSheet = sheets.find(
        (item) => item.id === reference.sheetId,
      );

      if (!referencedSheet) {
        continue;
      }

      const { blankCount, scannedCount, wasCapped } =
        countReferencedBlankCells(referencedSheet, reference.range);

      if (blankCount === 0) {
        continue;
      }

      issues.push(
        createIssue({
          key,
          rowIndex: position.rowIndex,
          columnIndex: position.columnIndex,
          severity: "info",
          title: "Formula references blank cells",
          details: `${reference.sheetName}!${reference.address} includes ${blankCount} blank ${blankCount === 1 ? "cell" : "cells"}${wasCapped ? ` in the first ${scannedCount} scanned cells` : ""}.`,
          formula,
        }),
      );
      break;
    }

    if (issues.length >= MAX_ISSUES) {
      break;
    }
  }

  return issues.slice(0, MAX_ISSUES);
}
