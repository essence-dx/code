import { createTableElement } from "@/features/editor/document-factory";
import {
  clampTableColumns,
  clampTableRows,
  maxTableColumns,
  maxTableRows,
} from "@/features/editor/table";

export const acceptedCsvMimeTypes = ["text/csv", "application/vnd.ms-excel"];
export const maxCsvImportBytes = 256 * 1024;

export type CsvImportResult =
  | {
      ok: true;
      element: ReturnType<typeof createTableElement>;
      importedRows: number;
      importedColumns: number;
      truncated: boolean;
    }
  | {
      ok: false;
      message: string;
    };

export function isAcceptedCsvFile(file: File) {
  return (
    acceptedCsvMimeTypes.includes(file.type) ||
    file.name.toLowerCase().endsWith(".csv")
  );
}

export async function importCsvFileAsTable(
  file: File,
): Promise<CsvImportResult> {
  if (!isAcceptedCsvFile(file)) {
    return {
      ok: false,
      message: "Use a CSV file to create an editable table.",
    };
  }

  if (file.size > maxCsvImportBytes) {
    return {
      ok: false,
      message: "CSV imports are limited to 256 KB for this editor.",
    };
  }

  const rows = parseCsvRows(await file.text());
  const dataRows = rows.filter((row) => row.some((cell) => cell.trim()));

  if (dataRows.length === 0) {
    return {
      ok: false,
      message: "This CSV does not contain any table rows.",
    };
  }

  const rowsCount = clampTableRows(dataRows.length);
  const columnsCount = clampTableColumns(
    Math.max(...dataRows.map((row) => row.length)),
  );
  const cells = Array.from({ length: rowsCount * columnsCount }, (_, index) => {
    const rowIndex = Math.floor(index / columnsCount);
    const columnIndex = index % columnsCount;

    return dataRows[rowIndex]?.[columnIndex]?.trim() ?? "";
  });
  const truncated =
    dataRows.length > maxTableRows ||
    dataRows.some((row) => row.length > maxTableColumns);

  return {
    ok: true,
    element: createTableElement({
      rows: rowsCount,
      columns: columnsCount,
      cells,
      width: Math.min(760, Math.max(360, columnsCount * 150)),
      height: Math.min(520, Math.max(160, rowsCount * 44)),
    }),
    importedRows: rowsCount,
    importedColumns: columnsCount,
    truncated,
  };
}

export function parseCsvRows(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let insideQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const nextCharacter = input[index + 1];

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        cell += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (character === "," && !insideQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !insideQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += character;
  }

  row.push(cell);
  rows.push(row);

  return rows;
}
