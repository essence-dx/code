import type {
  PivotField,
  PivotSourceModel,
} from "@/features/spreadsheet/pivot/pivot-types";
import type {
  PivotTableFieldGrouping,
  PivotTableFieldGroupingMode,
} from "@/features/workbooks/types";

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function getPivotGroupingLabel(mode: PivotTableFieldGroupingMode) {
  if (mode === "dateYear") {
    return "Years";
  }

  if (mode === "dateQuarter") {
    return "Quarters";
  }

  if (mode === "dateMonth") {
    return "Months";
  }

  if (mode === "numberBucket10") {
    return "10s";
  }

  return "100s";
}

function parseDateValue(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateGroup(value: string, mode: PivotTableFieldGroupingMode) {
  const date = parseDateValue(value);

  if (!date) {
    return value;
  }

  const year = date.getFullYear();
  const monthIndex = date.getMonth();

  if (mode === "dateYear") {
    return String(year);
  }

  if (mode === "dateQuarter") {
    return `${year} Q${Math.floor(monthIndex / 3) + 1}`;
  }

  return `${year}-${String(monthIndex + 1).padStart(2, "0")} ${monthNames[monthIndex]}`;
}

function formatNumberBucket(value: string, bucketSize: number) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return value;
  }

  const start = Math.floor(numberValue / bucketSize) * bucketSize;
  const end = start + bucketSize - 1;

  return `${start}-${end}`;
}

function formatGroupedValue(value: string, mode: PivotTableFieldGroupingMode) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  if (
    mode === "dateYear" ||
    mode === "dateQuarter" ||
    mode === "dateMonth"
  ) {
    return formatDateGroup(trimmedValue, mode);
  }

  return formatNumberBucket(trimmedValue, mode === "numberBucket10" ? 10 : 100);
}

function getGroupedFieldName(field: PivotField, mode: PivotTableFieldGroupingMode) {
  return `${field.name} (${getPivotGroupingLabel(mode)})`;
}

export function applyPivotFieldGroupings(
  source: PivotSourceModel,
  groupings: PivotTableFieldGrouping[],
): PivotSourceModel {
  if (groupings.length === 0) {
    return source;
  }

  const groupingsByFieldId = new Map(
    groupings.map((grouping) => [grouping.fieldId, grouping.mode]),
  );
  const fields = source.fields.map((field) => {
    const mode = groupingsByFieldId.get(field.id);

    return mode
      ? {
          ...field,
          name: getGroupedFieldName(field, mode),
          valueType: "text" as const,
        }
      : field;
  });
  const records = source.records.map((record) => ({
    ...record,
    values: Object.fromEntries(
      Object.entries(record.values).map(([fieldId, value]) => {
        const mode = groupingsByFieldId.get(fieldId);

        return [fieldId, mode ? formatGroupedValue(value, mode) : value];
      }),
    ),
  }));

  return {
    ...source,
    fields,
    records,
  };
}
