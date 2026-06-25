import type {
  ChartRange,
  InsertedObjectAnchor,
  SheetData,
} from "@/features/workbooks/types";

const defaultChartWidth = 360;
const defaultChartHeight = 220;

export function createChartObjectAnchor(
  sheet: SheetData,
  range: ChartRange,
): InsertedObjectAnchor {
  const preferredColumn = Math.min(
    range.endColumnIndex + 1,
    Math.max(sheet.columnCount - 1, 0),
  );

  return normalizeChartObjectAnchor(
    {
      columnIndex: preferredColumn,
      height: defaultChartHeight,
      offsetX: 8,
      offsetY: 8,
      rowIndex: range.startRowIndex,
      width: defaultChartWidth,
    },
    sheet,
    range,
  );
}

export function normalizeChartObjectAnchor(
  value: unknown,
  sheet: SheetData,
  range: ChartRange,
): InsertedObjectAnchor {
  const fallback = {
    columnIndex: Math.min(
      range.endColumnIndex + 1,
      Math.max(sheet.columnCount - 1, 0),
    ),
    height: defaultChartHeight,
    offsetX: 8,
    offsetY: 8,
    rowIndex: range.startRowIndex,
    width: defaultChartWidth,
  };
  const anchor =
    typeof value === "object" && value !== null
      ? (value as Partial<InsertedObjectAnchor>)
      : {};

  return {
    columnIndex: clampNumber(
      anchor.columnIndex,
      0,
      Math.max(sheet.columnCount - 1, 0),
      fallback.columnIndex,
    ),
    height: clampNumber(anchor.height, 96, 720, fallback.height),
    offsetX: clampNumber(anchor.offsetX, 0, 360, fallback.offsetX),
    offsetY: clampNumber(anchor.offsetY, 0, 240, fallback.offsetY),
    rowIndex: clampNumber(
      anchor.rowIndex,
      0,
      Math.max(sheet.rowCount - 1, 0),
      fallback.rowIndex,
    ),
    width: clampNumber(anchor.width, 160, 960, fallback.width),
  };
}

function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(Math.max(Math.round(numeric), min), max);
}
