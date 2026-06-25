import { cellKey } from "@/features/workbooks/addresses";
import { shiftFormulaReferences } from "@/features/spreadsheet/formula-references";
import { deleteDataModelRelationshipsForTable } from "@/features/spreadsheet/data-model";
import { normalizeTableName } from "@/features/spreadsheet/state/naming-state";
import { getActiveSheet } from "@/features/spreadsheet/state/document-state";
import type {
  CellRange,
  CellSelection,
} from "@/features/spreadsheet/state/selection-state";
import type {
  TableDefinition,
  WorkbookDocument,
} from "@/features/workbooks/types";

function touchTable(table: TableDefinition) {
  table.updatedAt = new Date().toISOString();
}

function getTableDataRowBounds(table: TableDefinition) {
  const startRowIndex =
    table.range.startRowIndex + (table.showHeaderRow ? 1 : 0);
  const endRowIndex = table.range.endRowIndex - (table.showTotalsRow ? 1 : 0);

  if (startRowIndex > endRowIndex) {
    return null;
  }

  return { startRowIndex, endRowIndex };
}

function isSelectionInTableDataColumn(
  table: TableDefinition,
  selection: CellSelection,
) {
  const rowBounds = getTableDataRowBounds(table);

  return Boolean(
    rowBounds &&
      selection.rowIndex >= rowBounds.startRowIndex &&
      selection.rowIndex <= rowBounds.endRowIndex &&
      selection.columnIndex >= table.range.startColumnIndex &&
      selection.columnIndex <= table.range.endColumnIndex,
  );
}

export function addTableToDocument(
  document: WorkbookDocument,
  range: CellRange,
  now = new Date().toISOString(),
) {
  document.tables ??= [];

  const existingNames = new Set(
    document.tables.map((table) => table.name.toLowerCase()),
  );
  let nextIndex = document.tables.length + 1;
  let tableName = `Table_${nextIndex}`;

  while (existingNames.has(tableName.toLowerCase())) {
    nextIndex += 1;
    tableName = `Table_${nextIndex}`;
  }

  document.tables.push({
    id: `table_${crypto.randomUUID()}`,
    sheetId: document.activeSheetId,
    name: tableName,
    range,
    style: "blue",
    showHeaderRow: true,
    showFilterButtons: true,
    showTotalsRow: false,
    createdAt: now,
    updatedAt: now,
  });
}

export function deleteTableFromDocument(
  document: WorkbookDocument,
  tableId: string,
) {
  const sheet = getActiveSheet(document);
  const attachedPivotTables = (document.pivotTables ?? []).filter(
    (pivotTable) => pivotTable.sourceTableId === tableId,
  );

  for (const pivotTable of attachedPivotTables) {
    for (
      let rowIndex = pivotTable.outputRange.startRowIndex;
      rowIndex <= pivotTable.outputRange.endRowIndex;
      rowIndex += 1
    ) {
      for (
        let columnIndex = pivotTable.outputRange.startColumnIndex;
        columnIndex <= pivotTable.outputRange.endColumnIndex;
        columnIndex += 1
      ) {
        delete sheet.cells[cellKey(rowIndex, columnIndex)];
      }
    }
  }

  document.tables = (document.tables ?? []).filter((table) => table.id !== tableId);
  deleteDataModelRelationshipsForTable(document, tableId);
  document.tableSlicers = (document.tableSlicers ?? []).filter(
    (slicer) => slicer.tableId !== tableId,
  );
  document.tableTimelines = (document.tableTimelines ?? []).filter(
    (timeline) => timeline.tableId !== tableId,
  );
  document.pivotTables = (document.pivotTables ?? []).filter(
    (pivotTable) => pivotTable.sourceTableId !== tableId,
  );
}

export function renameTableInDocument(
  document: WorkbookDocument,
  tableId: string,
  name: string,
) {
  const normalizedName = normalizeTableName(name);

  if (!normalizedName) {
    return;
  }

  const isDuplicate = (document.tables ?? []).some(
    (table) =>
      table.id !== tableId &&
      table.name.toLowerCase() === normalizedName.toLowerCase(),
  );
  const table = (document.tables ?? []).find((item) => item.id === tableId);

  if (table && !isDuplicate) {
    table.name = normalizedName;
    touchTable(table);
  }
}

export function resizeTableInDocument(
  document: WorkbookDocument,
  tableId: string,
  range: CellRange,
) {
  const table = (document.tables ?? []).find((item) => item.id === tableId);

  if (table) {
    table.range = range;
    touchTable(table);
  }
}

export function updateTableStyleInDocument(
  document: WorkbookDocument,
  tableId: string,
  style: TableDefinition["style"],
) {
  const table = (document.tables ?? []).find((item) => item.id === tableId);

  if (table) {
    table.style = style;
    touchTable(table);
  }
}

export function toggleTableTotalsInDocument(
  document: WorkbookDocument,
  tableId: string,
) {
  const table = (document.tables ?? []).find((item) => item.id === tableId);

  if (table) {
    table.showTotalsRow = !table.showTotalsRow;
    touchTable(table);
  }
}

export function toggleTableFilterButtonsInDocument(
  document: WorkbookDocument,
  tableId: string,
) {
  const table = (document.tables ?? []).find((item) => item.id === tableId);

  if (table) {
    table.showFilterButtons = !table.showFilterButtons;
    touchTable(table);
  }
}

export function toggleTableHeaderRowInDocument(
  document: WorkbookDocument,
  tableId: string,
) {
  const table = (document.tables ?? []).find((item) => item.id === tableId);

  if (table) {
    table.showHeaderRow = !table.showHeaderRow;
    touchTable(table);
  }
}

export function autofillCalculatedColumnInDocument(
  document: WorkbookDocument,
  selection: CellSelection,
) {
  const sheet = getActiveSheet(document);
  const sourceKey = cellKey(selection.rowIndex, selection.columnIndex);
  const sourceCell = sheet.cells[sourceKey];

  if (!sourceCell?.raw.trimStart().startsWith("=")) {
    return 0;
  }

  const table = (document.tables ?? [])
    .filter((item) => item.sheetId === document.activeSheetId)
    .filter((item) => isSelectionInTableDataColumn(item, selection))
    .sort((left, right) => {
      const leftArea =
        (left.range.endRowIndex - left.range.startRowIndex + 1) *
        (left.range.endColumnIndex - left.range.startColumnIndex + 1);
      const rightArea =
        (right.range.endRowIndex - right.range.startRowIndex + 1) *
        (right.range.endColumnIndex - right.range.startColumnIndex + 1);

      return leftArea - rightArea;
    })[0];
  const rowBounds = table ? getTableDataRowBounds(table) : null;

  if (!table || !rowBounds) {
    return 0;
  }

  let filledCount = 0;

  for (
    let rowIndex = rowBounds.startRowIndex;
    rowIndex <= rowBounds.endRowIndex;
    rowIndex += 1
  ) {
    if (rowIndex === selection.rowIndex) {
      continue;
    }

    const targetKey = cellKey(rowIndex, selection.columnIndex);
    const targetCell = sheet.cells[targetKey];

    if (targetCell?.raw) {
      continue;
    }

    sheet.cells[targetKey] = {
      ...targetCell,
      raw: shiftFormulaReferences({
        formula: sourceCell.raw,
        rowOffset: rowIndex - selection.rowIndex,
        columnOffset: 0,
      }),
    };
    filledCount += 1;
  }

  if (filledCount > 0) {
    touchTable(table);
  }

  return filledCount;
}
