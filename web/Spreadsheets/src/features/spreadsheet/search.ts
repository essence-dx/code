import { parseCellKey } from "@/features/workbooks/addresses";
import type { SheetData } from "@/features/workbooks/types";

export type CellMatch = {
  key: string;
  rowIndex: number;
  columnIndex: number;
};

export function findCellMatches(
  sheet: SheetData,
  computedValues: Record<string, string>,
  query: string,
  options: { hideHiddenFormulas?: boolean } = {},
) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  return Object.entries(sheet.cells).reduce<CellMatch[]>((matches, [key, cell]) => {
    const computedValue = computedValues[key] ?? "";
    const raw =
      options.hideHiddenFormulas &&
      cell.style?.formulaHidden &&
      cell.raw.startsWith("=")
        ? ""
        : cell.raw;
    const haystack = `${raw}\n${computedValue}`.toLowerCase();
    const position = parseCellKey(key);

    if (position && haystack.includes(normalizedQuery)) {
      matches.push({
        key,
        rowIndex: position.rowIndex,
        columnIndex: position.columnIndex,
      });
    }

    return matches;
  }, []);
}
