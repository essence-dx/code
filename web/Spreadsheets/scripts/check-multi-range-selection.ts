import assert from "node:assert/strict";
import { cellKey } from "@/features/workbooks/addresses";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";
import { normalizeWorkbookDocument } from "@/features/workbooks/serialization";
import {
  addNamedMultiRangeToDocument,
} from "@/features/spreadsheet/state/annotation-state";
import {
  createMultiRangeClipboardPayload,
  formatMultiRangeLabel,
  getNamedRangeAreas,
  normalizeMultiRangeAreas,
  pasteClipboardTextIntoMultiRanges,
  shiftMultiRangeFormulaReferences,
} from "@/features/spreadsheet/multi-range-selection";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";

const document = createDefaultWorkbookDocument();
const sheet = document.sheets[0];

assert.ok(sheet, "default workbook has a sheet");

const firstArea: CellRange = {
  startRowIndex: 1,
  startColumnIndex: 1,
  endRowIndex: 2,
  endColumnIndex: 1,
};
const overlappingArea: CellRange = {
  startRowIndex: 2,
  startColumnIndex: 1,
  endRowIndex: 3,
  endColumnIndex: 2,
};
const secondArea: CellRange = {
  startRowIndex: 1,
  startColumnIndex: 3,
  endRowIndex: 1,
  endColumnIndex: 3,
};

const normalizedAreas = normalizeMultiRangeAreas(sheet, [
  secondArea,
  firstArea,
  overlappingArea,
  firstArea,
]);

assert.deepEqual(
  normalizedAreas,
  [firstArea, secondArea],
  "multi-range normalization sorts areas and drops overlaps or duplicates",
);
assert.equal(
  formatMultiRangeLabel(normalizedAreas),
  "B2:B3, D2",
  "multi-area labels use compact A1 notation",
);

sheet.cells[cellKey(1, 1)] = { raw: "North" };
sheet.cells[cellKey(2, 1)] = { raw: "=A2" };
sheet.cells[cellKey(1, 3)] = { raw: "Audit" };

const payload = createMultiRangeClipboardPayload({
  sheet,
  ranges: normalizedAreas,
  computedValues: {
    [cellKey(2, 1)]: "125",
  },
});

assert.ok(payload, "multi-range copy creates a clipboard payload");
assert.equal(
  payload.text,
  "North\n125\n\nAudit",
  "multi-range copy stacks disjoint areas with a blank separator row",
);
assert.match(
  payload.html,
  /<tbody data-area="2">/,
  "multi-range HTML copy preserves separate area metadata",
);

const shiftedCells = shiftMultiRangeFormulaReferences({
  cells: [{ raw: "=A1" }, { raw: "=$A$1" }],
  rowOffset: 1,
  columnOffset: 2,
});

assert.equal(
  shiftedCells[0]?.raw,
  "=C2",
  "relative formulas shift across multi-range transforms",
);
assert.equal(
  shiftedCells[1]?.raw,
  "=$A$1",
  "absolute references stay locked across multi-range transforms",
);

addNamedMultiRangeToDocument(document, "Quarter Review Areas", normalizedAreas);

const namedRange = document.namedRanges?.[0];

assert.ok(namedRange, "multi-area named range is saved");
assert.equal(namedRange.name, "Quarter_Review_Areas");
assert.deepEqual(
  getNamedRangeAreas(namedRange),
  normalizedAreas,
  "named range helpers expose all saved areas",
);

const pastedCount = pasteClipboardTextIntoMultiRanges({
  sheet,
  ranges: normalizedAreas,
  text: "=A1",
});

assert.equal(pastedCount, 3, "single-cell paste repeats into every selected area");
assert.equal(sheet.cells.B2?.raw, "=A1");
assert.equal(sheet.cells.B3?.raw, "=A2");
assert.equal(sheet.cells.D2?.raw, "=C1");

const normalizedDocument = normalizeWorkbookDocument({
  ...document,
  namedRanges: [
    {
      ...namedRange,
      ranges: [firstArea, overlappingArea, secondArea],
    },
  ],
});
const normalizedNamedRange = normalizedDocument.namedRanges[0];

assert.ok(
  normalizedNamedRange,
  "workbook normalization preserves valid multi-area named ranges",
);
assert.deepEqual(
  getNamedRangeAreas(normalizedNamedRange),
  [firstArea, secondArea],
  "workbook normalization removes overlapping persisted named-range areas",
);

console.log("Multi-range selection checks passed");
