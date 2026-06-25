import type { CellRange } from "@/features/spreadsheet/state/selection-state";
import {
  getPivotConditionalFormatRange,
} from "@/features/spreadsheet/pivot/pivot-conditional-formatting";
import type {
  ConditionalFormatOperator,
  ConditionalFormatRule,
  ConditionalFormatStyle,
  DataValidationErrorStyle,
  DataValidationListSource,
  DataValidationRuleType,
  PivotTableConditionalFormatScope,
  WorkbookDocument,
} from "@/features/workbooks/types";

export type ConditionalFormatInput = {
  operator: ConditionalFormatOperator;
  value: string;
  style: ConditionalFormatStyle;
};

export type ConditionalFormatVisualOptionsUpdate = {
  foreground?: string;
  scale?: NonNullable<ConditionalFormatStyle["scale"]>;
};

function clampVisualThreshold(value: number, fallback: number) {
  return Number.isFinite(value)
    ? Math.min(Math.max(Math.round(value), 0), 100)
    : fallback;
}

function normalizeVisualScaleUpdate(
  scale: NonNullable<ConditionalFormatStyle["scale"]>,
) {
  const low = clampVisualThreshold(scale.thresholds?.low ?? 0, 0);
  const high = clampVisualThreshold(scale.thresholds?.high ?? 100, 100);

  return {
    minColor: scale.minColor,
    maxColor: scale.maxColor,
    thresholds: scale.thresholds
      ? {
          low: Math.min(low, high),
          high: Math.max(low, high),
        }
      : undefined,
  };
}

export type DataValidationInput = {
  type: DataValidationRuleType;
  value: string;
  listSource?: DataValidationListSource;
  dependentCell?: string;
  inputMessage?: string;
  errorMessage?: string;
  showInputMessage?: boolean;
  showErrorAlert?: boolean;
  errorStyle?: DataValidationErrorStyle;
  ignoreBlank?: boolean;
  circleInvalid?: boolean;
};

export function addConditionalFormatToDocument(
  document: WorkbookDocument,
  range: CellRange,
  rule: ConditionalFormatInput,
) {
  document.conditionalFormats ??= [];
  document.conditionalFormats.push({
    id: `condition_${crypto.randomUUID()}`,
    sheetId: document.activeSheetId,
    range,
    operator: rule.operator,
    value: rule.value,
    style: rule.style,
  });
}

export function addPivotTableConditionalFormatToDocument(
  document: WorkbookDocument,
  pivotTableId: string,
  rule: ConditionalFormatInput,
  scope: PivotTableConditionalFormatScope = "values",
) {
  const pivotTable = (document.pivotTables ?? []).find(
    (item) => item.id === pivotTableId && item.sheetId === document.activeSheetId,
  );

  if (!pivotTable) {
    return "PivotTable was not found on this sheet.";
  }

  document.conditionalFormats ??= [];
  document.conditionalFormats.push({
    id: `condition_${crypto.randomUUID()}`,
    sheetId: pivotTable.sheetId,
    range: getPivotConditionalFormatRange(pivotTable, scope),
    operator: rule.operator,
    value: rule.value,
    style: rule.style,
    sourcePivotTableId: pivotTable.id,
    pivotTableScope: scope,
  });

  return null;
}

export function deleteConditionalFormatFromDocument(
  document: WorkbookDocument,
  ruleId: string,
) {
  document.conditionalFormats = (document.conditionalFormats ?? []).filter(
    (rule) => rule.id !== ruleId,
  );
}

export function duplicateConditionalFormatInDocument(
  document: WorkbookDocument,
  ruleId: string,
) {
  const rules = document.conditionalFormats ?? [];
  const sourceIndex = rules.findIndex(
    (rule) => rule.id === ruleId && rule.sheetId === document.activeSheetId,
  );
  const sourceRule = rules[sourceIndex];

  if (!sourceRule) {
    return false;
  }

  rules.splice(sourceIndex + 1, 0, {
    ...sourceRule,
    id: `condition_${crypto.randomUUID()}`,
    style: {
      ...sourceRule.style,
      scale: sourceRule.style.scale
        ? {
            ...sourceRule.style.scale,
            thresholds: sourceRule.style.scale.thresholds
              ? { ...sourceRule.style.scale.thresholds }
              : undefined,
          }
        : undefined,
    },
  });

  return true;
}

export function resizeConditionalFormatInDocument(
  document: WorkbookDocument,
  ruleId: string,
  range: CellRange,
) {
  const rule = (document.conditionalFormats ?? []).find(
    (item) => item.id === ruleId && item.sheetId === document.activeSheetId,
  );

  if (rule) {
    rule.range = range;
    delete rule.sourcePivotTableId;
    delete rule.pivotTableScope;
  }
}

export function updateConditionalFormatVisualOptionsInDocument(
  document: WorkbookDocument,
  ruleId: string,
  updates: ConditionalFormatVisualOptionsUpdate,
) {
  const rule = (document.conditionalFormats ?? []).find(
    (item) => item.id === ruleId && item.sheetId === document.activeSheetId,
  );

  if (!rule || (rule.operator !== "dataBar" && rule.operator !== "iconSet")) {
    return false;
  }

  rule.style = {
    ...rule.style,
    foreground: updates.foreground ?? rule.style.foreground,
    scale: updates.scale ? normalizeVisualScaleUpdate(updates.scale) : rule.style.scale,
  };

  return true;
}

export function syncPivotTableConditionalFormatsInDocument(
  document: WorkbookDocument,
  pivotTableId: string,
) {
  const pivotTable = (document.pivotTables ?? []).find(
    (item) => item.id === pivotTableId,
  );

  if (!pivotTable) {
    return;
  }

  for (const rule of document.conditionalFormats ?? []) {
    if (rule.sourcePivotTableId !== pivotTable.id) {
      continue;
    }

    rule.sheetId = pivotTable.sheetId;
    rule.range = getPivotConditionalFormatRange(
      pivotTable,
      rule.pivotTableScope ?? "values",
    );
  }
}

export function moveConditionalFormatInDocument(
  document: WorkbookDocument,
  ruleId: string,
  direction: "up" | "down" | "top" | "bottom",
) {
  const rules = document.conditionalFormats ?? [];
  const sourceIndex = rules.findIndex((rule) => rule.id === ruleId);
  const sourceRule = rules[sourceIndex];

  if (!sourceRule) {
    return;
  }

  const sheetRuleIndexes = rules.flatMap((rule, index) =>
    rule.sheetId === sourceRule.sheetId ? [index] : [],
  );
  const position = sheetRuleIndexes.indexOf(sourceIndex);
  const targetPosition =
    direction === "top"
      ? 0
      : direction === "bottom"
        ? sheetRuleIndexes.length - 1
        : direction === "up"
          ? position - 1
          : position + 1;
  const targetIndex = sheetRuleIndexes[targetPosition];

  if (targetIndex === undefined || targetIndex === sourceIndex) {
    return;
  }

  const [rule] = rules.splice(sourceIndex, 1);

  if (!rule) {
    return;
  }

  const remainingSheetRuleIndexes = rules.flatMap((item, index) =>
    item.sheetId === sourceRule.sheetId ? [index] : [],
  );
  const nextTargetIndex =
    targetPosition <= 0
      ? (remainingSheetRuleIndexes[0] ?? rules.length)
      : targetPosition >= sheetRuleIndexes.length - 1
        ? (remainingSheetRuleIndexes[remainingSheetRuleIndexes.length - 1] ??
            rules.length - 1) + 1
        : (remainingSheetRuleIndexes[targetPosition] ?? rules.length);

  rules.splice(nextTargetIndex, 0, rule as ConditionalFormatRule);
}

export function addDataValidationToDocument(
  document: WorkbookDocument,
  range: CellRange,
  rule: DataValidationInput,
) {
  document.dataValidations ??= [];
  document.dataValidations.push({
    id: `validation_${crypto.randomUUID()}`,
    sheetId: document.activeSheetId,
    range,
    type: rule.type,
    value: rule.value,
    listSource: rule.listSource,
    dependentCell: rule.dependentCell,
    inputMessage: rule.inputMessage,
    errorMessage: rule.errorMessage,
    showInputMessage: rule.showInputMessage,
    showErrorAlert: rule.showErrorAlert,
    errorStyle: rule.errorStyle,
    ignoreBlank: rule.ignoreBlank,
    circleInvalid: rule.circleInvalid,
  });
}

export function deleteDataValidationFromDocument(
  document: WorkbookDocument,
  ruleId: string,
) {
  document.dataValidations = (document.dataValidations ?? []).filter(
    (rule) => rule.id !== ruleId,
  );
}

export function resizeDataValidationInDocument(
  document: WorkbookDocument,
  ruleId: string,
  range: CellRange,
) {
  const rule = (document.dataValidations ?? []).find(
    (item) => item.id === ruleId && item.sheetId === document.activeSheetId,
  );

  if (rule) {
    rule.range = range;
  }
}
