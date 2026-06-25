import assert from "node:assert/strict";
import {
  applyFlashFillToSheet,
  createFlashFillPlan,
} from "@/features/spreadsheet/flash-fill";
import { cellKey } from "@/features/workbooks/addresses";
import type { SheetData } from "@/features/workbooks/types";

function createSheet(): SheetData {
  return {
    id: "sheet-1",
    name: "Flash Fill",
    rowCount: 12,
    columnCount: 8,
    columnWidths: {},
    hiddenRows: [],
    hiddenColumns: [],
    showGridlines: true,
    rowGroups: [],
    columnGroups: [],
    mergedCells: [],
    cells: {},
  };
}

function setCell(
  sheet: SheetData,
  rowIndex: number,
  columnIndex: number,
  raw: string,
) {
  sheet.cells[cellKey(rowIndex, columnIndex)] = { raw };
}

const names = createSheet();
setCell(names, 0, 0, "Ada Lovelace");
setCell(names, 1, 0, "Grace Hopper");
setCell(names, 2, 0, "Alan Turing");
setCell(names, 0, 1, "Lovelace, Ada");

const namePlan = applyFlashFillToSheet({
  sheet: names,
  range: {
    startRowIndex: 0,
    startColumnIndex: 1,
    endRowIndex: 2,
    endColumnIndex: 1,
  },
});

assert.equal(namePlan?.filledCells.length, 2);
assert.equal(names.cells.B2?.raw, "Hopper, Grace");
assert.equal(names.cells.B3?.raw, "Turing, Alan");

const ids = createSheet();
setCell(ids, 0, 0, "INV-2026-0007");
setCell(ids, 1, 0, "INV-2026-0008");
setCell(ids, 2, 0, "INV-2026-0009");
setCell(ids, 0, 1, "2026/0007");

const idPlan = createFlashFillPlan({
  sheet: ids,
  range: {
    startRowIndex: 0,
    startColumnIndex: 1,
    endRowIndex: 2,
    endColumnIndex: 1,
  },
});

assert.deepEqual(
  idPlan?.filledCells.map((cell) => cell.raw),
  ["2026/0008", "2026/0009"],
);

const dates = createSheet();
setCell(dates, 0, 0, "2026-05-14");
setCell(dates, 1, 0, "2026-05-15");
setCell(dates, 2, 0, "2026-05-16");
setCell(dates, 0, 1, "May 14, 2026");

applyFlashFillToSheet({
  sheet: dates,
  range: {
    startRowIndex: 0,
    startColumnIndex: 1,
    endRowIndex: 2,
    endColumnIndex: 1,
  },
});

assert.equal(dates.cells.B2?.raw, "May 15, 2026");
assert.equal(dates.cells.B3?.raw, "May 16, 2026");

const rowPattern = createSheet();
setCell(rowPattern, 0, 0, "north-001");
setCell(rowPattern, 0, 1, "south-002");
setCell(rowPattern, 0, 2, "east-003");
setCell(rowPattern, 1, 0, "NORTH");

applyFlashFillToSheet({
  sheet: rowPattern,
  range: {
    startRowIndex: 1,
    startColumnIndex: 0,
    endRowIndex: 1,
    endColumnIndex: 2,
  },
});

assert.equal(rowPattern.cells.B2?.raw, "SOUTH");
assert.equal(rowPattern.cells.C2?.raw, "EAST");

console.log("Flash Fill checks passed.");
