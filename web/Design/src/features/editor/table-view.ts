import {
  clampTableColumns,
  clampTableRows,
  getTableCell,
} from "@/features/editor/table";
import { getTableCellDisplayValue } from "@/features/editor/table-formulas";
import { getActiveTableSheet } from "@/features/editor/table-sheets";
import type { TableElement } from "@/features/editor/types";

export type TableSortDirection = "asc" | "desc";

export type TableViewRow = {
  cells: string[];
  isEmptyState: boolean;
  isHeader: boolean;
  sourceRowIndex: number | null;
};

export type TableView = {
  columns: number;
  filteredRowCount: number;
  rows: TableViewRow[];
  sourceDataRowCount: number;
};

export function createTableView(element: TableElement): TableView {
  const activeSheet = getActiveTableSheet(element);
  const rows = clampTableRows(activeSheet.rows);
  const columns = clampTableColumns(activeSheet.columns);
  const headerRow = activeSheet.headerRow
    ? createSourceRow(element, 0, columns, true)
    : null;
  const dataStartIndex = activeSheet.headerRow ? 1 : 0;
  const sourceDataRows = Array.from(
    { length: Math.max(0, rows - dataStartIndex) },
    (_, index) => createSourceRow(element, dataStartIndex + index, columns, false),
  );
  const filteredRows = filterRows(sourceDataRows, activeSheet.filterQuery);
  const sortedRows = sortRows(filteredRows, element);
  const visibleRows =
    sortedRows.length > 0
      ? sortedRows
      : activeSheet.filterQuery?.trim()
        ? [createEmptyStateRow(columns)]
        : sortedRows;

  return {
    columns,
    filteredRowCount: filteredRows.length,
    rows: headerRow ? [headerRow, ...visibleRows] : visibleRows,
    sourceDataRowCount: sourceDataRows.length,
  };
}

export function hasActiveTableFilter(element: TableElement) {
  return Boolean(getActiveTableSheet(element).filterQuery?.trim());
}

export function hasActiveTableSort(element: TableElement) {
  const activeSheet = getActiveTableSheet(element);

  return (
    typeof activeSheet.sortColumnIndex === "number" &&
    activeSheet.sortColumnIndex >= 0 &&
    activeSheet.sortColumnIndex < clampTableColumns(activeSheet.columns)
  );
}

function createSourceRow(
  element: TableElement,
  rowIndex: number,
  columns: number,
  isHeader: boolean,
): TableViewRow {
  return {
    cells: Array.from({ length: columns }, (_, columnIndex) => {
      return getTableCellDisplayValue(element, rowIndex, columnIndex).displayValue;
    }),
    isEmptyState: false,
    isHeader,
    sourceRowIndex: rowIndex,
  };
}

function createEmptyStateRow(columns: number): TableViewRow {
  return {
    cells: Array.from({ length: columns }, (_, index) =>
      index === 0 ? "No matching rows" : "",
    ),
    isEmptyState: true,
    isHeader: false,
    sourceRowIndex: null,
  };
}

function filterRows(rows: TableViewRow[], query: string | undefined) {
  const normalizedQuery = query?.trim().toLowerCase();

  if (!normalizedQuery) return rows;

  return rows.filter((row) =>
    row.cells.some((cell) => cell.toLowerCase().includes(normalizedQuery)),
  );
}

function sortRows(rows: TableViewRow[], element: TableElement) {
  if (!hasActiveTableSort(element)) return rows;

  const activeSheet = getActiveTableSheet(element);
  const columnIndex = activeSheet.sortColumnIndex ?? 0;
  const direction = activeSheet.sortDirection === "desc" ? -1 : 1;

  return [...rows].sort((first, second) => {
    const firstValue = first.cells[columnIndex] ?? "";
    const secondValue = second.cells[columnIndex] ?? "";
    const firstNumber = parseSortableNumber(firstValue);
    const secondNumber = parseSortableNumber(secondValue);

    if (firstNumber !== null && secondNumber !== null) {
      return (firstNumber - secondNumber) * direction;
    }

    return firstValue.localeCompare(secondValue, undefined, {
      numeric: true,
      sensitivity: "base",
    }) * direction;
  });
}

function parseSortableNumber(value: string) {
  const normalized = value.trim().replace(/,/g, "");

  if (!normalized) return null;

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

export function getTableRawRows(element: TableElement) {
  const activeSheet = getActiveTableSheet(element);
  const rows = clampTableRows(activeSheet.rows);
  const columns = clampTableColumns(activeSheet.columns);

  return Array.from({ length: rows }, (_, rowIndex) =>
    Array.from({ length: columns }, (_, columnIndex) =>
      getTableCell(activeSheet.cells, activeSheet.columns, rowIndex, columnIndex),
    ),
  );
}
