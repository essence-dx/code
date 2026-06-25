import type { CellStyle, SheetData } from "@/features/workbooks/types";

export function mergeBorderStyle(
  current: CellStyle["borders"],
  next: CellStyle["borders"],
) {
  return {
    ...current,
    ...next,
  };
}

export function clearCellRaw(sheet: SheetData, key: string) {
  const current = sheet.cells[key];

  if (current?.style) {
    sheet.cells[key] = {
      ...current,
      raw: "",
      richTextRuns: undefined,
    };
    return;
  }

  delete sheet.cells[key];
}
