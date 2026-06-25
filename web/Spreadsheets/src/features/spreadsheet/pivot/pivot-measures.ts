import type {
  PivotAggregationResult,
  PivotSubtotalGroup,
} from "@/features/spreadsheet/pivot/pivot-types";
import type { PivotTableMeasure } from "@/features/workbooks/types";

function calculateValue(
  left: number,
  operator: PivotTableMeasure["operator"],
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

function cloneValueMap(values: Record<string, number>) {
  return { ...values };
}

function cloneNestedValues(values: Record<string, Record<string, number>>) {
  return Object.fromEntries(
    Object.entries(values).map(([key, nestedValues]) => [
      key,
      cloneValueMap(nestedValues),
    ]),
  );
}

function cloneSubtotal(subtotal: PivotSubtotalGroup): PivotSubtotalGroup {
  return {
    ...subtotal,
    columnTotals: cloneNestedValues(subtotal.columnTotals),
    totals: cloneValueMap(subtotal.totals),
  };
}

function cloneResult(result: PivotAggregationResult): PivotAggregationResult {
  return {
    ...result,
    cells: result.cells.map((cell) => ({
      ...cell,
      values: cloneValueMap(cell.values),
    })),
    columnKeys: [...result.columnKeys],
    columnTotals: cloneNestedValues(result.columnTotals),
    grandTotals: cloneValueMap(result.grandTotals),
    rowKeys: [...result.rowKeys],
    rowKeyPaths: Object.fromEntries(
      Object.entries(result.rowKeyPaths).map(([key, path]) => [key, [...path]]),
    ),
    rowSubtotals: Object.fromEntries(
      Object.entries(result.rowSubtotals).map(([key, subtotal]) => [
        key,
        cloneSubtotal(subtotal),
      ]),
    ),
    rowTotals: cloneNestedValues(result.rowTotals),
    valueFields: [...result.valueFields],
  };
}

function applyMeasureToValues(
  values: Record<string, number>,
  measure: PivotTableMeasure,
) {
  values[measure.name] = calculateValue(
    values[measure.leftValueLabel] ?? 0,
    measure.operator,
    values[measure.rightValueLabel] ?? 0,
  );
}

function hasMeasureOperands(
  measure: PivotTableMeasure,
  availableLabels: Set<string>,
) {
  return (
    availableLabels.has(measure.leftValueLabel) &&
    availableLabels.has(measure.rightValueLabel) &&
    !availableLabels.has(measure.name)
  );
}

export function applyPivotMeasures(
  result: PivotAggregationResult,
  measures: PivotTableMeasure[],
) {
  if (measures.length === 0 || result.valueFields.length === 0) {
    return result;
  }

  const nextResult = cloneResult(result);
  const availableLabels = new Set(
    nextResult.valueFields.map((valueField) => valueField.label),
  );

  for (const measure of measures) {
    if (!hasMeasureOperands(measure, availableLabels)) {
      continue;
    }

    nextResult.valueFields.push({
      aggregation: "sum",
      fieldId: measure.id,
      label: measure.name,
    });
    for (const cell of nextResult.cells) {
      applyMeasureToValues(cell.values, measure);
    }
    for (const values of Object.values(nextResult.rowTotals)) {
      applyMeasureToValues(values, measure);
    }
    for (const values of Object.values(nextResult.columnTotals)) {
      applyMeasureToValues(values, measure);
    }
    for (const subtotal of Object.values(nextResult.rowSubtotals)) {
      applyMeasureToValues(subtotal.totals, measure);
      for (const values of Object.values(subtotal.columnTotals)) {
        applyMeasureToValues(values, measure);
      }
    }
    applyMeasureToValues(nextResult.grandTotals, measure);
    availableLabels.add(measure.name);
  }

  return nextResult;
}
