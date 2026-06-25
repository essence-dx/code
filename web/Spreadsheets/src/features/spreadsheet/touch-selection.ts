import { columnLabel } from "@/features/workbooks/addresses";
import {
  normalizeRange,
  type CellRange,
  type CellSelection,
} from "@/features/spreadsheet/state/selection-state";

export type TouchSelectionHandle = "start" | "end";

export function getTouchSelectionAnchor(
  range: CellRange,
  handle: TouchSelectionHandle,
): CellSelection {
  if (handle === "start") {
    return {
      rowIndex: range.endRowIndex,
      columnIndex: range.endColumnIndex,
    };
  }

  return {
    rowIndex: range.startRowIndex,
    columnIndex: range.startColumnIndex,
  };
}

export function resizeRangeWithTouchHandle({
  range,
  handle,
  target,
}: {
  range: CellRange;
  handle: TouchSelectionHandle;
  target: CellSelection;
}) {
  return normalizeRange(getTouchSelectionAnchor(range, handle), target);
}

export function formatTouchSelectionLabel(range: CellRange) {
  const start = `${columnLabel(range.startColumnIndex)}${range.startRowIndex + 1}`;
  const end = `${columnLabel(range.endColumnIndex)}${range.endRowIndex + 1}`;

  return start === end ? start : `${start}:${end}`;
}
