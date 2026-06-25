import {
  HyperFormula,
  type SerializedNamedExpression,
  type Sheet,
  type Sheets,
} from "hyperformula";
import {
  cellKey,
  columnLabel,
  parseCellKey,
} from "@/features/workbooks/addresses";
import { formatValueByCellStyle } from "@/features/workbooks/number-formats";
import {
  FORMULA_SECURITY_BLOCKED_RESULT,
  isFormulaBlockedBySecurityPolicy,
} from "@/features/workbooks/formula-security";
import {
  ensureEssenceFormulaCompatibilityFunctionsRegistered,
} from "@/features/spreadsheet/formula-compatibility-functions";
import { normalizeExcelFormulaCompatibility } from "@/features/spreadsheet/formula-compatibility-normalization";
import { getSheetDynamicArrayState } from "@/features/spreadsheet/dynamic-arrays";
import { rewriteWorkbookCustomFunctions } from "@/features/spreadsheet/custom-function-evaluation";
import { getNamedRangeAreas } from "@/features/spreadsheet/multi-range-selection";
import { quoteFormulaSheetName } from "@/features/spreadsheet/formula-references";
import { rewriteStructuredTableReferences } from "@/features/spreadsheet/structured-table-references";
import type {
  CellStyle,
  NamedRange,
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";

export type WorkbookEvaluationOptions = {
  previousValues?: Record<string, string>;
  targetKeys?: Set<string>;
};

function coerceCellValue(
  raw: string,
  context?: {
    columnIndex: number;
    document: WorkbookDocument;
    rowIndex: number;
    sheet: SheetData;
    sheetNamesById: Map<string, string>;
  },
) {
  if (isFormulaBlockedBySecurityPolicy(raw)) {
    return FORMULA_SECURITY_BLOCKED_RESULT;
  }

  if (raw.startsWith("=")) {
    const rewrittenFormula = context
      ? rewriteStructuredTableReferences({
          columnIndex: context.columnIndex,
          document: context.document,
          formula: raw,
          rowIndex: context.rowIndex,
          sheet: context.sheet,
          sheetNamesById: context.sheetNamesById,
        })
      : raw;
    const customFunctionFormula = context
      ? rewriteWorkbookCustomFunctions({
          customFunctions: context.document.customFunctions,
          formula: rewrittenFormula,
        })
      : rewrittenFormula;

    return normalizeExcelFormulaCompatibility(customFunctionFormula);
  }

  if (raw.trim() === "") {
    return "";
  }

  const numeric = Number(raw);
  return Number.isFinite(numeric) && raw.trim() !== "" ? numeric : raw;
}

function formatFormulaError(value: object) {
  const type = "type" in value ? String(value.type) : "ERROR";

  const labels: Record<string, string> = {
    CYCLE: "#CYCLE!",
    DIV_BY_ZERO: "#DIV/0!",
    ERROR: "#ERROR!",
    LIC: "#LIC!",
    NA: "#N/A",
    NAME: "#NAME?",
    NUM: "#NUM!",
    REF: "#REF!",
    SPILL: "#SPILL!",
    VALUE: "#VALUE!",
  };

  return labels[type] ?? "#ERROR!";
}

function formatByStyle(value: unknown, style?: CellStyle) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    return formatFormulaError(value);
  }

  const formattedValue = formatValueByCellStyle(value, style);

  if (formattedValue !== null) {
    return formattedValue;
  }

  return String(value);
}

function absoluteAddress(rowIndex: number, columnIndex: number) {
  return `$${columnLabel(columnIndex)}$${rowIndex + 1}`;
}

function namedRangeExpression(
  namedRange: NamedRange,
  sheetNamesById: Map<string, string>,
) {
  const sheetName = sheetNamesById.get(namedRange.sheetId);

  if (!sheetName) {
    return null;
  }

  const range = getNamedRangeAreas(namedRange)[0];

  if (!range) {
    return null;
  }

  const start = absoluteAddress(
    range.startRowIndex,
    range.startColumnIndex,
  );
  const end = absoluteAddress(
    range.endRowIndex,
    range.endColumnIndex,
  );
  const sheetReference = quoteFormulaSheetName(sheetName);

  return start === end
    ? `=${sheetReference}!${start}`
    : `=${sheetReference}!${start}:${sheetReference}!${end}`;
}

function createNamedExpressions(
  namedRanges: NamedRange[],
  sheetNamesById: Map<string, string>,
) {
  const names = new Set<string>();
  const expressions: SerializedNamedExpression[] = [];

  for (const namedRange of namedRanges) {
    const name = namedRange.name.trim();
    const key = name.toLowerCase();

    if (!name || names.has(key)) {
      continue;
    }

    const expression = namedRangeExpression(namedRange, sheetNamesById);

    if (!expression) {
      continue;
    }

    names.add(key);
    expressions.push({
      name,
      expression,
    });
  }

  return expressions;
}

function createFormulaSheetName(
  sheet: SheetData,
  index: number,
  usedNames: Set<string>,
) {
  const baseName = (sheet.name.trim() || `Sheet ${index + 1}`).slice(0, 80);
  let candidate = baseName;
  let suffix = 2;

  while (usedNames.has(candidate.toLowerCase())) {
    candidate = `${baseName} ${suffix}`;
    suffix += 1;
  }

  usedNames.add(candidate.toLowerCase());
  return candidate;
}

function sheetToMatrix({
  document,
  sheet,
  sheetNamesById,
}: {
  document: WorkbookDocument;
  sheet: SheetData;
  sheetNamesById: Map<string, string>;
}): Sheet {
  return Array.from({ length: sheet.rowCount }, (_, rowIndex) =>
    Array.from({ length: sheet.columnCount }, (_, columnIndex) =>
      coerceCellValue(sheet.cells[cellKey(rowIndex, columnIndex)]?.raw ?? "", {
        columnIndex,
        document,
        rowIndex,
        sheet,
        sheetNamesById,
      }),
    ),
  );
}

export function evaluateWorkbook(
  document: WorkbookDocument,
  activeSheetId = document.activeSheetId,
  options: WorkbookEvaluationOptions = {},
) {
  ensureEssenceFormulaCompatibilityFunctionsRegistered();

  const sheetNamesById = new Map<string, string>();
  const usedNames = new Set<string>();

  document.sheets.forEach((sheet, index) => {
    const sheetName = createFormulaSheetName(sheet, index, usedNames);

    sheetNamesById.set(sheet.id, sheetName);
  });

  const sheets = document.sheets.reduce<Sheets>((items, sheet) => {
    const sheetName = sheetNamesById.get(sheet.id);

    if (!sheetName) {
      return items;
    }

    items[sheetName] = sheetToMatrix({ document, sheet, sheetNamesById });
    return items;
  }, {});
  const activeSheet =
    document.sheets.find((sheet) => sheet.id === activeSheetId) ??
    document.sheets[0];
  const values: Record<string, string> = options.previousValues
    ? { ...options.previousValues }
    : {};
  const activeSheetName = activeSheet ? sheetNamesById.get(activeSheet.id) : null;

  if (!activeSheet || !activeSheetName) {
    return values;
  }

  const engine = HyperFormula.buildFromSheets(
    sheets,
    {
      licenseKey: "gpl-v3",
    },
    createNamedExpressions(document.namedRanges ?? [], sheetNamesById),
  );
  const engineSheetId = engine.getSheetId(activeSheetName) ?? 0;

  for (const target of getEvaluationTargets(activeSheet, options.targetKeys)) {
    const { columnIndex, key, rowIndex } = target;
    const cell = activeSheet.cells[key];
    const raw = cell?.raw ?? "";

    delete values[key];

    if (!raw) {
      continue;
    }

    if (isFormulaBlockedBySecurityPolicy(raw)) {
      values[key] = FORMULA_SECURITY_BLOCKED_RESULT;
      continue;
    }

    values[key] = raw.startsWith("=")
      ? formatByStyle(
          engine.getCellValue({
            sheet: engineSheetId,
            row: rowIndex,
            col: columnIndex,
          }),
          cell?.style,
        )
      : formatByStyle(raw, cell?.style);
  }

  engine.destroy();
  return getSheetDynamicArrayState({
    sheet: activeSheet,
    computedValues: values,
  }).computedValues;
}

function getEvaluationTargets(sheet: SheetData, targetKeys?: Set<string>) {
  if (!targetKeys) {
    return Array.from({ length: sheet.rowCount }, (_, rowIndex) =>
      Array.from({ length: sheet.columnCount }, (_, columnIndex) => ({
        columnIndex,
        key: cellKey(rowIndex, columnIndex),
        rowIndex,
      })),
    ).flat();
  }

  return [...targetKeys].flatMap((key) => {
    const position = parseCellKey(key);

    if (
      !position ||
      position.rowIndex < 0 ||
      position.columnIndex < 0 ||
      position.rowIndex >= sheet.rowCount ||
      position.columnIndex >= sheet.columnCount
    ) {
      return [];
    }

    return [
      {
        columnIndex: position.columnIndex,
        key,
        rowIndex: position.rowIndex,
      },
    ];
  });
}
