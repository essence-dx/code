import { cellKey, columnIndex } from "@/features/workbooks/addresses";
import { rewriteStructuredTableReferences } from "@/features/spreadsheet/structured-table-references";
import type {
  ChartRange,
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";

export type FormulaReference = {
  id: string;
  sheetId: string;
  sheetName: string;
  address: string;
  range: ChartRange;
};

const MAX_HIGHLIGHTED_REFERENCE_CELLS = 1200;
const cellReferencePattern =
  /(?:(?:'([^']+)'|([A-Za-z_][\w .]*))!)?\$?([A-Z]{1,3})\$?([1-9]\d*)(?::\$?([A-Z]{1,3})\$?([1-9]\d*))?/gi;

function stripDoubleQuotedText(formula: string) {
  return formula.replace(/"(?:""|[^"])*"/g, " ");
}

function getSheetByName(sheets: SheetData[], sheetName: string) {
  const normalizedName = sheetName.toLowerCase();

  return (
    sheets.find((sheet) => sheet.name.toLowerCase() === normalizedName) ?? null
  );
}

function isReferenceBoundary(value: string | undefined) {
  return !value || !/[A-Z0-9_]/i.test(value);
}

function getReferenceRange(
  match: RegExpExecArray,
  sheet: SheetData,
): ChartRange | null {
  const startColumnIndex = columnIndex(match[3]);
  const startRowIndex = Number(match[4]) - 1;
  const rawEndColumnIndex = match[5] ? columnIndex(match[5]) : startColumnIndex;
  const rawEndRowIndex = match[6] ? Number(match[6]) - 1 : startRowIndex;
  const endColumnIndex = Math.min(
    Math.max(rawEndColumnIndex, startColumnIndex),
    sheet.columnCount - 1,
  );
  const endRowIndex = Math.min(
    Math.max(rawEndRowIndex, startRowIndex),
    sheet.rowCount - 1,
  );

  if (
    startColumnIndex < 0 ||
    startRowIndex < 0 ||
    startColumnIndex >= sheet.columnCount ||
    startRowIndex >= sheet.rowCount
  ) {
    return null;
  }

  return {
    startRowIndex,
    startColumnIndex,
    endRowIndex,
    endColumnIndex,
  };
}

function rangeAddress(range: ChartRange) {
  const startKey = cellKey(range.startRowIndex, range.startColumnIndex);
  const endKey = cellKey(range.endRowIndex, range.endColumnIndex);

  return startKey === endKey ? startKey : `${startKey}:${endKey}`;
}

export function getFormulaReferences({
  formula,
  activeSheet,
  cellPosition,
  document,
  sheets,
}: {
  formula: string;
  activeSheet: SheetData;
  cellPosition?: {
    columnIndex: number;
    rowIndex: number;
  };
  document?: WorkbookDocument;
  sheets: SheetData[];
}) {
  if (!formula.trim().startsWith("=")) {
    return [];
  }

  const references = new Map<string, FormulaReference>();
  const resolvedFormula =
    document && cellPosition
      ? rewriteStructuredTableReferences({
          columnIndex: cellPosition.columnIndex,
          document,
          formula,
          rowIndex: cellPosition.rowIndex,
          sheet: activeSheet,
        })
      : formula;
  const searchableFormula = stripDoubleQuotedText(resolvedFormula);

  for (const match of searchableFormula.matchAll(cellReferencePattern)) {
    if (
      !isReferenceBoundary(searchableFormula[match.index - 1]) ||
      !isReferenceBoundary(searchableFormula[match.index + match[0].length])
    ) {
      continue;
    }

    const sheetName = match[1] ?? match[2] ?? activeSheet.name;
    const targetSheet = getSheetByName(sheets, sheetName);

    if (!targetSheet) {
      continue;
    }

    const range = getReferenceRange(match, targetSheet);

    if (!range) {
      continue;
    }

    const address = rangeAddress(range);
    const id = `${targetSheet.id}:${address}`;

    references.set(id, {
      id,
      sheetId: targetSheet.id,
      sheetName: targetSheet.name,
      address,
      range,
    });
  }

  return Array.from(references.values());
}

export function getFormulaReferenceKeys(
  references: FormulaReference[],
  activeSheetId: string,
) {
  const keys = new Set<string>();

  for (const reference of references) {
    if (reference.sheetId !== activeSheetId) {
      continue;
    }

    for (
      let rowIndex = reference.range.startRowIndex;
      rowIndex <= reference.range.endRowIndex;
      rowIndex += 1
    ) {
      for (
        let columnIndexValue = reference.range.startColumnIndex;
        columnIndexValue <= reference.range.endColumnIndex;
        columnIndexValue += 1
      ) {
        keys.add(cellKey(rowIndex, columnIndexValue));

        if (keys.size >= MAX_HIGHLIGHTED_REFERENCE_CELLS) {
          return keys;
        }
      }
    }
  }

  return keys;
}
