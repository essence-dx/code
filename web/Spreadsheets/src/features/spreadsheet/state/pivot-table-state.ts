import { cellKey } from "@/features/workbooks/addresses";
import {
  createDataModelPivotSourceModel,
  createDataModelTableSourceModel,
} from "@/features/spreadsheet/data-model";
import { applyPivotCalculatedFields } from "@/features/spreadsheet/pivot/pivot-calculated-fields";
import { createPivotDrillDownSheet } from "@/features/spreadsheet/pivot/pivot-drilldown";
import { createPivotFieldListState } from "@/features/spreadsheet/pivot/pivot-layout";
import { createPivotSourceModel } from "@/features/spreadsheet/pivot/pivot-source";
import { renderPivotTableToSheet } from "@/features/spreadsheet/pivot/pivot-output";
import { getActiveSheet } from "@/features/spreadsheet/state/document-state";
import { syncPivotTableConditionalFormatsInDocument } from "@/features/spreadsheet/state/rule-state";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";
import type {
  ChartDefinition,
  ChartRange,
  PivotTableAggregation,
  PivotTableCalculatedField,
  PivotTableCalculatedFieldOperator,
  PivotTableCalculatedItem,
  PivotTableDefinition,
  PivotTableFieldGrouping,
  PivotTableFieldGroupingMode,
  PivotTableMeasure,
  PivotTableTimelineFilter,
  PivotTableValueField,
  SheetData,
  TableTimelineMode,
  TableDefinition,
  WorkbookDocument,
} from "@/features/workbooks/types";

type PivotTableSourcePlan =
  | { error: string }
  | {
      error: null;
      layout: ReturnType<typeof createPivotFieldListState>;
      outputAnchor: {
        columnIndex: number;
        rowIndex: number;
      };
      sheet: SheetData;
      sourceRange: ChartRange;
      sourceTable?: TableDefinition;
    };

export type PivotTableLayoutUpdate = {
  calculatedFields?: PivotTableCalculatedField[];
  calculatedItems?: PivotTableCalculatedItem[];
  columnFieldIds?: string[];
  fieldGroupings?: PivotTableFieldGrouping[];
  filterFieldIds?: string[];
  filterSelections?: Record<string, string[]>;
  measures?: PivotTableMeasure[];
  rowFieldIds?: string[];
  timelineFilters?: PivotTableTimelineFilter[];
  valueField?: {
    aggregation: PivotTableAggregation;
    fieldId: string;
  };
  valueFields?: PivotTableValueField[];
};

const PIVOT_CALCULATED_FIELD_OPERATORS = new Set<PivotTableCalculatedFieldOperator>([
  "add",
  "subtract",
  "multiply",
  "divide",
]);
const PIVOT_TABLE_AGGREGATIONS = new Set<PivotTableAggregation>([
  "sum",
  "count",
  "average",
  "min",
  "max",
]);
const PIVOT_GROUPING_MODES = new Set<PivotTableFieldGroupingMode>([
  "dateYear",
  "dateQuarter",
  "dateMonth",
  "numberBucket10",
  "numberBucket100",
]);
const PIVOT_TIMELINE_MODES = new Set<TableTimelineMode>([
  "year",
  "quarter",
  "month",
]);

function isRangeInside(container: ChartRange, range: ChartRange) {
  return (
    range.startRowIndex >= container.startRowIndex &&
    range.endRowIndex <= container.endRowIndex &&
    range.startColumnIndex >= container.startColumnIndex &&
    range.endColumnIndex <= container.endColumnIndex
  );
}

function findSourceTable(
  tables: TableDefinition[],
  sheetId: string,
  range: ChartRange,
) {
  return tables
    .filter((table) => table.sheetId === sheetId)
    .filter((table) => isRangeInside(table.range, range))
    .sort((left, right) => {
      const leftArea =
        (left.range.endRowIndex - left.range.startRowIndex + 1) *
        (left.range.endColumnIndex - left.range.startColumnIndex + 1);
      const rightArea =
        (right.range.endRowIndex - right.range.startRowIndex + 1) *
        (right.range.endColumnIndex - right.range.startColumnIndex + 1);

      return leftArea - rightArea;
    })[0];
}

function createPivotName(document: WorkbookDocument) {
  const names = new Set(
    (document.pivotTables ?? []).map((table) => table.name.toLowerCase()),
  );
  let index = (document.pivotTables ?? []).length + 1;
  let name = `PivotTable_${index}`;

  while (names.has(name.toLowerCase())) {
    index += 1;
    name = `PivotTable_${index}`;
  }

  return name;
}

function createOutputAnchor(sheet: SheetData, range: ChartRange) {
  const rightColumnIndex = range.endColumnIndex + 2;

  if (rightColumnIndex < sheet.columnCount) {
    return {
      rowIndex: range.startRowIndex,
      columnIndex: rightColumnIndex,
    };
  }

  const belowRowIndex = range.endRowIndex + 2;

  if (belowRowIndex < sheet.rowCount) {
    return {
      rowIndex: belowRowIndex,
      columnIndex: range.startColumnIndex,
    };
  }

  return null;
}

function createInitialOutputRange(
  rowIndex: number,
  columnIndex: number,
): ChartRange {
  return {
    startRowIndex: rowIndex,
    startColumnIndex: columnIndex,
    endRowIndex: rowIndex,
    endColumnIndex: columnIndex,
  };
}

function syncPivotChartRanges(
  document: WorkbookDocument,
  pivotTable: PivotTableDefinition,
) {
  document.charts = (document.charts ?? []).map((chart) =>
    chart.sourcePivotTableId === pivotTable.id
      ? {
          ...chart,
          sheetId: pivotTable.sheetId,
          range: pivotTable.outputRange,
        }
      : chart,
  );
}

function isUsableSourceRange(range: ChartRange) {
  return (
    range.endRowIndex > range.startRowIndex &&
    range.endColumnIndex >= range.startColumnIndex
  );
}

function createValueField(
  fieldName: string,
  fieldId: string,
  aggregation: PivotTableAggregation,
): PivotTableValueField {
  return {
    aggregation,
    fieldId,
    label: `${aggregation} of ${fieldName}`,
  };
}

function createValueFieldKey(field: PivotTableValueField) {
  return `${field.fieldId}\u001f${field.aggregation}`;
}

function normalizeValueFields({
  fieldsById,
  valueFields,
}: {
  fieldsById: Map<string, { id: string; name: string }>;
  valueFields: PivotTableValueField[];
}) {
  const usedKeys = new Set<string>();
  const usedLabels = new Set<string>();

  return valueFields
    .flatMap((field) => {
      const sourceField = fieldsById.get(field.fieldId);
      const key = createValueFieldKey(field);

      if (
        !sourceField ||
        usedKeys.has(key) ||
        !PIVOT_TABLE_AGGREGATIONS.has(field.aggregation)
      ) {
        return [];
      }

      usedKeys.add(key);
      const defaultLabel = `${field.aggregation} of ${sourceField.name}`;
      const baseLabel = field.label.trim().replace(/\s+/g, " ").slice(0, 120) ||
        defaultLabel;
      let label = baseLabel;
      let suffix = 2;

      while (usedLabels.has(label.toLowerCase())) {
        const suffixText = ` ${suffix}`;

        label = `${baseLabel.slice(0, 120 - suffixText.length)}${suffixText}`;
        suffix += 1;
      }

      usedLabels.add(label.toLowerCase());
      return [
        {
          aggregation: field.aggregation,
          fieldId: sourceField.id,
          label,
        },
      ];
    })
    .slice(0, 8);
}

function normalizeFieldIdList(fieldIds: string[] | undefined, validIds: Set<string>) {
  if (!fieldIds) {
    return undefined;
  }

  const seenIds = new Set<string>();

  return fieldIds
    .filter((fieldId) => {
      if (!validIds.has(fieldId) || seenIds.has(fieldId)) {
        return false;
      }

      seenIds.add(fieldId);
      return true;
    })
    .slice(0, 8);
}

function normalizeFilterSelections({
  filterFieldIds,
  filterSelections,
  validIds,
}: {
  filterFieldIds: string[];
  filterSelections: Record<string, string[]>;
  validIds: Set<string>;
}) {
  const activeFilterFields = new Set(filterFieldIds);

  return Object.entries(filterSelections).reduce<Record<string, string[]>>(
    (items, [fieldId, selectedValues]) => {
      if (!validIds.has(fieldId) || !activeFilterFields.has(fieldId)) {
        return items;
      }

      items[fieldId] = selectedValues
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim().slice(0, 500))
        .filter(Boolean)
        .slice(0, 250);
      return items;
    },
    {},
  );
}

function normalizeFieldGroupings({
  fieldGroupings,
  validIds,
}: {
  fieldGroupings: PivotTableFieldGrouping[];
  validIds: Set<string>;
}) {
  const seenIds = new Set<string>();

  return fieldGroupings
    .filter((grouping) => {
      if (
        !validIds.has(grouping.fieldId) ||
        !PIVOT_GROUPING_MODES.has(grouping.mode) ||
        seenIds.has(grouping.fieldId)
      ) {
        return false;
      }

      seenIds.add(grouping.fieldId);
      return true;
    })
    .slice(0, 8);
}

function normalizeTimelineFilters({
  timelineFilters,
  validIds,
}: {
  timelineFilters: PivotTableTimelineFilter[];
  validIds: Set<string>;
}) {
  const seenIds = new Set<string>();

  return timelineFilters
    .filter((timeline) => {
      if (
        !validIds.has(timeline.fieldId) ||
        !PIVOT_TIMELINE_MODES.has(timeline.mode) ||
        seenIds.has(timeline.fieldId)
      ) {
        return false;
      }

      seenIds.add(timeline.fieldId);
      return true;
    })
    .map((timeline) => ({
      fieldId: timeline.fieldId,
      mode: timeline.mode,
      selectedPeriods: Array.from(
        new Set(
          timeline.selectedPeriods
            .filter((period): period is string => typeof period === "string")
            .map((period) => period.trim().slice(0, 24))
            .filter(Boolean),
        ),
      ).slice(0, 120),
    }))
    .slice(0, 4);
}

function normalizeCalculatedFieldName(
  rawName: string,
  index: number,
  usedNames: Set<string>,
) {
  const baseName = rawName.trim().replace(/\s+/g, " ").slice(0, 80) ||
    `Calculated Field ${index + 1}`;
  let name = baseName;
  let suffix = 2;

  while (usedNames.has(name.toLowerCase())) {
    const suffixText = ` ${suffix}`;

    name = `${baseName.slice(0, 80 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }

  usedNames.add(name.toLowerCase());
  return name;
}

function normalizeCalculatedFields({
  calculatedFields,
  sourceFieldIds,
}: {
  calculatedFields: PivotTableCalculatedField[];
  sourceFieldIds: Set<string>;
}) {
  const usedIds = new Set<string>();
  const usedNames = new Set<string>();

  return calculatedFields
    .flatMap((field, index) => {
      const id = field.id.trim().slice(0, 80);

      if (
        !id ||
        usedIds.has(id) ||
        !sourceFieldIds.has(field.leftFieldId) ||
        !sourceFieldIds.has(field.rightFieldId) ||
        !PIVOT_CALCULATED_FIELD_OPERATORS.has(field.operator)
      ) {
        return [];
      }

      usedIds.add(id);
      return [
        {
          id,
          name: normalizeCalculatedFieldName(field.name, index, usedNames),
          leftFieldId: field.leftFieldId,
          operator: field.operator,
          rightFieldId: field.rightFieldId,
        },
      ];
    })
    .slice(0, 8);
}

function normalizeCalculatedItems({
  calculatedItems,
  validIds,
}: {
  calculatedItems: PivotTableCalculatedItem[];
  validIds: Set<string>;
}) {
  const usedIds = new Set<string>();
  const usedNames = new Set<string>();

  return calculatedItems
    .flatMap((item, index) => {
      const id = item.id.trim().slice(0, 80);
      const fieldId = item.fieldId.trim().slice(0, 80);
      const leftItem = item.leftItem.trim().slice(0, 500);
      const rightItem = item.rightItem.trim().slice(0, 500);

      if (
        !id ||
        usedIds.has(id) ||
        !validIds.has(fieldId) ||
        !leftItem ||
        !rightItem ||
        !PIVOT_CALCULATED_FIELD_OPERATORS.has(item.operator)
      ) {
        return [];
      }

      usedIds.add(id);
      return [
        {
          id,
          fieldId,
          leftItem,
          operator: item.operator,
          rightItem,
          name: normalizeCalculatedFieldName(item.name, index, usedNames),
        },
      ];
    })
    .slice(0, 8);
}

function normalizeMeasureName(
  rawName: string,
  index: number,
  usedNames: Set<string>,
) {
  const baseName = rawName.trim().replace(/\s+/g, " ").slice(0, 80) ||
    `Measure ${index + 1}`;
  let name = baseName;
  let suffix = 2;

  while (usedNames.has(name.toLowerCase())) {
    const suffixText = ` ${suffix}`;

    name = `${baseName.slice(0, 80 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }

  usedNames.add(name.toLowerCase());
  return name;
}

function normalizeMeasures({
  measures,
  valueLabels,
}: {
  measures: PivotTableMeasure[];
  valueLabels: Set<string>;
}) {
  const usedIds = new Set<string>();
  const usedNames = new Set(valueLabels);

  return measures
    .flatMap((measure, index) => {
      const id = measure.id.trim().slice(0, 80);
      const leftValueLabel = measure.leftValueLabel.trim().slice(0, 120);
      const rightValueLabel = measure.rightValueLabel.trim().slice(0, 120);

      if (
        !id ||
        usedIds.has(id) ||
        !valueLabels.has(leftValueLabel) ||
        !valueLabels.has(rightValueLabel) ||
        !PIVOT_CALCULATED_FIELD_OPERATORS.has(measure.operator)
      ) {
        return [];
      }

      usedIds.add(id);
      return [
        {
          id,
          name: normalizeMeasureName(measure.name, index, usedNames),
          leftValueLabel,
          operator: measure.operator,
          rightValueLabel,
        },
      ];
    })
    .slice(0, 8);
}

function getPivotTableSourcePlan({
  computedValues,
  document,
  selectedRange,
}: {
  computedValues: Record<string, string>;
  document: WorkbookDocument;
  selectedRange: CellRange;
}): PivotTableSourcePlan {
  const sheet = getActiveSheet(document);
  const sourceTable = findSourceTable(
    document.tables ?? [],
    document.activeSheetId,
    selectedRange,
  );
  const sourceRange = sourceTable?.range ?? selectedRange;

  if (!isUsableSourceRange(sourceRange)) {
    return {
      error: "Select a header row and at least one data row before creating a PivotTable.",
    };
  }

  const source = sourceTable
    ? createDataModelTableSourceModel({
        computedValues,
        document,
        sheet,
        table: sourceTable,
      })
    : createPivotSourceModel({
        computedValues,
        range: sourceRange,
        sheet,
      });

  if (source.fields.length === 0 || source.records.length === 0) {
    return {
      error: "The selected PivotTable source does not have usable headers and data rows.",
    };
  }

  const layout = createPivotFieldListState(source);

  if (layout.valueFields.length === 0) {
    return {
      error: "The selected PivotTable source needs at least one value field.",
    };
  }

  const outputAnchor = createOutputAnchor(sheet, sourceRange);

  if (!outputAnchor) {
    return {
      error: "There is not enough sheet space beside or below this source range.",
    };
  }

  return {
    error: null,
    layout,
    outputAnchor,
    sheet,
    sourceRange,
    sourceTable,
  };
}

export function getPivotTableCreateError(input: {
  computedValues: Record<string, string>;
  document: WorkbookDocument;
  selectedRange: CellRange;
}) {
  return getPivotTableSourcePlan(input).error ?? null;
}

export function addPivotTableToDocument({
  computedValues,
  document,
  selectedRange,
}: {
  computedValues: Record<string, string>;
  document: WorkbookDocument;
  selectedRange: CellRange;
}) {
  const plan = getPivotTableSourcePlan({
    computedValues,
    document,
    selectedRange,
  });

  if (plan.error !== null) {
    return plan.error;
  }

  const now = new Date().toISOString();
  const pivotTable: PivotTableDefinition = {
    id: `pivot_${crypto.randomUUID()}`,
    sheetId: document.activeSheetId,
    name: createPivotName(document),
    sourceRange: plan.sourceRange,
    ...(plan.sourceTable ? { sourceTableId: plan.sourceTable.id } : {}),
    outputRange: createInitialOutputRange(
      plan.outputAnchor.rowIndex,
      plan.outputAnchor.columnIndex,
    ),
    rowFieldIds: plan.layout.rowFieldIds,
    columnFieldIds: plan.layout.columnFieldIds,
    filterFieldIds: [],
    filterSelections: {},
    calculatedFields: [],
    calculatedItems: [],
    measures: [],
    fieldGroupings: [],
    timelineFilters: [],
    valueFields: plan.layout.valueFields.map((field) => ({ ...field })),
    createdAt: now,
    updatedAt: now,
  };

  pivotTable.outputRange = renderPivotTableToSheet({
    computedValues,
    document,
    pivotTable,
    sheet: plan.sheet,
  });
  document.pivotTables ??= [];
  document.pivotTables.push(pivotTable);

  return null;
}

export function refreshPivotTableInDocument({
  computedValues,
  document,
  pivotTableId,
}: {
  computedValues: Record<string, string>;
  document: WorkbookDocument;
  pivotTableId: string;
}) {
  const sheet = getActiveSheet(document);
  const pivotTable = (document.pivotTables ?? []).find(
    (item) => item.id === pivotTableId && item.sheetId === document.activeSheetId,
  );

  if (!pivotTable) {
    return "PivotTable was not found on this sheet.";
  }

  const sourceTable = pivotTable.sourceTableId
    ? (document.tables ?? []).find((table) => table.id === pivotTable.sourceTableId)
    : null;

  if (sourceTable) {
    pivotTable.sourceRange = sourceTable.range;
  }

  pivotTable.outputRange = renderPivotTableToSheet({
    computedValues,
    document,
    pivotTable,
    sheet,
  });
  pivotTable.updatedAt = new Date().toISOString();
  syncPivotChartRanges(document, pivotTable);
  syncPivotTableConditionalFormatsInDocument(document, pivotTable.id);

  return null;
}

function getSheetById(document: WorkbookDocument, sheetId: string) {
  return document.sheets.find((sheet) => sheet.id === sheetId) ?? null;
}

export function refreshPivotTablesForTableControlsInDocument({
  computedValues,
  document,
  tableId,
}: {
  computedValues: Record<string, string>;
  document: WorkbookDocument;
  tableId: string;
}) {
  const attachedPivotTables = (document.pivotTables ?? []).filter(
    (pivotTable) => pivotTable.sourceTableId === tableId,
  );

  for (const pivotTable of attachedPivotTables) {
    const sheet = getSheetById(document, pivotTable.sheetId);
    const sourceTable = (document.tables ?? []).find(
      (table) => table.id === pivotTable.sourceTableId,
    );

    if (!sheet) {
      continue;
    }

    if (sourceTable) {
      pivotTable.sourceRange = sourceTable.range;
    }

    pivotTable.outputRange = renderPivotTableToSheet({
      computedValues,
      document,
      pivotTable,
      sheet,
    });
    pivotTable.updatedAt = new Date().toISOString();
    syncPivotChartRanges(document, pivotTable);
    syncPivotTableConditionalFormatsInDocument(document, pivotTable.id);
  }

  return attachedPivotTables.length;
}

export function updatePivotTableLayoutInDocument({
  computedValues,
  document,
  pivotTableId,
  updates,
}: {
  computedValues: Record<string, string>;
  document: WorkbookDocument;
  pivotTableId: string;
  updates: PivotTableLayoutUpdate;
}) {
  const sheet = getActiveSheet(document);
  const pivotTable = (document.pivotTables ?? []).find(
    (item) => item.id === pivotTableId && item.sheetId === document.activeSheetId,
  );

  if (!pivotTable) {
    return "PivotTable was not found on this sheet.";
  }

  const sourceTable = pivotTable.sourceTableId
    ? (document.tables ?? []).find((table) => table.id === pivotTable.sourceTableId)
    : null;

  if (sourceTable) {
    pivotTable.sourceRange = sourceTable.range;
  }

  const rawSource = createDataModelPivotSourceModel({
    computedValues,
    document,
    pivotTable,
    sheet,
  });
  const sourceFieldIds = new Set(rawSource.fields.map((field) => field.id));

  pivotTable.calculatedFields = normalizeCalculatedFields({
    calculatedFields: updates.calculatedFields ?? (pivotTable.calculatedFields ?? []),
    sourceFieldIds,
  });

  const source = applyPivotCalculatedFields(
    rawSource,
    pivotTable.calculatedFields,
  );
  const fieldsById = new Map(source.fields.map((field) => [field.id, field]));
  const validIds = new Set(fieldsById.keys());
  const dateFieldIds = new Set(
    source.fields
      .filter((field) => field.valueType === "date")
      .map((field) => field.id),
  );

  pivotTable.rowFieldIds =
    normalizeFieldIdList(updates.rowFieldIds, validIds) ??
    pivotTable.rowFieldIds.filter((fieldId) => validIds.has(fieldId));
  pivotTable.columnFieldIds =
    normalizeFieldIdList(updates.columnFieldIds, validIds) ??
    pivotTable.columnFieldIds.filter((fieldId) => validIds.has(fieldId));
  pivotTable.filterFieldIds =
    normalizeFieldIdList(updates.filterFieldIds, validIds) ??
    pivotTable.filterFieldIds.filter((fieldId) => validIds.has(fieldId));
  pivotTable.filterSelections = normalizeFilterSelections({
    filterFieldIds: pivotTable.filterFieldIds,
    filterSelections: updates.filterSelections ?? pivotTable.filterSelections,
    validIds,
  });
  pivotTable.timelineFilters = normalizeTimelineFilters({
    timelineFilters: updates.timelineFilters ?? (pivotTable.timelineFilters ?? []),
    validIds: dateFieldIds,
  });
  pivotTable.fieldGroupings = normalizeFieldGroupings({
    fieldGroupings: updates.fieldGroupings ?? (pivotTable.fieldGroupings ?? []),
    validIds: new Set([
      ...pivotTable.rowFieldIds,
      ...pivotTable.columnFieldIds,
    ]),
  });
  pivotTable.calculatedItems = normalizeCalculatedItems({
    calculatedItems: updates.calculatedItems ?? (pivotTable.calculatedItems ?? []),
    validIds: new Set([
      ...pivotTable.rowFieldIds,
      ...pivotTable.columnFieldIds,
    ]),
  });

  if (updates.valueFields) {
    pivotTable.valueFields = normalizeValueFields({
      fieldsById,
      valueFields: updates.valueFields,
    });
  } else if (updates.valueField) {
    const field = fieldsById.get(updates.valueField.fieldId);

    if (!field) {
      return "Selected PivotTable value field no longer exists.";
    }

    pivotTable.valueFields = [
      createValueField(
        field.name,
        updates.valueField.fieldId,
        updates.valueField.aggregation,
      ),
    ];
  } else {
    pivotTable.valueFields = normalizeValueFields({
      fieldsById,
      valueFields: pivotTable.valueFields,
    });
  }

  if (pivotTable.valueFields.length === 0) {
    const fallback = createPivotFieldListState(source).valueFields[0];

    if (!fallback) {
      return "PivotTable source needs at least one value field.";
    }

    pivotTable.valueFields = [{ ...fallback }];
  }

  pivotTable.measures = normalizeMeasures({
    measures: updates.measures ?? (pivotTable.measures ?? []),
    valueLabels: new Set(pivotTable.valueFields.map((field) => field.label)),
  });

  pivotTable.outputRange = renderPivotTableToSheet({
    computedValues,
    document,
    pivotTable,
    sheet,
  });
  pivotTable.updatedAt = new Date().toISOString();
  syncPivotChartRanges(document, pivotTable);
  syncPivotTableConditionalFormatsInDocument(document, pivotTable.id);

  return null;
}

export function addPivotChartToDocument(
  document: WorkbookDocument,
  pivotTableId: string,
) {
  const pivotTable = (document.pivotTables ?? []).find(
    (item) => item.id === pivotTableId && item.sheetId === document.activeSheetId,
  );

  if (!pivotTable) {
    return "PivotTable was not found on this sheet.";
  }

  const existingChart = (document.charts ?? []).find(
    (chart) => chart.sourcePivotTableId === pivotTable.id,
  );

  if (existingChart) {
    existingChart.sheetId = pivotTable.sheetId;
    existingChart.range = pivotTable.outputRange;
    return null;
  }

  const chart: ChartDefinition = {
    id: `chart_${crypto.randomUUID()}`,
    sheetId: pivotTable.sheetId,
    title: `${pivotTable.name} chart`,
    type: "bar",
    range: pivotTable.outputRange,
    sourcePivotTableId: pivotTable.id,
  };

  document.charts ??= [];
  document.charts.push(chart);

  return null;
}

export function addPivotTableDrillDownSheetToDocument({
  computedValues,
  document,
  pivotTableId,
}: {
  computedValues: Record<string, string>;
  document: WorkbookDocument;
  pivotTableId: string;
}) {
  if (document.workbookProtection) {
    return "Workbook structure is protected.";
  }

  const sheet = getActiveSheet(document);
  const pivotTable = (document.pivotTables ?? []).find(
    (item) => item.id === pivotTableId && item.sheetId === document.activeSheetId,
  );

  if (!pivotTable) {
    return "PivotTable was not found on this sheet.";
  }

  const sourceTable = pivotTable.sourceTableId
    ? (document.tables ?? []).find((table) => table.id === pivotTable.sourceTableId)
    : null;

  if (sourceTable) {
    pivotTable.sourceRange = sourceTable.range;
  }

  const sourceSheet = sourceTable
    ? document.sheets.find((item) => item.id === sourceTable.sheetId) ?? sheet
    : sheet;

  const detailSheet = createPivotDrillDownSheet({
    computedValues,
    document,
    pivotTable,
    sourceSheet,
  });

  document.sheets.push(detailSheet);
  document.activeSheetId = detailSheet.id;

  return null;
}

export function deletePivotTableFromDocument(
  document: WorkbookDocument,
  pivotTableId: string,
) {
  const sheet = getActiveSheet(document);
  const pivotTable = (document.pivotTables ?? []).find(
    (item) => item.id === pivotTableId && item.sheetId === document.activeSheetId,
  );

  if (pivotTable) {
    for (
      let rowIndex = pivotTable.outputRange.startRowIndex;
      rowIndex <= pivotTable.outputRange.endRowIndex;
      rowIndex += 1
    ) {
      for (
        let columnIndex = pivotTable.outputRange.startColumnIndex;
        columnIndex <= pivotTable.outputRange.endColumnIndex;
        columnIndex += 1
      ) {
        delete sheet.cells[cellKey(rowIndex, columnIndex)];
      }
    }
  }

  document.pivotTables = (document.pivotTables ?? []).filter(
    (item) => item.id !== pivotTableId || item.sheetId !== document.activeSheetId,
  );
  document.charts = (document.charts ?? []).filter(
    (chart) => chart.sourcePivotTableId !== pivotTableId,
  );
  document.conditionalFormats = (document.conditionalFormats ?? []).filter(
    (rule) => rule.sourcePivotTableId !== pivotTableId,
  );
}
