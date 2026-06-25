import { parseCellKey } from "@/features/workbooks/addresses";
import type { SheetData } from "@/features/workbooks/types";

export type FormulaErrorIssue = {
  key: string;
  rowIndex: number;
  columnIndex: number;
  formula: string;
  message: string;
};

export function getFormulaErrorIssues({
  sheet,
  computedValues,
  hideHiddenFormulas = false,
}: {
  sheet: SheetData;
  computedValues: Record<string, string>;
  hideHiddenFormulas?: boolean;
}) {
  return Object.entries(sheet.cells)
    .flatMap(([key, cell]) => {
      if (!cell.raw.startsWith("=")) {
        return [];
      }

      const message = computedValues[key] ?? "";

      if (!message.startsWith("#")) {
        return [];
      }

      const position = parseCellKey(key);

      if (!position) {
        return [];
      }

      return [
        {
          key,
          rowIndex: position.rowIndex,
          columnIndex: position.columnIndex,
          formula:
            hideHiddenFormulas && cell.style?.formulaHidden
              ? "Formula hidden"
              : cell.raw,
          message,
        },
      ];
    })
    .sort(
      (left, right) =>
        left.rowIndex - right.rowIndex ||
        left.columnIndex - right.columnIndex,
    );
}
