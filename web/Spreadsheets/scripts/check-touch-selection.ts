import assert from "node:assert/strict";
import {
  formatTouchSelectionLabel,
  getTouchSelectionAnchor,
  resizeRangeWithTouchHandle,
} from "@/features/spreadsheet/touch-selection";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";

const range: CellRange = {
  startRowIndex: 1,
  startColumnIndex: 1,
  endRowIndex: 4,
  endColumnIndex: 3,
};

assert.deepEqual(getTouchSelectionAnchor(range, "start"), {
  rowIndex: 4,
  columnIndex: 3,
});
assert.deepEqual(getTouchSelectionAnchor(range, "end"), {
  rowIndex: 1,
  columnIndex: 1,
});

assert.deepEqual(
  resizeRangeWithTouchHandle({
    range,
    handle: "start",
    target: { rowIndex: 0, columnIndex: 0 },
  }),
  {
    startRowIndex: 0,
    startColumnIndex: 0,
    endRowIndex: 4,
    endColumnIndex: 3,
  },
);

assert.deepEqual(
  resizeRangeWithTouchHandle({
    range,
    handle: "end",
    target: { rowIndex: 6, columnIndex: 6 },
  }),
  {
    startRowIndex: 1,
    startColumnIndex: 1,
    endRowIndex: 6,
    endColumnIndex: 6,
  },
);

assert.equal(formatTouchSelectionLabel(range), "B2:D5");
assert.equal(
  formatTouchSelectionLabel({
    startRowIndex: 0,
    startColumnIndex: 0,
    endRowIndex: 0,
    endColumnIndex: 0,
  }),
  "A1",
);

console.log("Touch selection checks passed.");
