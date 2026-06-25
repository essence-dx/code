import type {
  PivotField,
  PivotSourceModel,
} from "@/features/spreadsheet/pivot/pivot-types";
import type { PivotTableDefinition } from "@/features/workbooks/types";

function normalizeItemValue(value: string) {
  const trimmed = value.trim();

  return trimmed || "(blank)";
}

export function getCalculatedItemFieldOptions(
  source: PivotSourceModel,
  pivotTable: PivotTableDefinition,
) {
  const groupedFieldIds = new Set<string>();
  const groupedCalculatedFields = new Set(
    (pivotTable.fieldGroupings ?? []).map((grouping) => grouping.fieldId),
  );

  if (pivotTable.rowFieldIds.length === 1) {
    groupedFieldIds.add(pivotTable.rowFieldIds[0]);
  }

  if (pivotTable.columnFieldIds.length === 1) {
    groupedFieldIds.add(pivotTable.columnFieldIds[0]);
  }

  return source.fields
    .filter(
      (field) =>
        groupedFieldIds.has(field.id) && !groupedCalculatedFields.has(field.id),
    )
    .map((field) => ({
      field,
      values: Array.from(
        new Set(
          source.records
            .map((record) => normalizeItemValue(record.values[field.id] ?? ""))
            .filter(Boolean),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    }))
    .filter((option) => option.values.length >= 2);
}

export function createCalculatedItemName(fields: PivotField[]) {
  const names = new Set(fields.map((field) => field.name.toLowerCase()));
  let index = 1;
  let name = "Calculated Item 1";

  while (names.has(name.toLowerCase())) {
    index += 1;
    name = `Calculated Item ${index}`;
  }

  return name;
}
