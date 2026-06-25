import { cellKey, columnLabel } from "@/features/workbooks/addresses";
import type { DataValidationIssue } from "@/features/spreadsheet/data-validation";
import type { FormulaErrorIssue } from "@/features/spreadsheet/formula-errors";
import type { SelectionSummary } from "@/features/spreadsheet/selection-summary";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";
import type {
  SheetData,
  TableDefinition,
} from "@/features/workbooks/types";

function rangeAddress(range: CellRange) {
  const start = `${columnLabel(range.startColumnIndex)}${range.startRowIndex + 1}`;
  const end = `${columnLabel(range.endColumnIndex)}${range.endRowIndex + 1}`;

  return start === end ? start : `${start}:${end}`;
}

function rangeOverlaps(left: CellRange, right: CellRange) {
  return (
    left.startRowIndex <= right.endRowIndex &&
    left.endRowIndex >= right.startRowIndex &&
    left.startColumnIndex <= right.endColumnIndex &&
    left.endColumnIndex >= right.startColumnIndex
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(value);
}

function selectedTableName(tables: TableDefinition[], range: CellRange) {
  return tables.find((table) => rangeOverlaps(table.range, range))?.name ?? null;
}

export function getSpreadsheetScreenReaderAnnouncement({
  sheet,
  selectedRange,
  computedValues,
  dataValidationIssues,
  formulaErrorIssues,
  selectionSummary,
  tables,
}: {
  sheet: SheetData;
  selectedRange: CellRange;
  computedValues: Record<string, string>;
  dataValidationIssues: DataValidationIssue[];
  formulaErrorIssues: FormulaErrorIssue[];
  selectionSummary: SelectionSummary;
  tables: TableDefinition[];
}) {
  const selectedKey = cellKey(
    selectedRange.startRowIndex,
    selectedRange.startColumnIndex,
  );
  const selectedValue =
    computedValues[selectedKey] ?? sheet.cells[selectedKey]?.raw ?? "";
  const validationIssue = dataValidationIssues.find(
    (issue) => issue.key === selectedKey,
  );
  const formulaErrorIssue = formulaErrorIssues.find(
    (issue) => issue.key === selectedKey,
  );
  const tableName = selectedTableName(tables, selectedRange);
  const parts = [`${sheet.name} ${rangeAddress(selectedRange)}`];

  if (selectionSummary.cells > 1) {
    parts.push(`${selectionSummary.cells} cells selected`);
    parts.push(`${selectionSummary.nonEmpty} with values`);

    if (selectionSummary.numeric > 0) {
      parts.push(`sum ${formatNumber(selectionSummary.sum)}`);
      parts.push(
        `average ${formatNumber(selectionSummary.average ?? selectionSummary.sum)}`,
      );
    }
  } else {
    parts.push(selectedValue ? `value ${selectedValue}` : "blank");
  }

  if (formulaErrorIssue) {
    parts.push(`formula error ${formulaErrorIssue.message}`);
  }

  if (validationIssue) {
    parts.push(`validation issue ${validationIssue.message}`);
  }

  if (tableName) {
    parts.push(`inside table ${tableName}`);
  }

  return parts.join(". ");
}
