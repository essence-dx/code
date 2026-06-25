import assert from "node:assert/strict";
import { createPivotDrillDownSheet } from "@/features/spreadsheet/pivot/pivot-drilldown";
import { renderPivotTableToSheet } from "@/features/spreadsheet/pivot/pivot-output";
import { getPivotTableSyncedControls } from "@/features/spreadsheet/pivot/pivot-control-sync";
import { createDataModelPivotSourceModel } from "@/features/spreadsheet/data-model";
import {
  refreshPivotTablesForTableControlsInDocument,
} from "@/features/spreadsheet/state/pivot-table-state";
import { updateTableSlicerValuesInDocument } from "@/features/spreadsheet/state/slicer-state";
import { cellKey } from "@/features/workbooks/addresses";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";
import type { PivotTableDefinition } from "@/features/workbooks/types";

const document = createDefaultWorkbookDocument();
const sheet = document.sheets[0];

assert.ok(sheet, "default workbook has a sheet");

sheet.cells = {
  A1: { raw: "Region" },
  B1: { raw: "CloseDate" },
  C1: { raw: "Amount" },
  A2: { raw: "North" },
  B2: { raw: "2026-01-05" },
  C2: { raw: "10" },
  A3: { raw: "North" },
  B3: { raw: "2026-02-05" },
  C3: { raw: "15" },
  A4: { raw: "South" },
  B4: { raw: "2026-01-10" },
  C4: { raw: "7" },
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
];
document.tableSlicers = [
  {
    id: "slicer_region",
    sheetId: sheet.id,
    tableId: "table_sales",
    columnIndex: 0,
    name: "Sales: Region",
    selectedValues: ["North"],
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
  },
];
document.tableTimelines = [
  {
    id: "timeline_close_date",
    sheetId: sheet.id,
    tableId: "table_sales",
    columnIndex: 1,
    name: "Sales: CloseDate",
    mode: "month",
    selectedPeriods: ["2026-01"],
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
    startColumnIndex: 8,
    endRowIndex: 0,
    endColumnIndex: 8,
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
      fieldId: "field_2",
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

assert.equal(
  sheet.cells[cellKey(2, 8)]?.raw,
  "North",
  "table slicers constrain table-backed PivotTable rows",
);
assert.equal(
  sheet.cells[cellKey(2, 9)]?.raw,
  "10",
  "table timelines constrain table-backed PivotTable values",
);
assert.equal(
  sheet.cells[cellKey(3, 9)]?.raw,
  "10",
  "grand totals respect synced slicer and timeline controls",
);

const source = createDataModelPivotSourceModel({
  computedValues: {},
  document,
  pivotTable,
  sheet,
});
const syncedControls = getPivotTableSyncedControls({
  document,
  pivotTable,
  source,
});

assert.deepEqual(
  syncedControls.map((control) => `${control.type}:${control.fieldName}`),
  ["slicer:Region", "timeline:CloseDate"],
  "PivotTable field list surfaces active synced table controls",
);

const detailSheet = createPivotDrillDownSheet({
  computedValues: {},
  document,
  pivotTable,
  sourceSheet: sheet,
});

assert.equal(
  detailSheet.cells[cellKey(1, 0)]?.raw,
  "North",
  "drill-down sheets inherit synchronized slicer filtering",
);
assert.equal(
  detailSheet.cells[cellKey(1, 1)]?.raw,
  "2026-01-05",
  "drill-down sheets inherit synchronized timeline filtering",
);
assert.equal(
  detailSheet.cells[cellKey(2, 0)]?.raw,
  undefined,
  "drill-down sheets exclude rows filtered out by synced controls",
);

const changedTableId = updateTableSlicerValuesInDocument(
  document,
  "slicer_region",
  ["South"],
);

assert.equal(changedTableId, "table_sales");

const refreshedCount = refreshPivotTablesForTableControlsInDocument({
  computedValues: {},
  document,
  tableId: changedTableId,
});

assert.equal(refreshedCount, 1, "table control changes refresh attached PivotTables");
assert.equal(
  sheet.cells[cellKey(2, 8)]?.raw,
  "South",
  "table control changes rerender attached PivotTable rows",
);
assert.equal(
  sheet.cells[cellKey(2, 9)]?.raw,
  "7",
  "table control changes rerender attached PivotTable values",
);

console.log("PivotTable workflow checks passed.");
