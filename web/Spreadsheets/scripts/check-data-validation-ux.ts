import assert from "node:assert/strict";
import {
  createDataValidationManagerRows,
  dataValidationPresets,
} from "@/features/spreadsheet/data-validation-manager";
import {
  getInvalidCellIssues,
  getInvalidCellKeys,
  getListValidationOptions,
  getValidationFeedback,
} from "@/features/spreadsheet/data-validation";
import { addDataValidationToDocument } from "@/features/spreadsheet/state/rule-state";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";
import { normalizeWorkbookDocument } from "@/features/workbooks/serialization";

const document = createDefaultWorkbookDocument();
const sheet = document.sheets[0];

assert.ok(sheet, "default workbook has a sheet");

sheet.cells = {
  A1: { raw: "Hardware" },
  A2: { raw: "Software" },
  B1: { raw: "Monitor" },
  B2: { raw: "Laptop" },
  C1: { raw: "Gold" },
  C2: { raw: "Silver" },
  D1: { raw: "Bronze" },
  D2: { raw: "Silver" },
};

const dependentPreset = dataValidationPresets.find(
  (preset) => preset.id === "dependent-list",
);
const requiredPreset = dataValidationPresets.find(
  (preset) => preset.id === "required",
);

assert.ok(dependentPreset, "dependent preset exists");
assert.ok(requiredPreset, "required preset exists");

addDataValidationToDocument(
  document,
  {
    startRowIndex: 0,
    startColumnIndex: 1,
    endRowIndex: 1,
    endColumnIndex: 1,
  },
  {
    ...dependentPreset.rule,
    dependentCell: undefined,
  },
);
addDataValidationToDocument(
  document,
  {
    startRowIndex: 0,
    startColumnIndex: 2,
    endRowIndex: 1,
    endColumnIndex: 2,
  },
  {
    type: "list",
    listSource: "range",
    value: "D1:D2",
    errorMessage: "Pick a value from the source range.",
    errorStyle: "stop",
    circleInvalid: true,
  },
);
addDataValidationToDocument(
  document,
  {
    startRowIndex: 0,
    startColumnIndex: 4,
    endRowIndex: 0,
    endColumnIndex: 4,
  },
  {
    ...requiredPreset.rule,
    circleInvalid: false,
  },
);

const rules = document.dataValidations.filter(
  (rule) => rule.sheetId === sheet.id,
);

assert.deepEqual(
  getListValidationOptions({
    rules,
    sheet,
    computedValues: {},
    rowIndex: 0,
    columnIndex: 1,
  }),
  ["Laptop", "Monitor", "Keyboard"],
);
assert.deepEqual(
  getListValidationOptions({
    rules,
    sheet,
    computedValues: {},
    rowIndex: 1,
    columnIndex: 1,
  }),
  ["License", "Renewal", "Support"],
);
assert.deepEqual(
  getListValidationOptions({
    rules,
    sheet,
    computedValues: {},
    rowIndex: 1,
    columnIndex: 2,
  }),
  ["Bronze", "Silver"],
);

const issues = getInvalidCellIssues({
  sheet,
  rules,
  computedValues: {},
});
const issueKeys = issues.map((issue) => issue.key).sort();

assert.deepEqual(issueKeys, ["B2", "C1", "E1"]);
assert.deepEqual(
  Array.from(
    getInvalidCellKeys({
      sheet,
      rules,
      computedValues: {},
    }),
  ).sort(),
  ["B2", "C1"],
);
assert.equal(
  getValidationFeedback({
    rules,
    rowIndex: 1,
    columnIndex: 1,
    isInvalid: true,
  }),
  "This option does not belong to the selected parent.",
);

const managerRows = createDataValidationManagerRows({ rules, issues });

assert.equal(managerRows[0]?.sourceLabel, "dependent on left cell");
assert.equal(managerRows[0]?.invalidCount, 1);
assert.equal(managerRows[2]?.circleLabel, "Circles off");

const normalized = normalizeWorkbookDocument(document);
const normalizedDependentRule = normalized.dataValidations.find(
  (rule) => rule.listSource === "dependent",
);

assert.equal(normalizedDependentRule?.errorStyle, "warning");
assert.equal(normalizedDependentRule?.circleInvalid, true);

console.log("Data validation UX checks passed.");
