import { getActiveSheet } from "@/features/spreadsheet/state/document-state";
import { getTableTimelineColumnOptions } from "@/features/spreadsheet/table-timelines";
import type {
  TableTimelineMode,
  WorkbookDocument,
} from "@/features/workbooks/types";

function touchTimeline(
  timeline: NonNullable<WorkbookDocument["tableTimelines"]>[number],
) {
  timeline.updatedAt = new Date().toISOString();
}

export function addTableTimelineToDocument({
  document,
  tableId,
  columnIndex,
  computedValues,
}: {
  document: WorkbookDocument;
  tableId: string;
  columnIndex: number;
  computedValues: Record<string, string>;
}) {
  const table = (document.tables ?? []).find(
    (item) => item.id === tableId && item.sheetId === document.activeSheetId,
  );

  if (!table || !table.showHeaderRow) {
    return null;
  }

  const normalizedColumnIndex = Math.min(
    Math.max(columnIndex, table.range.startColumnIndex),
    table.range.endColumnIndex,
  );
  const existing = (document.tableTimelines ?? []).find(
    (timeline) =>
      timeline.tableId === table.id &&
      timeline.columnIndex === normalizedColumnIndex,
  );

  if (existing) {
    existing.selectedPeriods = [];
    touchTimeline(existing);
    return existing.tableId;
  }

  const sheet = getActiveSheet(document);
  const label =
    getTableTimelineColumnOptions({
      sheet,
      table,
      computedValues,
    }).find((option) => option.columnIndex === normalizedColumnIndex)?.label ??
    table.name;
  const now = new Date().toISOString();

  document.tableTimelines ??= [];
  document.tableTimelines.push({
    id: `timeline_${crypto.randomUUID()}`,
    sheetId: document.activeSheetId,
    tableId: table.id,
    columnIndex: normalizedColumnIndex,
    name: `${table.name}: ${label}`.slice(0, 80),
    mode: "month",
    selectedPeriods: [],
    createdAt: now,
    updatedAt: now,
  });

  return table.id;
}

export function updateTableTimelineInDocument(
  document: WorkbookDocument,
  timelineId: string,
  updates: {
    mode?: TableTimelineMode;
    selectedPeriods?: string[];
  },
) {
  const timeline = (document.tableTimelines ?? []).find(
    (item) => item.id === timelineId && item.sheetId === document.activeSheetId,
  );

  if (!timeline) {
    return null;
  }

  if (updates.mode) {
    timeline.mode = updates.mode;
    timeline.selectedPeriods = [];
  }

  if (updates.selectedPeriods) {
    timeline.selectedPeriods = updates.selectedPeriods
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.slice(0, 24))
      .slice(0, 120);
  }

  touchTimeline(timeline);

  return timeline.tableId;
}

export function deleteTableTimelineFromDocument(
  document: WorkbookDocument,
  timelineId: string,
) {
  const deletedTimeline = (document.tableTimelines ?? []).find(
    (timeline) =>
      timeline.id === timelineId && timeline.sheetId === document.activeSheetId,
  );

  document.tableTimelines = (document.tableTimelines ?? []).filter(
    (timeline) =>
      timeline.id !== timelineId || timeline.sheetId !== document.activeSheetId,
  );

  return deletedTimeline?.tableId ?? null;
}
