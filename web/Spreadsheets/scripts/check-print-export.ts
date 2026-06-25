import { strict as assert } from "node:assert";
import { updateActiveSheetPrintSettingsInDocument } from "@/features/spreadsheet/state/print-state";
import { cellKey } from "@/features/workbooks/addresses";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";
import {
  formatPrintAreaReference,
  parsePrintAreaReference,
} from "@/features/workbooks/print-area-reference";
import { sheetToPdf } from "@/features/workbooks/pdf";

const document = createDefaultWorkbookDocument();
const sheet = document.sheets[0];

assert(sheet, "default workbook has a sheet");

sheet.cells[cellKey(0, 0)] = { raw: "Outside area" };
sheet.cells[cellKey(1, 1)] = { raw: "Inside area" };
sheet.cells[cellKey(2, 2)] = { raw: "Tail cell" };
sheet.cells[cellKey(39, 1)] = { raw: "Flow end" };

const parsedArea = parsePrintAreaReference("$B$2:$C$3", sheet);

if (!parsedArea.ok) {
  throw new Error(parsedArea.error);
}

assert.equal(
  formatPrintAreaReference(parsedArea.range),
  "B2:C3",
  "print area references format as compact A1 ranges",
);

updateActiveSheetPrintSettingsInDocument(document, {
  columnPageBreaks: [2],
  footerText: "Page &[Page] of &[Pages]",
  headerText: "&[File] - &[Sheet]",
  printArea: parsedArea.range,
  rowPageBreaks: [2],
});

const pdf = sheetToPdf({
  computedValues: {
    [cellKey(1, 1)]: "Inside area",
    [cellKey(2, 2)]: "Tail cell",
  },
  generatedAt: new Date("2026-05-15T00:00:00.000Z"),
  printSettings: document.sheetPrintSettings[0],
  sheet,
  workbookName: "Essence Excel",
});
const pdfText = new TextDecoder().decode(pdf);

assert(pdfText.startsWith("%PDF-1.4"), "PDF export writes a PDF header");
assert(pdfText.includes("/Count 4"), "page breaks create four PDF pages");
assert(pdfText.includes("Inside area"), "print area cells render into the PDF");
assert(
  pdfText.includes("Tail cell"),
  "later page-break segments render into the PDF",
);
assert(
  !pdfText.includes("Outside area"),
  "cells outside the print area are excluded from the PDF",
);

const longArea = parsePrintAreaReference("B2:B40", sheet);

if (!longArea.ok) {
  throw new Error(longArea.error);
}

updateActiveSheetPrintSettingsInDocument(document, {
  columnPageBreaks: [],
  printArea: longArea.range,
  rowPageBreaks: [],
});

const multipagePdf = sheetToPdf({
  computedValues: {
    [cellKey(1, 1)]: "Inside area",
    [cellKey(39, 1)]: "Flow end",
  },
  generatedAt: new Date("2026-05-15T00:00:00.000Z"),
  printSettings: document.sheetPrintSettings[0],
  sheet,
  workbookName: "Essence Excel",
});
const multipagePdfText = new TextDecoder().decode(multipagePdf);

assert(
  multipagePdfText.includes("/Count 2"),
  "long print areas flow across additional PDF pages",
);
assert(
  multipagePdfText.includes("Flow end"),
  "late rows in long print areas are not truncated",
);

const invalidArea = parsePrintAreaReference("ZZZ1", sheet);

assert.equal(invalidArea.ok, false, "out-of-sheet print areas are rejected");

console.log("Print export checks passed.");
