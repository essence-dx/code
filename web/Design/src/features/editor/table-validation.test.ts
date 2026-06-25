import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createTableElement } from "@/features/editor/document-factory";
import { createTableSheet, sheetToTableFields } from "@/features/editor/table-sheets";
import { createTableSheetValidationReport } from "@/features/editor/table-validation";

describe("table validation", () => {
  test("marks healthy sheets as ready", () => {
    const sheet = createTableSheet({
      rows: 2,
      columns: 2,
      cells: ["Metric", "Value", "Revenue", "=SUM(10, 20)"],
    });
    const table = createTableElement(sheetToTableFields(sheet));
    const report = createTableSheetValidationReport(table);

    assert.equal(report.status, "ready");
    assert.equal(report.score, 100);
  });

  test("surfaces duplicate headers and broken formulas", () => {
    const sheet = createTableSheet({
      rows: 2,
      columns: 2,
      cells: ["Value", "Value", "Broken", "=Missing!A1"],
    });
    const table = createTableElement({
      ...sheetToTableFields(sheet),
      activeSheetId: sheet.id,
      sheets: [sheet],
    });
    const report = createTableSheetValidationReport(table);

    assert.equal(report.status, "blocked");
    assert.ok(
      report.checks.some(
        (check) =>
          check.id === "headers" &&
          check.detail === "Duplicate header names detected",
      ),
    );
    assert.ok(
      report.checks.some(
        (check) => check.id === "formulas" && check.status === "blocked",
      ),
    );
  });
});
