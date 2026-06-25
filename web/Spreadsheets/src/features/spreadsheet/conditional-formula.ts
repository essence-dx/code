import { cellKey, columnIndex } from "@/features/workbooks/addresses";
import { shiftFormulaReferences } from "@/features/spreadsheet/formula-references";
import type { SheetData } from "@/features/workbooks/types";
import { parseComparableNumber } from "@/features/spreadsheet/value-parsing";

type FormulaOperand = string | number | boolean;

type FormulaEvaluationInput = {
  sheet: SheetData;
  computedValues: Record<string, string>;
  rowIndex: number;
  columnIndexValue: number;
};

type FormulaRuleInput = FormulaEvaluationInput & {
  formula: string;
  rowOffset: number;
  columnOffset: number;
};

function splitTopLevelArguments(value: string) {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  let inString = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (character === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (character === "(") {
      depth += 1;
      continue;
    }

    if (character === ")") {
      depth = Math.max(depth - 1, 0);
      continue;
    }

    if (character === "," && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }

  parts.push(value.slice(start).trim());
  return parts.filter(Boolean);
}

function getCellTextValue({
  sheet,
  computedValues,
  reference,
}: {
  sheet: SheetData;
  computedValues: Record<string, string>;
  reference: string;
}) {
  const match = reference.match(/^\$?([A-Z]{1,3})\$?([1-9]\d*)$/i);

  if (!match) {
    return "";
  }

  const targetColumnIndex = columnIndex(match[1].toUpperCase());
  const targetRowIndex = Number(match[2]) - 1;

  if (
    targetRowIndex < 0 ||
    targetColumnIndex < 0 ||
    targetRowIndex >= sheet.rowCount ||
    targetColumnIndex >= sheet.columnCount
  ) {
    return "";
  }

  const key = cellKey(targetRowIndex, targetColumnIndex);

  return computedValues[key] ?? sheet.cells[key]?.raw ?? "";
}

function findComparisonOperator(expression: string) {
  const operators = [">=", "<=", "<>", ">", "<", "="];
  let depth = 0;
  let inString = false;

  for (let index = 0; index < expression.length; index += 1) {
    const character = expression[index];

    if (character === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (character === "(") {
      depth += 1;
      continue;
    }

    if (character === ")") {
      depth = Math.max(depth - 1, 0);
      continue;
    }

    if (depth > 0) {
      continue;
    }

    const operator = operators.find((item) =>
      expression.slice(index).startsWith(item),
    );

    if (operator) {
      return { index, operator };
    }
  }

  return null;
}

function evaluateFormulaOperand({
  operand,
  sheet,
  computedValues,
  rowIndex,
  columnIndexValue,
}: FormulaEvaluationInput & {
  operand: string;
}): FormulaOperand {
  const trimmed = operand.trim();

  if (/^TRUE$/i.test(trimmed)) {
    return true;
  }

  if (/^FALSE$/i.test(trimmed)) {
    return false;
  }

  if (/^ROW\(\)$/i.test(trimmed)) {
    return rowIndex + 1;
  }

  if (/^COLUMN\(\)$/i.test(trimmed)) {
    return columnIndexValue + 1;
  }

  const stringMatch = trimmed.match(/^"((?:""|[^"])*)"$/);

  if (stringMatch) {
    return stringMatch[1].replace(/""/g, '"');
  }

  const cellReferenceMatch = trimmed.match(/^\$?[A-Z]{1,3}\$?[1-9]\d*$/i);

  if (cellReferenceMatch) {
    return getCellTextValue({ sheet, computedValues, reference: trimmed });
  }

  const numericValue = parseComparableNumber(trimmed);

  return numericValue ?? trimmed;
}

function compareFormulaValues(
  left: FormulaOperand,
  right: FormulaOperand,
  operator: string,
) {
  const leftNumber =
    typeof left === "number" ? left : parseComparableNumber(String(left));
  const rightNumber =
    typeof right === "number" ? right : parseComparableNumber(String(right));
  const canCompareNumbers = leftNumber !== null && rightNumber !== null;

  if (canCompareNumbers) {
    if (operator === ">") return leftNumber > rightNumber;
    if (operator === "<") return leftNumber < rightNumber;
    if (operator === ">=") return leftNumber >= rightNumber;
    if (operator === "<=") return leftNumber <= rightNumber;
    if (operator === "=") return leftNumber === rightNumber;
    if (operator === "<>") return leftNumber !== rightNumber;
  }

  const leftText = String(left).trim().toLowerCase();
  const rightText = String(right).trim().toLowerCase();

  return operator === "="
    ? leftText === rightText
    : operator === "<>"
      ? leftText !== rightText
      : false;
}

function evaluateFormulaCondition({
  formula,
  sheet,
  computedValues,
  rowIndex,
  columnIndexValue,
}: FormulaEvaluationInput & {
  formula: string;
}): boolean {
  const expression = formula.trim().replace(/^=/, "").trim();
  const functionMatch = expression.match(/^([A-Z]+)\((.*)\)$/i);

  if (functionMatch) {
    const functionName = functionMatch[1].toUpperCase();
    const args = splitTopLevelArguments(functionMatch[2]);

    if (functionName === "AND") {
      return args.every((arg) =>
        evaluateFormulaCondition({
          formula: arg,
          sheet,
          computedValues,
          rowIndex,
          columnIndexValue,
        }),
      );
    }

    if (functionName === "OR") {
      return args.some((arg) =>
        evaluateFormulaCondition({
          formula: arg,
          sheet,
          computedValues,
          rowIndex,
          columnIndexValue,
        }),
      );
    }

    if (functionName === "NOT") {
      return !evaluateFormulaCondition({
        formula: args[0] ?? "",
        sheet,
        computedValues,
        rowIndex,
        columnIndexValue,
      });
    }

    if (functionName === "ISBLANK") {
      const value = evaluateFormulaOperand({
        operand: args[0] ?? "",
        sheet,
        computedValues,
        rowIndex,
        columnIndexValue,
      });

      return String(value).trim().length === 0;
    }

    if (functionName === "ISNUMBER") {
      const value = evaluateFormulaOperand({
        operand: args[0] ?? "",
        sheet,
        computedValues,
        rowIndex,
        columnIndexValue,
      });

      return parseComparableNumber(String(value)) !== null;
    }

    if (functionName === "ISTEXT") {
      const value = evaluateFormulaOperand({
        operand: args[0] ?? "",
        sheet,
        computedValues,
        rowIndex,
        columnIndexValue,
      });

      return (
        String(value).trim().length > 0 &&
        parseComparableNumber(String(value)) === null
      );
    }
  }

  const comparison = findComparisonOperator(expression);

  if (!comparison) {
    const value = evaluateFormulaOperand({
      operand: expression,
      sheet,
      computedValues,
      rowIndex,
      columnIndexValue,
    });

    return typeof value === "boolean"
      ? value
      : String(value).trim().length > 0 && String(value).trim() !== "0";
  }

  const left = evaluateFormulaOperand({
    operand: expression.slice(0, comparison.index),
    sheet,
    computedValues,
    rowIndex,
    columnIndexValue,
  });
  const right = evaluateFormulaOperand({
    operand: expression.slice(comparison.index + comparison.operator.length),
    sheet,
    computedValues,
    rowIndex,
    columnIndexValue,
  });

  return compareFormulaValues(left, right, comparison.operator);
}

export function matchesFormulaCondition({
  formula,
  rowOffset,
  columnOffset,
  sheet,
  computedValues,
  rowIndex,
  columnIndexValue,
}: FormulaRuleInput) {
  return evaluateFormulaCondition({
    formula: shiftFormulaReferences({ formula, rowOffset, columnOffset }),
    sheet,
    computedValues,
    rowIndex,
    columnIndexValue,
  });
}
