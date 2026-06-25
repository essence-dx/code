"use client";

import { getPivotGroupingLabel } from "@/features/spreadsheet/pivot/pivot-grouping";
import type { PivotField } from "@/features/spreadsheet/pivot/pivot-types";
import type {
  PivotTableDefinition,
  PivotTableFieldGroupingMode,
} from "@/features/workbooks/types";

type GroupingOption = {
  label: string;
  value: PivotTableFieldGroupingMode | "";
};

const dateGroupingOptions: GroupingOption[] = [
  { label: "None", value: "" },
  { label: getPivotGroupingLabel("dateYear"), value: "dateYear" },
  { label: getPivotGroupingLabel("dateQuarter"), value: "dateQuarter" },
  { label: getPivotGroupingLabel("dateMonth"), value: "dateMonth" },
];

const numberGroupingOptions: GroupingOption[] = [
  { label: "None", value: "" },
  { label: getPivotGroupingLabel("numberBucket10"), value: "numberBucket10" },
  { label: getPivotGroupingLabel("numberBucket100"), value: "numberBucket100" },
];

function getGroupingOptions(field: PivotField) {
  if (field.valueType === "date") {
    return dateGroupingOptions;
  }

  if (field.valueType === "number") {
    return numberGroupingOptions;
  }

  return [];
}

export function PivotTableGroupingControl({
  disabled,
  field,
  label,
  pivotTable,
  onChange,
}: {
  disabled?: boolean;
  field: PivotField | undefined;
  label: string;
  pivotTable: PivotTableDefinition;
  onChange: (fieldId: string, mode: PivotTableFieldGroupingMode | "") => void;
}) {
  if (!field) {
    return null;
  }

  const options = getGroupingOptions(field);

  if (options.length === 0) {
    return null;
  }

  const grouping = (pivotTable.fieldGroupings ?? []).find(
    (item) => item.fieldId === field.id,
  );

  return (
    <label className="block text-xs font-medium">
      {label}
      <select
        value={grouping?.mode ?? ""}
        disabled={disabled}
        aria-label={`${pivotTable.name} ${label.toLowerCase()}`}
        className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onChange={(event) =>
          onChange(field.id, event.target.value as PivotTableFieldGroupingMode | "")
        }
      >
        {options.map((option) => (
          <option key={option.value || "none"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
