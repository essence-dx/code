import assert from "node:assert/strict";
import { cellKey } from "@/features/workbooks/addresses";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";
import {
  getSelectionWideRaw,
  updateRangeRaw,
} from "@/features/spreadsheet/state/edit-state";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";

const document = createDefaultWorkbookDocument();
const sheet = document.sheets[0];

assert.ok(sheet, "default workbook has a sheet");

const twoByTwoRange: CellRange = {
  startRowIndex: 0,
  startColumnIndex: 0,
  endRowIndex: 1,
  endColumnIndex: 1,
};

updateRangeRaw(sheet, twoByTwoRange, "=A1", {
  rowIndex: 0,
  columnIndex: 0,
});

assert.equal(sheet.cells[cellKey(0, 0)]?.raw, "=A1");
assert.equal(
  sheet.cells[cellKey(0, 1)]?.raw,
  "=B1",
  "selection-wide formulas shift relative columns across a row",
);
assert.equal(
  sheet.cells[cellKey(1, 0)]?.raw,
  "=A2",
  "selection-wide formulas shift relative rows down a column",
);
assert.equal(
  sheet.cells[cellKey(1, 1)]?.raw,
  "=B2",
  "selection-wide formulas shift both row and column for each target cell",
);

assert.equal(
  getSelectionWideRaw({
    anchor: { rowIndex: 0, columnIndex: 0 },
    columnIndex: 1,
    normalizedRaw: "=$A1+A$1+$A$1",
    rowIndex: 1,
  }),
  "=$A2+B$1+$A$1",
  "absolute formula references keep their locked axes during range edits",
);

updateRangeRaw(sheet, twoByTwoRange, "Approved", {
  rowIndex: 0,
  columnIndex: 0,
});

assert.deepEqual(
  [
    sheet.cells[cellKey(0, 0)]?.raw,
    sheet.cells[cellKey(0, 1)]?.raw,
    sheet.cells[cellKey(1, 0)]?.raw,
    sheet.cells[cellKey(1, 1)]?.raw,
  ],
  ["Approved", "Approved", "Approved", "Approved"],
  "non-formula edits still write the same value across the whole selection",
);

sheet.cells[cellKey(1, 1)] = {
  raw: "Keep style",
  style: { bold: true },
};
updateRangeRaw(sheet, twoByTwoRange, "", {
  rowIndex: 0,
  columnIndex: 0,
});

assert.equal(
  sheet.cells[cellKey(1, 1)]?.raw,
  "",
  "blank selection-wide edits clear raw cell values",
);
assert.equal(
  sheet.cells[cellKey(1, 1)]?.style?.bold,
  true,
  "blank selection-wide edits preserve existing cell style records",
);

console.log("Multi-cell edit checks passed.");
