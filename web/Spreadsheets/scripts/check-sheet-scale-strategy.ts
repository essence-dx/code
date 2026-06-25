import assert from "node:assert/strict";
import {
  cellKey,
  columnLabel,
} from "@/features/workbooks/addresses";
import { sheetToCsv, sheetToTsv } from "@/features/workbooks/csv";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";
import { normalizeWorkbookDocument } from "@/features/workbooks/serialization";
import { getContiguousIndexes } from "@/features/spreadsheet/index-cache";
import {
  EXCEL_MAX_COLUMNS,
  EXCEL_MAX_ROWS,
  enableExcelScaleForSheet,
  getDelimitedExportBounds,
  getSheetScaleSummary,
} from "@/features/spreadsheet/sheet-scale";

const document = createDefaultWorkbookDocument();
const sheet = document.sheets[0];

assert.ok(sheet, "default workbook has a sheet");
assert.equal(sheet.scaleMode, "standard");
assert.equal(sheet.rowCount, 1_000);
assert.equal(sheet.columnCount, 52);

enableExcelScaleForSheet(sheet);

assert.equal(sheet.scaleMode, "excel");
assert.equal(sheet.rowCount, EXCEL_MAX_ROWS);
assert.equal(sheet.columnCount, EXCEL_MAX_COLUMNS);
assert.equal(columnLabel(EXCEL_MAX_COLUMNS - 1), "XFD");

const lastKey = cellKey(EXCEL_MAX_ROWS - 1, EXCEL_MAX_COLUMNS - 1);
sheet.cells = {
  A1: { raw: "First" },
  [lastKey]: { raw: "Last" },
};

const summary = getSheetScaleSummary(sheet);

assert.equal(summary.mode, "excel");
assert.equal(summary.totalRows, EXCEL_MAX_ROWS);
assert.equal(summary.totalColumns, EXCEL_MAX_COLUMNS);
assert.equal(summary.usedRangeLabel, "A1:XFD1048576");
assert.equal(summary.exportsUseUsedRange, true);

const bounds = getDelimitedExportBounds(sheet);

assert.equal(bounds.startRowIndex, 0);
assert.equal(bounds.startColumnIndex, 0);
assert.equal(bounds.endRowIndex, EXCEL_MAX_ROWS - 1);
assert.equal(bounds.endColumnIndex, EXCEL_MAX_COLUMNS - 1);

sheet.cells = {
  C3: { raw: "Compact" },
  D4: { raw: "Export" },
};

assert.equal(sheetToCsv(sheet), "Compact\n,Export");
assert.equal(sheetToTsv(sheet), "Compact\n\tExport");

const normalized = normalizeWorkbookDocument({
  ...document,
  sheets: [
    {
      ...sheet,
      rowCount: EXCEL_MAX_ROWS + 10,
      columnCount: EXCEL_MAX_COLUMNS + 10,
      scaleMode: "excel",
      cells: {
        A1: { raw: "inside" },
        XFE1: { raw: "outside" },
      },
    },
  ],
});
const normalizedSheet = normalized.sheets[0];

assert.ok(normalizedSheet, "normalized workbook keeps a sheet");
assert.equal(normalizedSheet.rowCount, EXCEL_MAX_ROWS);
assert.equal(normalizedSheet.columnCount, EXCEL_MAX_COLUMNS);
assert.equal(normalizedSheet.scaleMode, "excel");
assert.equal(normalizedSheet.cells.A1?.raw, "inside");
assert.equal(normalizedSheet.cells.XFE1, undefined);

const firstMillionIndexes = getContiguousIndexes(EXCEL_MAX_ROWS);

assert.equal(firstMillionIndexes.length, EXCEL_MAX_ROWS);
assert.equal(firstMillionIndexes[0], 0);
assert.equal(firstMillionIndexes.at(-1), EXCEL_MAX_ROWS - 1);
assert.equal(getContiguousIndexes(EXCEL_MAX_ROWS), firstMillionIndexes);

console.log("Sheet scale strategy checks passed");
