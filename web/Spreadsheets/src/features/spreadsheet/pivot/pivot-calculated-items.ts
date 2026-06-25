import type {
  PivotAggregationCell,
  PivotAggregationResult,
} from "@/features/spreadsheet/pivot/pivot-types";
import type { PivotTableCalculatedItem } from "@/features/workbooks/types";

function calculateValue(
  left: number,
  operator: PivotTableCalculatedItem["operator"],
  right: number,
) {
  if (operator === "add") {
    return left + right;
  }

  if (operator === "subtract") {
    return left - right;
  }

  if (operator === "multiply") {
    return left * right;
  }

  return right === 0 ? 0 : left / right;
}

function calculateValues({
  leftValues,
  operator,
  rightValues,
  valueLabels,
}: {
  leftValues?: Record<string, number>;
  operator: PivotTableCalculatedItem["operator"];
  rightValues?: Record<string, number>;
  valueLabels: string[];
}) {
  return valueLabels.reduce<Record<string, number>>((values, label) => {
    values[label] = calculateValue(
      leftValues?.[label] ?? 0,
      operator,
      rightValues?.[label] ?? 0,
    );
    return values;
  }, {});
}

function cloneResult(result: PivotAggregationResult): PivotAggregationResult {
  return {
    ...result,
    cells: [...result.cells],
    columnKeys: [...result.columnKeys],
    columnTotals: { ...result.columnTotals },
    grandTotals: { ...result.grandTotals },
    rowKeys: [...result.rowKeys],
    rowKeyPaths: { ...result.rowKeyPaths },
    rowSubtotals: { ...result.rowSubtotals },
    rowTotals: { ...result.rowTotals },
  };
}

function getCellValues(cells: PivotAggregationCell[]) {
  return new Map(
    cells.map((cell) => [`${cell.rowKey}\u001f${cell.columnKey}`, cell.values]),
  );
}

function applyRowCalculatedItem(
  result: PivotAggregationResult,
  item: PivotTableCalculatedItem,
  valueLabels: string[],
) {
  if (
    result.rowFields.length !== 1 ||
    result.rowFields[0]?.id !== item.fieldId ||
    result.rowKeys.includes(item.name)
  ) {
    return;
  }

  const leftValues = result.rowTotals[item.leftItem];
  const rightValues = result.rowTotals[item.rightItem];

  if (!leftValues && !rightValues) {
    return;
  }

  const cellValues = getCellValues(result.cells);

  result.rowKeys.push(item.name);
  result.rowKeyPaths[item.name] = [item.name];
  result.rowTotals[item.name] = calculateValues({
    leftValues,
    operator: item.operator,
    rightValues,
    valueLabels,
  });

  for (const columnKey of result.columnKeys) {
    result.cells.push({
      columnKey,
      rowKey: item.name,
      values: calculateValues({
        leftValues: cellValues.get(`${item.leftItem}\u001f${columnKey}`),
        operator: item.operator,
        rightValues: cellValues.get(`${item.rightItem}\u001f${columnKey}`),
        valueLabels,
      }),
    });
  }
}

function applyColumnCalculatedItem(
  result: PivotAggregationResult,
  item: PivotTableCalculatedItem,
  valueLabels: string[],
) {
  if (
    result.columnFields.length !== 1 ||
    result.columnFields[0]?.id !== item.fieldId ||
    result.columnKeys.includes(item.name)
  ) {
    return;
  }

  const leftValues = result.columnTotals[item.leftItem];
  const rightValues = result.columnTotals[item.rightItem];

  if (!leftValues && !rightValues) {
    return;
  }

  const cellValues = getCellValues(result.cells);

  result.columnKeys.push(item.name);
  result.columnTotals[item.name] = calculateValues({
    leftValues,
    operator: item.operator,
    rightValues,
    valueLabels,
  });

  for (const rowKey of result.rowKeys) {
    result.cells.push({
      columnKey: item.name,
      rowKey,
      values: calculateValues({
        leftValues: cellValues.get(`${rowKey}\u001f${item.leftItem}`),
        operator: item.operator,
        rightValues: cellValues.get(`${rowKey}\u001f${item.rightItem}`),
        valueLabels,
      }),
    });
  }
}

export function applyPivotCalculatedItems(
  result: PivotAggregationResult,
  calculatedItems: PivotTableCalculatedItem[],
) {
  if (calculatedItems.length === 0 || result.valueFields.length === 0) {
    return result;
  }

  const nextResult = cloneResult(result);
  const valueLabels = result.valueFields.map((field) => field.label);

  for (const item of calculatedItems) {
    applyRowCalculatedItem(nextResult, item, valueLabels);
    applyColumnCalculatedItem(nextResult, item, valueLabels);
  }

  return nextResult;
}
