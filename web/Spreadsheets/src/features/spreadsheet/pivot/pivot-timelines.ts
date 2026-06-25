import type {
  PivotSourceModel,
  PivotSourceRecord,
} from "@/features/spreadsheet/pivot/pivot-types";
import type {
  PivotTableTimelineFilter,
  TableTimelineMode,
} from "@/features/workbooks/types";

const dayInMilliseconds = 24 * 60 * 60 * 1000;

export type PivotTimelinePeriodOption = {
  count: number;
  label: string;
  value: string;
};

function parseDateValue(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const numericValue = Number(trimmed);

  if (
    Number.isFinite(numericValue) &&
    numericValue > 0 &&
    numericValue < 60000
  ) {
    return new Date(Date.UTC(1899, 11, 30) + numericValue * dayInMilliseconds);
  }

  if (Number.isFinite(numericValue)) {
    return null;
  }

  const timestamp = Date.parse(trimmed);

  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

function getPeriodValue(date: Date, mode: TableTimelineMode) {
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

function getPeriodLabel(value: string, mode: TableTimelineMode) {
  if (mode === "year") {
    return value;
  }

  if (mode === "quarter") {
    return value.replace("-Q", " Q");
  }

  const [year, month] = value.split("-");
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));

  if (!Number.isFinite(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

function getRecordPeriod(
  record: PivotSourceRecord,
  fieldId: string,
  mode: TableTimelineMode,
) {
  const date = parseDateValue(record.values[fieldId] ?? "");

  return date ? getPeriodValue(date, mode) : null;
}

function recordMatchesTimelines(
  record: PivotSourceRecord,
  timelineFilters: PivotTableTimelineFilter[],
) {
  return timelineFilters.every((timeline) => {
    if (timeline.selectedPeriods.length === 0) {
      return true;
    }

    const period = getRecordPeriod(record, timeline.fieldId, timeline.mode);

    return period ? timeline.selectedPeriods.includes(period) : false;
  });
}

export function getPivotTimelineOptions({
  fieldId,
  mode,
  source,
}: {
  fieldId: string;
  mode: TableTimelineMode;
  source: PivotSourceModel;
}) {
  const periods = new Map<string, number>();

  for (const record of source.records) {
    const period = getRecordPeriod(record, fieldId, mode);

    if (period) {
      periods.set(period, (periods.get(period) ?? 0) + 1);
    }
  }

  return Array.from(periods.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map<PivotTimelinePeriodOption>(([value, count]) => ({
      count,
      label: getPeriodLabel(value, mode),
      value,
    }));
}

export function filterPivotSourceByTimelines(
  source: PivotSourceModel,
  timelineFilters: PivotTableTimelineFilter[],
): PivotSourceModel {
  const activeTimelineFilters = timelineFilters.filter(
    (timeline) => timeline.selectedPeriods.length > 0,
  );

  if (activeTimelineFilters.length === 0) {
    return source;
  }

  return {
    ...source,
    records: source.records.filter((record) =>
      recordMatchesTimelines(record, activeTimelineFilters),
    ),
  };
}
