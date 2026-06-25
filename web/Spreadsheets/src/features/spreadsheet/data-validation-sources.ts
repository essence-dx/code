import { cellKey, parseCellKey } from "@/features/workbooks/addresses";
import type {
  ChartRange,
  DataValidationRule,
  SheetData,
} from "@/features/workbooks/types";

export function parseListValues(value: string) {
  return parseListLabels(value).map((item) => item.toLocaleLowerCase());
}

export function parseListLabels(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseValidationRangeReference(value: string): ChartRange | null {
  const referenceParts = value.trim().replaceAll("$", "").split("!");
  const rangeReference = referenceParts[referenceParts.length - 1]?.trim();

  if (!rangeReference) {
    return null;
  }

  const [startReference, endReference = startReference] =
    rangeReference.split(":");
  const start = startReference ? parseCellKey(startReference) : null;
  const end = endReference ? parseCellKey(endReference) : null;

  if (!start || !end) {
    return null;
  }

  return {
    startRowIndex: Math.min(start.rowIndex, end.rowIndex),
    startColumnIndex: Math.min(start.columnIndex, end.columnIndex),
    endRowIndex: Math.max(start.rowIndex, end.rowIndex),
    endColumnIndex: Math.max(start.columnIndex, end.columnIndex),
  };
}

export function parseDependentListGroups(value: string) {
  const groups = new Map<string, string[]>();
  const segments = value
    .split(/\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);

  for (const segment of segments) {
    const separatorIndex = ["=", ":"]
      .map((separator) => segment.indexOf(separator))
      .filter((index) => index >= 0)
      .sort((left, right) => left - right)[0];

    if (separatorIndex === undefined) {
      continue;
    }

    const key = segment.slice(0, separatorIndex).trim().toLocaleLowerCase();
    const options = parseListLabels(segment.slice(separatorIndex + 1));

    if (key && options.length) {
      groups.set(key, options);
    }
  }

  return groups;
}

function getCellValue({
  sheet,
  computedValues,
  rowIndex,
  columnIndex,
}: {
  sheet: SheetData;
  computedValues: Record<string, string>;
  rowIndex: number;
  columnIndex: number;
}) {
  const key = cellKey(rowIndex, columnIndex);

  return computedValues[key] ?? sheet.cells[key]?.raw ?? "";
}

function getRangeListOptions({
  rule,
  sheet,
  computedValues,
}: {
  rule: DataValidationRule;
  sheet: SheetData;
  computedValues: Record<string, string>;
}) {
  const sourceRange = parseValidationRangeReference(rule.value);

  if (!sourceRange) {
    return [];
  }

  const options = new Set<string>();
  const endRowIndex = Math.min(sourceRange.endRowIndex, sheet.rowCount - 1);
  const endColumnIndex = Math.min(
    sourceRange.endColumnIndex,
    sheet.columnCount - 1,
  );

  for (
    let rowIndex = Math.max(sourceRange.startRowIndex, 0);
    rowIndex <= endRowIndex;
    rowIndex += 1
  ) {
    for (
      let columnIndex = Math.max(sourceRange.startColumnIndex, 0);
      columnIndex <= endColumnIndex;
      columnIndex += 1
    ) {
      const value = getCellValue({ sheet, computedValues, rowIndex, columnIndex })
        .trim();

      if (value) {
        options.add(value);
      }
    }
  }

  return Array.from(options);
}

function getDependentListOptions({
  rule,
  sheet,
  computedValues,
  rowIndex,
  columnIndex,
}: {
  rule: DataValidationRule;
  sheet: SheetData;
  computedValues: Record<string, string>;
  rowIndex: number;
  columnIndex: number;
}) {
  const parentCell = rule.dependentCell
    ? parseCellKey(rule.dependentCell.replaceAll("$", ""))
    : columnIndex > 0
      ? { rowIndex, columnIndex: columnIndex - 1 }
      : null;

  if (!parentCell) {
    return [];
  }

  const parentValue = getCellValue({
    sheet,
    computedValues,
    rowIndex: parentCell.rowIndex,
    columnIndex: parentCell.columnIndex,
  })
    .trim()
    .toLocaleLowerCase();

  if (!parentValue) {
    return [];
  }

  return parseDependentListGroups(rule.value).get(parentValue) ?? [];
}

export function getValidationListOptions({
  rule,
  sheet,
  computedValues,
  rowIndex,
  columnIndex,
}: {
  rule: DataValidationRule;
  sheet: SheetData;
  computedValues: Record<string, string>;
  rowIndex: number;
  columnIndex: number;
}) {
  if (rule.type !== "list") {
    return [];
  }

  if (rule.listSource === "range") {
    return getRangeListOptions({ rule, sheet, computedValues });
  }

  if (rule.listSource === "dependent") {
    return getDependentListOptions({
      rule,
      sheet,
      computedValues,
      rowIndex,
      columnIndex,
    });
  }

  return parseListLabels(rule.value);
}

export function getValidationSourceLabel(rule: DataValidationRule) {
  if (rule.type !== "list") {
    return "direct rule";
  }

  if (rule.listSource === "range") {
    return `range ${rule.value || "not set"}`;
  }

  if (rule.listSource === "dependent") {
    return `dependent on ${rule.dependentCell || "left cell"}`;
  }

  return "inline list";
}
