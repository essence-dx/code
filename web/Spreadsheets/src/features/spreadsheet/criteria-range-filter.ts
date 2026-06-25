import { cellKey, columnLabel } from "@/features/workbooks/addresses";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";
import type {
  SheetData,
  SheetFilterCondition,
  SheetFilterCriteriaCondition,
  SheetFilterCriteriaGroup,
  SheetFilterRule,
} from "@/features/workbooks/types";

export type CriteriaRangeFilterDraft = Pick<
  SheetFilterRule,
  | "range"
  | "columnIndex"
  | "headerName"
  | "type"
  | "value"
  | "conditions"
  | "joiner"
  | "criteriaGroups"
>;

function getCellText({
  sheet,
  computedValues,
  rowIndex,
  columnIndex,
}: {
  sheet: SheetData;
  computedValues: Record<string, string>;
  rowIndex: number;
  columnIndex: number;
}) {
  const key = cellKey(rowIndex, columnIndex);

  return (computedValues[key] ?? sheet.cells[key]?.raw ?? "").trim();
}

function normalizeHeader(value: string) {
  return value.trim().toLocaleLowerCase();
}

function stripOuterWildcards(value: string) {
  return value.replace(/^\*+/, "").replace(/\*+$/, "");
}

export function parseCriteriaValue(value: string): SheetFilterCondition | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed === "=") {
    return { type: "empty", value: "" };
  }

  if (trimmed === "<>") {
    return { type: "notEmpty", value: "" };
  }

  const operator = /^(>=|<=|<>|>|<|=)(.*)$/.exec(trimmed);

  if (operator) {
    const operand = operator[2].trim();

    if (operator[1] === ">=") {
      return { type: "greaterThanOrEqual", value: operand };
    }

    if (operator[1] === "<=") {
      return { type: "lessThanOrEqual", value: operand };
    }

    if (operator[1] === "<>") {
      return { type: "notEquals", value: operand };
    }

    if (operator[1] === ">") {
      return { type: "greaterThan", value: operand };
    }

    if (operator[1] === "<") {
      return { type: "lessThan", value: operand };
    }

    return { type: "equals", value: operand };
  }

  if (trimmed.startsWith("*") && trimmed.endsWith("*") && trimmed.length > 2) {
    return { type: "contains", value: stripOuterWildcards(trimmed) };
  }

  if (trimmed.endsWith("*") && trimmed.length > 1) {
    return { type: "startsWith", value: stripOuterWildcards(trimmed) };
  }

  if (trimmed.startsWith("*") && trimmed.length > 1) {
    return { type: "endsWith", value: stripOuterWildcards(trimmed) };
  }

  return { type: "equals", value: trimmed };
}

export function createCriteriaRangeFilters({
  sheet,
  criteriaRange,
  computedValues,
}: {
  sheet: SheetData;
  criteriaRange: CellRange;
  computedValues: Record<string, string>;
}): { filters: CriteriaRangeFilterDraft[]; message?: string } {
  if (criteriaRange.startRowIndex < 2) {
    return {
      filters: [],
      message: "Select a criteria range below the data header and data rows.",
    };
  }

  if (criteriaRange.endRowIndex <= criteriaRange.startRowIndex) {
    return {
      filters: [],
      message: "Criteria ranges need a header row and at least one criteria row.",
    };
  }

  const dataRange: CellRange = {
    startRowIndex: 0,
    startColumnIndex: 0,
    endRowIndex: criteriaRange.startRowIndex - 1,
    endColumnIndex: sheet.columnCount - 1,
  };
  const headerLookup = new Map<string, { columnIndex: number; headerName: string }>();

  for (let columnIndex = 0; columnIndex < sheet.columnCount; columnIndex += 1) {
    const headerName =
      getCellText({
        sheet,
        computedValues,
        rowIndex: dataRange.startRowIndex,
        columnIndex,
      }) || columnLabel(columnIndex);

    headerLookup.set(normalizeHeader(headerName), { columnIndex, headerName });
    headerLookup.set(normalizeHeader(columnLabel(columnIndex)), {
      columnIndex,
      headerName,
    });
  }

  const groups: SheetFilterCriteriaGroup[] = [];

  for (
    let criteriaRowIndex = criteriaRange.startRowIndex + 1;
    criteriaRowIndex <= criteriaRange.endRowIndex;
    criteriaRowIndex += 1
  ) {
    const conditions: SheetFilterCriteriaCondition[] = [];

    for (
      let criteriaColumnIndex = criteriaRange.startColumnIndex;
      criteriaColumnIndex <= criteriaRange.endColumnIndex;
      criteriaColumnIndex += 1
    ) {
      const criteriaHeader = getCellText({
        sheet,
        computedValues,
        rowIndex: criteriaRange.startRowIndex,
        columnIndex: criteriaColumnIndex,
      });
      const dataColumn = headerLookup.get(normalizeHeader(criteriaHeader));

      if (!criteriaHeader || !dataColumn) {
        continue;
      }

      const condition = parseCriteriaValue(
        getCellText({
          sheet,
          computedValues,
          rowIndex: criteriaRowIndex,
          columnIndex: criteriaColumnIndex,
        }),
      );

      if (!condition) {
        continue;
      }

      conditions.push({
        ...condition,
        columnIndex: dataColumn.columnIndex,
        headerName: dataColumn.headerName,
      });
    }

    if (conditions.length > 0) {
      groups.push({ conditions });
    }
  }

  const firstCondition = groups[0]?.conditions[0];
  const filters: CriteriaRangeFilterDraft[] = firstCondition
    ? [
        {
          range: dataRange,
          columnIndex: firstCondition.columnIndex,
          headerName: "Criteria range",
          type: firstCondition.type,
          value: firstCondition.value,
          joiner: groups.length > 1 ? "or" : undefined,
          criteriaGroups: groups,
        },
      ]
    : [];

  return {
    filters,
    message:
      filters.length === 0
        ? "No criteria matched the data headers above the selected range."
        : undefined,
  };
}
