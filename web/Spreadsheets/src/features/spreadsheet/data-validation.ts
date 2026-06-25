import { cellKey } from "@/features/workbooks/addresses";
import { matchesFormulaCondition } from "@/features/spreadsheet/conditional-formula";
import { getValidationListOptions } from "@/features/spreadsheet/data-validation-sources";
import { parseComparableNumber } from "@/features/spreadsheet/value-parsing";
import type {
  DataValidationErrorStyle,
  DataValidationRuleType,
  DataValidationRule,
  SheetData,
} from "@/features/workbooks/types";

export {
  parseDependentListGroups,
  parseListLabels,
  parseListValues,
  parseValidationRangeReference,
} from "@/features/spreadsheet/data-validation-sources";

export type DataValidationIssue = {
  key: string;
  ruleId: string;
  rowIndex: number;
  columnIndex: number;
  type: DataValidationRuleType;
  message: string;
  errorStyle: DataValidationErrorStyle;
  circleInvalid: boolean;
};

function parseComparableDate(value: string) {
  const timestamp = Date.parse(value.trim());

  return Number.isFinite(timestamp) ? timestamp : null;
}

function rangeContainsCell(
  rule: DataValidationRule,
  rowIndex: number,
  columnIndex: number,
) {
  return (
    rowIndex >= rule.range.startRowIndex &&
    rowIndex <= rule.range.endRowIndex &&
    columnIndex >= rule.range.startColumnIndex &&
    columnIndex <= rule.range.endColumnIndex
  );
}

export function getListValidationOptions({
  rules,
  sheet,
  computedValues,
  rowIndex,
  columnIndex,
}: {
  rules: DataValidationRule[];
  sheet: SheetData;
  computedValues: Record<string, string>;
  rowIndex: number;
  columnIndex: number;
}) {
  for (let index = rules.length - 1; index >= 0; index -= 1) {
    const rule = rules[index];

    if (
      rule.type === "list" &&
      rangeContainsCell(rule, rowIndex, columnIndex)
    ) {
      return getValidationListOptions({
        rule,
        sheet,
        computedValues,
        rowIndex,
        columnIndex,
      });
    }
  }

  return [];
}

export function getValidationFeedback({
  rules,
  rowIndex,
  columnIndex,
  isInvalid,
}: {
  rules: DataValidationRule[];
  rowIndex: number;
  columnIndex: number;
  isInvalid: boolean;
}) {
  for (let index = rules.length - 1; index >= 0; index -= 1) {
    const rule = rules[index];

    if (!rangeContainsCell(rule, rowIndex, columnIndex)) {
      continue;
    }

    if (isInvalid) {
      if (rule.showErrorAlert === false) {
        return null;
      }

      return rule.errorMessage || "Value does not match the validation rule.";
    }

    if (rule.showInputMessage === false) {
      return null;
    }

    return rule.inputMessage || null;
  }

  return null;
}

function isValid({
  value,
  rule,
  sheet,
  computedValues,
  rowIndex,
  columnIndex,
}: {
  value: string;
  rule: DataValidationRule;
  sheet: SheetData;
  computedValues: Record<string, string>;
  rowIndex: number;
  columnIndex: number;
}) {
  const trimmedValue = value.trim();

  if (rule.type === "notEmpty") {
    return trimmedValue.length > 0;
  }

  if (trimmedValue.length === 0 && rule.ignoreBlank !== false) {
    return true;
  }

  if (rule.type === "customFormula") {
    return matchesFormulaCondition({
      formula: rule.value,
      rowOffset: rowIndex - rule.range.startRowIndex,
      columnOffset: columnIndex - rule.range.startColumnIndex,
      sheet,
      computedValues,
      rowIndex,
      columnIndexValue: columnIndex,
    });
  }

  if (rule.type === "list") {
    const allowedValues = getValidationListOptions({
      rule,
      sheet,
      computedValues,
      rowIndex,
      columnIndex,
    }).map((item) => item.trim().toLocaleLowerCase());

    return allowedValues.includes(trimmedValue.toLocaleLowerCase());
  }

  if (rule.type === "textContains") {
    const needle = rule.value.trim().toLocaleLowerCase();

    return needle.length === 0 || trimmedValue.toLocaleLowerCase().includes(needle);
  }

  if (rule.type === "dateAfter" || rule.type === "dateBefore") {
    const cellDate = parseComparableDate(trimmedValue);
    const ruleDate = parseComparableDate(rule.value);

    if (cellDate === null || ruleDate === null) {
      return false;
    }

    return rule.type === "dateAfter"
      ? cellDate > ruleDate
      : cellDate < ruleDate;
  }

  const cellNumber = parseComparableNumber(trimmedValue);
  const ruleNumber = parseComparableNumber(rule.value);

  if (cellNumber === null || ruleNumber === null) {
    return false;
  }

  return rule.type === "numberGreaterThan"
    ? cellNumber > ruleNumber
    : cellNumber < ruleNumber;
}

export function getInvalidCellKeys({
  sheet,
  rules,
  computedValues,
}: {
  sheet: SheetData;
  rules: DataValidationRule[];
  computedValues: Record<string, string>;
}) {
  return new Set(
    getInvalidCellIssues({ sheet, rules, computedValues })
      .filter((issue) => issue.circleInvalid)
      .map((issue) => issue.key),
  );
}

export function getInvalidCellIssues({
  sheet,
  rules,
  computedValues,
}: {
  sheet: SheetData;
  rules: DataValidationRule[];
  computedValues: Record<string, string>;
}) {
  const issues = new Map<string, DataValidationIssue>();

  for (const rule of rules) {
    const startRowIndex = Math.max(rule.range.startRowIndex, 0);
    const endRowIndex = Math.min(rule.range.endRowIndex, sheet.rowCount - 1);
    const startColumnIndex = Math.max(rule.range.startColumnIndex, 0);
    const endColumnIndex = Math.min(
      rule.range.endColumnIndex,
      sheet.columnCount - 1,
    );

    for (let rowIndex = startRowIndex; rowIndex <= endRowIndex; rowIndex += 1) {
      for (
        let columnIndex = startColumnIndex;
        columnIndex <= endColumnIndex;
        columnIndex += 1
      ) {
        const key = cellKey(rowIndex, columnIndex);
        const value = computedValues[key] ?? sheet.cells[key]?.raw ?? "";

        if (
          !isValid({
            value,
            rule,
            sheet,
            computedValues,
            rowIndex,
            columnIndex,
          })
        ) {
          issues.set(key, {
            key,
            ruleId: rule.id,
            rowIndex,
            columnIndex,
            type: rule.type,
            message:
              rule.errorMessage || "Value does not match the validation rule.",
            errorStyle: rule.errorStyle ?? "stop",
            circleInvalid: rule.circleInvalid !== false,
          });
        }
      }
    }
  }

  return Array.from(issues.values()).slice(0, 100);
}
