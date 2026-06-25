import assert from "node:assert/strict";
import {
  conditionalFormatPresets,
  createConditionalFormatManagerRows,
} from "@/features/spreadsheet/conditional-format-manager";
import { getConditionalCellStyles } from "@/features/spreadsheet/conditional-formatting";
import {
  addConditionalFormatToDocument,
  duplicateConditionalFormatInDocument,
  moveConditionalFormatInDocument,
  updateConditionalFormatVisualOptionsInDocument,
} from "@/features/spreadsheet/state/rule-state";
import { cellKey } from "@/features/workbooks/addresses";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";
import { normalizeWorkbookDocument } from "@/features/workbooks/serialization";

const document = createDefaultWorkbookDocument();
const sheet = document.sheets[0];

assert.ok(sheet, "default workbook has a sheet");

sheet.cells = {
  A1: { raw: "10" },
  A2: { raw: "20" },
  A3: { raw: "30" },
  B1: { raw: "North" },
  B2: { raw: "North" },
  B3: { raw: "South" },
};

const dataBarPreset = conditionalFormatPresets.find(
  (preset) => preset.id === "data-bar",
);
const colorScalePreset = conditionalFormatPresets.find(
  (preset) => preset.id === "color-scale",
);
const iconSetPreset = conditionalFormatPresets.find(
  (preset) => preset.id === "icon-set",
);
const duplicatesPreset = conditionalFormatPresets.find(
  (preset) => preset.id === "duplicates",
);

assert.ok(dataBarPreset, "data-bar preset exists");
assert.ok(colorScalePreset, "color-scale preset exists");
assert.ok(iconSetPreset, "icon-set preset exists");
assert.ok(duplicatesPreset, "duplicates preset exists");

addConditionalFormatToDocument(
  document,
  {
    startRowIndex: 0,
    startColumnIndex: 0,
    endRowIndex: 2,
    endColumnIndex: 0,
  },
  dataBarPreset,
);
addConditionalFormatToDocument(
  document,
  {
    startRowIndex: 1,
    startColumnIndex: 0,
    endRowIndex: 2,
    endColumnIndex: 0,
  },
  colorScalePreset,
);
addConditionalFormatToDocument(
  document,
  {
    startRowIndex: 0,
    startColumnIndex: 0,
    endRowIndex: 2,
    endColumnIndex: 0,
  },
  iconSetPreset,
);
addConditionalFormatToDocument(
  document,
  {
    startRowIndex: 0,
    startColumnIndex: 1,
    endRowIndex: 2,
    endColumnIndex: 1,
  },
  duplicatesPreset,
);

const rules = document.conditionalFormats;

assert.equal(rules.length, 4, "preset rules are added to the active sheet");

let managerRows = createConditionalFormatManagerRows(rules);

assert.deepEqual(
  managerRows.map((row) => row.ruleTypeLabel),
  ["Data bars", "Color scale", "Icon set", "Duplicates"],
);
assert.equal(
  managerRows[0]?.affectedByLaterRules,
  2,
  "manager reports later overlapping rules that can override styling",
);
assert.equal(
  managerRows[2]?.affectsEarlierRules,
  2,
  "manager reports earlier overlapping rules affected by current priority",
);

const firstRuleId = rules[0]?.id;

assert.ok(firstRuleId, "first rule has an id");
assert.equal(
  duplicateConditionalFormatInDocument(document, firstRuleId),
  true,
  "rules can be duplicated in place",
);
assert.equal(rules.length, 5);
assert.notEqual(rules[0]?.id, rules[1]?.id, "duplicate receives a new id");
assert.deepEqual(
  rules[0]?.style,
  rules[1]?.style,
  "duplicate preserves rule style metadata",
);
assert.notEqual(
  rules[0]?.style.scale?.thresholds,
  rules[1]?.style.scale?.thresholds,
  "duplicate receives an independent threshold object",
);

moveConditionalFormatInDocument(document, firstRuleId, "bottom");
assert.equal(rules[rules.length - 1]?.id, firstRuleId);

moveConditionalFormatInDocument(document, firstRuleId, "top");
assert.equal(rules[0]?.id, firstRuleId);

managerRows = createConditionalFormatManagerRows(rules);
assert.deepEqual(
  managerRows.map((row) => row.priority),
  [1, 2, 3, 4, 5],
  "manager priorities follow the active rule order",
);

const styles = getConditionalCellStyles({
  computedValues: {},
  rules,
  sheet,
});

assert.match(
  styles[cellKey(2, 0)]?.background ?? "",
  /linear-gradient|#/,
  "advanced visual conditional formats still resolve cell styles",
);
assert.equal(
  styles[cellKey(0, 1)]?.background,
  duplicatesPreset.style.background,
  "duplicate-value preset highlights duplicated labels",
);

const thresholdDocument = createDefaultWorkbookDocument();
const thresholdSheet = thresholdDocument.sheets[0];

assert.ok(thresholdSheet, "threshold workbook has a sheet");
thresholdSheet.cells = {
  A1: { raw: "0" },
  A2: { raw: "50" },
  A3: { raw: "100" },
  B1: { raw: "0" },
  B2: { raw: "70" },
  B3: { raw: "100" },
};
addConditionalFormatToDocument(
  thresholdDocument,
  {
    startRowIndex: 0,
    startColumnIndex: 0,
    endRowIndex: 2,
    endColumnIndex: 0,
  },
  dataBarPreset,
);

const thresholdRule = thresholdDocument.conditionalFormats[0];

assert.ok(thresholdRule, "threshold rule exists");
assert.equal(
  updateConditionalFormatVisualOptionsInDocument(
    thresholdDocument,
    thresholdRule.id,
    {
      foreground: "#0f172a",
      scale: {
        minColor: "#f8fafc",
        maxColor: "#22c55e",
        thresholds: {
          low: 25,
          high: 75,
        },
      },
    },
  ),
  true,
  "visual threshold options update data-bar rules",
);

const thresholdStyles = getConditionalCellStyles({
  computedValues: {},
  rules: thresholdDocument.conditionalFormats,
  sheet: thresholdSheet,
});

assert.match(
  thresholdStyles[cellKey(1, 0)]?.background ?? "",
  /50%/,
  "data-bar thresholds remap the midpoint to a partial bar",
);
assert.equal(
  normalizeWorkbookDocument(thresholdDocument).conditionalFormats[0]?.style.scale
    ?.thresholds?.high,
  75,
  "visual thresholds survive workbook normalization",
);

addConditionalFormatToDocument(
  thresholdDocument,
  {
    startRowIndex: 0,
    startColumnIndex: 1,
    endRowIndex: 2,
    endColumnIndex: 1,
  },
  iconSetPreset,
);

const iconRule = thresholdDocument.conditionalFormats[1];

assert.ok(iconRule, "icon rule exists");
updateConditionalFormatVisualOptionsInDocument(thresholdDocument, iconRule.id, {
  scale: {
    minColor: "#dbeafe",
    maxColor: "#16a34a",
    thresholds: {
      low: 60,
      high: 80,
    },
  },
});

const iconStyles = getConditionalCellStyles({
  computedValues: {},
  rules: thresholdDocument.conditionalFormats,
  sheet: thresholdSheet,
});

assert.equal(
  iconStyles[cellKey(1, 1)]?.indicator?.direction,
  "flat",
  "editable icon-set low threshold controls the middle icon",
);
assert.equal(
  iconStyles[cellKey(2, 1)]?.indicator?.direction,
  "up",
  "editable icon-set high threshold controls the top icon",
);

console.log("Conditional format manager checks passed.");
