import { nanoid } from "nanoid";

import {
  clampTableColumns,
  clampTableRows,
  createDefaultTableCells,
  resizeTableCells,
} from "@/features/editor/table";
import type { TableElement, TableSheet } from "@/features/editor/types";

type SheetBackedTableFields = Pick<
  TableElement,
  | "rows"
  | "columns"
  | "cells"
  | "cellStyles"
  | "headerRow"
  | "freezeHeaderRow"
  | "filterQuery"
  | "sortColumnIndex"
  | "sortDirection"
>;

const sheetBackedKeys = [
  "rows",
  "columns",
  "cells",
  "cellStyles",
  "headerRow",
  "freezeHeaderRow",
  "filterQuery",
  "sortColumnIndex",
  "sortDirection",
] as const;

export type TableSheetSnapshot = TableSheet & SheetBackedTableFields;

export function createTableSheet(
  overrides: Partial<TableSheet> = {},
): TableSheet {
  const rows = clampTableRows(overrides.rows ?? 3);
  const columns = clampTableColumns(overrides.columns ?? 3);

  return {
    id: overrides.id ?? nanoid(),
    name: normalizeTableSheetName(overrides.name, "Sheet"),
    rows,
    columns,
    cells:
      overrides.cells?.slice(0, rows * columns) ??
      createDefaultTableCells(rows, columns),
    cellStyles: overrides.cellStyles,
    headerRow: overrides.headerRow ?? true,
    freezeHeaderRow: overrides.freezeHeaderRow ?? true,
    filterQuery: overrides.filterQuery ?? "",
    sortColumnIndex:
      typeof overrides.sortColumnIndex === "number" &&
      overrides.sortColumnIndex >= 0 &&
      overrides.sortColumnIndex < columns
        ? overrides.sortColumnIndex
        : undefined,
    sortDirection: overrides.sortDirection ?? "asc",
  };
}

export function getTableSheets(element: TableElement): TableSheetSnapshot[] {
  const sheets = normalizeTableSheets(element);
  const activeSheetId = getActiveTableSheetId(element, sheets);

  return sheets.map((sheet) =>
    sheet.id === activeSheetId ? tableElementToSheet(element, sheet) : sheet,
  );
}

export function getActiveTableSheet(element: TableElement): TableSheetSnapshot {
  const sheets = getTableSheets(element);
  const activeSheetId = getActiveTableSheetId(element, sheets);

  return sheets.find((sheet) => sheet.id === activeSheetId) ?? sheets[0];
}

export function applyTableSheetUpdates(
  element: TableElement,
  updates: Partial<TableElement>,
): Partial<TableElement> {
  const sheets = getTableSheets(element);
  const activeSheetId = getActiveTableSheetId(element, sheets);
  const activeSheet = getActiveTableSheet(element);
  const patchedSheet = normalizeTableSheet({
    ...activeSheet,
    ...pickSheetBackedUpdates(updates),
  });

  return {
    ...updates,
    activeSheetId,
    sheets: sheets.map((sheet) =>
      sheet.id === activeSheetId ? patchedSheet : sheet,
    ),
  };
}

export function switchTableSheet(
  element: TableElement,
  sheetId: string,
): Partial<TableElement> {
  const sheets = getTableSheets(element);
  const nextSheet = sheets.find((sheet) => sheet.id === sheetId);

  if (!nextSheet) return {};

  return {
    ...sheetToTableFields(nextSheet),
    activeSheetId: nextSheet.id,
    sheets,
  };
}

export function addTableSheet(element: TableElement): Partial<TableElement> {
  const sheets = getTableSheets(element);
  const nextSheet = createTableSheet({
    name: `Sheet ${sheets.length + 1}`,
    rows: element.rows,
    columns: element.columns,
  });

  return {
    ...sheetToTableFields(nextSheet),
    activeSheetId: nextSheet.id,
    sheets: [...sheets, nextSheet],
  };
}

export function duplicateTableSheet(
  element: TableElement,
): Partial<TableElement> {
  const sheets = getTableSheets(element);
  const activeSheet = getActiveTableSheet(element);
  const nextSheet = createTableSheet({
    ...activeSheet,
    id: nanoid(),
    name: createCopyName(activeSheet.name, sheets),
    cells: [...activeSheet.cells],
    cellStyles: activeSheet.cellStyles
      ? { ...activeSheet.cellStyles }
      : undefined,
  });

  return {
    ...sheetToTableFields(nextSheet),
    activeSheetId: nextSheet.id,
    sheets: [...sheets, nextSheet],
  };
}

export function renameTableSheet(
  element: TableElement,
  sheetId: string,
  name: string,
): Partial<TableElement> {
  const sheets = getTableSheets(element);

  return {
    activeSheetId: element.activeSheetId ?? sheets[0]?.id,
    sheets: sheets.map((sheet) =>
      sheet.id === sheetId
        ? { ...sheet, name: normalizeTableSheetName(name, sheet.name) }
        : sheet,
    ),
  };
}

export function removeTableSheet(
  element: TableElement,
  sheetId: string,
): Partial<TableElement> {
  const sheets = getTableSheets(element);
  if (sheets.length <= 1) return {};

  const nextSheets = sheets.filter((sheet) => sheet.id !== sheetId);
  const nextSheet =
    sheetId === (element.activeSheetId ?? sheets[0].id)
      ? nextSheets[0]
      : getActiveTableSheet(element);

  return {
    ...sheetToTableFields(nextSheet),
    activeSheetId: nextSheet.id,
    sheets: nextSheets,
  };
}

export function sheetToTableFields(sheet: TableSheet): SheetBackedTableFields {
  return {
    rows: sheet.rows,
    columns: sheet.columns,
    cells: sheet.cells,
    cellStyles: sheet.cellStyles,
    headerRow: sheet.headerRow ?? true,
    freezeHeaderRow: sheet.freezeHeaderRow ?? true,
    filterQuery: sheet.filterQuery ?? "",
    sortColumnIndex: sheet.sortColumnIndex,
    sortDirection: sheet.sortDirection ?? "asc",
  };
}

function normalizeTableSheets(element: TableElement): TableSheetSnapshot[] {
  const sheets =
    element.sheets && element.sheets.length > 0
      ? element.sheets
      : [tableElementToSheet(element)];

  return sheets.map(normalizeTableSheet);
}

function normalizeTableSheet(sheet: TableSheet): TableSheetSnapshot {
  const rows = clampTableRows(sheet.rows);
  const columns = clampTableColumns(sheet.columns);

  return {
    ...sheet,
    name: normalizeTableSheetName(sheet.name, "Sheet"),
    rows,
    columns,
    cells: resizeTableCells({
      cells: sheet.cells,
      currentRows: sheet.rows,
      currentColumns: sheet.columns,
      nextRows: rows,
      nextColumns: columns,
    }),
    headerRow: sheet.headerRow ?? true,
    freezeHeaderRow: sheet.freezeHeaderRow ?? true,
    filterQuery: sheet.filterQuery ?? "",
    sortColumnIndex:
      typeof sheet.sortColumnIndex === "number" &&
      sheet.sortColumnIndex >= 0 &&
      sheet.sortColumnIndex < columns
        ? sheet.sortColumnIndex
        : undefined,
    sortDirection: sheet.sortDirection ?? "asc",
  };
}

function tableElementToSheet(
  element: TableElement,
  baseSheet?: TableSheet,
): TableSheetSnapshot {
  return normalizeTableSheet({
    id: baseSheet?.id ?? element.activeSheetId ?? nanoid(),
    name: baseSheet?.name ?? "Sheet 1",
    ...sheetToTableFields({
      id: baseSheet?.id ?? "",
      name: baseSheet?.name ?? "",
      rows: element.rows,
      columns: element.columns,
      cells: element.cells,
      cellStyles: element.cellStyles,
      headerRow: element.headerRow,
      freezeHeaderRow: element.freezeHeaderRow,
      filterQuery: element.filterQuery,
      sortColumnIndex: element.sortColumnIndex,
      sortDirection: element.sortDirection,
    }),
  });
}

function getActiveTableSheetId(
  element: TableElement,
  sheets: readonly TableSheet[],
) {
  const requestedId = element.activeSheetId;

  return sheets.some((sheet) => sheet.id === requestedId)
    ? requestedId
    : sheets[0]?.id;
}

function pickSheetBackedUpdates(updates: Partial<TableElement>) {
  return sheetBackedKeys.reduce<Partial<SheetBackedTableFields>>(
    (picked, key) => {
      if (key in updates) {
        picked[key] = updates[key] as never;
      }

      return picked;
    },
    {},
  );
}

function normalizeTableSheetName(value: string | undefined, fallback: string) {
  const normalized = value?.trim();

  return normalized ? normalized.slice(0, 31) : fallback;
}

function createCopyName(name: string, sheets: readonly TableSheet[]) {
  const baseName = `${name} copy`.slice(0, 24);
  let copyName = baseName;
  let index = 2;

  while (sheets.some((sheet) => sheet.name === copyName)) {
    copyName = `${baseName} ${index}`.slice(0, 31);
    index += 1;
  }

  return copyName;
}
