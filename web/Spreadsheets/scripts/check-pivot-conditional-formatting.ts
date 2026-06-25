import assert from "node:assert/strict";
import { getConditionalCellStyles } from "@/features/spreadsheet/conditional-formatting";
import {
  getPivotConditionalFormatRange,
  resolvePivotConditionalFormatRules,
} from "@/features/spreadsheet/pivot/pivot-conditional-formatting";
import { renderPivotTableToSheet } from "@/features/spreadsheet/pivot/pivot-output";
import { refreshPivotTableInDocument } from "@/features/spreadsheet/state/pivot-table-state";
import { addPivotTableConditionalFormatToDocument } from "@/features/spreadsheet/state/rule-state";
import { cellKey } from "@/features/workbooks/addresses";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";
import { normalizeWorkbookDocument } from "@/features/workbooks/serialization";
import type { PivotTableDefinition } from "@/features/workbooks/types";

const document = createDefaultWorkbookDocument();
const sheet = document.sheets[0];

assert.ok(sheet, "default workbook has a sheet");

sheet.cells = {
  A1: { raw: "Region" },
  B1: { raw: "Amount" },
  A2: { raw: "North" },
  B2: { raw: "10" },
  A3: { raw: "South" },
  B3: { raw: "30" },
};
document.tables = [
  {
    id: "table_sales",
    sheetId: sheet.id,
    name: "Sales",
    range: {
      startRowIndex: 0,
      startColumnIndex: 0,
      endRowIndex: 2,
      endColumnIndex: 1,
    },
    style: "blue",
    showHeaderRow: true,
    showFilterButtons: true,
    showTotalsRow: false,
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
  },
];

const pivotTable: PivotTableDefinition = {
  id: "pivot_sales",
  sheetId: sheet.id,
  name: "Sales Pivot",
  sourceRange: document.tables[0].range,
  sourceTableId: "table_sales",
  outputRange: {
    startRowIndex: 0,
    startColumnIndex: 4,
    endRowIndex: 0,
    endColumnIndex: 4,
  },
  rowFieldIds: ["field_0"],
  columnFieldIds: [],
  filterFieldIds: [],
  filterSelections: {},
  calculatedFields: [],
  calculatedItems: [],
  measures: [],
  fieldGroupings: [],
  timelineFilters: [],
  valueFields: [
    {
      aggregation: "sum",
      fieldId: "field_1",
      label: "Sales",
    },
  ],
  createdAt: "2026-05-16T00:00:00.000Z",
  updatedAt: "2026-05-16T00:00:00.000Z",
};

document.pivotTables = [pivotTable];
pivotTable.outputRange = renderPivotTableToSheet({
  computedValues: {},
  document,
  pivotTable,
  sheet,
});

assert.deepEqual(
  getPivotConditionalFormatRange(pivotTable, "values"),
  {
    startRowIndex: 2,
    startColumnIndex: 5,
    endRowIndex: 4,
    endColumnIndex: 5,
  },
  "PivotTable value-cell range excludes title, headers, and row labels",
);

assert.equal(
  addPivotTableConditionalFormatToDocument(
    document,
    pivotTable.id,
    {
      operator: "dataBar",
      value: "",
      style: {
        foreground: "#111827",
        scale: {
          minColor: "#dbeafe",
          maxColor: "#60a5fa",
        },
      },
    },
    "values",
  ),
  null,
  "PivotTable conditional format can be created",
);

const [rule] = document.conditionalFormats;

assert.equal(rule?.sourcePivotTableId, pivotTable.id);
assert.equal(rule?.pivotTableScope, "values");
assert.deepEqual(rule?.range, getPivotConditionalFormatRange(pivotTable, "values"));

let resolvedRules = resolvePivotConditionalFormatRules({
  pivotTables: document.pivotTables,
  rules: document.conditionalFormats,
});
let styles = getConditionalCellStyles({
  computedValues: {},
  rules: resolvedRules,
  sheet,
});

assert.equal(
  styles[cellKey(2, 5)]?.background?.startsWith("linear-gradient"),
  true,
  "PivotTable value cells receive conditional formatting",
);
assert.equal(
  styles[cellKey(2, 4)]?.background,
  undefined,
  "PivotTable row labels stay outside value-cell formatting",
);

pivotTable.outputRange = {
  startRowIndex: 5,
  startColumnIndex: 7,
  endRowIndex: 5,
  endColumnIndex: 7,
};
assert.equal(
  refreshPivotTableInDocument({
    computedValues: {},
    document,
    pivotTableId: pivotTable.id,
  }),
  null,
  "PivotTable refresh succeeds after moving output anchor",
);
assert.deepEqual(
  document.conditionalFormats[0]?.range,
  getPivotConditionalFormatRange(pivotTable, "values"),
  "PivotTable conditional format range follows refreshed output",
);

resolvedRules = resolvePivotConditionalFormatRules({
  pivotTables: document.pivotTables,
  rules: normalizeWorkbookDocument(document).conditionalFormats,
});
styles = getConditionalCellStyles({
  computedValues: {},
  rules: resolvedRules,
  sheet,
});

assert.equal(
  styles[cellKey(7, 8)]?.background?.startsWith("linear-gradient"),
  true,
  "normalized PivotTable-scoped rules still resolve to refreshed values",
);

console.log("PivotTable conditional-formatting checks passed.");
