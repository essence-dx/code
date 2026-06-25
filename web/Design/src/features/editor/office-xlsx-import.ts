import JSZip from "jszip";

import {
  createPage,
  createTableElement,
} from "@/features/editor/document-factory";
import {
  clampTableColumns,
  clampTableRows,
  maxTableColumns,
  maxTableRows,
} from "@/features/editor/table";
import {
  createTableSheet,
  sheetToTableFields,
} from "@/features/editor/table-sheets";
import type { DesignPage } from "@/features/editor/types";

export const acceptedXlsxMimeTypes = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;
export const maxXlsxImportBytes = 10 * 1024 * 1024;
export const maxXlsxImportSheets = 12;

type OutputSize = {
  width: number;
  height: number;
};

type WorkbookSheet = {
  name: string;
  path: string;
};

type WorksheetRows = {
  rows: string[][];
  truncated: boolean;
};

export type XlsxImportResult =
  | {
      ok: true;
      pages: DesignPage[];
      importedSheets: number;
      importedRows: number;
      importedColumns: number;
      truncated: boolean;
    }
  | {
      ok: false;
      message: string;
    };

export function isAcceptedXlsxFile(file: File) {
  return (
    acceptedXlsxMimeTypes.includes(
      file.type as (typeof acceptedXlsxMimeTypes)[number],
    ) || file.name.toLowerCase().endsWith(".xlsx")
  );
}

export async function importXlsxFileAsPages(
  file: File,
  output: OutputSize,
): Promise<XlsxImportResult> {
  if (!isAcceptedXlsxFile(file)) {
    return {
      ok: false,
      message: "Use a .xlsx spreadsheet file to import editable sheets.",
    };
  }

  if (file.size > maxXlsxImportBytes) {
    return {
      ok: false,
      message: "XLSX imports are limited to 10 MB.",
    };
  }

  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const workbookXml = await zip.file("xl/workbook.xml")?.async("text");

  if (!workbookXml) {
    return {
      ok: false,
      message: "This XLSX does not contain a readable workbook.",
    };
  }

  const sharedStrings = await readSharedStrings(zip);
  const workbookSheets = await readWorkbookSheets(zip, parseXml(workbookXml));
  const sheets = workbookSheets.slice(0, maxXlsxImportSheets);
  const importedSheets = await readSheetTables(zip, sheets, sharedStrings);

  if (importedSheets.length === 0) {
    return {
      ok: false,
      message: "No readable sheet rows were found in this XLSX.",
    };
  }

  const pages = createPagesFromSheets({
    fileName: file.name,
    output,
    sheets: importedSheets,
  });
  const largestColumnCount = Math.max(
    ...importedSheets.map((sheet) => sheet.rows[0]?.length ?? 0),
  );

  return {
    ok: true,
    pages,
    importedSheets: importedSheets.length,
    importedRows: importedSheets.reduce(
      (total, sheet) => total + sheet.rows.length,
      0,
    ),
    importedColumns: largestColumnCount,
    truncated:
      workbookSheets.length > maxXlsxImportSheets ||
      importedSheets.some((sheet) => sheet.truncated),
  };
}

async function readSharedStrings(zip: JSZip) {
  const sharedStringsXml = await zip.file("xl/sharedStrings.xml")?.async("text");

  if (!sharedStringsXml) return [];

  return findAll(parseXml(sharedStringsXml), "si").map(readTextRuns);
}

async function readWorkbookSheets(zip: JSZip, workbook: Document) {
  const relationshipsXml = await zip
    .file("xl/_rels/workbook.xml.rels")
    ?.async("text");
  const relationships = relationshipsXml
    ? readRelationships(parseXml(relationshipsXml))
    : new Map<string, string>();
  const sheets = findAll(workbook, "sheet")
    .map((sheet, index): WorkbookSheet | null => {
      const relationshipId = getAttribute(sheet, "id");
      const target = relationshipId ? relationships.get(relationshipId) : null;

      if (!target) return null;

      return {
        name: getAttribute(sheet, "name") ?? `Sheet ${index + 1}`,
        path: normalizeWorkbookTarget(target),
      };
    })
    .filter((sheet): sheet is WorkbookSheet => Boolean(sheet));

  if (sheets.length > 0) return sheets;

  return Object.keys(zip.files)
    .filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(path))
    .sort((first, second) => first.localeCompare(second, undefined, { numeric: true }))
    .map((path, index) => ({
      name: `Sheet ${index + 1}`,
      path,
    }));
}

async function readSheetTables(
  zip: JSZip,
  sheets: WorkbookSheet[],
  sharedStrings: string[],
) {
  const importedSheets: Array<
    WorkbookSheet & {
      rows: string[][];
      truncated: boolean;
    }
  > = [];

  for (const sheet of sheets) {
    const worksheetXml = await zip.file(sheet.path)?.async("text");

    if (!worksheetXml) continue;

    const worksheetRows = readWorksheetRows(parseXml(worksheetXml), sharedStrings);

    if (worksheetRows.rows.length === 0) continue;

    importedSheets.push({
      ...sheet,
      ...worksheetRows,
    });
  }

  return importedSheets;
}

function readWorksheetRows(
  worksheet: Document,
  sharedStrings: string[],
): WorksheetRows {
  const rows: string[][] = [];
  let truncated = false;

  for (const row of findAll(worksheet, "row")) {
    const rowCells = readRowCells(row, sharedStrings);

    if (!rowCells.some(hasCellText)) continue;

    if (rows.length >= maxTableRows) {
      truncated = true;
      continue;
    }

    rows.push(rowCells);
  }

  const normalized = normalizeRows(rows);

  return {
    rows: normalized.rows,
    truncated: truncated || normalized.truncated,
  };
}

function readRowCells(row: Element, sharedStrings: string[]) {
  const cells: string[] = [];

  for (const cell of Array.from(row.children).filter(
    (child) => child.localName === "c",
  )) {
    const reference = getAttribute(cell, "r");
    const columnIndex = reference
      ? getColumnIndexFromCellReference(reference)
      : cells.length;

    if (columnIndex < 0) continue;

    cells[columnIndex] = readCellValue(cell, sharedStrings);
  }

  return cells;
}

function readCellValue(cell: Element, sharedStrings: string[]) {
  const type = getAttribute(cell, "t");
  const formula = findFirst(cell, "f")?.textContent?.trim() ?? "";
  const value = findFirst(cell, "v")?.textContent ?? "";

  if (formula) return `=${formula}`;

  if (type === "s") {
    const sharedIndex = Number.parseInt(value, 10);

    return sharedStrings[sharedIndex] ?? "";
  }

  if (type === "inlineStr") {
    return readTextRuns(findFirst(cell, "is") ?? cell);
  }

  if (type === "b") return value === "1" ? "TRUE" : "FALSE";

  return value;
}

function normalizeRows(rows: string[][]): WorksheetRows {
  if (rows.length === 0) {
    return {
      rows: [],
      truncated: false,
    };
  }

  const filledColumnIndexes = rows.flatMap((row) =>
    row
      .map((cell, index) => (hasCellText(cell) ? index : -1))
      .filter((index) => index >= 0),
  );

  if (filledColumnIndexes.length === 0) {
    return {
      rows: [],
      truncated: false,
    };
  }

  const firstColumn = Math.min(...filledColumnIndexes);
  const lastColumn = Math.max(...filledColumnIndexes);
  const actualColumns = lastColumn - firstColumn + 1;
  const columns = clampTableColumns(actualColumns);
  const normalizedRows = rows.slice(0, maxTableRows).map((row) =>
    Array.from({ length: columns }, (_, index) => {
      return row[firstColumn + index]?.trim() ?? "";
    }),
  );

  return {
    rows: normalizedRows,
    truncated: rows.length > maxTableRows || actualColumns > maxTableColumns,
  };
}

function createPagesFromSheets(input: {
  fileName: string;
  output: OutputSize;
  sheets: Array<WorkbookSheet & WorksheetRows>;
}) {
  const workbookName = input.fileName.replace(/\.xlsx$/i, "") || "XLSX";
  const marginX = Math.max(40, Math.round(input.output.width * 0.07));
  const marginY = Math.max(40, Math.round(input.output.height * 0.08));
  const contentWidth = Math.max(320, input.output.width - marginX * 2);
  const contentHeight = Math.max(180, input.output.height - marginY * 2);

  const sheets = input.sheets.map((sheet, index) => {
    const rows = clampTableRows(sheet.rows.length);
    const columns = clampTableColumns(sheet.rows[0]?.length ?? 1);
    const cells = Array.from({ length: rows * columns }, (_, cellIndex) => {
      const rowIndex = Math.floor(cellIndex / columns);
      const columnIndex = cellIndex % columns;

      return sheet.rows[rowIndex]?.[columnIndex] ?? "";
    });

    return createTableSheet({
      name: sheet.name || `Sheet ${index + 1}`,
      rows,
      columns,
      cells,
      headerRow: rows > 1,
    });
  });
  const activeSheet = sheets[0];

  if (!activeSheet) return [];

  return [
    createPage({
      name: workbookName,
      background: "#ffffff",
      elements: [
        createTableElement({
          ...sheetToTableFields(activeSheet),
          sheets,
          activeSheetId: activeSheet.id,
          x: marginX,
          y: marginY,
          width: Math.min(contentWidth, Math.max(420, activeSheet.columns * 150)),
          height: Math.min(contentHeight, Math.max(160, activeSheet.rows * 48)),
        }),
      ],
    }),
  ];
}

function readRelationships(document: Document) {
  const relationships = new Map<string, string>();

  for (const relationship of findAll(document, "Relationship")) {
    const id = getAttribute(relationship, "Id");
    const target = getAttribute(relationship, "Target");

    if (id && target) relationships.set(id, target);
  }

  return relationships;
}

function normalizeWorkbookTarget(target: string) {
  const normalized = target.replace(/^\/+/, "");

  if (normalized.startsWith("xl/")) return normalized;

  return `xl/${normalized}`;
}

function readTextRuns(element: Element) {
  return findAll(element, "t")
    .map((text) => text.textContent ?? "")
    .join("");
}

function getColumnIndexFromCellReference(reference: string) {
  const columnLetters = reference.match(/^[A-Z]+/i)?.[0] ?? "";

  if (!columnLetters) return -1;

  return columnLetters
    .toUpperCase()
    .split("")
    .reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function hasCellText(value: string | undefined) {
  return Boolean(value?.trim());
}

function findAll(root: ParentNode | null, localName: string) {
  if (!root) return [];

  return Array.from(root.querySelectorAll("*")).filter(
    (element) => element.localName === localName,
  );
}

function findFirst(root: ParentNode | null, localName: string) {
  return findAll(root, localName)[0] ?? null;
}

function parseXml(input: string) {
  const parser = new DOMParser();

  return parser.parseFromString(input, "application/xml");
}

function getAttribute(element: Element | null, localName: string) {
  if (!element) return null;

  for (const attribute of Array.from(element.attributes)) {
    if (attribute.localName === localName) return attribute.value;
  }

  return null;
}
