import { cellKey, columnLabel } from "@/features/workbooks/addresses";
import { quoteFormulaSheetName } from "@/features/spreadsheet/formula-references";
import type {
  ChartRange,
  SheetData,
  TableDefinition,
  WorkbookDocument,
} from "@/features/workbooks/types";

type StructuredRowMode = "all" | "data" | "headers" | "totals" | "thisRow";

export function getStructuredReferenceSheet(
  document: WorkbookDocument,
  sheetId: string,
) {
  return document.sheets.find((sheet) => sheet.id === sheetId) ?? null;
}

function normalizeLookup(value: string) {
  return value.trim().toLowerCase();
}

function normalizeSpecial(value: string) {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

function absoluteAddress(rowIndex: number, columnIndex: number) {
  return `$${columnLabel(columnIndex)}$${rowIndex + 1}`;
}

export function rangeToFormulaReference({
  range,
  sheet,
  sheetNamesById,
}: {
  range: ChartRange;
  sheet: SheetData;
  sheetNamesById?: Map<string, string>;
}) {
  const sheetName = sheetNamesById?.get(sheet.id) ?? sheet.name;
  const sheetReference = quoteFormulaSheetName(sheetName);
  const start = absoluteAddress(range.startRowIndex, range.startColumnIndex);
  const end = absoluteAddress(range.endRowIndex, range.endColumnIndex);

  return start === end
    ? `${sheetReference}!${start}`
    : `${sheetReference}!${start}:${sheetReference}!${end}`;
}

export function getTableDataRows(table: TableDefinition) {
  const startRowIndex =
    table.range.startRowIndex + (table.showHeaderRow ? 1 : 0);
  const endRowIndex = table.range.endRowIndex - (table.showTotalsRow ? 1 : 0);

  return startRowIndex <= endRowIndex
    ? { startRowIndex, endRowIndex }
    : null;
}

function getTableRowRange({
  currentRowIndex,
  mode,
  table,
}: {
  currentRowIndex: number;
  mode: StructuredRowMode;
  table: TableDefinition;
}) {
  if (mode === "all") {
    return {
      startRowIndex: table.range.startRowIndex,
      endRowIndex: table.range.endRowIndex,
    };
  }

  if (mode === "headers") {
    return table.showHeaderRow
      ? {
          startRowIndex: table.range.startRowIndex,
          endRowIndex: table.range.startRowIndex,
        }
      : null;
  }

  if (mode === "totals") {
    return table.showTotalsRow
      ? {
          startRowIndex: table.range.endRowIndex,
          endRowIndex: table.range.endRowIndex,
        }
      : null;
  }

  if (mode === "thisRow") {
    const dataRows = getTableDataRows(table);

    return dataRows &&
      currentRowIndex >= dataRows.startRowIndex &&
      currentRowIndex <= dataRows.endRowIndex
      ? { startRowIndex: currentRowIndex, endRowIndex: currentRowIndex }
      : null;
  }

  return getTableDataRows(table);
}

function getTableColumns(document: WorkbookDocument, table: TableDefinition) {
  const sheet = getStructuredReferenceSheet(document, table.sheetId);

  if (!sheet) {
    return [];
  }

  return Array.from(
    {
      length: table.range.endColumnIndex - table.range.startColumnIndex + 1,
    },
    (_, offset) => {
      const columnIndex = table.range.startColumnIndex + offset;
      const header = table.showHeaderRow
        ? sheet.cells[cellKey(table.range.startRowIndex, columnIndex)]?.raw.trim()
        : "";

      return {
        columnIndex,
        name: header || columnLabel(columnIndex),
      };
    },
  );
}

function findColumnIndex(
  document: WorkbookDocument,
  table: TableDefinition,
  name: string,
) {
  const normalizedName = normalizeLookup(name);

  return (
    getTableColumns(document, table).find(
      (column) => normalizeLookup(column.name) === normalizedName,
    )?.columnIndex ?? null
  );
}

function parseStructuredItems(value: string) {
  const trimmed = value.trim();
  const bracketedItems = Array.from(trimmed.matchAll(/\[([^\]]+)\]/g)).map(
    (match) => match[1],
  );

  return {
    hasColumnRange: /\]\s*:\s*\[/.test(trimmed),
    items: bracketedItems.length > 0 ? bracketedItems : [trimmed],
  };
}

function rowModeFromItem(item: string): StructuredRowMode | null {
  const special = normalizeSpecial(item);

  if (special === "#all") {
    return "all";
  }

  if (special === "#data") {
    return "data";
  }

  if (special === "#headers") {
    return "headers";
  }

  if (special === "#totals") {
    return "totals";
  }

  if (special === "#thisrow") {
    return "thisRow";
  }

  return null;
}

export function structuredReferenceRange({
  content,
  document,
  rowIndex,
  table,
}: {
  content: string;
  document: WorkbookDocument;
  rowIndex: number;
  table: TableDefinition;
}) {
  const { hasColumnRange, items } = parseStructuredItems(content);
  let rowMode: StructuredRowMode = "data";
  const columnNames: string[] = [];

  for (const item of items) {
    const trimmedItem = item.trim();
    const itemRowMode = rowModeFromItem(trimmedItem);

    if (itemRowMode) {
      rowMode = itemRowMode;
      continue;
    }

    if (trimmedItem.startsWith("@")) {
      rowMode = "thisRow";
      columnNames.push(trimmedItem.slice(1));
      continue;
    }

    if (trimmedItem) {
      columnNames.push(trimmedItem);
    }
  }

  const rowRange = getTableRowRange({
    currentRowIndex: rowIndex,
    mode: rowMode,
    table,
  });

  if (!rowRange) {
    return null;
  }

  let startColumnIndex = table.range.startColumnIndex;
  let endColumnIndex = table.range.endColumnIndex;

  if (columnNames.length > 0) {
    const firstColumnIndex = findColumnIndex(document, table, columnNames[0]);
    const lastColumnName = hasColumnRange
      ? columnNames[columnNames.length - 1]
      : columnNames[0];
    const lastColumnIndex = findColumnIndex(document, table, lastColumnName);

    if (firstColumnIndex === null || lastColumnIndex === null) {
      return null;
    }

    startColumnIndex = Math.min(firstColumnIndex, lastColumnIndex);
    endColumnIndex = Math.max(firstColumnIndex, lastColumnIndex);
  }

  return {
    startRowIndex: rowRange.startRowIndex,
    startColumnIndex,
    endRowIndex: rowRange.endRowIndex,
    endColumnIndex,
  };
}
