"use client";

import { useMemo, useState } from "react";
import { GripVertical, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createPivotFieldDropUpdate,
  createPivotFieldRemoveUpdate,
  getPivotDropAreaFieldIds,
  pivotDropAreas,
  type PivotDropArea,
} from "@/features/spreadsheet/components/pivot-table-field-drop-utils";
import type { PivotTableLayoutUpdate } from "@/features/spreadsheet/components/pivot-table-layout-types";
import type { PivotField } from "@/features/spreadsheet/pivot/pivot-types";
import type { PivotTableDefinition } from "@/features/workbooks/types";

function FieldChip({
  badgeLabel,
  disabled,
  field,
  onRemove,
}: {
  badgeLabel?: string;
  disabled?: boolean;
  field: PivotField;
  onRemove?: () => void;
}) {
  return (
    <span
      draggable={!disabled}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "copyMove";
        event.dataTransfer.setData("text/plain", field.id);
      }}
      className="inline-flex max-w-full items-center gap-1 rounded-md border bg-card px-2 py-1 text-xs shadow-sm"
    >
      <GripVertical className="size-3 shrink-0 text-muted-foreground" />
      <span className="truncate">{field.name}</span>
      <Badge variant="secondary" className="ml-1 h-4 px-1 font-mono text-[10px]">
        {badgeLabel ?? field.valueType}
      </Badge>
      {onRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          className="-mr-1 size-5"
          onClick={onRemove}
        >
          <X className="size-3" />
          <span className="sr-only">Remove field</span>
        </Button>
      ) : null}
    </span>
  );
}

export function PivotTableFieldDropBuilder({
  disabled,
  fields,
  pivotTable,
  onUpdateLayout,
}: {
  disabled?: boolean;
  fields: PivotField[];
  pivotTable: PivotTableDefinition;
  onUpdateLayout: (updates: PivotTableLayoutUpdate) => void;
}) {
  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  const [query, setQuery] = useState("");
  const assignedAreasByFieldId = useMemo(() => {
    const areas = new Map<string, string[]>();

    pivotDropAreas.forEach(({ area, label }) => {
      getPivotDropAreaFieldIds({ area, pivotTable }).forEach((fieldId) => {
        areas.set(fieldId, [...(areas.get(fieldId) ?? []), label]);
      });
    });

    return areas;
  }, [pivotTable]);
  const visibleFields = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return fields
      .filter((field) =>
        normalizedQuery
          ? field.name.toLowerCase().includes(normalizedQuery) ||
            field.valueType.includes(normalizedQuery)
          : true,
      )
      .sort((left, right) => {
        const leftAssigned = assignedAreasByFieldId.has(left.id);
        const rightAssigned = assignedAreasByFieldId.has(right.id);

        if (leftAssigned !== rightAssigned) {
          return leftAssigned ? 1 : -1;
        }

        return left.name.localeCompare(right.name);
      });
  }, [assignedAreasByFieldId, fields, query]);

  function dropField(area: PivotDropArea, fieldId: string) {
    const field = fieldsById.get(fieldId);

    if (!field || disabled) {
      return;
    }

    onUpdateLayout(createPivotFieldDropUpdate({ area, field, pivotTable }));
  }

  function removeField(area: PivotDropArea, fieldId: string) {
    const update = createPivotFieldRemoveUpdate({ area, fieldId, pivotTable });

    if (update && !disabled) {
      onUpdateLayout(update);
    }
  }

  return (
    <div className="grid gap-2 rounded-md border bg-muted/20 p-2">
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-medium">Field list</h3>
          <Badge variant="outline" className="font-mono">
            {visibleFields.length}/{fields.length}
          </Badge>
        </div>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            disabled={disabled}
            placeholder="Search fields"
            aria-label={`${pivotTable.name} field search`}
            className="h-8 pl-7 text-xs"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="flex max-h-24 flex-wrap gap-1 overflow-auto rounded-md border bg-background p-2">
          {visibleFields.length > 0 ? (
            visibleFields.map((field) => (
              <FieldChip
                key={field.id}
                badgeLabel={
                  assignedAreasByFieldId.get(field.id)?.join(", ") ??
                  field.valueType
                }
                disabled={disabled}
                field={field}
              />
            ))
          ) : (
            <span className="text-xs text-muted-foreground">No matching fields</span>
          )}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {pivotDropAreas.map(({ area, label }) => {
          const areaFields = getPivotDropAreaFieldIds({ area, pivotTable })
            .map((fieldId) => fieldsById.get(fieldId))
            .filter((field): field is PivotField => Boolean(field));

          return (
            <div
              key={area}
              className="min-h-20 rounded-md border border-dashed bg-background p-2"
              onDragOver={(event) => {
                if (!disabled) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                dropField(area, event.dataTransfer.getData("text/plain"));
              }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium">{label}</span>
                <Badge variant="outline" className="font-mono">
                  {areaFields.length}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {areaFields.length > 0 ? (
                  areaFields.map((field) => (
                    <FieldChip
                      key={`${area}:${field.id}`}
                      disabled={disabled}
                      field={field}
                      onRemove={() => removeField(area, field.id)}
                    />
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">None</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
