import {
  getTableSlicerColumnOptions,
} from "@/features/spreadsheet/table-slicers";
import { getActiveSheet } from "@/features/spreadsheet/state/document-state";
import type { WorkbookDocument } from "@/features/workbooks/types";

function touchSlicer(
  slicer: NonNullable<WorkbookDocument["tableSlicers"]>[number],
) {
  slicer.updatedAt = new Date().toISOString();
}

export function addTableSlicerToDocument({
  document,
  tableId,
  columnIndex,
  computedValues,
}: {
  document: WorkbookDocument;
  tableId: string;
  columnIndex: number;
  computedValues: Record<string, string>;
}) {
  const table = (document.tables ?? []).find(
    (item) => item.id === tableId && item.sheetId === document.activeSheetId,
  );

  if (!table || !table.showHeaderRow) {
    return null;
  }

  const normalizedColumnIndex = Math.min(
    Math.max(columnIndex, table.range.startColumnIndex),
    table.range.endColumnIndex,
  );
  const existing = (document.tableSlicers ?? []).find(
    (slicer) =>
      slicer.tableId === table.id && slicer.columnIndex === normalizedColumnIndex,
  );

  if (existing) {
    existing.selectedValues = [];
    touchSlicer(existing);
    return existing.tableId;
  }

  const sheet = getActiveSheet(document);
  const label =
    getTableSlicerColumnOptions({
      sheet,
      table,
      computedValues,
    }).find((option) => option.columnIndex === normalizedColumnIndex)?.label ??
    table.name;
  const now = new Date().toISOString();

  document.tableSlicers ??= [];
  document.tableSlicers.push({
    id: `slicer_${crypto.randomUUID()}`,
    sheetId: document.activeSheetId,
    tableId: table.id,
    columnIndex: normalizedColumnIndex,
    name: `${table.name}: ${label}`.slice(0, 80),
    selectedValues: [],
    createdAt: now,
    updatedAt: now,
  });

  return table.id;
}

export function updateTableSlicerValuesInDocument(
  document: WorkbookDocument,
  slicerId: string,
  selectedValues: string[],
) {
  const slicer = (document.tableSlicers ?? []).find(
    (item) => item.id === slicerId && item.sheetId === document.activeSheetId,
  );

  if (!slicer) {
    return null;
  }

  slicer.selectedValues = selectedValues
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.slice(0, 500))
    .slice(0, 250);
  touchSlicer(slicer);

  return slicer.tableId;
}

export function deleteTableSlicerFromDocument(
  document: WorkbookDocument,
  slicerId: string,
) {
  const deletedSlicer = (document.tableSlicers ?? []).find(
    (slicer) =>
      slicer.id === slicerId && slicer.sheetId === document.activeSheetId,
  );

  document.tableSlicers = (document.tableSlicers ?? []).filter(
    (slicer) =>
      slicer.id !== slicerId || slicer.sheetId !== document.activeSheetId,
  );

  return deletedSlicer?.tableId ?? null;
}
