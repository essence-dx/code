import { normalizePivotFilterValue } from "@/features/spreadsheet/pivot/pivot-filters";
import type {
  PivotField,
  PivotSourceModel,
} from "@/features/spreadsheet/pivot/pivot-types";
import type {
  PivotTableDefinition,
  PivotTableTimelineFilter,
  TableTimelineMode,
  WorkbookDocument,
} from "@/features/workbooks/types";

const EMPTY_FILTER_SENTINEL = "\u0000pivot-empty-filter";
const EMPTY_TIMELINE_SENTINEL = "\u0000pivot-empty-timeline";

export type SyncedPivotTableControl =
  | {
      fieldId: string;
      fieldName: string;
      id: string;
      name: string;
      selectedCount: number;
      type: "slicer";
    }
  | {
      fieldId: string;
      fieldName: string;
      id: string;
      mode: TableTimelineMode;
      name: string;
      selectedCount: number;
      type: "timeline";
    };

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function findSourceFieldByColumn(
  source: PivotSourceModel,
  columnIndex: number,
): PivotField | null {
  return (
    source.fields.find((field) => field.sourceColumnIndex === columnIndex) ?? null
  );
}

function mergeFilterValues(left: string[], right: string[]) {
  if (left.length === 0) {
    return right;
  }

  if (right.length === 0) {
    return left;
  }

  const rightValues = new Set(right);
  const merged = left.filter((value) => rightValues.has(value));

  return merged.length > 0 ? merged : [EMPTY_FILTER_SENTINEL];
}

function addFilterSelection(
  selections: Record<string, string[]>,
  fieldId: string,
  selectedValues: string[],
) {
  const normalizedValues = uniqueValues(
    selectedValues.map((value) => normalizePivotFilterValue(value)),
  );

  if (normalizedValues.length === 0) {
    return selections;
  }

  return {
    ...selections,
    [fieldId]: mergeFilterValues(selections[fieldId] ?? [], normalizedValues),
  };
}

function mergeTimelineFilter(
  filters: PivotTableTimelineFilter[],
  nextFilter: PivotTableTimelineFilter,
) {
  const existingIndex = filters.findIndex(
    (filter) =>
      filter.fieldId === nextFilter.fieldId && filter.mode === nextFilter.mode,
  );

  if (existingIndex === -1) {
    return [...filters, nextFilter];
  }

  const existing = filters[existingIndex];

  if (!existing) {
    return filters;
  }

  const existingPeriods = existing.selectedPeriods;
  const nextPeriods = nextFilter.selectedPeriods;
  const selectedPeriods =
    existingPeriods.length === 0
      ? nextPeriods
      : nextPeriods.length === 0
        ? existingPeriods
        : existingPeriods.filter((period) => nextPeriods.includes(period));

  return filters.map((filter, index) =>
    index === existingIndex
      ? {
          ...filter,
          selectedPeriods:
            selectedPeriods.length > 0
              ? uniqueValues(selectedPeriods)
              : [EMPTY_TIMELINE_SENTINEL],
        }
      : filter,
  );
}

export function createEffectivePivotTableFilterSelections({
  document,
  pivotTable,
  source,
}: {
  document: WorkbookDocument;
  pivotTable: PivotTableDefinition;
  source: PivotSourceModel;
}) {
  const sourceTableId = pivotTable.sourceTableId;

  if (!sourceTableId) {
    return pivotTable.filterSelections;
  }

  return (document.tableSlicers ?? [])
    .filter(
      (slicer) =>
        slicer.tableId === sourceTableId && slicer.selectedValues.length > 0,
    )
    .reduce<Record<string, string[]>>(
      (selections, slicer) => {
        const field = findSourceFieldByColumn(source, slicer.columnIndex);

        return field
          ? addFilterSelection(selections, field.id, slicer.selectedValues)
          : selections;
      },
      { ...pivotTable.filterSelections },
    );
}

export function createEffectivePivotTableTimelineFilters({
  document,
  pivotTable,
  source,
}: {
  document: WorkbookDocument;
  pivotTable: PivotTableDefinition;
  source: PivotSourceModel;
}) {
  const sourceTableId = pivotTable.sourceTableId;

  if (!sourceTableId) {
    return pivotTable.timelineFilters ?? [];
  }

  return (document.tableTimelines ?? [])
    .filter(
      (timeline) =>
        timeline.tableId === sourceTableId &&
        timeline.selectedPeriods.length > 0,
    )
    .reduce<PivotTableTimelineFilter[]>(
      (filters, timeline) => {
        const field = findSourceFieldByColumn(source, timeline.columnIndex);

        return field
          ? mergeTimelineFilter(filters, {
              fieldId: field.id,
              mode: timeline.mode,
              selectedPeriods: uniqueValues(timeline.selectedPeriods),
            })
          : filters;
      },
      [...(pivotTable.timelineFilters ?? [])],
    );
}

export function getPivotTableSyncedControls({
  document,
  pivotTable,
  source,
}: {
  document: WorkbookDocument;
  pivotTable: PivotTableDefinition;
  source: PivotSourceModel;
}): SyncedPivotTableControl[] {
  const sourceTableId = pivotTable.sourceTableId;

  if (!sourceTableId) {
    return [];
  }

  const slicerControls = (document.tableSlicers ?? []).flatMap((slicer) => {
    if (slicer.tableId !== sourceTableId || slicer.selectedValues.length === 0) {
      return [];
    }

    const field = findSourceFieldByColumn(source, slicer.columnIndex);

    return field
      ? [
          {
            fieldId: field.id,
            fieldName: field.name,
            id: slicer.id,
            name: slicer.name,
            selectedCount: slicer.selectedValues.length,
            type: "slicer" as const,
          },
        ]
      : [];
  });
  const timelineControls = (document.tableTimelines ?? []).flatMap((timeline) => {
    if (
      timeline.tableId !== sourceTableId ||
      timeline.selectedPeriods.length === 0
    ) {
      return [];
    }

    const field = findSourceFieldByColumn(source, timeline.columnIndex);

    return field
      ? [
          {
            fieldId: field.id,
            fieldName: field.name,
            id: timeline.id,
            mode: timeline.mode,
            name: timeline.name,
            selectedCount: timeline.selectedPeriods.length,
            type: "timeline" as const,
          },
        ]
      : [];
  });

  return [...slicerControls, ...timelineControls];
}
