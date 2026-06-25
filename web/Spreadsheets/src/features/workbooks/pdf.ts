import { cellKey, columnLabel } from "@/features/workbooks/addresses";
import { expandPrintFieldText } from "@/features/workbooks/print-fields";
import {
  getSheetPrintPageRanges,
  getSheetPrintVisibleIndexes,
} from "@/features/workbooks/print-pages";
import { getEffectiveSheetPrintSettings } from "@/features/workbooks/print-settings";
import type {
  ChartRange,
  SheetData,
  SheetPrintSettings,
} from "@/features/workbooks/types";

type PdfPageSize = {
  height: number;
  width: number;
};

type PreparedPdfPage = {
  columnIndexes: number[];
  columnWidths: number[];
  rowIndexes: number[];
  scale: number;
};

export type SheetPdfExportOptions = {
  computedValues: Record<string, string>;
  generatedAt?: Date;
  printSettings?: SheetPrintSettings;
  sheet: SheetData;
  workbookName: string;
};

const LETTER_PORTRAIT: PdfPageSize = { height: 792, width: 612 };
const LETTER_LANDSCAPE: PdfPageSize = { height: 612, width: 792 };
const PDF_MARGINS: Record<SheetPrintSettings["margins"], number> = {
  narrow: 25.2,
  normal: 50.4,
  wide: 72,
};
const MAX_CELL_WIDTH = 120;
const MIN_CELL_WIDTH = 38;
const ROW_HEIGHT = 20;
const HEADER_HEIGHT = 18;
const BODY_FONT_SIZE = 8;
const HEADER_FONT_SIZE = 10;
const TITLE_FONT_SIZE = 11;

export function sheetToPdf({
  computedValues,
  generatedAt = new Date(),
  printSettings,
  sheet,
  workbookName,
}: SheetPdfExportOptions) {
  const settings = getEffectiveSheetPrintSettings(sheet.id, printSettings);
  const pageRanges = getSheetPrintPageRanges(sheet, settings);
  const visibleIndexes = getSheetPrintVisibleIndexes(sheet, settings);
  const pageSize =
    settings.orientation === "landscape" ? LETTER_LANDSCAPE : LETTER_PORTRAIT;
  const preparedPages = pageRanges.flatMap((pageRange) =>
    preparePdfPages({
      pageRange: pageRange.range,
      pageSize,
      settings,
      sheet,
      visibleColumnIndexes: visibleIndexes.visibleColumns,
      visibleRowIndexes: visibleIndexes.visibleRows,
    }),
  );
  const contents = preparedPages.map((page, pageOffset) =>
    renderPdfPage({
      columnIndexes: page.columnIndexes,
      columnWidths: page.columnWidths,
      computedValues,
      generatedAt,
      pageNumber: pageOffset + 1,
      pageSize,
      pageCount: preparedPages.length,
      rowIndexes: page.rowIndexes,
      scale: page.scale,
      settings,
      sheet,
      workbookName,
    }),
  );

  return createPdf(contents, pageSize);
}

function preparePdfPages({
  pageRange,
  pageSize,
  settings,
  sheet,
  visibleColumnIndexes,
  visibleRowIndexes,
}: {
  pageRange: ChartRange;
  pageSize: PdfPageSize;
  settings: SheetPrintSettings;
  sheet: SheetData;
  visibleColumnIndexes: number[];
  visibleRowIndexes: number[];
}): PreparedPdfPage[] {
  const rowIndexes = visibleRowIndexes.filter(
    (rowIndex) =>
      rowIndex >= pageRange.startRowIndex && rowIndex <= pageRange.endRowIndex,
  );
  const columnIndexes = visibleColumnIndexes.filter(
    (columnIndex) =>
      columnIndex >= pageRange.startColumnIndex &&
      columnIndex <= pageRange.endColumnIndex,
  );
  const resolvedRows = rowIndexes.length
    ? rowIndexes
    : [pageRange.startRowIndex];
  const resolvedColumns = columnIndexes.length
    ? columnIndexes
    : [pageRange.startColumnIndex];
  const columnWidths = getColumnWidths(sheet, resolvedColumns);
  const scale = getTableScale({
    columnWidths,
    pageSize,
    settings,
  });
  const maxRows = getMaxBodyRowCount({ pageSize, scale, settings });

  return chunkIndexes(resolvedRows, maxRows).map((rowChunk) => ({
    columnIndexes: resolvedColumns,
    columnWidths,
    rowIndexes: rowChunk,
    scale,
  }));
}

function renderPdfPage({
  columnIndexes,
  columnWidths,
  computedValues,
  generatedAt,
  pageNumber,
  pageSize,
  pageCount,
  rowIndexes,
  scale,
  settings,
  sheet,
  workbookName,
}: {
  columnIndexes: number[];
  columnWidths: number[];
  computedValues: Record<string, string>;
  generatedAt: Date;
  pageNumber: number;
  pageSize: PdfPageSize;
  pageCount: number;
  rowIndexes: number[];
  scale: number;
  settings: SheetPrintSettings;
  sheet: SheetData;
  workbookName: string;
}) {
  const margin = PDF_MARGINS[settings.margins];
  const rowHeaderWidth = 28;
  const totalTableWidth =
    rowHeaderWidth + columnWidths.reduce((total, width) => total + width, 0);
  const operators: string[] = [];
  const headerText = expandPrintFieldText(settings.headerText, {
    fileName: workbookName,
    generatedAt,
    pageCount,
    pageNumber,
    sheetName: sheet.name,
  });
  const footerText = expandPrintFieldText(
    settings.footerText || "Page &[Page] of &[Pages]",
    {
      fileName: workbookName,
      generatedAt,
      pageCount,
      pageNumber,
      sheetName: sheet.name,
    },
  );
  let y = pageSize.height - margin;

  operators.push("0.15 0.18 0.22 rg");
  drawText(operators, workbookName, margin, y, TITLE_FONT_SIZE, "F2");
  drawText(operators, sheet.name, pageSize.width - margin - 160, y, TITLE_FONT_SIZE, "F2");
  y -= 18;

  if (headerText) {
    drawText(operators, headerText, margin, y, HEADER_FONT_SIZE, "F1");
    y -= 16;
  }

  operators.push("0.97 0.98 0.99 rg");
  drawRect(
    operators,
    margin,
    y - HEADER_HEIGHT,
    totalTableWidth * scale,
    HEADER_HEIGHT,
    true,
  );
  operators.push("0.63 0.68 0.75 RG");
  drawRect(
    operators,
    margin,
    y - HEADER_HEIGHT,
    totalTableWidth * scale,
    HEADER_HEIGHT,
    false,
  );

  let x = margin + rowHeaderWidth * scale;

  columnIndexes.forEach((columnIndex, columnOffset) => {
    const width = columnWidths[columnOffset] * scale;

    operators.push("0.15 0.18 0.22 rg");
    drawText(
      operators,
      columnLabel(columnIndex),
      x + 3,
      y - 12,
      BODY_FONT_SIZE,
      "F2",
    );
    operators.push("0.63 0.68 0.75 RG");
    drawLine(operators, x, y - HEADER_HEIGHT, x, y);
    x += width;
  });

  y -= HEADER_HEIGHT;

  rowIndexes.forEach((rowIndex) => {
    const rowTop = y;
    const rowBottom = y - ROW_HEIGHT * scale;

    operators.push("1 1 1 rg");
    drawRect(
      operators,
      margin,
      rowBottom,
      totalTableWidth * scale,
      ROW_HEIGHT * scale,
      true,
    );
    operators.push("0.86 0.88 0.92 RG");
    drawLine(operators, margin, rowBottom, margin + totalTableWidth * scale, rowBottom);
    drawText(
      operators,
      String(rowIndex + 1),
      margin + 4,
      rowTop - 13 * scale,
      BODY_FONT_SIZE,
      "F2",
    );

    let cellX = margin + rowHeaderWidth * scale;

    columnIndexes.forEach((columnIndex, columnOffset) => {
      const width = columnWidths[columnOffset] * scale;
      const key = cellKey(rowIndex, columnIndex);
      const value = computedValues[key] || sheet.cells[key]?.raw || "";
      const font = sheet.cells[key]?.style?.bold ? "F2" : "F1";

      operators.push("0.15 0.18 0.22 rg");
      drawText(
        operators,
        fitText(value, width - 6, BODY_FONT_SIZE),
        cellX + 3,
        rowTop - 13 * scale,
        BODY_FONT_SIZE,
        font,
      );
      operators.push("0.86 0.88 0.92 RG");
      drawLine(operators, cellX, rowBottom, cellX, rowTop);
      cellX += width;
    });

    drawLine(operators, margin + totalTableWidth * scale, rowBottom, margin + totalTableWidth * scale, rowTop);
    y = rowBottom;
  });

  operators.push("0.42 0.45 0.50 rg");
  drawText(operators, footerText, margin, margin - 16, HEADER_FONT_SIZE, "F1");

  return operators.join("\n");
}

function getColumnWidths(sheet: SheetData, columnIndexes: number[]) {
  return columnIndexes.map((columnIndex) =>
    clampWidth((sheet.columnWidths?.[String(columnIndex)] ?? 96) * 0.75),
  );
}

function getTableScale({
  columnWidths,
  pageSize,
  settings,
}: {
  columnWidths: number[];
  pageSize: PdfPageSize;
  settings: SheetPrintSettings;
}) {
  const margin = PDF_MARGINS[settings.margins];
  const availableWidth = pageSize.width - margin * 2;
  const rowHeaderWidth = 28;
  const totalTableWidth =
    rowHeaderWidth + columnWidths.reduce((total, width) => total + width, 0);

  return Math.min(settings.scale / 100, availableWidth / Math.max(totalTableWidth, 1));
}

function getMaxBodyRowCount({
  pageSize,
  scale,
  settings,
}: {
  pageSize: PdfPageSize;
  scale: number;
  settings: SheetPrintSettings;
}) {
  const margin = PDF_MARGINS[settings.margins];
  const availableHeight = pageSize.height - margin * 2;

  return Math.max(
    1,
    Math.floor((availableHeight - 80 - HEADER_HEIGHT * scale) / (ROW_HEIGHT * scale)),
  );
}

function chunkIndexes(indexes: number[], chunkSize: number) {
  const chunks: number[][] = [];

  for (let offset = 0; offset < indexes.length; offset += chunkSize) {
    chunks.push(indexes.slice(offset, offset + chunkSize));
  }

  return chunks.length ? chunks : [[]];
}

function clampWidth(width: number) {
  if (!Number.isFinite(width)) {
    return MIN_CELL_WIDTH;
  }

  return Math.min(Math.max(width, MIN_CELL_WIDTH), MAX_CELL_WIDTH);
}

function fitText(value: string, width: number, fontSize: number) {
  const sanitized = sanitizePdfText(value);
  const maxCharacters = Math.max(1, Math.floor(width / (fontSize * 0.55)));

  if (sanitized.length <= maxCharacters) {
    return sanitized;
  }

  if (maxCharacters <= 3) {
    return sanitized.slice(0, maxCharacters);
  }

  return `${sanitized.slice(0, maxCharacters - 3)}...`;
}

function drawText(
  operators: string[],
  value: string,
  x: number,
  y: number,
  fontSize: number,
  fontName: "F1" | "F2",
) {
  operators.push(
    `BT /${fontName} ${fontSize} Tf ${formatNumber(x)} ${formatNumber(y)} Td (${escapePdfText(
      value,
    )}) Tj ET`,
  );
}

function drawRect(
  operators: string[],
  x: number,
  y: number,
  width: number,
  height: number,
  fill: boolean,
) {
  operators.push(
    `${formatNumber(x)} ${formatNumber(y)} ${formatNumber(width)} ${formatNumber(
      height,
    )} re ${fill ? "f" : "S"}`,
  );
}

function drawLine(
  operators: string[],
  startX: number,
  startY: number,
  endX: number,
  endY: number,
) {
  operators.push(
    `${formatNumber(startX)} ${formatNumber(startY)} m ${formatNumber(
      endX,
    )} ${formatNumber(endY)} l S`,
  );
}

function escapePdfText(value: string) {
  return sanitizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function sanitizePdfText(value: string) {
  return value.replace(/[^\x20-\x7e]/g, "?");
}

function formatNumber(value: number) {
  return Number(value.toFixed(2)).toString();
}

function createPdf(contents: string[], pageSize: PdfPageSize) {
  const encoder = new TextEncoder();
  const objects: string[] = ["", ""];
  const addObject = (content: string) => {
    objects.push(content);
    return objects.length;
  };
  const regularFontObject = addObject(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  );
  const boldFontObject = addObject(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  );
  const pageObjects: number[] = [];

  contents.forEach((content) => {
    const contentLength = encoder.encode(content).byteLength;
    const contentObject = addObject(
      `<< /Length ${contentLength} >>\nstream\n${content}\nendstream`,
    );
    const pageObject = addObject(
      [
        "<< /Type /Page",
        "/Parent 2 0 R",
        `/MediaBox [0 0 ${pageSize.width} ${pageSize.height}]`,
        `/Resources << /Font << /F1 ${regularFontObject} 0 R /F2 ${boldFontObject} 0 R >> >>`,
        `/Contents ${contentObject} 0 R`,
        ">>",
      ].join(" "),
    );

    pageObjects.push(pageObject);
  });

  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] =
    `<< /Type /Pages /Kids [${pageObjects.map((objectNumber) => `${objectNumber} 0 R`).join(" ")}] /Count ${pageObjects.length} >>`;

  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];

  objects.forEach((content, index) => {
    offsets.push(encoder.encode(chunks.join("")).byteLength);
    chunks.push(`${index + 1} 0 obj\n${content}\nendobj\n`);
  });

  const xrefOffset = encoder.encode(chunks.join("")).byteLength;

  chunks.push(`xref\n0 ${objects.length + 1}\n`);
  chunks.push("0000000000 65535 f \n");
  offsets.slice(1).forEach((offset) => {
    chunks.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
  });
  chunks.push(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
  );

  return encoder.encode(chunks.join(""));
}
