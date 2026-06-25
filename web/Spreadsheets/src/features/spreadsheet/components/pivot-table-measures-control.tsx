"use client";

import { Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPivotCalculatedFieldOperatorLabel } from "@/features/spreadsheet/pivot/pivot-calculated-fields";
import type { PivotTableLayoutUpdate } from "@/features/spreadsheet/components/pivot-table-layout-types";
import type {
  PivotTableCalculatedFieldOperator,
  PivotTableDefinition,
} from "@/features/workbooks/types";

const measureOperatorOptions: PivotTableCalculatedFieldOperator[] = [
  "add",
  "subtract",
  "multiply",
  "divide",
];

function createMeasureName(pivotTable: PivotTableDefinition) {
  const names = new Set([
    ...pivotTable.valueFields.map((field) => field.label.toLowerCase()),
    ...(pivotTable.measures ?? []).map((measure) => measure.name.toLowerCase()),
  ]);
  let index = 1;
  let name = "Measure 1";

  while (names.has(name.toLowerCase())) {
    index += 1;
    name = `Measure ${index}`;
  }

  return name;
}

export function PivotTableMeasuresControl({
  disabled,
  pivotTable,
  onUpdateLayout,
}: {
  disabled?: boolean;
  pivotTable: PivotTableDefinition;
  onUpdateLayout: (updates: PivotTableLayoutUpdate) => void;
}) {
  const valueLabels = useMemo(
    () =>
      Array.from(new Set(pivotTable.valueFields.map((field) => field.label))).slice(
        0,
        8,
      ),
    [pivotTable.valueFields],
  );
  const [name, setName] = useState(() => createMeasureName(pivotTable));
  const [leftValueLabel, setLeftValueLabel] = useState(
    () => valueLabels[0] ?? "",
  );
  const [rightValueLabel, setRightValueLabel] = useState(
    () => valueLabels[1] ?? valueLabels[0] ?? "",
  );
  const [operator, setOperator] =
    useState<PivotTableCalculatedFieldOperator>("divide");
  const selectedLeftValueLabel = valueLabels.includes(leftValueLabel)
    ? leftValueLabel
    : (valueLabels[0] ?? "");
  const selectedRightValueLabel = valueLabels.includes(rightValueLabel)
    ? rightValueLabel
    : (valueLabels[1] ?? valueLabels[0] ?? "");

  function addMeasure() {
    const trimmedName = name.trim();

    if (!trimmedName || !selectedLeftValueLabel || !selectedRightValueLabel) {
      return;
    }

    const nextMeasures = [
      ...(pivotTable.measures ?? []),
      {
        id: `measure_${crypto.randomUUID()}`,
        name: trimmedName,
        leftValueLabel: selectedLeftValueLabel,
        operator,
        rightValueLabel: selectedRightValueLabel,
      },
    ];

    onUpdateLayout({ measures: nextMeasures });
    setName(createMeasureName({ ...pivotTable, measures: nextMeasures }));
  }

  function removeMeasure(measureId: string) {
    onUpdateLayout({
      measures: (pivotTable.measures ?? []).filter(
        (measure) => measure.id !== measureId,
      ),
    });
  }

  return (
    <div className="space-y-2 rounded-md border bg-background p-2">
      <div className="text-xs font-medium">Measures</div>
      {valueLabels.length < 2 ? (
        <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
          Drop at least two fields into Values.
        </p>
      ) : (
        <div className="space-y-2">
          <Input
            value={name}
            disabled={disabled}
            placeholder="Measure name"
            className="h-8 px-2 text-xs"
            onChange={(event) => setName(event.target.value)}
          />
          <div className="grid grid-cols-[1fr_4.5rem_1fr_auto] gap-1">
            <select
              value={selectedLeftValueLabel}
              disabled={disabled}
              aria-label={`${pivotTable.name} measure left value`}
              className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => setLeftValueLabel(event.target.value)}
            >
              {valueLabels.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={operator}
              disabled={disabled}
              aria-label={`${pivotTable.name} measure operator`}
              className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) =>
                setOperator(event.target.value as PivotTableCalculatedFieldOperator)
              }
            >
              {measureOperatorOptions.map((option) => (
                <option key={option} value={option}>
                  {getPivotCalculatedFieldOperatorLabel(option)}
                </option>
              ))}
            </select>
            <select
              value={selectedRightValueLabel}
              disabled={disabled}
              aria-label={`${pivotTable.name} measure right value`}
              className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => setRightValueLabel(event.target.value)}
            >
              {valueLabels.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="icon-sm"
              disabled={disabled || !name.trim()}
              onClick={addMeasure}
            >
              <Plus />
              <span className="sr-only">Add measure</span>
            </Button>
          </div>
        </div>
      )}
      {(pivotTable.measures ?? []).length > 0 ? (
        <div className="space-y-1">
          {pivotTable.measures.map((measure) => (
            <div
              key={measure.id}
              className="flex items-center justify-between gap-2 rounded-md bg-muted px-2 py-1 text-xs"
            >
              <span className="min-w-0 truncate">
                {measure.name}: {measure.leftValueLabel}{" "}
                {getPivotCalculatedFieldOperatorLabel(measure.operator)}{" "}
                {measure.rightValueLabel}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={disabled}
                onClick={() => removeMeasure(measure.id)}
              >
                <X />
                <span className="sr-only">Remove measure</span>
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
