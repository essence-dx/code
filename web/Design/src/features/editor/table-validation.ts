import { getTableCell } from "@/features/editor/table";
import { getTableFormulaDiagnostics } from "@/features/editor/table-formulas";
import {
  getActiveTableSheet,
  getTableSheets,
} from "@/features/editor/table-sheets";
import { createTableView } from "@/features/editor/table-view";
import type { TableElement } from "@/features/editor/types";

export type TableSheetValidationStatus = "ready" | "review" | "blocked";

export type TableSheetValidationCheck = {
  id: string;
  label: string;
  detail: string;
  status: TableSheetValidationStatus;
};

export type TableSheetValidationReport = {
  status: TableSheetValidationStatus;
  score: number;
  checks: TableSheetValidationCheck[];
};

export function createTableSheetValidationReport(
  element: TableElement,
): TableSheetValidationReport {
  const activeSheet = getActiveTableSheet(element);
  const sheets = getTableSheets(element);
  const formulas = getTableFormulaDiagnostics(element);
  const tableView = createTableView(element);
  const checks: TableSheetValidationCheck[] = [
    {
      id: "size",
      label: "Grid size",
      detail: `${activeSheet.rows} rows x ${activeSheet.columns} columns`,
      status:
        activeSheet.rows >= 1 &&
        activeSheet.columns >= 1 &&
        activeSheet.cells.length >= activeSheet.rows * activeSheet.columns
          ? "ready"
          : "blocked",
    },
    {
      id: "headers",
      label: "Header row",
      detail: getHeaderValidationDetail(element),
      status: getHeaderValidationStatus(element),
    },
    {
      id: "formulas",
      label: "Formula health",
      detail: formulas.length
        ? `${formulas.length} formula issue${formulas.length === 1 ? "" : "s"}`
        : "All formulas resolve",
      status: formulas.length ? "blocked" : "ready",
    },
    {
      id: "filter",
      label: "Filtered rows",
      detail: activeSheet.filterQuery
        ? `${tableView.filteredRowCount} rows match "${activeSheet.filterQuery}"`
        : "No active row filter",
      status:
        activeSheet.filterQuery && tableView.filteredRowCount === 0
          ? "review"
          : "ready",
    },
    {
      id: "workbook",
      label: "Workbook sheets",
      detail: `${sheets.length} sheet${sheets.length === 1 ? "" : "s"} available`,
      status: sheets.length ? "ready" : "blocked",
    },
  ];
  const score = Math.round(
    (checks.reduce((total, check) => total + getCheckScore(check.status), 0) /
      (checks.length * 2)) *
      100,
  );

  return {
    status: checks.some((check) => check.status === "blocked")
      ? "blocked"
      : checks.some((check) => check.status === "review")
        ? "review"
        : "ready",
    score,
    checks,
  };
}

function getHeaderValidationStatus(
  element: TableElement,
): TableSheetValidationStatus {
  const activeSheet = getActiveTableSheet(element);

  if (!activeSheet.headerRow) return "review";

  const headers = getNormalizedHeaders(element);

  if (headers.some((header) => !header)) return "review";
  if (new Set(headers).size !== headers.length) return "review";

  return "ready";
}

function getHeaderValidationDetail(element: TableElement) {
  const activeSheet = getActiveTableSheet(element);

  if (!activeSheet.headerRow) return "Header row is disabled";

  const headers = getNormalizedHeaders(element);

  if (headers.some((header) => !header)) {
    return "Some header cells are blank";
  }

  if (new Set(headers).size !== headers.length) {
    return "Duplicate header names detected";
  }

  return "Headers are named and unique";
}

function getNormalizedHeaders(element: TableElement) {
  const activeSheet = getActiveTableSheet(element);

  return Array.from({ length: activeSheet.columns }, (_, columnIndex) =>
    getTableCell(activeSheet.cells, activeSheet.columns, 0, columnIndex)
      .trim()
      .toLowerCase(),
  );
}

function getCheckScore(status: TableSheetValidationStatus) {
  if (status === "ready") return 2;
  if (status === "review") return 1;

  return 0;
}
