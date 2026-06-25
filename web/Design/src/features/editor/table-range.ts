import { getTableCell, setTableCell } from "@/features/editor/table";

export type TableCellRangeInput = {
  startRow: number;
  startColumn: number;
  endRow: number;
  endColumn: number;
};

export type TableCellRange = TableCellRangeInput & {
  rowCount: number;
  columnCount: number;
  cellCount: number;
  label: string;
};

export function normalizeTableCellRange(
  input: TableCellRangeInput,
  bounds: { rows: number; columns: number },
): TableCellRange {
  const startRow = clampIndex(Math.min(input.startRow, input.endRow), bounds.rows);
  const endRow = clampIndex(Math.max(input.startRow, input.endRow), bounds.rows);
  const startColumn = clampIndex(
    Math.min(input.startColumn, input.endColumn),
    bounds.columns,
  );
  const endColumn = clampIndex(
    Math.max(input.startColumn, input.endColumn),
    bounds.columns,
  );
  const rowCount = endRow - startRow + 1;
  const columnCount = endColumn - startColumn + 1;

  return {
    startRow,
    startColumn,
    endRow,
    endColumn,
    rowCount,
    columnCount,
    cellCount: rowCount * columnCount,
    label:
      startRow === endRow && startColumn === endColumn
        ? formatTableCellLabel(startRow, startColumn)
        : `${formatTableCellLabel(startRow, startColumn)}:${formatTableCellLabel(
            endRow,
            endColumn,
          )}`,
  };
}

export function fillTableRangeDown(input: {
  cells: string[];
  columns: number;
  range: TableCellRange;
}) {
  let nextCells = [...input.cells];

  for (
    let columnIndex = input.range.startColumn;
    columnIndex <= input.range.endColumn;
    columnIndex += 1
  ) {
    const sourceValue = getTableCell(
      nextCells,
      input.columns,
      input.range.startRow,
      columnIndex,
    );

    for (
      let rowIndex = input.range.startRow + 1;
      rowIndex <= input.range.endRow;
      rowIndex += 1
    ) {
      nextCells = setTableCell(
        nextCells,
        input.columns,
        rowIndex,
        columnIndex,
        sourceValue,
      );
    }
  }

  return nextCells;
}

export function fillTableRangeRight(input: {
  cells: string[];
  columns: number;
  range: TableCellRange;
}) {
  let nextCells = [...input.cells];

  for (
    let rowIndex = input.range.startRow;
    rowIndex <= input.range.endRow;
    rowIndex += 1
  ) {
    const sourceValue = getTableCell(
      nextCells,
      input.columns,
      rowIndex,
      input.range.startColumn,
    );

    for (
      let columnIndex = input.range.startColumn + 1;
      columnIndex <= input.range.endColumn;
      columnIndex += 1
    ) {
      nextCells = setTableCell(
        nextCells,
        input.columns,
        rowIndex,
        columnIndex,
        sourceValue,
      );
    }
  }

  return nextCells;
}

export function clearTableRange(input: {
  cells: string[];
  columns: number;
  range: TableCellRange;
}) {
  let nextCells = [...input.cells];

  for (
    let rowIndex = input.range.startRow;
    rowIndex <= input.range.endRow;
    rowIndex += 1
  ) {
    for (
      let columnIndex = input.range.startColumn;
      columnIndex <= input.range.endColumn;
      columnIndex += 1
    ) {
      nextCells = setTableCell(nextCells, input.columns, rowIndex, columnIndex, "");
    }
  }

  return nextCells;
}

export function formatTableCellLabel(rowIndex: number, columnIndex: number) {
  return `${formatColumnLabel(columnIndex)}${rowIndex + 1}`;
}

function formatColumnLabel(columnIndex: number) {
  let value = columnIndex + 1;
  let label = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = `${String.fromCharCode(65 + remainder)}${label}`;
    value = Math.floor((value - 1) / 26);
  }

  return label;
}

function clampIndex(value: number, count: number) {
  if (!Number.isFinite(value)) return 0;

  return Math.min(Math.max(0, Math.round(value)), Math.max(0, count - 1));
}
