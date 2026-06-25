import type {
  PivotSourceModel,
  PivotSourceRecord,
} from "@/features/spreadsheet/pivot/pivot-types";

export type PivotFilterOption = {
  count: number;
  label: string;
  value: string;
};

export function normalizePivotFilterValue(value: string) {
  const trimmed = value.trim();

  return trimmed || "(blank)";
}

export function getPivotFilterOptions({
  fieldId,
  source,
}: {
  fieldId: string;
  source: PivotSourceModel;
}) {
  const counts = new Map<string, number>();

  for (const record of source.records) {
    const value = normalizePivotFilterValue(record.values[fieldId] ?? "");

    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map<PivotFilterOption>(([value, count]) => ({
      count,
      label: value,
      value,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function recordMatchesFilters(
  record: PivotSourceRecord,
  filterSelections: Record<string, string[]>,
) {
  return Object.entries(filterSelections).every(([fieldId, selectedValues]) => {
    if (selectedValues.length === 0) {
      return true;
    }

    return selectedValues.includes(
      normalizePivotFilterValue(record.values[fieldId] ?? ""),
    );
  });
}

export function filterPivotSource(
  source: PivotSourceModel,
  filterSelections: Record<string, string[]>,
): PivotSourceModel {
  const activeSelections = Object.fromEntries(
    Object.entries(filterSelections).filter(([, selectedValues]) =>
      selectedValues.length > 0,
    ),
  );

  if (Object.keys(activeSelections).length === 0) {
    return source;
  }

  return {
    ...source,
    records: source.records.filter((record) =>
      recordMatchesFilters(record, activeSelections),
    ),
  };
}
