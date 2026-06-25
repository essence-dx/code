import { cellKey, columnLabel } from "@/features/workbooks/addresses";
import type {
  SheetData,
  SheetFilterRule,
  TableDefinition,
  TableSlicer,
} from "@/features/workbooks/types";

export type TableSlicerColumnOption = {
  columnIndex: number;
  label: string;
};

export type TableSlicerValueOption = {
  count: number;
  label: string;
  value: string;
};

function getCellText({
  sheet,
  computedValues,
  rowIndex,
  columnIndex,
}: {
  sheet: SheetData;
  computedValues: Record<string, string>;
  rowIndex: number;
  columnIndex: number;
}) {
  const key = cellKey(rowIndex, columnIndex);

  return (computedValues[key] ?? sheet.cells[key]?.raw ?? "").trim();
}

function getTableDataRows(table: TableDefinition) {
  const startRowIndex =
    table.range.startRowIndex + (table.showHeaderRow ? 1 : 0);
  const endRowIndex = table.range.endRowIndex - (table.showTotalsRow ? 1 : 0);

  if (startRowIndex > endRowIndex) {
    return null;
  }

  return { startRowIndex, endRowIndex };
}

export function getTableSlicerColumnOptions({
  sheet,
  table,
  computedValues,
}: {
  sheet: SheetData;
  table: TableDefinition;
  computedValues: Record<string, string>;
}) {
  const options: TableSlicerColumnOption[] = [];

  for (
    let columnIndex = table.range.startColumnIndex;
    columnIndex <= table.range.endColumnIndex;
    columnIndex += 1
  ) {
    const header = table.showHeaderRow
      ? getCellText({
          sheet,
          computedValues,
          rowIndex: table.range.startRowIndex,
          columnIndex,
        })
      : "";

    options.push({
      columnIndex,
      label: header || columnLabel(columnIndex),
    });
  }

  return options;
}

export function getTableSlicerValueOptions({
  sheet,
  table,
  columnIndex,
  computedValues,
  limit = 250,
}: {
  sheet: SheetData;
  table: TableDefinition;
  columnIndex: number;
  computedValues: Record<string, string>;
  limit?: number;
}) {
  const rowBounds = getTableDataRows(table);
  const counts = new Map<string, number>();

  if (!rowBounds) {
    return [];
  }

  for (
    let rowIndex = rowBounds.startRowIndex;
    rowIndex <= rowBounds.endRowIndex;
    rowIndex += 1
  ) {
    const value = getCellText({ sheet, computedValues, rowIndex, columnIndex });

    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort(([left], [right]) =>
      left.localeCompare(right, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    )
    .slice(0, limit)
    .map<TableSlicerValueOption>(([value, count]) => ({
      count,
      label: value || "(Blanks)",
      value,
    }));
}

export function createTableSlicerFilterRules({
  slicers,
  tables,
}: {
  slicers: TableSlicer[];
  tables: TableDefinition[];
}): SheetFilterRule[] {
  const tablesById = new Map(tables.map((table) => [table.id, table]));

  return slicers.flatMap((slicer) => {
    const table = tablesById.get(slicer.tableId);

    if (
      !table ||
      !table.showHeaderRow ||
      table.sheetId !== slicer.sheetId ||
      slicer.selectedValues.length === 0 ||
      slicer.columnIndex < table.range.startColumnIndex ||
      slicer.columnIndex > table.range.endColumnIndex
    ) {
      return [];
    }

    return [
      {
        id: `slicer_filter_${slicer.id}`,
        sheetId: slicer.sheetId,
        range: table.range,
        columnIndex: slicer.columnIndex,
        headerName: slicer.name,
        type: "oneOf",
        value: "",
        values: slicer.selectedValues,
      },
    ];
  });
}
