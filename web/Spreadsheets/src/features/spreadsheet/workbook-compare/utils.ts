import { cellKey, parseCellKey } from "@/features/workbooks/addresses";
import type {
  CellRecord,
  ChartRange,
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";
import {
  compareCategories,
  type WorkbookCompareItem,
  type WorkbookCompareSummary,
} from "@/features/spreadsheet/workbook-compare/types";

export function emptySummary(): WorkbookCompareSummary {
  return {
    added: 0,
    changed: 0,
    removed: 0,
    total: 0,
    truncated: 0,
    byCategory: compareCategories.reduce(
      (totals, category) => ({ ...totals, [category]: 0 }),
      {} as WorkbookCompareSummary["byCategory"],
    ),
  };
}

export function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, childValue]) => `${JSON.stringify(key)}:${stableJson(childValue)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export function previewValue(value: unknown) {
  if (value === undefined) {
    return "Missing";
  }

  if (value === null) {
    return "None";
  }

  if (typeof value === "string") {
    return value.trim().slice(0, 140) || "Blank";
  }

  return stableJson(value).slice(0, 140);
}

export function makeId(parts: Array<number | string | undefined>) {
  return parts
    .filter((part): part is number | string => part !== undefined)
    .join(":")
    .replace(/[^a-z0-9:._-]+/gi, "-")
    .slice(0, 180);
}

export function getCellRange(key: string): ChartRange | undefined {
  const position = parseCellKey(key);

  if (!position) {
    return undefined;
  }

  return {
    startRowIndex: position.rowIndex,
    startColumnIndex: position.columnIndex,
    endRowIndex: position.rowIndex,
    endColumnIndex: position.columnIndex,
  };
}

export function hasFormula(cell: CellRecord | undefined) {
  return Boolean(cell?.raw.trim().startsWith("="));
}

export function recordCompareItem({
  item,
  items,
  maxItems,
  summary,
}: {
  item: WorkbookCompareItem;
  items: WorkbookCompareItem[];
  maxItems: number;
  summary: WorkbookCompareSummary;
}) {
  summary.total += 1;
  summary[item.status] += 1;
  summary.byCategory[item.category] += 1;

  if (items.length < maxItems) {
    items.push(item);
  } else {
    summary.truncated += 1;
  }
}

export function scopedObjectKey(sheetName: string, label: string) {
  return `${normalizeName(sheetName)}:${normalizeName(label)}`;
}

export function clone<T>(value: T): T {
  return structuredClone(value);
}

export function makeUniqueId(
  existingIds: Set<string>,
  preferredId: string,
  prefix: string,
) {
  if (!existingIds.has(preferredId)) {
    existingIds.add(preferredId);
    return preferredId;
  }

  let nextId = `${prefix}_${crypto.randomUUID()}`;

  while (existingIds.has(nextId)) {
    nextId = `${prefix}_${crypto.randomUUID()}`;
  }

  existingIds.add(nextId);
  return nextId;
}

export function makeUniqueSheetName(sheets: SheetData[], preferredName: string) {
  const names = new Set(sheets.map((sheet) => normalizeName(sheet.name)));
  const baseName = preferredName.trim() || "Imported sheet";
  let nextName = baseName;
  let suffix = 2;

  while (names.has(normalizeName(nextName))) {
    nextName = `${baseName} ${suffix}`;
    suffix += 1;
  }

  return nextName;
}

export function mapIncomingSheetId({
  base,
  incoming,
  incomingSheetId,
}: {
  base: WorkbookDocument;
  incoming: WorkbookDocument;
  incomingSheetId: string;
}) {
  const incomingSheet = incoming.sheets.find((sheet) => sheet.id === incomingSheetId);

  if (!incomingSheet) {
    return incomingSheetId;
  }

  return (
    base.sheets.find((sheet) => sheet.id === incomingSheetId)?.id ??
    base.sheets.find(
      (sheet) => normalizeName(sheet.name) === normalizeName(incomingSheet.name),
    )?.id ??
    incomingSheetId
  );
}

export function getWorkbookCompareRangeLabel(item: WorkbookCompareItem) {
  if (item.cellKey) {
    return `${item.sheetName ?? "Sheet"}!${item.cellKey}`;
  }

  if (!item.range) {
    return item.sheetName ?? item.category;
  }

  return `${item.sheetName ?? "Sheet"}!${cellKey(
    item.range.startRowIndex,
    item.range.startColumnIndex,
  )}:${cellKey(item.range.endRowIndex, item.range.endColumnIndex)}`;
}
