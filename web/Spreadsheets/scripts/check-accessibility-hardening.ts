import assert from "node:assert/strict";
import {
  getCellAriaLabel,
  getCellDescriptionId,
  getCellElementId,
  getCellStatusDescription,
  getGridKeyboardInstructionsId,
  getGridSelectionDescription,
  getGridSelectionDescriptionId,
} from "@/features/spreadsheet/components/cell-accessibility";
import { getWorkbookAccessibilityIssues } from "@/features/spreadsheet/workbook-accessibility";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";

assert.equal(getCellElementId("sheet_1", "A1"), "cell-sheet_1-A1");
assert.equal(
  getCellDescriptionId("sheet 1", "A:1"),
  "cell-description-sheet-1-A-1",
);
assert.equal(
  getGridKeyboardInstructionsId("sheet 1"),
  "grid-keyboard-instructions-sheet-1",
);
assert.equal(
  getGridSelectionDescriptionId("sheet 1"),
  "grid-selection-description-sheet-1",
);

assert.equal(
  getCellAriaLabel({
    address: "B2",
    value: "Paid",
    rowIndex: 1,
    columnIndex: 1,
    isSelected: true,
    isInRange: true,
    isInvalid: true,
    isFormulaError: false,
    hasLink: true,
    hasNote: true,
    tableName: "Invoices",
    tableCellKind: "body",
  }),
  "B2, row 2, column B, Value Paid, active cell, invalid value, has link, has note, Invoices body cell",
);

assert.equal(
  getCellStatusDescription({
    validationFeedback: "Choose an approved status.",
    formulaErrorMessage: null,
    spillMessage: "Dynamic array spill range.",
    isProtected: true,
    listOptionCount: 3,
    tableName: "Invoices",
    tableCellKind: "header",
    isFrozenRow: true,
    isFrozenColumn: false,
  }),
  "Choose an approved status. Dynamic array spill range. This cell is protected and cannot be edited. Validation dropdown with 3 options. Inside Invoices, header area. Frozen row.",
);

assert.equal(
  getGridSelectionDescription({
    selectedRange: {
      startRowIndex: 0,
      startColumnIndex: 0,
      endRowIndex: 2,
      endColumnIndex: 1,
    },
    selectedKey: "A1",
    isProtected: false,
    canEditSelection: true,
  }),
  "Selected A1:B3. 3 rows by 2 columns. Selection can be edited.",
);

const document = createDefaultWorkbookDocument();
const sheet = document.sheets[0];

assert.ok(sheet, "default workbook has a sheet");

sheet.hiddenRows = [2];
sheet.hiddenColumns = [3];
sheet.showGridlines = false;
document.dataValidations.push({
  id: "dv-status",
  sheetId: sheet.id,
  range: {
    startRowIndex: 0,
    startColumnIndex: 0,
    endRowIndex: 4,
    endColumnIndex: 0,
  },
  type: "list",
  value: "Open,Closed",
});

const accessibilityIssues = getWorkbookAccessibilityIssues(document);
const issueIds = new Set(accessibilityIssues.map((issue) => issue.id));

assert.ok(issueIds.has(`hidden-structure:${sheet.id}`));
assert.ok(issueIds.has(`hidden-gridlines:${sheet.id}`));
assert.ok(issueIds.has("unclear-validation-rules"));

console.log("Accessibility hardening checks passed.");
