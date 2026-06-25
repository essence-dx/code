import { cellKey, columnLabel } from "@/features/workbooks/addresses";
import type {
  SheetData,
  SheetFilterRule,
  TableDefinition,
  TableTimeline,
  TableTimelineMode,
} from "@/features/workbooks/types";

const dayInMilliseconds = 24 * 60 * 60 * 1000;

export type TableTimelineColumnOption = {
  columnIndex: number;
  label: string;
};

export type TableTimelinePeriodOption = {
  count: number;
  key: string;
  label: string;
  sourceValues: string[];
};

function getCellText({
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

  return (computedValues[key] ?? sheet.cells[key]?.raw ?? "").trim();
}

function getTableDataRows(table: TableDefinition) {
  const startRowIndex =
    table.range.startRowIndex + (table.showHeaderRow ? 1 : 0);
  const endRowIndex = table.range.endRowIndex - (table.showTotalsRow ? 1 : 0);

  if (startRowIndex > endRowIndex) {
    return null;
  }

  return { startRowIndex, endRowIndex };
}

function isSerialDateCell(
  sheet: SheetData,
  rowIndex: number,
  columnIndex: number,
) {
  const style = sheet.cells[cellKey(rowIndex, columnIndex)]?.style;

  return (
    style?.numberFormat === "date" ||
    (style?.numberFormat === "custom" &&
      /[dmy]/i.test(style.customNumberFormat ?? ""))
  );
}

function parseDateValue(value: string, allowSerialDate = false) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const numericValue = Number(trimmed);

  if (
    allowSerialDate &&
    Number.isFinite(numericValue) &&
    numericValue > 0 &&
    numericValue < 60000
  ) {
    const timestamp = Date.UTC(1899, 11, 30) + numericValue * dayInMilliseconds;

    return new Date(timestamp);
  }

  if (Number.isFinite(numericValue)) {
    return null;
  }

  const timestamp = Date.parse(trimmed);

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return new Date(timestamp);
}

function getPeriodKey(date: Date, mode: TableTimelineMode) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();

  if (mode === "year") {
    return `${year}`;
  }

  if (mode === "quarter") {
    return `${year}-Q${Math.floor(month / 3) + 1}`;
  }

  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function getPeriodLabel(key: string, mode: TableTimelineMode) {
  if (mode === "year") {
    return key;
  }

  if (mode === "quarter") {
    return key.replace("-Q", " Q");
  }

  const [year, month] = key.split("-");
  const monthIndex = Number(month) - 1;
  const date = new Date(Date.UTC(Number(year), monthIndex, 1));
  const label = new Intl.DateTimeFormat(undefined, {
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);

  return Number.isFinite(date.getTime()) ? label : key;
}

export function getTableTimelineColumnOptions({
  sheet,
  table,
  computedValues,
}: {
  sheet: SheetData;
  table: TableDefinition;
  computedValues: Record<string, string>;
}) {
  const rowBounds = getTableDataRows(table);
  const options: TableTimelineColumnOption[] = [];

  for (
    let columnIndex = table.range.startColumnIndex;
    columnIndex <= table.range.endColumnIndex;
    columnIndex += 1
  ) {
    let dateValueCount = 0;

    if (rowBounds) {
      for (
        let rowIndex = rowBounds.startRowIndex;
        rowIndex <= rowBounds.endRowIndex;
        rowIndex += 1
      ) {
        const value = getCellText({ sheet, computedValues, rowIndex, columnIndex });

        if (parseDateValue(value, isSerialDateCell(sheet, rowIndex, columnIndex))) {
          dateValueCount += 1;
        }
      }
    }

    if (dateValueCount === 0) {
      continue;
    }

    const header = table.showHeaderRow
      ? getCellText({
          sheet,
          computedValues,
          rowIndex: table.range.startRowIndex,
          columnIndex,
        })
      : "";

    options.push({
      columnIndex,
      label: header || columnLabel(columnIndex),
    });
  }

  return options;
}

export function getTableTimelinePeriodOptions({
  sheet,
  table,
  columnIndex,
  computedValues,
  mode,
}: {
  sheet: SheetData;
  table: TableDefinition;
  columnIndex: number;
  computedValues: Record<string, string>;
  mode: TableTimelineMode;
}) {
  const rowBounds = getTableDataRows(table);
  const periods = new Map<string, { count: number; sourceValues: Set<string> }>();

  if (!rowBounds) {
    return [];
  }

  for (
    let rowIndex = rowBounds.startRowIndex;
    rowIndex <= rowBounds.endRowIndex;
    rowIndex += 1
  ) {
    const value = getCellText({ sheet, computedValues, rowIndex, columnIndex });
    const date = parseDateValue(
      value,
      isSerialDateCell(sheet, rowIndex, columnIndex),
    );

    if (!date) {
      continue;
    }

    const key = getPeriodKey(date, mode);
    const current = periods.get(key) ?? {
      count: 0,
      sourceValues: new Set<string>(),
    };

    current.count += 1;
    current.sourceValues.add(value);
    periods.set(key, current);
  }

  return Array.from(periods.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map<TableTimelinePeriodOption>(([key, period]) => ({
      key,
      count: period.count,
      label: getPeriodLabel(key, mode),
      sourceValues: Array.from(period.sourceValues),
    }));
}

export function createTableTimelineFilterRules({
  timelines,
  tables,
  sheet,
  computedValues,
}: {
  timelines: TableTimeline[];
  tables: TableDefinition[];
  sheet: SheetData;
  computedValues: Record<string, string>;
}): SheetFilterRule[] {
  const tablesById = new Map(tables.map((table) => [table.id, table]));

  return timelines.flatMap((timeline) => {
    const table = tablesById.get(timeline.tableId);

    if (
      !table ||
      !table.showHeaderRow ||
      table.sheetId !== timeline.sheetId ||
      timeline.selectedPeriods.length === 0 ||
      timeline.columnIndex < table.range.startColumnIndex ||
      timeline.columnIndex > table.range.endColumnIndex
    ) {
      return [];
    }

    const selectedPeriodSet = new Set(timeline.selectedPeriods);
    const values = getTableTimelinePeriodOptions({
      sheet,
      table,
      columnIndex: timeline.columnIndex,
      computedValues,
      mode: timeline.mode,
    })
      .filter((period) => selectedPeriodSet.has(period.key))
      .flatMap((period) => period.sourceValues)
      .slice(0, 250);

    if (values.length === 0) {
      return [];
    }

    return [
      {
        id: `timeline_filter_${timeline.id}`,
        sheetId: timeline.sheetId,
        range: table.range,
        columnIndex: timeline.columnIndex,
        headerName: timeline.name,
        type: "oneOf",
        value: "",
        values,
      },
    ];
  });
}
