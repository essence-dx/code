import type {
  ChartRange,
  ConditionalFormatRule,
  PivotTableConditionalFormatScope,
  PivotTableDefinition,
} from "@/features/workbooks/types";

export const pivotConditionalFormatScopes = [
  "all",
  "labels",
  "values",
] satisfies PivotTableConditionalFormatScope[];

export function getPivotConditionalFormatRange(
  pivotTable: PivotTableDefinition,
  scope: PivotTableConditionalFormatScope = "values",
): ChartRange {
  const { outputRange } = pivotTable;

  if (scope === "all") {
    return { ...outputRange };
  }

  if (scope === "labels") {
    return {
      startRowIndex: Math.min(outputRange.startRowIndex + 2, outputRange.endRowIndex),
      endRowIndex: outputRange.endRowIndex,
      startColumnIndex: outputRange.startColumnIndex,
      endColumnIndex: outputRange.startColumnIndex,
    };
  }

  const valueRange = {
    startRowIndex: Math.min(outputRange.startRowIndex + 2, outputRange.endRowIndex),
    endRowIndex: outputRange.endRowIndex,
    startColumnIndex: Math.min(
      outputRange.startColumnIndex + 1,
      outputRange.endColumnIndex,
    ),
    endColumnIndex: outputRange.endColumnIndex,
  };

  if (
    valueRange.startRowIndex > valueRange.endRowIndex ||
    valueRange.startColumnIndex > valueRange.endColumnIndex
  ) {
    return { ...outputRange };
  }

  return valueRange;
}

export function resolvePivotConditionalFormatRules({
  pivotTables,
  rules,
}: {
  pivotTables: PivotTableDefinition[];
  rules: ConditionalFormatRule[];
}): ConditionalFormatRule[] {
  const pivotTablesById = new Map(
    pivotTables.map((pivotTable) => [pivotTable.id, pivotTable]),
  );

  return rules.map((rule) => {
    if (!rule.sourcePivotTableId) {
      return rule;
    }

    const pivotTable = pivotTablesById.get(rule.sourcePivotTableId);

    if (!pivotTable) {
      return rule;
    }

    return {
      ...rule,
      sheetId: pivotTable.sheetId,
      range: getPivotConditionalFormatRange(
        pivotTable,
        rule.pivotTableScope ?? "values",
      ),
    };
  });
}

export function getPivotConditionalFormatCount(
  rules: ConditionalFormatRule[],
  pivotTableId: string,
) {
  return rules.filter((rule) => rule.sourcePivotTableId === pivotTableId).length;
}

export function getPivotConditionalFormatScopeLabel(
  scope: PivotTableConditionalFormatScope = "values",
) {
  if (scope === "all") {
    return "PivotTable output";
  }

  return scope === "labels" ? "PivotTable labels" : "PivotTable values";
}
