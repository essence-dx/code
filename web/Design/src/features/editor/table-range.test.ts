import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  clearTableRange,
  fillTableRangeDown,
  fillTableRangeRight,
  normalizeTableCellRange,
} from "@/features/editor/table-range";

describe("table range editing", () => {
  test("normalizes selected ranges and formats spreadsheet labels", () => {
    const range = normalizeTableCellRange(
      { startRow: 5, startColumn: 3, endRow: 1, endColumn: 1 },
      { rows: 10, columns: 6 },
    );

    assert.equal(range.label, "B2:D6");
    assert.equal(range.cellCount, 15);
  });

  test("fills down and right from the range anchor cells", () => {
    const range = normalizeTableCellRange(
      { startRow: 0, startColumn: 0, endRow: 2, endColumn: 2 },
      { rows: 3, columns: 3 },
    );
    const cells = ["A", "B", "C", "", "", "", "", "", ""];

    assert.deepEqual(fillTableRangeDown({ cells, columns: 3, range }), [
      "A",
      "B",
      "C",
      "A",
      "B",
      "C",
      "A",
      "B",
      "C",
    ]);
    assert.deepEqual(fillTableRangeRight({ cells, columns: 3, range }), [
      "A",
      "A",
      "A",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
  });

  test("clears every cell in the selected range", () => {
    const range = normalizeTableCellRange(
      { startRow: 0, startColumn: 1, endRow: 1, endColumn: 2 },
      { rows: 2, columns: 3 },
    );

    assert.deepEqual(
      clearTableRange({
        cells: ["A", "B", "C", "D", "E", "F"],
        columns: 3,
        range,
      }),
      ["A", "", "", "D", "", ""],
    );
  });
});
