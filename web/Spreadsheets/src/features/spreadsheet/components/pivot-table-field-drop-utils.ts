import { getDefaultPivotAggregation } from "@/features/spreadsheet/components/pivot-table-field-control-utils";
import type { PivotTableLayoutUpdate } from "@/features/spreadsheet/components/pivot-table-layout-types";
import type { PivotField } from "@/features/spreadsheet/pivot/pivot-types";
import type { PivotTableDefinition } from "@/features/workbooks/types";

export type PivotDropArea = "rows" | "columns" | "filters" | "values";

export const pivotDropAreas: Array<{
  area: PivotDropArea;
  label: string;
}> = [
  { area: "rows", label: "Rows" },
  { area: "columns", label: "Columns" },
  { area: "filters", label: "Filters" },
  { area: "values", label: "Values" },
];

function uniqueFieldIds(fieldIds: string[]) {
  return Array.from(new Set(fieldIds.filter(Boolean)));
}

function createValueField(field: PivotField) {
  const aggregation = getDefaultPivotAggregation(field);

  return {
    aggregation,
    fieldId: field.id,
    label: `${aggregation} of ${field.name}`,
  };
}

export function createPivotFieldDropUpdate({
  area,
  field,
  pivotTable,
}: {
  area: PivotDropArea;
  field: PivotField;
  pivotTable: PivotTableDefinition;
}): PivotTableLayoutUpdate {
  if (area === "rows") {
    return {
      rowFieldIds: uniqueFieldIds([
        ...pivotTable.rowFieldIds.filter((fieldId) => fieldId !== field.id),
        field.id,
      ]).slice(-2),
    };
  }

  if (area === "columns") {
    return { columnFieldIds: [field.id] };
  }

  if (area === "filters") {
    return {
      filterFieldIds: [field.id],
      filterSelections: {},
    };
  }

  return {
    valueFields: [
      ...pivotTable.valueFields.filter(
        (valueField) => valueField.fieldId !== field.id,
      ),
      createValueField(field),
    ],
  };
}

export function createPivotFieldRemoveUpdate({
  area,
  fieldId,
  pivotTable,
}: {
  area: PivotDropArea;
  fieldId: string;
  pivotTable: PivotTableDefinition;
}): PivotTableLayoutUpdate | null {
  if (area === "rows") {
    return {
      fieldGroupings: (pivotTable.fieldGroupings ?? []).filter(
        (grouping) => grouping.fieldId !== fieldId,
      ),
      rowFieldIds: pivotTable.rowFieldIds.filter((item) => item !== fieldId),
    };
  }

  if (area === "columns") {
    return {
      columnFieldIds: pivotTable.columnFieldIds.filter(
        (item) => item !== fieldId,
      ),
      fieldGroupings: (pivotTable.fieldGroupings ?? []).filter(
        (grouping) => grouping.fieldId !== fieldId,
      ),
    };
  }

  if (area === "filters") {
    const nextSelections = { ...pivotTable.filterSelections };

    delete nextSelections[fieldId];

    return {
      filterFieldIds: pivotTable.filterFieldIds.filter(
        (item) => item !== fieldId,
      ),
      filterSelections: nextSelections,
    };
  }

  return {
    valueFields: pivotTable.valueFields.filter(
      (field) => field.fieldId !== fieldId,
    ),
  };
}

export function getPivotDropAreaFieldIds({
  area,
  pivotTable,
}: {
  area: PivotDropArea;
  pivotTable: PivotTableDefinition;
}) {
  if (area === "rows") {
    return pivotTable.rowFieldIds;
  }

  if (area === "columns") {
    return pivotTable.columnFieldIds;
  }

  if (area === "filters") {
    return pivotTable.filterFieldIds;
  }

  return pivotTable.valueFields.map((field) => field.fieldId);
}
