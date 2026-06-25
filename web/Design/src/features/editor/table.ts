export const minTableRows = 1;
export const maxTableRows = 60;
export const minTableColumns = 1;
export const maxTableColumns = 24;

type ResizeTableCellsArgs = {
  cells: string[];
  currentRows: number;
  currentColumns: number;
  nextRows: number;
  nextColumns: number;
};

export function createDefaultTableCells(rows: number, columns: number) {
  const labels = [
    "Item",
    "Owner",
    "Status",
    "Launch",
    "Essence",
    "Team",
    "Ready",
    "Today",
    "Print",
    "Codex",
    "Review",
    "Next",
  ];

  return Array.from({ length: rows * columns }, (_, index) => {
    return labels[index] ?? "";
  });
}

export function getTableCell(
  cells: string[],
  columns: number,
  rowIndex: number,
  columnIndex: number,
) {
  return cells[rowIndex * columns + columnIndex] ?? "";
}

export function setTableCell(
  cells: string[],
  columns: number,
  rowIndex: number,
  columnIndex: number,
  value: string,
) {
  const nextCells = [...cells];
  nextCells[rowIndex * columns + columnIndex] = value;

  return nextCells;
}

export function resizeTableCells({
  cells,
  currentRows,
  currentColumns,
  nextRows,
  nextColumns,
}: ResizeTableCellsArgs) {
  const rows = clampTableRows(nextRows);
  const columns = clampTableColumns(nextColumns);

  return Array.from({ length: rows * columns }, (_, index) => {
    const rowIndex = Math.floor(index / columns);
    const columnIndex = index % columns;

    if (rowIndex >= currentRows || columnIndex >= currentColumns) {
      return "";
    }

    return getTableCell(cells, currentColumns, rowIndex, columnIndex);
  });
}

export function clampTableRows(rows: number) {
  return clampInteger(rows, minTableRows, maxTableRows);
}

export function clampTableColumns(columns: number) {
  return clampInteger(columns, minTableColumns, maxTableColumns);
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;

  return Math.max(min, Math.min(max, Math.round(value)));
}
