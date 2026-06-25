"use client";

import { PivotTableCalculatedFieldsControl } from "@/features/spreadsheet/components/pivot-table-calculated-fields-control";
import { PivotTableCalculatedItemsControl } from "@/features/spreadsheet/components/pivot-table-calculated-items-control";
import { PivotTableFieldDropBuilder } from "@/features/spreadsheet/components/pivot-table-field-drop-builder";
import {
  getDefaultPivotAggregation,
  pivotAggregationOptions,
} from "@/features/spreadsheet/components/pivot-table-field-control-utils";
import type { PivotTableLayoutUpdate } from "@/features/spreadsheet/components/pivot-table-layout-types";
import { PivotTableGroupingControl } from "@/features/spreadsheet/components/pivot-table-grouping-control";
import { PivotTableMeasuresControl } from "@/features/spreadsheet/components/pivot-table-measures-control";
import type {
  PivotField,
  PivotSourceModel,
} from "@/features/spreadsheet/pivot/pivot-types";
import type {
  PivotTableAggregation,
  PivotTableDefinition,
  PivotTableFieldGroupingMode,
} from "@/features/workbooks/types";

export function PivotTableFieldControls({
  disabled,
  fields,
  pivotTable,
  source,
  onUpdateLayout,
}: {
  disabled?: boolean;
  fields: PivotField[];
  pivotTable: PivotTableDefinition;
  source: PivotSourceModel;
  onUpdateLayout: (updates: PivotTableLayoutUpdate) => void;
}) {
  const fieldIds = new Set(fields.map((field) => field.id));
  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  const primaryRowFieldId = pivotTable.rowFieldIds.find((fieldId) =>
    fieldIds.has(fieldId),
  );
  const secondaryRowFieldId = pivotTable.rowFieldIds.find(
    (fieldId) => fieldId !== primaryRowFieldId && fieldIds.has(fieldId),
  );
  const columnFieldId = pivotTable.columnFieldIds.find((fieldId) =>
    fieldIds.has(fieldId),
  );
  const valueField =
    pivotTable.valueFields.find((field) => fieldIds.has(field.fieldId)) ??
    (fields[0]
      ? {
          aggregation: getDefaultPivotAggregation(fields[0]),
          fieldId: fields[0].id,
          label: fields[0].name,
        }
      : null);

  function updateGrouping(
    fieldId: string,
    mode: PivotTableFieldGroupingMode | "",
  ) {
    onUpdateLayout({
      fieldGroupings: [
        ...(pivotTable.fieldGroupings ?? []).filter(
          (grouping) => grouping.fieldId !== fieldId,
        ),
        ...(mode ? [{ fieldId, mode }] : []),
      ],
    });
  }

  return (
    <div className="space-y-2 rounded-md border bg-background p-2">
      <PivotTableFieldDropBuilder
        disabled={disabled}
        fields={fields}
        pivotTable={pivotTable}
        onUpdateLayout={onUpdateLayout}
      />
      <label className="block text-xs font-medium">
        Rows
        <select
          value={primaryRowFieldId ?? ""}
          disabled={disabled}
          aria-label={`${pivotTable.name} primary row field`}
          className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) =>
            onUpdateLayout({
              rowFieldIds: [
                event.target.value,
                secondaryRowFieldId === event.target.value
                  ? ""
                  : (secondaryRowFieldId ?? ""),
              ].filter(Boolean),
            })
          }
        >
          <option value="">None</option>
          {fields.map((field) => (
            <option key={field.id} value={field.id}>
              {field.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium">
        Secondary row
        <select
          value={secondaryRowFieldId ?? ""}
          disabled={disabled}
          aria-label={`${pivotTable.name} secondary row field`}
          className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) =>
            onUpdateLayout({
              rowFieldIds: [
                primaryRowFieldId ?? "",
                event.target.value === primaryRowFieldId ? "" : event.target.value,
              ].filter(Boolean),
            })
          }
        >
          <option value="">None</option>
          {fields.map((field) => (
            <option key={field.id} value={field.id}>
              {field.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium">
        Columns
        <select
          value={columnFieldId ?? ""}
          disabled={disabled}
          aria-label={`${pivotTable.name} column field`}
          className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) =>
            onUpdateLayout({
              columnFieldIds: event.target.value ? [event.target.value] : [],
            })
          }
        >
          <option value="">None</option>
          {fields.map((field) => (
            <option key={field.id} value={field.id}>
              {field.name}
            </option>
          ))}
        </select>
      </label>
      <PivotTableGroupingControl
        disabled={disabled}
        field={fieldsById.get(primaryRowFieldId ?? "")}
        label="Primary row grouping"
        pivotTable={pivotTable}
        onChange={updateGrouping}
      />
      <PivotTableGroupingControl
        disabled={disabled}
        field={fieldsById.get(secondaryRowFieldId ?? "")}
        label="Secondary row grouping"
        pivotTable={pivotTable}
        onChange={updateGrouping}
      />
      <PivotTableGroupingControl
        disabled={disabled}
        field={fieldsById.get(columnFieldId ?? "")}
        label="Column grouping"
        pivotTable={pivotTable}
        onChange={updateGrouping}
      />
      <PivotTableCalculatedFieldsControl
        disabled={disabled}
        fields={fields}
        pivotTable={pivotTable}
        onUpdateLayout={onUpdateLayout}
      />
      <PivotTableCalculatedItemsControl
        disabled={disabled}
        pivotTable={pivotTable}
        source={source}
        onUpdateLayout={onUpdateLayout}
      />
      <PivotTableMeasuresControl
        disabled={disabled}
        pivotTable={pivotTable}
        onUpdateLayout={onUpdateLayout}
      />
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <label className="block text-xs font-medium">
          Values
          <select
            value={valueField?.fieldId ?? ""}
            disabled={disabled || !valueField}
            aria-label={`${pivotTable.name} value field`}
            className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => {
              const field = fields.find((item) => item.id === event.target.value);

              if (field) {
                onUpdateLayout({
                  valueField: {
                    aggregation: getDefaultPivotAggregation(field),
                    fieldId: field.id,
                  },
                });
              }
            }}
          >
            {fields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium">
          Agg
          <select
            value={valueField?.aggregation ?? "sum"}
            disabled={disabled || !valueField}
            aria-label={`${pivotTable.name} value aggregation`}
            className="mt-1 h-8 w-24 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => {
              if (!valueField) {
                return;
              }

              onUpdateLayout({
                valueField: {
                  aggregation: event.target.value as PivotTableAggregation,
                  fieldId: valueField.fieldId,
                },
              });
            }}
          >
            {pivotAggregationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
