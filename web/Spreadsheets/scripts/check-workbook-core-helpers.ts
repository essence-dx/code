import assert from "node:assert/strict";
import {
  cellKey,
  columnIndex,
  columnLabel,
  parseCellKey,
} from "@/features/workbooks/addresses";
import {
  forEachCellInRange,
  isCellKeyInRange,
  normalizeRange,
  rangesOverlap,
  selectionToRange,
} from "@/features/spreadsheet/state/selection-state";
import {
  quoteFormulaSheetName,
  shiftFormulaReferences,
} from "@/features/spreadsheet/formula-references";
import { normalizeWorkbookDocument } from "@/features/workbooks/serialization";

assert.equal(columnLabel(0), "A", "first zero-based column is A");
assert.equal(columnLabel(25), "Z", "column 25 is Z");
assert.equal(columnLabel(26), "AA", "column 26 is AA");
assert.equal(columnLabel(701), "ZZ", "column 701 is ZZ");
assert.equal(columnLabel(702), "AAA", "column 702 is AAA");
assert.equal(columnIndex("A"), 0, "column A is zero-based index 0");
assert.equal(columnIndex("AA"), 26, "column AA is zero-based index 26");
assert.equal(cellKey(4, 27), "AB5", "cell keys use A1 notation");
assert.deepEqual(
  parseCellKey("ab12"),
  { columnIndex: 27, rowIndex: 11 },
  "cell parsing is case-insensitive",
);
assert.equal(parseCellKey("A0"), null, "row zero is not a valid A1 key");
assert.equal(parseCellKey(""), null, "blank keys do not parse");

const reversedRange = normalizeRange(
  { rowIndex: 5, columnIndex: 3 },
  { rowIndex: 2, columnIndex: 1 },
);

assert.deepEqual(
  reversedRange,
  {
    startRowIndex: 2,
    startColumnIndex: 1,
    endRowIndex: 5,
    endColumnIndex: 3,
  },
  "range normalization orders both axes",
);
assert.deepEqual(
  selectionToRange({ rowIndex: 3, columnIndex: 2 }),
  {
    startRowIndex: 3,
    startColumnIndex: 2,
    endRowIndex: 3,
    endColumnIndex: 2,
  },
  "single-cell selections convert to a one-cell range",
);
assert.equal(
  rangesOverlap(reversedRange, {
    startRowIndex: 4,
    startColumnIndex: 3,
    endRowIndex: 7,
    endColumnIndex: 6,
  }),
  true,
  "overlap detection catches intersecting ranges",
);
assert.equal(
  rangesOverlap(reversedRange, {
    startRowIndex: 6,
    startColumnIndex: 4,
    endRowIndex: 8,
    endColumnIndex: 8,
  }),
  false,
  "overlap detection rejects separated ranges",
);
assert.equal(
  isCellKeyInRange("C4", reversedRange),
  true,
  "A1 cell keys can be tested against normalized ranges",
);
assert.equal(
  isCellKeyInRange("A0", reversedRange),
  false,
  "invalid A1 cell keys are never inside a range",
);

const visitedCells: string[] = [];

forEachCellInRange(
  {
    startRowIndex: 0,
    startColumnIndex: 0,
    endRowIndex: 1,
    endColumnIndex: 1,
  },
  (rowIndex, columnIndexValue) => {
    visitedCells.push(cellKey(rowIndex, columnIndexValue));
  },
);

assert.deepEqual(
  visitedCells,
  ["A1", "B1", "A2", "B2"],
  "range iteration stays row-major",
);

const normalized = normalizeWorkbookDocument({
  activeSheetId: "missing_sheet",
  metadata: {
    description: "  Finance workbook  ",
    favorite: true,
    tags: ["Quarter", "Quarter", "  Planning  ", "", 42],
  },
  sheets: [
    {
      id: "sheet_main",
      name: "Main",
      rowCount: 2,
      columnCount: 2,
      cells: {
        A1: { raw: "=SUM(1,2)" },
        A0: { raw: "invalid row" },
        c1: { raw: "outside columns" },
      },
      hiddenRows: [1, 1, 4, "bad"],
      hiddenColumns: [0, 5, "bad"],
    },
  ],
  formulaWatches: [
    { id: "watch_valid", sheetId: "sheet_main", cellKey: "A1", createdAt: "now" },
    { id: "watch_invalid", sheetId: "sheet_main", cellKey: "A0", createdAt: "now" },
  ],
});
const normalizedSheet = normalized.sheets[0];

assert.equal(
  normalized.activeSheetId,
  "sheet_main",
  "normalization falls back to the first valid sheet",
);
assert.deepEqual(
  normalized.metadata.tags,
  ["Quarter", "Planning"],
  "metadata tags are trimmed, deduplicated, and filtered",
);
assert.equal(normalizedSheet?.cells.A1?.raw, "=SUM(1,2)");
assert.equal(normalizedSheet?.cells.A0, undefined);
assert.equal(normalizedSheet?.cells.C1, undefined);
assert.deepEqual(normalizedSheet?.hiddenRows, [1]);
assert.deepEqual(normalizedSheet?.hiddenColumns, [0]);
assert.equal(
  normalized.formulaWatches.length,
  1,
  "formula watches keep only valid in-sheet formulas",
);

assert.equal(
  shiftFormulaReferences({
    formula: "=A1+$B$2+C$3+$D4",
    rowOffset: 1,
    columnOffset: 2,
  }),
  "=C2+$B$2+E$3+$D5",
  "relative references shift while locked axes stay fixed",
);
assert.equal(
  shiftFormulaReferences({
    formula: '="A1"&A1',
    rowOffset: 1,
    columnOffset: 1,
  }),
  '="A1"&B2',
  "quoted string contents are not shifted",
);
assert.equal(
  shiftFormulaReferences({
    formula: `=${quoteFormulaSheetName("Quarter Plan")}!A1`,
    rowOffset: 0,
    columnOffset: 1,
  }),
  "='Quarter Plan'!B1",
  "sheet-qualified references can shift",
);
assert.equal(
  shiftFormulaReferences({
    formula: "=A1",
    rowOffset: -1,
    columnOffset: 0,
  }),
  "=A1",
  "references are not shifted below the worksheet origin",
);

console.log("Workbook core helper checks passed.");
