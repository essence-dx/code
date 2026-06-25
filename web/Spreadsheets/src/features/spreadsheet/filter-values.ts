import { cellKey } from "@/features/workbooks/addresses";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";
import type { SheetData } from "@/features/workbooks/types";

export type FilterValueOption = {
  count: number;
  label: string;
  value: string;
};

export function getFilterValueOptions({
  sheet,
  range,
  columnIndex,
  computedValues,
  limit = 250,
}: {
  sheet: SheetData;
  range: CellRange;
  columnIndex: number;
  computedValues: Record<string, string>;
  limit?: number;
}) {
  const counts = new Map<string, number>();

  for (
    let rowIndex = range.startRowIndex + 1;
    rowIndex <= range.endRowIndex;
    rowIndex += 1
  ) {
    const key = cellKey(rowIndex, columnIndex);
    const value = computedValues[key] ?? sheet.cells[key]?.raw ?? "";
    const normalizedValue = value.trim();

    counts.set(normalizedValue, (counts.get(normalizedValue) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort(([left], [right]) =>
      left.localeCompare(right, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    )
    .slice(0, limit)
    .map<FilterValueOption>(([value, count]) => ({
      count,
      label: value || "(Blanks)",
      value,
    }));
}

export function getFilterValueOptionsByColumn({
  sheet,
  range,
  computedValues,
}: {
  sheet: SheetData;
  range: CellRange;
  computedValues: Record<string, string>;
}) {
  const optionsByColumn: Record<number, FilterValueOption[]> = {};

  for (
    let columnIndex = range.startColumnIndex;
    columnIndex <= range.endColumnIndex;
    columnIndex += 1
  ) {
    optionsByColumn[columnIndex] = getFilterValueOptions({
      sheet,
      range,
      columnIndex,
      computedValues,
    });
  }

  return optionsByColumn;
}
