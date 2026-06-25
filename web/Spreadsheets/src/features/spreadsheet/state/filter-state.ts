import { createCriteriaRangeFilters } from "@/features/spreadsheet/criteria-range-filter";
import {
  cloneFilterForSheet,
  normalizeFilterPresetName,
} from "@/features/spreadsheet/state/document-state";
import {
  rangesOverlap,
  type CellRange,
} from "@/features/spreadsheet/state/selection-state";
import type {
  SheetData,
  SheetFilterCondition,
  SheetFilterRule,
  SheetFilterRuleType,
  WorkbookDocument,
} from "@/features/workbooks/types";

export type FilterInput = {
  columnIndex: number;
  headerName?: string;
  type: SheetFilterRuleType;
  value: string;
  values?: string[];
  joiner?: "and" | "or";
  conditions?: SheetFilterCondition[];
  criteriaGroups?: SheetFilterRule["criteriaGroups"];
};

export type ColumnValueFilterInput = {
  range: CellRange;
  columnIndex: number;
  headerName?: string;
  values: string[];
};

type CriteriaRangeFilterDraft = ReturnType<
  typeof createCriteriaRangeFilters
>["filters"][number];

type PreparedFilterPresetSave =
  | { ok: false; error: string }
  | { ok: true; presetName: string };

export function addFilterToDocument(
  document: WorkbookDocument,
  range: CellRange,
  rule: FilterInput,
) {
  document.filters ??= [];
  document.filters.push({
    id: `filter_${crypto.randomUUID()}`,
    sheetId: document.activeSheetId,
    range,
    columnIndex: rule.columnIndex,
    headerName: rule.headerName,
    type: rule.type,
    value: rule.value,
    values: rule.values,
    joiner: rule.joiner,
    conditions: rule.conditions,
    criteriaGroups: rule.criteriaGroups,
  });
}

export function createCriteriaFilterPlan(input: {
  sheet: SheetData;
  criteriaRange: CellRange;
  computedValues: Record<string, string>;
}) {
  return createCriteriaRangeFilters(input);
}

export function applyCriteriaFiltersToDocument(
  document: WorkbookDocument,
  filters: CriteriaRangeFilterDraft[],
) {
  document.filters ??= [];

  for (const filter of filters) {
    const replacementColumns = new Set(
      (filter.criteriaGroups ?? [{ conditions: [filter] }]).flatMap((group) =>
        group.conditions.map((condition) => condition.columnIndex),
      ),
    );

    document.filters = document.filters.filter(
      (rule) =>
        rule.sheetId !== document.activeSheetId ||
        !rangesOverlap(rule.range, filter.range) ||
        (!rule.criteriaGroups && !replacementColumns.has(rule.columnIndex)),
    );
    document.filters.push({
      id: `filter_${crypto.randomUUID()}`,
      sheetId: document.activeSheetId,
      range: filter.range,
      columnIndex: filter.columnIndex,
      headerName: filter.headerName,
      type: filter.type,
      value: filter.value,
      joiner: filter.joiner,
      conditions: filter.conditions,
      criteriaGroups: filter.criteriaGroups,
    });
  }
}

export function applyColumnValueFilterToDocument(
  document: WorkbookDocument,
  input: ColumnValueFilterInput,
) {
  const values = input.values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.slice(0, 500))
    .slice(0, 250);

  document.filters ??= [];
  document.filters = document.filters.filter(
    (rule) =>
      rule.sheetId !== document.activeSheetId ||
      rule.columnIndex !== input.columnIndex ||
      !rangesOverlap(rule.range, input.range),
  );
  document.filters.push({
    id: `filter_${crypto.randomUUID()}`,
    sheetId: document.activeSheetId,
    range: input.range,
    columnIndex: input.columnIndex,
    headerName: input.headerName,
    type: "oneOf",
    value: "",
    values,
  });
}

export function clearColumnFiltersInDocument(
  document: WorkbookDocument,
  input: Pick<ColumnValueFilterInput, "columnIndex" | "range">,
) {
  document.filters = (document.filters ?? []).filter(
    (rule) =>
      rule.sheetId !== document.activeSheetId ||
      rule.columnIndex !== input.columnIndex ||
      !rangesOverlap(rule.range, input.range),
  );
}

export function deleteFilterFromDocument(
  document: WorkbookDocument,
  ruleId: string,
) {
  document.filters = (document.filters ?? []).filter((rule) => rule.id !== ruleId);
}

export function resizeFilterInDocument(
  document: WorkbookDocument,
  ruleId: string,
  range: CellRange,
) {
  const rule = (document.filters ?? []).find(
    (item) => item.id === ruleId && item.sheetId === document.activeSheetId,
  );

  if (rule) {
    rule.range = range;
  }
}

export function prepareFilterPresetSave(
  document: WorkbookDocument,
  sheetId: string,
  name: string,
): PreparedFilterPresetSave {
  const sheetFilters = (document.filters ?? []).filter(
    (rule) => rule.sheetId === sheetId,
  );

  if (sheetFilters.length === 0) {
    return {
      ok: false,
      error: "Create at least one active filter before saving a preset.",
    };
  }

  const existingPresetCount = (document.filterPresets ?? []).filter(
    (preset) => preset.sheetId === sheetId,
  ).length;

  return {
    ok: true,
    presetName: normalizeFilterPresetName(name, existingPresetCount + 1),
  };
}

export function saveFilterPresetToDocument(
  document: WorkbookDocument,
  presetName: string,
) {
  const now = new Date().toISOString();
  const filters = (document.filters ?? [])
    .filter((rule) => rule.sheetId === document.activeSheetId)
    .map((filter) => cloneFilterForSheet(filter, document.activeSheetId));
  const existingIndex = (document.filterPresets ?? []).findIndex(
    (preset) =>
      preset.sheetId === document.activeSheetId &&
      preset.name.toLocaleLowerCase() === presetName.toLocaleLowerCase(),
  );

  document.filterPresets ??= [];

  if (existingIndex >= 0) {
    document.filterPresets[existingIndex] = {
      ...document.filterPresets[existingIndex],
      name: presetName,
      filters,
      updatedAt: now,
    };
    return;
  }

  document.filterPresets.push({
    id: `filter_preset_${crypto.randomUUID()}`,
    sheetId: document.activeSheetId,
    name: presetName,
    filters,
    createdAt: now,
    updatedAt: now,
  });
}

export function getFilterPresetApplyError(
  document: WorkbookDocument,
  sheetId: string,
  presetId: string,
) {
  const preset = (document.filterPresets ?? []).find(
    (item) => item.id === presetId && item.sheetId === sheetId,
  );

  if (!preset) {
    return "Filter preset was not found.";
  }

  if (preset.filters.length === 0) {
    return "Filter preset has no saved filters.";
  }

  return null;
}

export function applyFilterPresetToDocument(
  document: WorkbookDocument,
  presetId: string,
) {
  const preset = (document.filterPresets ?? []).find(
    (item) => item.id === presetId && item.sheetId === document.activeSheetId,
  );

  if (!preset) {
    return;
  }

  document.filters = [
    ...(document.filters ?? []).filter(
      (rule) => rule.sheetId !== document.activeSheetId,
    ),
    ...preset.filters.map((filter) =>
      cloneFilterForSheet(filter, document.activeSheetId),
    ),
  ];
}

export function deleteFilterPresetFromDocument(
  document: WorkbookDocument,
  presetId: string,
) {
  document.filterPresets = (document.filterPresets ?? []).filter(
    (preset) =>
      preset.id !== presetId || preset.sheetId !== document.activeSheetId,
  );
}
