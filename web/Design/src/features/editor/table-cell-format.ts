import type { TableCellStyle, TableElement } from "@/features/editor/types";

export function createTableCellStyleKey(rowIndex: number, columnIndex: number) {
  return `${rowIndex}:${columnIndex}`;
}

export function getTableCellStyle(
  element: TableElement,
  rowIndex: number,
  columnIndex: number,
) {
  return (
    element.cellStyles?.[createTableCellStyleKey(rowIndex, columnIndex)] ?? {}
  );
}

export function setTableCellStyle(
  styles: TableElement["cellStyles"],
  rowIndex: number,
  columnIndex: number,
  updates: TableCellStyle,
) {
  const key = createTableCellStyleKey(rowIndex, columnIndex);
  const nextStyle = compactCellStyle({
    ...(styles?.[key] ?? {}),
    ...updates,
  });
  const nextStyles = { ...(styles ?? {}) };

  if (Object.keys(nextStyle).length === 0) {
    delete nextStyles[key];
  } else {
    nextStyles[key] = nextStyle;
  }

  return Object.keys(nextStyles).length > 0 ? nextStyles : undefined;
}

export function clearTableCellStyle(
  styles: TableElement["cellStyles"],
  rowIndex: number,
  columnIndex: number,
) {
  if (!styles) return undefined;

  const nextStyles = { ...styles };
  delete nextStyles[createTableCellStyleKey(rowIndex, columnIndex)];

  return Object.keys(nextStyles).length > 0 ? nextStyles : undefined;
}

export function pruneTableCellStyles(
  styles: TableElement["cellStyles"],
  rows: number,
  columns: number,
) {
  if (!styles) return undefined;

  const nextStyles: Record<string, TableCellStyle> = {};

  for (const [key, style] of Object.entries(styles)) {
    const parsed = parseTableCellStyleKey(key);

    if (
      !parsed ||
      parsed.rowIndex >= rows ||
      parsed.columnIndex >= columns
    ) {
      continue;
    }

    const compacted = compactCellStyle(style);

    if (Object.keys(compacted).length > 0) nextStyles[key] = compacted;
  }

  return Object.keys(nextStyles).length > 0 ? nextStyles : undefined;
}

function parseTableCellStyleKey(key: string) {
  const [row, column] = key.split(":");
  const rowIndex = Number(row);
  const columnIndex = Number(column);

  if (
    !Number.isInteger(rowIndex) ||
    !Number.isInteger(columnIndex) ||
    rowIndex < 0 ||
    columnIndex < 0
  ) {
    return null;
  }

  return { columnIndex, rowIndex };
}

function compactCellStyle(style: TableCellStyle) {
  return Object.fromEntries(
    Object.entries(style).filter(([, value]) => {
      return value !== undefined && value !== "";
    }),
  ) as TableCellStyle;
}
