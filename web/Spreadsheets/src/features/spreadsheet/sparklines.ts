import { cellKey } from "@/features/workbooks/addresses";
import type {
  SheetData,
  SparklineDefinition,
} from "@/features/workbooks/types";

function parseNumericValue(value: string) {
  const numericValue = Number(String(value).replace(/[$,%]/g, ""));

  return Number.isFinite(numericValue) ? numericValue : null;
}

export function getSparklineValues({
  sheet,
  computedValues,
  sparkline,
}: {
  sheet: SheetData;
  computedValues: Record<string, string>;
  sparkline: SparklineDefinition;
}) {
  const values: number[] = [];

  for (
    let rowIndex = sparkline.range.startRowIndex;
    rowIndex <= sparkline.range.endRowIndex;
    rowIndex += 1
  ) {
    for (
      let columnIndex = sparkline.range.startColumnIndex;
      columnIndex <= sparkline.range.endColumnIndex;
      columnIndex += 1
    ) {
      const key = cellKey(rowIndex, columnIndex);
      const value = parseNumericValue(computedValues[key] ?? sheet.cells[key]?.raw ?? "");

      if (value !== null) {
        values.push(value);
      }
    }
  }

  return values.slice(0, 120);
}
