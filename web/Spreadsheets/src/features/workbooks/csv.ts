import { cellKey } from "@/features/workbooks/addresses";
import { canonicalizeFormulaInput } from "@/features/spreadsheet/formula-locale";
import { getDelimitedExportBounds } from "@/features/spreadsheet/sheet-scale";
import { createBlankSheet } from "@/features/workbooks/default-workbook";
import type { SheetData } from "@/features/workbooks/types";

function escapeCsvCell(value: string) {
  if (!/[",\n\r]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}

function escapeTsvCell(value: string) {
  return value.replace(/\t/g, " ").replace(/\r?\n/g, " ");
}

function sheetToDelimited(
  sheet: SheetData,
  delimiter: "," | "\t",
  escapeCell: (value: string) => string,
) {
  const rows: string[] = [];
  const bounds = getDelimitedExportBounds(sheet);

  for (let row = bounds.startRowIndex; row <= bounds.endRowIndex; row += 1) {
    const values: string[] = [];

    for (
      let column = bounds.startColumnIndex;
      column <= bounds.endColumnIndex;
      column += 1
    ) {
      values.push(escapeCell(sheet.cells[cellKey(row, column)]?.raw ?? ""));
    }

    rows.push(values.join(delimiter).replace(new RegExp(`${delimiter === "\t" ? "\\t" : ","}+$`), ""));
  }

  return rows.join("\n").replace(/\n+$/, "");
}

function delimitedToSheet(
  text: string,
  delimiter: "," | "\t",
  name: string,
) {
  const sheet = createBlankSheet(name);
  const rows = text.replace(/\r\n/g, "\n").split("\n");

  rows.forEach((line, rowIndex) => {
    const values = line.split(delimiter);

    values.forEach((value, columnIndex) => {
      const raw = canonicalizeFormulaInput(
        value.replace(/^"|"$/g, "").replaceAll('""', '"'),
      );

      if (raw.trim()) {
        sheet.cells[cellKey(rowIndex, columnIndex)] = {
          raw,
        };
      }
    });
  });

  sheet.rowCount = Math.max(sheet.rowCount, rows.length);
  sheet.columnCount = Math.max(
    sheet.columnCount,
    ...rows.map((line) => Math.max(line.split(delimiter).length, 1)),
  );

  return sheet;
}

export function sheetToCsv(sheet: SheetData) {
  return sheetToDelimited(sheet, ",", escapeCsvCell);
}

export function csvToSheet(csv: string, name = "Imported CSV") {
  return delimitedToSheet(csv, ",", name);
}

export function sheetToTsv(sheet: SheetData) {
  return sheetToDelimited(sheet, "\t", escapeTsvCell);
}

export function tsvToSheet(tsv: string, name = "Imported TSV") {
  return delimitedToSheet(tsv, "\t", name);
}
