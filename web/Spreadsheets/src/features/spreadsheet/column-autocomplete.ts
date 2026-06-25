import { cellKey } from "@/features/workbooks/addresses";
import type { SheetData } from "@/features/workbooks/types";

const MAX_AUTOCOMPLETE_OPTIONS = 20;

export function getColumnAutocompleteOptions({
  columnIndex,
  computedValues,
  rowIndex,
  sheet,
}: {
  columnIndex: number;
  computedValues: Record<string, string>;
  rowIndex: number;
  sheet: SheetData;
}) {
  const values = new Set<string>();

  for (let index = 0; index < sheet.rowCount; index += 1) {
    if (index === rowIndex) {
      continue;
    }

    const key = cellKey(index, columnIndex);
    const raw = sheet.cells[key]?.raw ?? "";
    const value = computedValues[key] ?? raw;
    const trimmedValue = value.trim();

    if (!trimmedValue || raw.startsWith("=")) {
      continue;
    }

    values.add(trimmedValue);

    if (values.size >= MAX_AUTOCOMPLETE_OPTIONS) {
      break;
    }
  }

  return Array.from(values).sort((left, right) => left.localeCompare(right));
}
