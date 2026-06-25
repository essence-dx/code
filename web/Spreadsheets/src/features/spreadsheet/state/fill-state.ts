import type { SheetData } from "@/features/workbooks/types";
import {
  fillNumericSeries,
  fillNumericSeriesByDirection,
  fillRangeDown,
  fillRangeRight,
} from "@/features/spreadsheet/range-fill";
import type {
  CellRange,
  FillRangeMode,
} from "@/features/spreadsheet/state/selection-state";

export function canFillRange(range: CellRange, mode: FillRangeMode) {
  const rowCount = range.endRowIndex - range.startRowIndex + 1;
  const columnCount = range.endColumnIndex - range.startColumnIndex + 1;

  if ((mode === "down" || mode === "seriesDown") && rowCount < 2) {
    return false;
  }

  if ((mode === "right" || mode === "seriesRight") && columnCount < 2) {
    return false;
  }

  if (mode === "series" && rowCount < 2 && columnCount < 2) {
    return false;
  }

  return true;
}

export function fillSheetRange(
  sheet: SheetData,
  range: CellRange,
  mode: FillRangeMode,
) {
  if (mode === "down") {
    fillRangeDown(sheet, range);
    return;
  }

  if (mode === "right") {
    fillRangeRight(sheet, range);
    return;
  }

  if (mode === "seriesDown") {
    fillNumericSeriesByDirection(sheet, range, "down");
    return;
  }

  if (mode === "seriesRight") {
    fillNumericSeriesByDirection(sheet, range, "right");
    return;
  }

  fillNumericSeries(sheet, range);
}
