import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createTableElement } from "@/features/editor/document-factory";
import {
  addTableSheet,
  applyTableSheetUpdates,
  createTableSheet,
  getActiveTableSheet,
  getTableSheets,
  renameTableSheet,
  sheetToTableFields,
  switchTableSheet,
} from "@/features/editor/table-sheets";

describe("table sheets", () => {
  test("keeps the active sheet synchronized with table edits", () => {
    const table = createTableElement({ rows: 2, columns: 2 });
    const updates = applyTableSheetUpdates(table, {
      cells: ["A", "B", "C", "D"],
      rows: 2,
      columns: 2,
    });
    const nextTable = { ...table, ...updates };
    const activeSheet = getActiveTableSheet(nextTable);

    assert.deepEqual(activeSheet.cells, ["A", "B", "C", "D"]);
    assert.equal(activeSheet.rows, 2);
    assert.equal(activeSheet.columns, 2);
  });

  test("switches sheets without losing the current active sheet snapshot", () => {
    const firstSheet = createTableSheet({
      id: "sheet-a",
      name: "Summary",
      rows: 2,
      columns: 2,
      cells: ["Metric", "Value", "Revenue", "100"],
    });
    const secondSheet = createTableSheet({
      id: "sheet-b",
      name: "Data",
      rows: 1,
      columns: 2,
      cells: ["40", "60"],
    });
    const table = createTableElement({
      ...sheetToTableFields(firstSheet),
      activeSheetId: firstSheet.id,
      sheets: [firstSheet, secondSheet],
    });
    const editedTable = {
      ...table,
      ...applyTableSheetUpdates(table, {
        cells: ["Metric", "Value", "Revenue", "125"],
      }),
    };
    const switchedTable = {
      ...editedTable,
      ...switchTableSheet(editedTable, secondSheet.id),
    };

    assert.equal(getActiveTableSheet(switchedTable).name, "Data");
    assert.deepEqual(
      getTableSheets(switchedTable).find((sheet) => sheet.id === firstSheet.id)
        ?.cells,
      ["Metric", "Value", "Revenue", "125"],
    );
  });

  test("adds and renames workbook tabs", () => {
    const table = createTableElement();
    const withSheet = { ...table, ...addTableSheet(table) };
    const activeSheet = getActiveTableSheet(withSheet);
    const renamed = {
      ...withSheet,
      ...renameTableSheet(withSheet, activeSheet.id, "Budget"),
    };

    assert.equal(getTableSheets(renamed).length, 2);
    assert.equal(getActiveTableSheet(renamed).name, "Budget");
  });
});
