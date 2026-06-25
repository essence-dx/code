import type { PivotField } from "@/features/spreadsheet/pivot/pivot-types";
import type { PivotTableAggregation } from "@/features/workbooks/types";

export const pivotAggregationOptions: Array<{
  label: string;
  value: PivotTableAggregation;
}> = [
  { label: "Sum", value: "sum" },
  { label: "Count", value: "count" },
  { label: "Average", value: "average" },
  { label: "Min", value: "min" },
  { label: "Max", value: "max" },
];

export function getDefaultPivotAggregation(
  field: PivotField,
): PivotTableAggregation {
  return field.valueType === "number" ? "sum" : "count";
}
