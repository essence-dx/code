"use client";

import { Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getPivotCalculatedFieldOperatorLabel,
  isPivotCalculatedFieldId,
} from "@/features/spreadsheet/pivot/pivot-calculated-fields";
import type { PivotTableLayoutUpdate } from "@/features/spreadsheet/components/pivot-table-layout-types";
import type { PivotField } from "@/features/spreadsheet/pivot/pivot-types";
import type {
  PivotTableCalculatedFieldOperator,
  PivotTableDefinition,
} from "@/features/workbooks/types";

const operatorOptions: PivotTableCalculatedFieldOperator[] = [
  "add",
  "subtract",
  "multiply",
  "divide",
];

function createCalculatedFieldName(fields: PivotField[]) {
  const names = new Set(fields.map((field) => field.name.toLowerCase()));
  let index = 1;
  let name = "Calculated Field 1";

  while (names.has(name.toLowerCase())) {
    index += 1;
    name = `Calculated Field ${index}`;
  }

  return name;
}

export function PivotTableCalculatedFieldsControl({
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
  const numericSourceFields = useMemo(
    () =>
      fields.filter(
        (field) =>
          field.valueType === "number" && !isPivotCalculatedFieldId(field.id),
      ),
    [fields],
  );
  const [name, setName] = useState(() => createCalculatedFieldName(fields));
  const [leftFieldId, setLeftFieldId] = useState(
    () => numericSourceFields[0]?.id ?? "",
  );
  const [rightFieldId, setRightFieldId] = useState(
    () => numericSourceFields[1]?.id ?? numericSourceFields[0]?.id ?? "",
  );
  const [operator, setOperator] =
    useState<PivotTableCalculatedFieldOperator>("subtract");

  function addCalculatedField() {
    const trimmedName = name.trim();

    if (!trimmedName || !leftFieldId || !rightFieldId) {
      return;
    }

    onUpdateLayout({
      calculatedFields: [
        ...(pivotTable.calculatedFields ?? []),
        {
          id: `calc_${crypto.randomUUID()}`,
          name: trimmedName,
          leftFieldId,
          operator,
          rightFieldId,
        },
      ],
    });
    setName(createCalculatedFieldName(fields));
  }

  function removeCalculatedField(fieldId: string) {
    onUpdateLayout({
      calculatedFields: (pivotTable.calculatedFields ?? []).filter(
        (field) => field.id !== fieldId,
      ),
    });
  }

  return (
    <div className="space-y-2 rounded-md border bg-background p-2">
      <div className="text-xs font-medium">Calculated fields</div>
      {numericSourceFields.length < 2 ? (
        <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
          Need two numeric source fields.
        </p>
      ) : (
        <div className="space-y-2">
          <Input
            value={name}
            disabled={disabled}
            placeholder="Field name"
            className="h-8 px-2 text-xs"
            onChange={(event) => setName(event.target.value)}
          />
          <div className="grid grid-cols-[1fr_4.5rem_1fr_auto] gap-1">
            <select
              value={leftFieldId}
              disabled={disabled}
              aria-label={`${pivotTable.name} calculated field left operand`}
              className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => setLeftFieldId(event.target.value)}
            >
              {numericSourceFields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))}
            </select>
            <select
              value={operator}
              disabled={disabled}
              aria-label={`${pivotTable.name} calculated field operator`}
              className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) =>
                setOperator(event.target.value as PivotTableCalculatedFieldOperator)
              }
            >
              {operatorOptions.map((option) => (
                <option key={option} value={option}>
                  {getPivotCalculatedFieldOperatorLabel(option)}
                </option>
              ))}
            </select>
            <select
              value={rightFieldId}
              disabled={disabled}
              aria-label={`${pivotTable.name} calculated field right operand`}
              className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => setRightFieldId(event.target.value)}
            >
              {numericSourceFields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="icon-sm"
              disabled={disabled || !name.trim() || !leftFieldId || !rightFieldId}
              onClick={addCalculatedField}
            >
              <Plus />
              <span className="sr-only">Add calculated field</span>
            </Button>
          </div>
        </div>
      )}
      {(pivotTable.calculatedFields ?? []).length > 0 ? (
        <div className="space-y-1">
          {pivotTable.calculatedFields.map((field) => {
            const leftField = fields.find((item) => item.id === field.leftFieldId);
            const rightField = fields.find((item) => item.id === field.rightFieldId);

            return (
              <div
                key={field.id}
                className="flex items-center justify-between gap-2 rounded-md bg-muted px-2 py-1 text-xs"
              >
                <span className="min-w-0 truncate">
                  {field.name}: {leftField?.name ?? "Field"}{" "}
                  {getPivotCalculatedFieldOperatorLabel(field.operator)}{" "}
                  {rightField?.name ?? "Field"}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled}
                  onClick={() => removeCalculatedField(field.id)}
                >
                  <X />
                  <span className="sr-only">Remove calculated field</span>
                </Button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
