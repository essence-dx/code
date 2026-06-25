import { cellKey } from "@/features/workbooks/addresses";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";
import type { SheetData } from "@/features/workbooks/types";

export type SelectionSummary = {
  cells: number;
  nonEmpty: number;
  numeric: number;
  sum: number;
  average: number | null;
  min: number | null;
  max: number | null;
};

function parseSummaryNumber(value: string) {
  const normalized = value.replace(/[$,%\s,]/g, "");
  const number = Number(normalized);

  return Number.isFinite(number) ? number : null;
}

export function getSelectionSummary({
  sheet,
  selectedRange,
  computedValues,
}: {
  sheet: SheetData;
  selectedRange: CellRange;
  computedValues: Record<string, string>;
}): SelectionSummary {
  let cells = 0;
  let nonEmpty = 0;
  let numeric = 0;
  let sum = 0;
  let min: number | null = null;
  let max: number | null = null;

  for (
    let rowIndex = selectedRange.startRowIndex;
    rowIndex <= selectedRange.endRowIndex;
    rowIndex += 1
  ) {
    for (
      let columnIndex = selectedRange.startColumnIndex;
      columnIndex <= selectedRange.endColumnIndex;
      columnIndex += 1
    ) {
      cells += 1;

      const key = cellKey(rowIndex, columnIndex);
      const value = computedValues[key] ?? sheet.cells[key]?.raw ?? "";
      const trimmedValue = value.trim();

      if (trimmedValue) {
        nonEmpty += 1;
      }

      const number = parseSummaryNumber(trimmedValue);

      if (number !== null) {
        numeric += 1;
        sum += number;
        min = min === null ? number : Math.min(min, number);
        max = max === null ? number : Math.max(max, number);
      }
    }
  }

  return {
    cells,
    nonEmpty,
    numeric,
    sum,
    average: numeric > 0 ? sum / numeric : null,
    min,
    max,
  };
}
