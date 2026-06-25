import { columnLabel, parseCellKey } from "@/features/workbooks/addresses";
import type { ChartRange, SheetData } from "@/features/workbooks/types";

export type PrintAreaParseResult =
  | { ok: true; range?: ChartRange }
  | { error: string; ok: false };

export function formatPrintAreaReference(range?: ChartRange) {
  if (!range) {
    return "";
  }

  const start = `${columnLabel(range.startColumnIndex)}${range.startRowIndex + 1}`;
  const end = `${columnLabel(range.endColumnIndex)}${range.endRowIndex + 1}`;

  return start === end ? start : `${start}:${end}`;
}

export function parsePrintAreaReference(
  input: string,
  sheet: Pick<SheetData, "columnCount" | "rowCount">,
): PrintAreaParseResult {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return { ok: true, range: undefined };
  }

  const reference = trimmedInput
    .replace(/^'[^']+'!/, "")
    .replace(/^[^!]+!/, "")
    .replaceAll("$", "")
    .replace(/\s+/g, "");
  const [startReference, endReference = startReference] = reference.split(":");
  const start = parseCellKey(startReference);
  const end = parseCellKey(endReference);

  if (!start || !end) {
    return {
      error: "Use an A1 reference like A1:D20.",
      ok: false,
    };
  }

  const startRowIndex = Math.min(start.rowIndex, end.rowIndex);
  const endRowIndex = Math.max(start.rowIndex, end.rowIndex);
  const startColumnIndex = Math.min(start.columnIndex, end.columnIndex);
  const endColumnIndex = Math.max(start.columnIndex, end.columnIndex);

  if (
    startRowIndex < 0 ||
    startColumnIndex < 0 ||
    endRowIndex >= sheet.rowCount ||
    endColumnIndex >= sheet.columnCount
  ) {
    return {
      error: `Keep the print area inside A1:${columnLabel(sheet.columnCount - 1)}${sheet.rowCount}.`,
      ok: false,
    };
  }

  return {
    ok: true,
    range: {
      startRowIndex,
      startColumnIndex,
      endRowIndex,
      endColumnIndex,
    },
  };
}
