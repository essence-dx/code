"use client";

import { Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createCalculatedItemName,
  getCalculatedItemFieldOptions,
} from "@/features/spreadsheet/components/pivot-table-calculated-items-utils";
import { getPivotCalculatedFieldOperatorLabel } from "@/features/spreadsheet/pivot/pivot-calculated-fields";
import type { PivotTableLayoutUpdate } from "@/features/spreadsheet/components/pivot-table-layout-types";
import type { PivotSourceModel } from "@/features/spreadsheet/pivot/pivot-types";
import type {
  PivotTableCalculatedFieldOperator,
  PivotTableDefinition,
} from "@/features/workbooks/types";

const itemOperatorOptions: PivotTableCalculatedFieldOperator[] = [
  "add",
  "subtract",
  "multiply",
  "divide",
];

export function PivotTableCalculatedItemsControl({
  disabled,
  pivotTable,
  source,
  onUpdateLayout,
}: {
  disabled?: boolean;
  pivotTable: PivotTableDefinition;
  source: PivotSourceModel;
  onUpdateLayout: (updates: PivotTableLayoutUpdate) => void;
}) {
  const fieldOptions = useMemo(
    () => getCalculatedItemFieldOptions(source, pivotTable),
    [pivotTable, source],
  );
  const [name, setName] = useState(() =>
    createCalculatedItemName(source.fields),
  );
  const [fieldId, setFieldId] = useState(() => fieldOptions[0]?.field.id ?? "");
  const [leftItem, setLeftItem] = useState(() => fieldOptions[0]?.values[0] ?? "");
  const [rightItem, setRightItem] = useState(
    () => fieldOptions[0]?.values[1] ?? "",
  );
  const [operator, setOperator] =
    useState<PivotTableCalculatedFieldOperator>("subtract");
  const selectedOption =
    fieldOptions.find((option) => option.field.id === fieldId) ??
    fieldOptions[0];
  const itemValues = selectedOption?.values ?? [];
  const selectedLeftItem = itemValues.includes(leftItem)
    ? leftItem
    : (itemValues[0] ?? "");
  const selectedRightItem = itemValues.includes(rightItem)
    ? rightItem
    : (itemValues[1] ?? itemValues[0] ?? "");

  function addCalculatedItem() {
    const trimmedName = name.trim();

    if (!trimmedName || !selectedOption || !selectedLeftItem || !selectedRightItem) {
      return;
    }

    onUpdateLayout({
      calculatedItems: [
        ...(pivotTable.calculatedItems ?? []),
        {
          id: `calc_item_${crypto.randomUUID()}`,
          fieldId: selectedOption.field.id,
          leftItem: selectedLeftItem,
          operator,
          rightItem: selectedRightItem,
          name: trimmedName,
        },
      ],
    });
    setName(createCalculatedItemName(source.fields));
  }

  function removeCalculatedItem(itemId: string) {
    onUpdateLayout({
      calculatedItems: (pivotTable.calculatedItems ?? []).filter(
        (item) => item.id !== itemId,
      ),
    });
  }

  return (
    <div className="space-y-2 rounded-md border bg-background p-2">
      <div className="text-xs font-medium">Calculated items</div>
      {fieldOptions.length === 0 ? (
        <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
          Place a field with at least two items in Rows or Columns.
        </p>
      ) : (
        <div className="space-y-2">
          <Input
            value={name}
            disabled={disabled}
            placeholder="Item name"
            className="h-8 px-2 text-xs"
            onChange={(event) => setName(event.target.value)}
          />
          <div className="grid grid-cols-[1fr_1fr_4.5rem_1fr_auto] gap-1">
            <select
              value={selectedOption?.field.id ?? ""}
              disabled={disabled}
              aria-label={`${pivotTable.name} calculated item field`}
              className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => setFieldId(event.target.value)}
            >
              {fieldOptions.map((option) => (
                <option key={option.field.id} value={option.field.id}>
                  {option.field.name}
                </option>
              ))}
            </select>
            <select
              value={selectedLeftItem}
              disabled={disabled}
              aria-label={`${pivotTable.name} calculated item left item`}
              className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => setLeftItem(event.target.value)}
            >
              {itemValues.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select
              value={operator}
              disabled={disabled}
              aria-label={`${pivotTable.name} calculated item operator`}
              className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) =>
                setOperator(event.target.value as PivotTableCalculatedFieldOperator)
              }
            >
              {itemOperatorOptions.map((option) => (
                <option key={option} value={option}>
                  {getPivotCalculatedFieldOperatorLabel(option)}
                </option>
              ))}
            </select>
            <select
              value={selectedRightItem}
              disabled={disabled}
              aria-label={`${pivotTable.name} calculated item right item`}
              className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => setRightItem(event.target.value)}
            >
              {itemValues.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="icon-sm"
              disabled={disabled || !name.trim()}
              onClick={addCalculatedItem}
            >
              <Plus />
              <span className="sr-only">Add calculated item</span>
            </Button>
          </div>
        </div>
      )}
      {(pivotTable.calculatedItems ?? []).length > 0 ? (
        <div className="space-y-1">
          {pivotTable.calculatedItems.map((item) => {
            const field = source.fields.find(
              (sourceField) => sourceField.id === item.fieldId,
            );

            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-md bg-muted px-2 py-1 text-xs"
              >
                <span className="min-w-0 truncate">
                  {field?.name ?? "Field"} {item.name}: {item.leftItem}{" "}
                  {getPivotCalculatedFieldOperatorLabel(item.operator)}{" "}
                  {item.rightItem}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled}
                  onClick={() => removeCalculatedItem(item.id)}
                >
                  <X />
                  <span className="sr-only">Remove calculated item</span>
                </Button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
