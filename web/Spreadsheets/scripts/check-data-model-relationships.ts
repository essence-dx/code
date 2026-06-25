import assert from "node:assert/strict";
import {
  addDataModelRelationshipToDocument,
  createDataModelPivotSourceModel,
  getDataModelRelationshipIssues,
} from "@/features/spreadsheet/data-model";
import { renderPivotTableToSheet } from "@/features/spreadsheet/pivot/pivot-output";
import { normalizeWorkbookDocument } from "@/features/workbooks/serialization";
import { cellKey } from "@/features/workbooks/addresses";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";
import type { PivotTableDefinition } from "@/features/workbooks/types";

const document = createDefaultWorkbookDocument();
const sheet = document.sheets[0];

assert.ok(sheet, "default workbook has a sheet");

sheet.cells = {
  A1: { raw: "ProductId" },
  B1: { raw: "Region" },
  C1: { raw: "Amount" },
  A2: { raw: "P1" },
  B2: { raw: "North" },
  C2: { raw: "10" },
  A3: { raw: "P2" },
  B3: { raw: "South" },
  C3: { raw: "7" },
  A4: { raw: "P1" },
  B4: { raw: "North" },
  C4: { raw: "15" },
  E1: { raw: "ProductId" },
  F1: { raw: "Category" },
  E2: { raw: "P1" },
  F2: { raw: "Tools" },
  E3: { raw: "P2" },
  F3: { raw: "Books" },
};
document.tables = [
  {
    id: "table_sales",
    sheetId: sheet.id,
    name: "Sales",
    range: {
      startRowIndex: 0,
      startColumnIndex: 0,
      endRowIndex: 3,
      endColumnIndex: 2,
    },
    style: "blue",
    showHeaderRow: true,
    showFilterButtons: true,
    showTotalsRow: false,
    createdAt: "2026-05-15T00:00:00.000Z",
    updatedAt: "2026-05-15T00:00:00.000Z",
  },
  {
    id: "table_products",
    sheetId: sheet.id,
    name: "Products",
    range: {
      startRowIndex: 0,
      startColumnIndex: 4,
      endRowIndex: 2,
      endColumnIndex: 5,
    },
    style: "green",
    showHeaderRow: true,
    showFilterButtons: true,
    showTotalsRow: false,
    createdAt: "2026-05-15T00:00:00.000Z",
    updatedAt: "2026-05-15T00:00:00.000Z",
  },
];

const relationshipMessage = addDataModelRelationshipToDocument({
  activeSheetId: sheet.id,
  computedValues: {},
  document,
  draft: {
    cardinality: "manyToOne",
    fromColumnIndex: 0,
    fromTableId: "table_sales",
    toColumnIndex: 4,
    toTableId: "table_products",
  },
  now: "2026-05-15T00:00:00.000Z",
});

assert.equal(relationshipMessage, null, "valid table relationship is accepted");
assert.equal(
  getDataModelRelationshipIssues({
    activeSheetId: sheet.id,
    computedValues: {},
    document,
  }).length,
  0,
  "valid relationships do not produce model issues",
);

const relationshipId = document.dataModelRelationships?.[0]?.id;

assert.ok(relationshipId, "relationship is persisted on the workbook document");

const pivotTable: PivotTableDefinition = {
  id: "pivot_sales",
  sheetId: sheet.id,
  name: "Sales by category",
  sourceRange: document.tables[0].range,
  sourceTableId: "table_sales",
  outputRange: {
    startRowIndex: 0,
    startColumnIndex: 8,
    endRowIndex: 0,
    endColumnIndex: 8,
  },
  rowFieldIds: [`model_${relationshipId}_field_5`],
  columnFieldIds: [],
  filterFieldIds: [],
  filterSelections: {},
  calculatedFields: [],
  calculatedItems: [],
  measures: [
    {
      id: "measure_average_sale",
      name: "Average sale",
      leftValueLabel: "Sales",
      operator: "divide",
      rightValueLabel: "Orders",
    },
  ],
  fieldGroupings: [],
  timelineFilters: [],
  valueFields: [
    {
      aggregation: "sum",
      fieldId: "field_2",
      label: "Sales",
    },
    {
      aggregation: "count",
      fieldId: "field_2",
      label: "Orders",
    },
  ],
  createdAt: "2026-05-15T00:00:00.000Z",
  updatedAt: "2026-05-15T00:00:00.000Z",
};

const modelSource = createDataModelPivotSourceModel({
  computedValues: {},
  document,
  pivotTable,
  sheet,
});
const categoryField = modelSource.fields.find(
  (field) => field.id === `model_${relationshipId}_field_5`,
);

assert.equal(
  categoryField?.name,
  "Products.Category",
  "related lookup table fields are exposed to PivotTables",
);
assert.deepEqual(
  modelSource.records.map((record) => record.values[categoryField?.id ?? ""]),
  ["Tools", "Books", "Tools"],
  "related lookup values are joined onto source records",
);

pivotTable.outputRange = renderPivotTableToSheet({
  computedValues: {},
  document,
  pivotTable,
  sheet,
});

assert.equal(sheet.cells[cellKey(1, 11)]?.raw, "Average sale");
assert.equal(sheet.cells[cellKey(2, 8)]?.raw, "Books");
assert.equal(sheet.cells[cellKey(2, 9)]?.raw, "7");
assert.equal(sheet.cells[cellKey(2, 11)]?.raw, "7");
assert.equal(sheet.cells[cellKey(3, 8)]?.raw, "Tools");
assert.equal(sheet.cells[cellKey(3, 9)]?.raw, "25");
assert.equal(sheet.cells[cellKey(3, 11)]?.raw, "12.50");

const normalized = normalizeWorkbookDocument({
  ...document,
  dataModelRelationships: [
    ...(document.dataModelRelationships ?? []),
    {
      id: "duplicate_relationship",
      name: "Duplicate",
      fromTableId: "table_sales",
      fromColumnIndex: 0,
      toTableId: "table_products",
      toColumnIndex: 4,
      cardinality: "manyToOne",
      active: true,
      createdAt: "2026-05-15T00:00:00.000Z",
      updatedAt: "2026-05-15T00:00:00.000Z",
    },
  ],
});

assert.equal(
  normalized.dataModelRelationships?.length,
  1,
  "relationship normalization removes duplicate relationship paths",
);

console.log("Data model relationship checks passed.");
