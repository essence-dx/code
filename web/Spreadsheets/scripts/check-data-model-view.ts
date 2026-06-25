import assert from "node:assert/strict";
import {
  addDataModelHierarchyToDocument,
  addDataModelKpiToDocument,
  addDataModelPerspectiveToDocument,
} from "@/features/spreadsheet/data-model-view";
import { addDataModelRelationshipToDocument, createDataModelPivotSourceModel } from "@/features/spreadsheet/data-model";
import { getLargeDataModelWorkbookStats } from "@/features/spreadsheet/large-data-model";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";
import { normalizeWorkbookDocument } from "@/features/workbooks/serialization";
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
  C3: { raw: "30" },
  A4: { raw: "P1" },
  B4: { raw: "North" },
  C4: { raw: "25" },
  E1: { raw: "ProductId" },
  F1: { raw: "Category" },
  G1: { raw: "Owner" },
  E2: { raw: "P1" },
  F2: { raw: "Tools" },
  G2: { raw: "Team A" },
  E3: { raw: "P2" },
  F3: { raw: "Books" },
  G3: { raw: "Team B" },
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
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
  },
  {
    id: "table_products",
    sheetId: sheet.id,
    name: "Products",
    range: {
      startRowIndex: 0,
      startColumnIndex: 4,
      endRowIndex: 2,
      endColumnIndex: 6,
    },
    style: "green",
    showHeaderRow: true,
    showFilterButtons: true,
    showTotalsRow: false,
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
  },
];
document.dataModelStorage = {
  maxRows: 12_000_000,
  mode: "columnar",
  segmentRowCount: 2,
};

assert.equal(
  addDataModelRelationshipToDocument({
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
    now: "2026-05-16T00:00:00.000Z",
  }),
  null,
  "relationship is accepted",
);

assert.equal(
  addDataModelHierarchyToDocument({
    document,
    draft: {
      levels: [
        { columnIndex: 1, name: "Region" },
        { columnIndex: 0, name: "Product" },
      ],
      name: "Region product path",
      tableId: "table_sales",
    },
    now: "2026-05-16T00:00:00.000Z",
  }),
  null,
  "source hierarchy is accepted",
);
assert.equal(
  addDataModelHierarchyToDocument({
    document,
    draft: {
      levels: [
        { columnIndex: 5, name: "Category" },
        { columnIndex: 6, name: "Owner" },
      ],
      name: "Category owner",
      tableId: "table_products",
    },
    now: "2026-05-16T00:00:00.000Z",
  }),
  null,
  "related hierarchy is accepted",
);
assert.equal(
  addDataModelKpiToDocument({
    document,
    draft: {
      direction: "higherIsBetter",
      name: "Sales target",
      tableId: "table_sales",
      target: 20,
      valueColumnIndex: 2,
    },
    now: "2026-05-16T00:00:00.000Z",
  }),
  null,
  "source KPI is accepted",
);
assert.equal(
  addDataModelPerspectiveToDocument({
    document,
    draft: {
      fields: [
        { tableId: "table_sales", columnIndex: 0 },
        { tableId: "table_sales", columnIndex: 2 },
      ],
      name: "Sales perspective",
      tableIds: ["table_sales"],
    },
    now: "2026-05-16T00:00:00.000Z",
  }),
  null,
  "perspective is accepted",
);

const relationshipId = document.dataModelRelationships?.[0]?.id;
const sourceHierarchyId = document.dataModelHierarchies?.[0]?.id;
const relatedHierarchyId = document.dataModelHierarchies?.[1]?.id;
const kpiId = document.dataModelKpis?.[0]?.id;

assert.ok(relationshipId, "relationship id exists");
assert.ok(sourceHierarchyId, "source hierarchy id exists");
assert.ok(relatedHierarchyId, "related hierarchy id exists");
assert.ok(kpiId, "KPI id exists");

const pivotTable: PivotTableDefinition = {
  id: "pivot_model_view",
  sheetId: sheet.id,
  name: "Model view pivot",
  sourceRange: document.tables[0].range,
  sourceTableId: "table_sales",
  outputRange: {
    startRowIndex: 0,
    startColumnIndex: 8,
    endRowIndex: 0,
    endColumnIndex: 8,
  },
  rowFieldIds: [`hierarchy_${sourceHierarchyId}`],
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
  createdAt: "2026-05-16T00:00:00.000Z",
  updatedAt: "2026-05-16T00:00:00.000Z",
};
const source = createDataModelPivotSourceModel({
  computedValues: {},
  document,
  pivotTable,
  sheet,
});

assert.ok(
  source.fields.some((field) => field.id === `hierarchy_${sourceHierarchyId}`),
  "source table hierarchy becomes a PivotTable field",
);
assert.ok(
  source.fields.some(
    (field) => field.id === `model_${relationshipId}_hierarchy_${relatedHierarchyId}`,
  ),
  "related table hierarchy becomes a joined PivotTable field",
);
assert.ok(
  source.fields.some((field) => field.id === `kpi_${kpiId}`),
  "KPI status becomes a PivotTable field",
);
assert.deepEqual(
  source.records.map((record) => record.values[`hierarchy_${sourceHierarchyId}`]),
  ["North > P1", "South > P2", "North > P1"],
  "hierarchy values are materialized per source row",
);
assert.deepEqual(
  source.records.map((record) => record.values[`kpi_${kpiId}`]),
  ["Bad", "Good", "Good"],
  "KPI statuses are materialized per source row",
);
assert.equal(source.storage?.segmentCount, 2, "custom storage segments are used");
assert.equal(
  source.storage?.maxRowCount,
  12_000_000,
  "custom model row cap is reported",
);

const normalized = normalizeWorkbookDocument({
  ...document,
  dataModelHierarchies: [
    ...(document.dataModelHierarchies ?? []),
    {
      id: "invalid_hierarchy",
      active: true,
      createdAt: "2026-05-16T00:00:00.000Z",
      levels: [{ columnIndex: 99, name: "Broken" }],
      name: "Broken",
      tableId: "table_sales",
      updatedAt: "2026-05-16T00:00:00.000Z",
    },
  ],
  dataModelStorage: {
    maxRows: 500,
    mode: "columnar",
    segmentRowCount: 1,
  },
});

assert.equal(normalized.dataModelHierarchies?.length, 2);
assert.equal(normalized.dataModelKpis?.length, 1);
assert.equal(normalized.dataModelPerspectives?.length, 1);
assert.equal(normalized.dataModelStorage?.maxRows, 1_048_576);
assert.equal(normalized.dataModelStorage?.segmentRowCount, 1);

const workbookStats = getLargeDataModelWorkbookStats({
  activeSheetId: sheet.id,
  computedValues: {},
  document,
});

assert.equal(workbookStats.segmentCount, 3);
assert.equal(workbookStats.maxRowCount, 12_000_000);
assert.ok(workbookStats.estimatedBytes > 0);

console.log("Data model view checks passed.");
