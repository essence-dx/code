import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createTableElement } from "@/features/editor/document-factory";
import {
  getTableCellDisplayValue,
  getTableFormulaDiagnostics,
} from "@/features/editor/table-formulas";
import {
  createTableSheet,
  sheetToTableFields,
} from "@/features/editor/table-sheets";

describe("table formulas", () => {
  test("evaluates formulas across workbook sheets", () => {
    const summary = createTableSheet({
      id: "summary",
      name: "Summary",
      rows: 2,
      columns: 2,
      cells: ["Metric", "Value", "Total", "=SUM(Data!A1:B1)"],
    });
    const data = createTableSheet({
      id: "data",
      name: "Data",
      rows: 1,
      columns: 2,
      cells: ["40", "2"],
    });
    const table = createTableElement({
      ...sheetToTableFields(summary),
      activeSheetId: summary.id,
      sheets: [summary, data],
    });

    assert.equal(getTableCellDisplayValue(table, 1, 1).displayValue, "42");
  });

  test("supports quoted sheet references and cross-sheet diagnostics", () => {
    const summary = createTableSheet({
      id: "summary",
      name: "Summary",
      rows: 1,
      columns: 2,
      cells: ["Quoted", "='Raw Data'!A1+'Raw Data'!B1"],
    });
    const rawData = createTableSheet({
      id: "raw",
      name: "Raw Data",
      rows: 1,
      columns: 2,
      cells: ["15", "7"],
    });
    const table = createTableElement({
      ...sheetToTableFields(summary),
      activeSheetId: summary.id,
      sheets: [summary, rawData],
    });
    const broken = createTableElement({
      ...sheetToTableFields({
        ...summary,
        cells: ["Broken", "=Missing!A1"],
      }),
      activeSheetId: summary.id,
      sheets: [
        { ...summary, cells: ["Broken", "=Missing!A1"] },
        rawData,
      ],
    });

    assert.equal(getTableCellDisplayValue(table, 0, 1).displayValue, "22");
    assert.deepEqual(getTableFormulaDiagnostics(broken), [
      {
        cellLabel: "Summary!B1",
        columnIndex: 1,
        error: "#REF!",
        formula: "=Missing!A1",
        rowIndex: 0,
      },
    ]);
  });
});
