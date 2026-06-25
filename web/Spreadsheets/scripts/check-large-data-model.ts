import assert from "node:assert/strict";
import {
  addDataModelRelationshipToDocument,
  createDataModelPivotSourceModel,
} from "@/features/spreadsheet/data-model";
import {
  createLargeDataModelLookupIndex,
  createLargeDataModelTable,
  getLargeDataModelStorageStats,
  getLargeDataModelValue,
  getLargeDataModelWorkbookStats,
  streamLargeDataModelRecords,
} from "@/features/spreadsheet/large-data-model";
import { renderPivotTableToSheet } from "@/features/spreadsheet/pivot/pivot-output";
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
  A5: { raw: "P1" },
  B5: { raw: "North" },
  C5: { raw: "20" },
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
      endRowIndex: 4,
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

const salesTable = document.tables[0];
const productsTable = document.tables[1];

assert.ok(salesTable, "sales table exists");
assert.ok(productsTable, "products table exists");

const salesModel = createLargeDataModelTable({
  computedValues: {},
  range: salesTable.range,
  sheet,
  tableId: salesTable.id,
});
const regionField = salesModel.fields.find((field) => field.name === "Region");
const productField = salesModel.fields.find((field) => field.name === "ProductId");

assert.ok(regionField, "region field is modeled");
assert.ok(productField, "product field is modeled");
assert.equal(salesModel.rowCount, 4, "large model stores data rows");
assert.equal(
  getLargeDataModelValue(salesModel, regionField.id, 0),
  "North",
  "columnar model reads values by row offset",
);
assert.equal(
  Array.from(streamLargeDataModelRecords(salesModel)).length,
  4,
  "columnar model streams records for refresh",
);

const salesStats = getLargeDataModelStorageStats(salesModel);

assert.equal(salesStats.mode, "columnar");
assert.ok(
  salesStats.repeatedValueSavings > 0,
  "repeated table values are dictionary-compressed",
);

const productsModel = createLargeDataModelTable({
  computedValues: {},
  range: productsTable.range,
  sheet,
  tableId: productsTable.id,
});
const productLookupField = productsModel.fields.find(
  (field) => field.name === "ProductId",
);

assert.ok(productLookupField, "product lookup field is modeled");
assert.equal(
  createLargeDataModelLookupIndex(productsModel, productLookupField.id).get("p1"),
  0,
  "relationship lookup indexes normalize keys",
);

const relationshipMessage = addDataModelRelationshipToDocument({
  activeSheetId: sheet.id,
  computedValues: {},
  document,
  draft: {
    cardinality: "manyToOne",
    fromColumnIndex: 0,
    fromTableId: salesTable.id,
    toColumnIndex: 4,
    toTableId: productsTable.id,
  },
  now: "2026-05-15T00:00:00.000Z",
});

assert.equal(relationshipMessage, null, "relationship is accepted");

const relationshipId = document.dataModelRelationships?.[0]?.id;

assert.ok(relationshipId, "relationship is persisted");

const pivotTable: PivotTableDefinition = {
  id: "pivot_large_model_sales",
  sheetId: sheet.id,
  name: "Large model sales by category",
  sourceRange: salesTable.range,
  sourceTableId: salesTable.id,
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
  measures: [],
  fieldGroupings: [],
  timelineFilters: [],
  valueFields: [
    {
      aggregation: "sum",
      fieldId: "field_2",
      label: "Sales",
    },
  ],
  createdAt: "2026-05-15T00:00:00.000Z",
  updatedAt: "2026-05-15T00:00:00.000Z",
};
const source = createDataModelPivotSourceModel({
  computedValues: {},
  document,
  pivotTable,
  sheet,
});

assert.equal(source.storage?.mode, "columnar");
assert.equal(source.storage?.relationshipIndexCount, 1);
assert.equal(source.records.length, 4, "pivot source refreshes from row stream");

pivotTable.outputRange = renderPivotTableToSheet({
  computedValues: {},
  document,
  pivotTable,
  sheet,
});

assert.equal(sheet.cells[cellKey(2, 8)]?.raw, "Books");
assert.equal(sheet.cells[cellKey(2, 9)]?.raw, "7");
assert.equal(sheet.cells[cellKey(3, 8)]?.raw, "Tools");
assert.equal(sheet.cells[cellKey(3, 9)]?.raw, "45");

const workbookStats = getLargeDataModelWorkbookStats({
  activeSheetId: sheet.id,
  computedValues: {},
  document,
});

assert.equal(workbookStats.tableCount, 2);
assert.equal(workbookStats.rowCount, 6);
assert.equal(workbookStats.relationshipIndexCount, 1);
assert.ok(workbookStats.repeatedValueSavings > 0);

console.log("Large data model checks passed.");
