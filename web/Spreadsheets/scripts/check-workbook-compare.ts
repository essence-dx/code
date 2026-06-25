import assert from "node:assert/strict";
import { cellKey } from "@/features/workbooks/addresses";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";
import {
  compareWorkbookDocuments,
  getWorkbookCompareRangeLabel,
  mergeWorkbookCompareItems,
} from "@/features/spreadsheet/workbook-compare";

const base = createDefaultWorkbookDocument();
const incoming = structuredClone(base);
const sheet = incoming.sheets[0];

assert.ok(sheet, "default workbook has a sheet");

incoming.metadata.description = "Incoming planning workbook";
sheet.name = "Planning";
sheet.cells[cellKey(4, 0)] = { raw: "1250" };
sheet.cells[cellKey(4, 2)] = { raw: "=A5+B5" };
sheet.cells[cellKey(8, 0)] = { raw: "Added note" };
delete sheet.cells[cellKey(5, 0)];
incoming.tables = [
  {
    id: "table_sales",
    createdAt: "2026-05-15T00:00:00.000Z",
    name: "Sales",
    range: {
      startColumnIndex: 0,
      startRowIndex: 3,
      endColumnIndex: 2,
      endRowIndex: 5,
    },
    sheetId: sheet.id,
    showFilterButtons: true,
    showHeaderRow: true,
    showTotalsRow: false,
    style: "blue",
    updatedAt: "2026-05-15T00:00:00.000Z",
  },
];
incoming.charts = [
  {
    id: "chart_profit",
    sheetId: sheet.id,
    title: "Profit trend",
    type: "line",
    range: {
      startColumnIndex: 0,
      startRowIndex: 3,
      endColumnIndex: 2,
      endRowIndex: 5,
    },
  },
];

const addedSheet = structuredClone(sheet);

addedSheet.id = "sheet_added";
addedSheet.name = "Scenario";
addedSheet.cells = {
  A1: { raw: "Scenario model" },
};
incoming.sheets.push(addedSheet);

const result = compareWorkbookDocuments({
  base,
  incoming,
  incomingName: "incoming.essence-backup.json",
});

assert.equal(result.incomingName, "incoming.essence-backup.json");
assert.ok(result.summary.total >= 8, "comparison records workbook differences");
assert.ok(result.summary.byCategory.metadata >= 1, "metadata changes are counted");
assert.ok(result.summary.byCategory.sheet >= 2, "sheet changes are counted");
assert.ok(result.summary.byCategory.cell >= 2, "cell changes are counted");
assert.ok(result.summary.byCategory.formula >= 1, "formula changes are counted");
assert.ok(result.summary.byCategory.table >= 1, "table additions are counted");
assert.ok(result.summary.byCategory.chart >= 1, "chart additions are counted");

const changedCell = result.items.find(
  (item) => item.category === "cell" && item.cellKey === "A5",
);
const removedCell = result.items.find(
  (item) => item.category === "cell" && item.cellKey === "A6",
);
const addedCell = result.items.find(
  (item) => item.category === "cell" && item.cellKey === "A9",
);
const metadataChange = result.items.find((item) => item.category === "metadata");
const addedSheetItem = result.items.find(
  (item) => item.category === "sheet" && item.status === "added",
);
const addedTableItem = result.items.find((item) => item.category === "table");
const addedChartItem = result.items.find((item) => item.category === "chart");

assert.ok(changedCell?.merge, "changed cells are mergeable");
assert.ok(removedCell?.merge, "removed cells are mergeable");
assert.ok(addedCell?.merge, "added cells are mergeable");
assert.ok(metadataChange?.merge, "metadata changes are mergeable");
assert.ok(addedSheetItem?.merge, "added sheets are mergeable");
assert.ok(addedTableItem?.merge, "added tables are mergeable");
assert.ok(addedChartItem?.merge, "added charts are mergeable");
assert.equal(
  getWorkbookCompareRangeLabel(changedCell),
  "Sheet 1!A5",
  "range labels use sheet-qualified A1 notation",
);

const merged = mergeWorkbookCompareItems({
  base,
  incoming,
  itemIds: [
    changedCell.id,
    removedCell.id,
    addedCell.id,
    metadataChange.id,
    addedSheetItem.id,
    addedTableItem.id,
    addedChartItem.id,
  ],
});
const mergedSheet = merged.sheets.find((item) => item.id === base.sheets[0]?.id);

assert.equal(merged.metadata.description, "Incoming planning workbook");
assert.equal(mergedSheet?.cells.A5?.raw, "1250");
assert.equal(mergedSheet?.cells.A6, undefined);
assert.equal(mergedSheet?.cells.A9?.raw, "Added note");
assert.ok(
  merged.sheets.some((item) => item.name === "Scenario"),
  "selected added sheets are merged",
);
assert.equal(merged.tables.length, 1);
assert.equal(merged.charts.length, 1);

const postMerge = compareWorkbookDocuments({
  base: merged,
  incoming,
  maxItems: Number.POSITIVE_INFINITY,
});

assert.equal(
  postMerge.items.some((item) => item.id === changedCell.id),
  false,
  "merged cell changes disappear from the diff",
);

console.log("Workbook compare checks passed.");
