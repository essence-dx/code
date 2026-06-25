import { rangesOverlap } from "@/features/spreadsheet/state/selection-state";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";
import type { SheetFilterRule } from "@/features/workbooks/types";

export function hasActiveColumnFilter(
  filters: SheetFilterRule[],
  range: CellRange,
  columnIndex: number,
) {
  return filters.some(
    (filter) =>
      filter.columnIndex === columnIndex && rangesOverlap(filter.range, range),
  );
}

export function getActiveColumnFilterValues(
  filters: SheetFilterRule[],
  range: CellRange,
  columnIndex: number,
) {
  return (
    filters.find(
      (filter) =>
        filter.type === "oneOf" &&
        filter.columnIndex === columnIndex &&
        rangesOverlap(filter.range, range),
    )?.values ?? null
  );
}
