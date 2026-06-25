import { cellKey } from "@/features/workbooks/addresses";
import { getContiguousIndexes } from "@/features/spreadsheet/index-cache";
import { getEffectiveHiddenRows } from "@/features/spreadsheet/outline-groups";
import {
  getCellStyleCriterionValue,
  type StyleCriterion,
} from "@/features/spreadsheet/style-criteria";
import { parseComparableNumber } from "@/features/spreadsheet/value-parsing";
import type {
  SheetData,
  SheetFilterCondition,
  SheetFilterRule,
} from "@/features/workbooks/types";

type FilterMatchContext = {
  value: string;
  sheet: SheetData;
  rowIndex: number;
  columnIndex: number;
};

function getStyleCriterionForFilter(
  type: SheetFilterCondition["type"],
): StyleCriterion | null {
  if (type === "cellColor" || type === "fontColor" || type === "icon") {
    return type;
  }

  return null;
}

function getComparableFilterValue(
  condition: SheetFilterCondition,
  context: FilterMatchContext,
) {
  const styleCriterion = getStyleCriterionForFilter(condition.type);

  if (!styleCriterion) {
    return context.value;
  }

  return getCellStyleCriterionValue(
    context.sheet,
    context.rowIndex,
    context.columnIndex,
    styleCriterion,
  );
}

function matchesCondition(
  context: FilterMatchContext,
  condition: SheetFilterCondition,
) {
  const comparableValue = getComparableFilterValue(condition, context);
  const trimmedValue = comparableValue.trim();
  const normalizedValue = trimmedValue.toLocaleLowerCase();
  const normalizedFilterValue = condition.value.trim().toLocaleLowerCase();

  if (condition.type === "empty") {
    return trimmedValue.length === 0;
  }

  if (condition.type === "notEmpty") {
    return trimmedValue.length > 0;
  }

  if (condition.type === "oneOf") {
    return (condition.values ?? []).some(
      (item) => item.trim().toLocaleLowerCase() === normalizedValue,
    );
  }

  if (getStyleCriterionForFilter(condition.type)) {
    return (condition.values ?? []).some((item) => item === comparableValue);
  }

  if (condition.type === "contains") {
    return (
      normalizedFilterValue.length === 0 ||
      normalizedValue.includes(normalizedFilterValue)
    );
  }

  if (condition.type === "doesNotContain") {
    return (
      normalizedFilterValue.length === 0 ||
      !normalizedValue.includes(normalizedFilterValue)
    );
  }

  if (condition.type === "startsWith") {
    return (
      normalizedFilterValue.length === 0 ||
      normalizedValue.startsWith(normalizedFilterValue)
    );
  }

  if (condition.type === "endsWith") {
    return (
      normalizedFilterValue.length === 0 ||
      normalizedValue.endsWith(normalizedFilterValue)
    );
  }

  if (condition.type === "equals") {
    return normalizedValue === normalizedFilterValue;
  }

  if (condition.type === "notEquals") {
    return normalizedValue !== normalizedFilterValue;
  }

  const cellNumber = parseComparableNumber(trimmedValue);
  const filterNumber = parseComparableNumber(condition.value);

  if (cellNumber === null || filterNumber === null) {
    return false;
  }

  if (condition.type === "greaterThan") {
    return cellNumber > filterNumber;
  }

  if (condition.type === "greaterThanOrEqual") {
    return cellNumber >= filterNumber;
  }

  if (condition.type === "lessThan") {
    return cellNumber < filterNumber;
  }

  return cellNumber <= filterNumber;
}

function matchesFilter(context: FilterMatchContext, filter: SheetFilterRule) {
  if (filter.criteriaGroups && filter.criteriaGroups.length > 0) {
    return true;
  }

  const conditions =
    filter.conditions && filter.conditions.length > 0
      ? filter.conditions
      : [
          {
            type: filter.type,
            value: filter.value,
            values: filter.values,
          },
        ];

  if (filter.joiner === "or") {
    return conditions.some((condition) => matchesCondition(context, condition));
  }

  return conditions.every((condition) => matchesCondition(context, condition));
}

function matchesCriteriaGroups({
  filter,
  sheet,
  computedValues,
  rowIndex,
}: {
  filter: SheetFilterRule;
  sheet: SheetData;
  computedValues: Record<string, string>;
  rowIndex: number;
}) {
  const groups = filter.criteriaGroups ?? [];

  if (groups.length === 0) {
    return null;
  }

  return groups.some((group) =>
    group.conditions.every((condition) => {
      if (
        condition.columnIndex < 0 ||
        condition.columnIndex >= sheet.columnCount
      ) {
        return false;
      }

      const key = cellKey(rowIndex, condition.columnIndex);
      const value = computedValues[key] ?? sheet.cells[key]?.raw ?? "";

      return matchesCondition(
        {
          value,
          sheet,
          rowIndex,
          columnIndex: condition.columnIndex,
        },
        condition,
      );
    }),
  );
}

function filterAppliesToRow(filter: SheetFilterRule, rowIndex: number) {
  return (
    rowIndex >= filter.range.startRowIndex &&
    rowIndex <= filter.range.endRowIndex
  );
}

function isHeaderRow(filter: SheetFilterRule, rowIndex: number) {
  return rowIndex === filter.range.startRowIndex;
}

export function getVisibleRowIndexes({
  sheet,
  filters,
  computedValues,
}: {
  sheet: SheetData;
  filters: SheetFilterRule[];
  computedValues: Record<string, string>;
}) {
  const hiddenRows = getEffectiveHiddenRows(sheet);

  if (filters.length === 0) {
    const rowIndexes = getContiguousIndexes(sheet.rowCount);

    if (hiddenRows.size === 0) {
      return rowIndexes;
    }

    return rowIndexes.filter((rowIndex) => !hiddenRows.has(rowIndex));
  }

  const rows: number[] = [];

  for (let rowIndex = 0; rowIndex < sheet.rowCount; rowIndex += 1) {
    if (hiddenRows.has(rowIndex)) {
      continue;
    }

    let visible = true;

    for (const filter of filters) {
      if (!filterAppliesToRow(filter, rowIndex) || isHeaderRow(filter, rowIndex)) {
        continue;
      }

      const key = cellKey(rowIndex, filter.columnIndex);
      const value = computedValues[key] ?? sheet.cells[key]?.raw ?? "";
      const criteriaGroupMatch = matchesCriteriaGroups({
        filter,
        sheet,
        computedValues,
        rowIndex,
      });

      if (
        criteriaGroupMatch === false ||
        !matchesFilter(
          {
            value,
            sheet,
            rowIndex,
            columnIndex: filter.columnIndex,
          },
          filter,
        )
      ) {
        visible = false;
        break;
      }
    }

    if (visible) {
      rows.push(rowIndex);
    }
  }

  return rows;
}
