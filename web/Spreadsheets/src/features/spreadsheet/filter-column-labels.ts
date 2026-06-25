import { cellKey, columnLabel } from "@/features/workbooks/addresses";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";
import type { SheetData } from "@/features/workbooks/types";

export type FilterColumnLabels = Record<number, string>;

export function getFilterColumnLabels({
  sheet,
  range,
  computedValues,
}: {
  sheet: SheetData;
  range: CellRange;
  computedValues: Record<string, string>;
}): FilterColumnLabels {
  const labels: FilterColumnLabels = {};

  for (
    let columnIndex = range.startColumnIndex;
    columnIndex <= range.endColumnIndex;
    columnIndex += 1
  ) {
    const key = cellKey(range.startRowIndex, columnIndex);
    const header = (computedValues[key] ?? sheet.cells[key]?.raw ?? "")
      .trim()
      .slice(0, 80);

    labels[columnIndex] = header || columnLabel(columnIndex);
  }

  return labels;
}

export function formatFilterColumnLabel(
  columnIndex: number,
  labels: FilterColumnLabels,
) {
  const fallback = columnLabel(columnIndex);
  const label = labels[columnIndex] ?? fallback;

  return label === fallback ? fallback : `${label} (${fallback})`;
}
