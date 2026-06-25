import {
  getStructuredReferenceSheet,
  getTableDataRows,
  rangeToFormulaReference,
  structuredReferenceRange,
} from "@/features/spreadsheet/structured-table-reference-ranges";
import type { SheetData, WorkbookDocument } from "@/features/workbooks/types";

type RewriteStructuredTableReferencesInput = {
  columnIndex: number;
  document: WorkbookDocument;
  formula: string;
  rowIndex: number;
  sheet: SheetData;
  sheetNamesById?: Map<string, string>;
};

function isReferenceBoundary(value: string | undefined) {
  return !value || !/[A-Za-z0-9_]/.test(value);
}

function findClosingBracket(value: string, openBracketIndex: number) {
  let depth = 0;

  for (let index = openBracketIndex; index < value.length; index += 1) {
    const character = value[index];

    if (character === "[") {
      depth += 1;
    } else if (character === "]") {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function rewriteQualifiedTableReferences(
  chunk: string,
  input: RewriteStructuredTableReferencesInput,
) {
  const tables = [...(input.document.tables ?? [])].sort(
    (left, right) => right.name.length - left.name.length,
  );
  let rewritten = chunk;

  for (const table of tables) {
    let cursor = 0;

    while (cursor < rewritten.length) {
      const tableIndex = rewritten
        .toLowerCase()
        .indexOf(table.name.toLowerCase(), cursor);

      if (tableIndex === -1) {
        break;
      }

      const bracketIndex = tableIndex + table.name.length;

      if (
        rewritten[bracketIndex] !== "[" ||
        !isReferenceBoundary(rewritten[tableIndex - 1])
      ) {
        cursor = bracketIndex;
        continue;
      }

      const closingIndex = findClosingBracket(rewritten, bracketIndex);

      if (closingIndex === -1) {
        cursor = bracketIndex + 1;
        continue;
      }

      const targetSheet = getStructuredReferenceSheet(
        input.document,
        table.sheetId,
      );
      const range = structuredReferenceRange({
        content: rewritten.slice(bracketIndex + 1, closingIndex),
        document: input.document,
        rowIndex: input.rowIndex,
        table,
      });

      if (!targetSheet || !range) {
        cursor = closingIndex + 1;
        continue;
      }

      const replacement = rangeToFormulaReference({
        range,
        sheet: targetSheet,
        sheetNamesById: input.sheetNamesById,
      });

      rewritten =
        rewritten.slice(0, tableIndex) +
        replacement +
        rewritten.slice(closingIndex + 1);
      cursor = tableIndex + replacement.length;
    }
  }

  return rewritten;
}

function findCurrentTable(input: RewriteStructuredTableReferencesInput) {
  return (
    (input.document.tables ?? []).find((table) => {
      const dataRows = getTableDataRows(table);

      return (
        table.sheetId === input.sheet.id &&
        Boolean(dataRows) &&
        input.rowIndex >= (dataRows?.startRowIndex ?? 0) &&
        input.rowIndex <= (dataRows?.endRowIndex ?? -1) &&
        input.columnIndex >= table.range.startColumnIndex &&
        input.columnIndex <= table.range.endColumnIndex
      );
    }) ?? null
  );
}

function rewriteCurrentRowReferences(
  chunk: string,
  input: RewriteStructuredTableReferencesInput,
) {
  const currentTable = findCurrentTable(input);

  if (!currentTable) {
    return chunk;
  }

  return chunk.replace(/\[@([^\]]+)\]/g, (match, columnName: string) => {
    const targetSheet = getStructuredReferenceSheet(
      input.document,
      currentTable.sheetId,
    );
    const range = structuredReferenceRange({
      content: `@${columnName}`,
      document: input.document,
      rowIndex: input.rowIndex,
      table: currentTable,
    });

    return targetSheet && range
      ? rangeToFormulaReference({
          range,
          sheet: targetSheet,
          sheetNamesById: input.sheetNamesById,
        })
      : match;
  });
}

function rewriteFormulaChunks(
  formula: string,
  rewriteChunk: (chunk: string) => string,
) {
  let rewritten = "";
  let chunk = "";
  let inString = false;

  for (const character of formula) {
    if (character === '"') {
      rewritten += inString ? chunk + character : rewriteChunk(chunk) + character;
      chunk = "";
      inString = !inString;
      continue;
    }

    chunk += character;
  }

  return rewritten + (inString ? chunk : rewriteChunk(chunk));
}

export function rewriteStructuredTableReferences(
  input: RewriteStructuredTableReferencesInput,
) {
  if (!input.formula.trimStart().startsWith("=")) {
    return input.formula;
  }

  return rewriteFormulaChunks(input.formula, (chunk) =>
    rewriteCurrentRowReferences(
      rewriteQualifiedTableReferences(chunk, input),
      input,
    ),
  );
}
