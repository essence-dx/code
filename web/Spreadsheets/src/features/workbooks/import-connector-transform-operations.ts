import type {
  ImportConnectorAggregate,
  ImportConnectorDataType,
  ImportConnectorFilterMode,
  ImportConnectorTransformStep,
} from "@/features/workbooks/import-connector-transform-types";

const maxGeneratedRows = 20_000;

function clampPositiveInteger(value: unknown, fallback: number, max: number) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.min(Math.max(Math.floor(numberValue), 1), max);
}

function normalizeColumnList(value: string, columnLimit: number) {
  const indexes = new Set<number>();

  value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const [startText, endText] = part.split("-").map((item) => item.trim());
      const start = Number(startText);
      const end = Number(endText ?? startText);

      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        return;
      }

      const first = Math.min(start, end);
      const last = Math.max(start, end);

      for (let index = first; index <= last; index += 1) {
        if (index >= 1 && index <= columnLimit) {
          indexes.add(index - 1);
        }
      }
    });

  return Array.from(indexes).sort((left, right) => left - right);
}

function normalizeDelimitedRows(text: string, delimiter?: string) {
  const normalizedDelimiter =
    delimiter === "\\t" || delimiter === "tab" ? "\t" : delimiter?.[0];
  const fallbackDelimiter = text.includes("\t") ? "\t" : ",";
  const activeDelimiter = normalizedDelimiter ?? fallbackDelimiter;

  return text
    .split(/\r?\n/)
    .map((row) => row.split(activeDelimiter).map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell));
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function getHeaderIndex(headers: string[], key: string) {
  const numericKey = Number(key);

  if (Number.isInteger(numericKey) && numericKey >= 1) {
    return numericKey - 1;
  }

  const normalizedKey = normalizeKey(key);
  return headers.findIndex((header) => normalizeKey(header) === normalizedKey);
}

function getColumnValue(row: string[], headers: string[], key: string) {
  const index = getHeaderIndex(headers, key);

  return index >= 0 ? row[index] ?? "" : "";
}

function applyKeepColumns(rows: string[][], columns: string) {
  const columnLimit = Math.max(0, ...rows.map((row) => row.length));
  const indexes = normalizeColumnList(columns, columnLimit);

  return indexes.length === 0
    ? rows
    : rows.map((row) => indexes.map((index) => row[index] ?? ""));
}

function applyRemoveColumns(rows: string[][], columns: string) {
  const columnLimit = Math.max(0, ...rows.map((row) => row.length));
  const indexes = new Set(normalizeColumnList(columns, columnLimit));

  if (indexes.size === 0) {
    return rows;
  }

  return rows.map((row) => row.filter((_, index) => !indexes.has(index)));
}

function compareFilterValue({
  mode,
  needle,
  value,
}: {
  mode: ImportConnectorFilterMode;
  needle: string;
  value: string;
}) {
  const normalizedValue = value.trim();
  const normalizedNeedle = needle.trim();
  const lowerValue = normalizedValue.toLowerCase();
  const lowerNeedle = normalizedNeedle.toLowerCase();

  if (mode === "isBlank") {
    return normalizedValue === "";
  }

  if (mode === "isNotBlank") {
    return normalizedValue !== "";
  }

  if (!normalizedNeedle) {
    return true;
  }

  if (mode === "contains") {
    return lowerValue.includes(lowerNeedle);
  }

  if (mode === "equals") {
    return lowerValue === lowerNeedle;
  }

  if (mode === "notEquals") {
    return lowerValue !== lowerNeedle;
  }

  if (mode === "startsWith") {
    return lowerValue.startsWith(lowerNeedle);
  }

  if (mode === "endsWith") {
    return lowerValue.endsWith(lowerNeedle);
  }

  const numberValue = Number(normalizedValue.replace(/,/g, ""));
  const numberNeedle = Number(normalizedNeedle.replace(/,/g, ""));

  if (!Number.isFinite(numberValue) || !Number.isFinite(numberNeedle)) {
    return true;
  }

  return mode === "greaterThan"
    ? numberValue > numberNeedle
    : numberValue < numberNeedle;
}

function applyFilterRows(rows: string[][], step: ImportConnectorTransformStep) {
  if (rows.length <= 1) {
    return rows;
  }

  const [header, ...dataRows] = rows;
  const columnIndex = Math.max(0, (step.columnIndex ?? 1) - 1);
  const mode = step.mode ?? "contains";
  const value = step.value ?? "";

  return [
    header,
    ...dataRows.filter((row) =>
      compareFilterValue({
        mode,
        needle: value,
        value: row[columnIndex] ?? "",
      }),
    ),
  ];
}

function formatTypedValue(value: string, dataType: ImportConnectorDataType) {
  const trimmed = value.trim();

  if (!trimmed || dataType === "text") {
    return dataType === "text" ? value : "";
  }

  if (dataType === "number") {
    const numeric = Number(trimmed.replace(/[$,%\s]/g, "").replace(/,/g, ""));

    return Number.isFinite(numeric) ? String(numeric) : value;
  }

  if (dataType === "date") {
    const date = new Date(trimmed);

    return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
  }

  const normalized = trimmed.toLowerCase();

  if (["1", "true", "yes", "y"].includes(normalized)) {
    return "TRUE";
  }

  if (["0", "false", "no", "n"].includes(normalized)) {
    return "FALSE";
  }

  return value;
}

function applyChangeType(rows: string[][], step: ImportConnectorTransformStep) {
  if (rows.length <= 1) {
    return rows;
  }

  const [header, ...dataRows] = rows;
  const columnIndex = Math.max(0, (step.columnIndex ?? 1) - 1);
  const dataType = step.dataType ?? "text";

  return [
    header,
    ...dataRows.map((row) =>
      row.map((cell, index) =>
        index === columnIndex ? formatTypedValue(cell, dataType) : cell,
      ),
    ),
  ];
}

function applySplitColumn(rows: string[][], step: ImportConnectorTransformStep) {
  const columnIndex = Math.max(0, (step.columnIndex ?? 1) - 1);
  const delimiter = step.delimiter || ",";
  const partCount = clampPositiveInteger(step.count, 2, 20);

  return rows.map((row, rowIndex) => {
    const sourceValue = row[columnIndex] ?? "";
    const parts =
      rowIndex === 0
        ? Array.from({ length: partCount }, (_, index) =>
            `${sourceValue || `Column ${columnIndex + 1}`} ${index + 1}`,
          )
        : sourceValue.split(delimiter).slice(0, partCount);
    const paddedParts = Array.from(
      { length: partCount },
      (_, index) => parts[index]?.trim() ?? "",
    );

    return [
      ...row.slice(0, columnIndex),
      ...paddedParts,
      ...row.slice(columnIndex + 1),
    ];
  });
}

function aggregateValues(
  values: string[],
  aggregate: ImportConnectorAggregate = "count",
) {
  if (aggregate === "count") {
    return String(values.length);
  }

  if (aggregate === "first") {
    return values.find((value) => value.trim()) ?? "";
  }

  const numbers = values
    .map((value) => Number(value.replace(/,/g, "")))
    .filter(Number.isFinite);

  if (numbers.length === 0) {
    return "";
  }

  if (aggregate === "sum") {
    return String(numbers.reduce((total, value) => total + value, 0));
  }

  if (aggregate === "average") {
    return String(numbers.reduce((total, value) => total + value, 0) / numbers.length);
  }

  return String(
    aggregate === "min" ? Math.min(...numbers) : Math.max(...numbers),
  );
}

function applyGroupBy(rows: string[][], step: ImportConnectorTransformStep) {
  if (rows.length <= 1) {
    return rows;
  }

  const [header, ...dataRows] = rows;
  const groupIndexes = normalizeColumnList(step.columns || "1", header.length);
  const valueIndex = Math.max(0, (step.columnIndex ?? 1) - 1);
  const aggregate = step.aggregate ?? "count";

  if (groupIndexes.length === 0) {
    return rows;
  }

  const groups = new Map<string, { keys: string[]; values: string[] }>();

  dataRows.forEach((row) => {
    const keys = groupIndexes.map((index) => row[index] ?? "");
    const groupKey = JSON.stringify(keys);
    const existing = groups.get(groupKey);
    const value = aggregate === "count" ? "1" : row[valueIndex] ?? "";

    if (existing) {
      existing.values.push(value);
    } else {
      groups.set(groupKey, { keys, values: [value] });
    }
  });

  const valueHeader = header[valueIndex] ?? `Column ${valueIndex + 1}`;

  return [
    [
      ...groupIndexes.map((index) => header[index] ?? `Column ${index + 1}`),
      `${aggregate} ${valueHeader}`,
    ],
    ...Array.from(groups.values()).map((group) => [
      ...group.keys,
      aggregateValues(group.values, aggregate),
    ]),
  ];
}

function applyCustomColumn(rows: string[][], step: ImportConnectorTransformStep) {
  if (rows.length === 0) {
    return rows;
  }

  const [header, ...dataRows] = rows;
  const template = step.value ?? "";
  const columnName = step.name?.trim() || "Custom";

  return [
    [...header, columnName],
    ...dataRows.map((row) => [
      ...row,
      template.replace(
        /\{\{\s*([^}]+?)\s*\}\}|\{\s*([^}]+?)\s*\}/g,
        (_match, doubleKey: string | undefined, singleKey: string | undefined) =>
          getColumnValue(row, header, doubleKey ?? singleKey ?? ""),
      ),
    ]),
  ];
}

function applyAppendRows(rows: string[][], step: ImportConnectorTransformStep) {
  const appendedRows = normalizeDelimitedRows(step.value ?? "", step.delimiter);

  if (appendedRows.length === 0) {
    return rows;
  }

  const [header] = rows;
  const rowsToAppend =
    header &&
    appendedRows[0]?.length === header.length &&
    appendedRows[0].every(
      (cell, index) => normalizeKey(cell) === normalizeKey(header[index] ?? ""),
    )
      ? appendedRows.slice(1)
      : appendedRows;

  return [...rows, ...rowsToAppend];
}

function applyMergeLookup(rows: string[][], step: ImportConnectorTransformStep) {
  if (rows.length === 0) {
    return rows;
  }

  const lookupRows = normalizeDelimitedRows(step.value ?? "", step.delimiter);

  if (lookupRows.length === 0) {
    return rows;
  }

  const sourceIndex = Math.max(0, (step.columnIndex ?? 1) - 1);
  const returnIndex = Math.max(0, (step.targetColumnIndex ?? 2) - 1);
  const [lookupHeader, ...lookupDataRows] = lookupRows;
  const outputHeader =
    step.name?.trim() ||
    lookupHeader?.[returnIndex] ||
    `Lookup ${returnIndex + 1}`;
  const lookupValues = new Map(
    lookupDataRows.map((row) => [normalizeKey(row[0] ?? ""), row[returnIndex] ?? ""]),
  );

  return rows.map((row, rowIndex) => [
    ...row,
    rowIndex === 0
      ? outputHeader
      : lookupValues.get(normalizeKey(row[sourceIndex] ?? "")) ?? "",
  ]);
}

function applyUnpivotColumns(rows: string[][], step: ImportConnectorTransformStep) {
  if (rows.length <= 1) {
    return rows;
  }

  const [header, ...dataRows] = rows;
  const keyIndexes = normalizeColumnList(step.columns || "1", header.length);
  const valueIndexes = step.value
    ? normalizeColumnList(step.value, header.length)
    : header
        .map((_column, index) => index)
        .filter((index) => !keyIndexes.includes(index));

  if (keyIndexes.length === 0 || valueIndexes.length === 0) {
    return rows;
  }

  return [
    [
      ...keyIndexes.map((index) => header[index] ?? `Column ${index + 1}`),
      "Attribute",
      "Value",
    ],
    ...dataRows
      .flatMap((row) =>
        valueIndexes.map((valueIndex) => [
          ...keyIndexes.map((keyIndex) => row[keyIndex] ?? ""),
          header[valueIndex] ?? `Column ${valueIndex + 1}`,
          row[valueIndex] ?? "",
        ]),
      )
      .slice(0, maxGeneratedRows),
  ];
}

function applyPivotColumns(rows: string[][], step: ImportConnectorTransformStep) {
  if (rows.length <= 1) {
    return rows;
  }

  const [header, ...dataRows] = rows;
  const keyIndexes = normalizeColumnList(step.columns || "1", header.length);
  const attributeIndex = Math.max(0, (step.columnIndex ?? 2) - 1);
  const valueIndex = Math.max(0, (step.targetColumnIndex ?? 3) - 1);
  const aggregate = step.aggregate ?? "sum";

  if (keyIndexes.length === 0) {
    return rows;
  }

  const attributes = Array.from(
    dataRows.reduce<Set<string>>((values, row) => {
      const attribute = row[attributeIndex]?.trim();

      if (attribute) {
        values.add(attribute);
      }

      return values;
    }, new Set()),
  ).slice(0, 100);
  const groups = new Map<
    string,
    { byAttribute: Map<string, string[]>; keys: string[] }
  >();

  dataRows.forEach((row) => {
    const keys = keyIndexes.map((index) => row[index] ?? "");
    const groupKey = JSON.stringify(keys);
    const attribute = row[attributeIndex] ?? "";
    const value = row[valueIndex] ?? "";
    const group =
      groups.get(groupKey) ?? { byAttribute: new Map<string, string[]>(), keys };
    const existingValues = group.byAttribute.get(attribute) ?? [];

    existingValues.push(value);
    group.byAttribute.set(attribute, existingValues);
    groups.set(groupKey, group);
  });

  return [
    [
      ...keyIndexes.map((index) => header[index] ?? `Column ${index + 1}`),
      ...attributes,
    ],
    ...Array.from(groups.values()).map((group) => [
      ...group.keys,
      ...attributes.map((attribute) =>
        aggregateValues(group.byAttribute.get(attribute) ?? [], aggregate),
      ),
    ]),
  ];
}

export function applyConnectorTransformStep(
  rows: string[][],
  step: ImportConnectorTransformStep,
) {
  if (step.type === "trimCells") {
    return rows.map((row) => row.map((cell) => cell.trim()));
  }

  if (step.type === "removeEmptyRows") {
    return rows.filter((row) => row.some((cell) => cell.trim()));
  }

  if (step.type === "removeTopRows") {
    return rows.slice(step.count ?? 1);
  }

  if (step.type === "keepColumns") {
    return applyKeepColumns(rows, step.columns ?? "");
  }

  if (step.type === "removeColumns") {
    return applyRemoveColumns(rows, step.columns ?? "");
  }

  if (step.type === "filterRows") {
    return applyFilterRows(rows, step);
  }

  if (step.type === "splitColumn") {
    return applySplitColumn(rows, step);
  }

  if (step.type === "changeType") {
    return applyChangeType(rows, step);
  }

  if (step.type === "groupBy") {
    return applyGroupBy(rows, step);
  }

  if (step.type === "appendRows") {
    return applyAppendRows(rows, step);
  }

  if (step.type === "mergeLookup") {
    return applyMergeLookup(rows, step);
  }

  if (step.type === "unpivotColumns") {
    return applyUnpivotColumns(rows, step);
  }

  if (step.type === "pivotColumns") {
    return applyPivotColumns(rows, step);
  }

  if (step.type === "customColumn") {
    return applyCustomColumn(rows, step);
  }

  const needle = (step.value ?? "").toLowerCase();

  if (!needle) {
    return rows;
  }

  return rows.filter((row) =>
    (row[(step.columnIndex ?? 1) - 1] ?? "").toLowerCase().includes(needle),
  );
}
