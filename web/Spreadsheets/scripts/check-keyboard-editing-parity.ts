import { createAutoSumFormula } from "@/features/spreadsheet/autosum";
import { cellKey } from "@/features/workbooks/addresses";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const document = createDefaultWorkbookDocument();
const sheet = document.sheets[0];

assert(Boolean(sheet), "default workbook has a sheet");

sheet!.cells = {
  [cellKey(0, 0)]: { raw: "Revenue" },
  [cellKey(1, 0)]: { raw: "10" },
  [cellKey(2, 0)]: { raw: "15" },
  [cellKey(3, 0)]: { raw: "" },
  [cellKey(5, 0)]: { raw: "Jan" },
  [cellKey(5, 1)]: { raw: "20" },
  [cellKey(5, 2)]: { raw: "30" },
};

assert(
  createAutoSumFormula({
    computedValues: {},
    selection: { rowIndex: 3, columnIndex: 0 },
    sheet: sheet!,
  }) === "=SUM(A2:A3)",
  "AutoSum prefers the contiguous numeric range above the active cell",
);
assert(
  createAutoSumFormula({
    computedValues: {},
    selection: { rowIndex: 5, columnIndex: 3 },
    sheet: sheet!,
  }) === "=SUM(B6:C6)",
  "AutoSum falls back to the contiguous numeric range to the left",
);
assert(
  createAutoSumFormula({
    computedValues: {},
    selection: { rowIndex: 0, columnIndex: 3 },
    sheet: sheet!,
  }) === null,
  "AutoSum returns no formula when no adjacent numeric range exists",
);

console.log("Keyboard editing parity checks passed.");
