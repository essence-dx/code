import type {
  PivotAggregation,
  PivotAggregationCell,
  PivotAggregationResult,
  PivotField,
  PivotFieldListState,
  PivotSourceModel,
  PivotSourceRecord,
  PivotValueField,
} from "@/features/spreadsheet/pivot/pivot-types";

type AggregateBucket = {
  count: number;
  max: number | null;
  min: number | null;
  sum: number;
};

const TOTAL_KEY = "__total__";

function getFieldsById(source: PivotSourceModel) {
  return new Map(source.fields.map((field) => [field.id, field]));
}

function getOrderedFields(fieldIds: string[], fieldsById: Map<string, PivotField>) {
  return fieldIds
    .map((fieldId) => fieldsById.get(fieldId))
    .filter((field): field is PivotField => Boolean(field));
}

function normalizeGroupValue(value: string) {
  const trimmed = value.trim();

  return trimmed || "(blank)";
}

function createGroupValues(record: PivotSourceRecord, fieldIds: string[]) {
  return fieldIds.map((fieldId) =>
    normalizeGroupValue(record.values[fieldId] ?? ""),
  );
}

function createGroupKey(values: string[]) {
  if (values.length === 0) {
    return TOTAL_KEY;
  }

  return JSON.stringify(values);
}

function getDisplayKey(key: string) {
  if (key === TOTAL_KEY) {
    return "Total";
  }

  try {
    const values = JSON.parse(key) as string[];

    return values.join(" / ");
  } catch {
    return key;
  }
}

function getKeyParts(key: string) {
  if (key === TOTAL_KEY) {
    return [];
  }

  try {
    const values = JSON.parse(key) as string[];

    return Array.isArray(values) ? values.map(String) : [getDisplayKey(key)];
  } catch {
    return [key];
  }
}

function createBucket(): AggregateBucket {
  return {
    count: 0,
    max: null,
    min: null,
    sum: 0,
  };
}

function addValue(bucket: AggregateBucket, rawValue: string) {
  const numericValue = Number(rawValue);

  if (rawValue.trim() === "") {
    return;
  }

  bucket.count += 1;

  if (!Number.isFinite(numericValue)) {
    return;
  }

  bucket.sum += numericValue;
  bucket.min = bucket.min === null ? numericValue : Math.min(bucket.min, numericValue);
  bucket.max = bucket.max === null ? numericValue : Math.max(bucket.max, numericValue);
}

function calculateBucketValue(
  bucket: AggregateBucket,
  aggregation: PivotAggregation,
) {
  if (aggregation === "count") {
    return bucket.count;
  }

  if (aggregation === "average") {
    return bucket.count === 0 ? 0 : bucket.sum / bucket.count;
  }

  if (aggregation === "min") {
    return bucket.min ?? 0;
  }

  if (aggregation === "max") {
    return bucket.max ?? 0;
  }

  return bucket.sum;
}

function getBucketKey(
  rowKey: string,
  columnKey: string,
  valueField: PivotValueField,
) {
  return `${rowKey}\u001f${columnKey}\u001f${valueField.fieldId}\u001f${valueField.aggregation}`;
}

function getBucket(
  buckets: Map<string, AggregateBucket>,
  rowKey: string,
  columnKey: string,
  valueField: PivotValueField,
) {
  const key = getBucketKey(rowKey, columnKey, valueField);
  const bucket = buckets.get(key) ?? createBucket();

  buckets.set(key, bucket);
  return bucket;
}

function addSortedKey(keys: Set<string>, key: string) {
  keys.add(key);
}

function createTotalsByKey(
  keys: string[],
  buckets: Map<string, AggregateBucket>,
  valueFields: PivotValueField[],
  getKey: (key: string, valueField: PivotValueField) => string,
) {
  return keys.reduce<Record<string, Record<string, number>>>((items, key) => {
    items[getDisplayKey(key)] = valueFields.reduce<Record<string, number>>(
      (values, valueField) => {
        const bucket = buckets.get(getKey(key, valueField));

        values[valueField.label] = bucket
          ? calculateBucketValue(bucket, valueField.aggregation)
          : 0;
        return values;
      },
      {},
    );

    return items;
  }, {});
}

function createSubtotalGroups({
  columnKeys,
  subtotalBuckets,
  subtotalKeys,
  subtotalTotalBuckets,
  valueFields,
}: {
  columnKeys: string[];
  subtotalBuckets: Map<string, AggregateBucket>;
  subtotalKeys: string[];
  subtotalTotalBuckets: Map<string, AggregateBucket>;
  valueFields: PivotValueField[];
}) {
  return subtotalKeys.reduce<PivotAggregationResult["rowSubtotals"]>(
    (items, subtotalKey) => {
      const displayKey = getDisplayKey(subtotalKey);
      const path = getKeyParts(subtotalKey);

      items[displayKey] = {
        columnTotals: columnKeys.reduce<Record<string, Record<string, number>>>(
          (columns, columnKey) => {
            columns[getDisplayKey(columnKey)] = valueFields.reduce<
              Record<string, number>
            >((values, valueField) => {
              const bucket = subtotalBuckets.get(
                getBucketKey(subtotalKey, columnKey, valueField),
              );

              values[valueField.label] = bucket
                ? calculateBucketValue(bucket, valueField.aggregation)
                : 0;
              return values;
            }, {});
            return columns;
          },
          {},
        ),
        label: displayKey,
        level: path.length,
        totals: valueFields.reduce<Record<string, number>>((values, valueField) => {
          const bucket = subtotalTotalBuckets.get(
            getBucketKey(subtotalKey, TOTAL_KEY, valueField),
          );

          values[valueField.label] = bucket
            ? calculateBucketValue(bucket, valueField.aggregation)
            : 0;
          return values;
        }, {}),
      };

      return items;
    },
    {},
  );
}

export function aggregatePivotSource(
  source: PivotSourceModel,
  layout: PivotFieldListState,
): PivotAggregationResult {
  const fieldsById = getFieldsById(source);
  const rowFields = getOrderedFields(layout.rowFieldIds, fieldsById);
  const columnFields = getOrderedFields(layout.columnFieldIds, fieldsById);
  const valueFields = layout.valueFields.filter((valueField) =>
    fieldsById.has(valueField.fieldId),
  );
  const rowKeys = new Set<string>();
  const columnKeys = new Set<string>();
  const buckets = new Map<string, AggregateBucket>();
  const rowSubtotalBuckets = new Map<string, AggregateBucket>();
  const rowSubtotalKeys = new Set<string>();
  const rowSubtotalTotalBuckets = new Map<string, AggregateBucket>();
  const rowTotalBuckets = new Map<string, AggregateBucket>();
  const columnTotalBuckets = new Map<string, AggregateBucket>();
  const grandTotalBuckets = new Map<string, AggregateBucket>();

  for (const record of source.records) {
    const rowGroupValues = createGroupValues(record, layout.rowFieldIds);
    const columnGroupValues = createGroupValues(record, layout.columnFieldIds);
    const rowKey = createGroupKey(rowGroupValues);
    const columnKey = createGroupKey(columnGroupValues);
    const rowSubtotalKeysForRecord = rowGroupValues
      .slice(0, -1)
      .map((_, index) => createGroupKey(rowGroupValues.slice(0, index + 1)));

    addSortedKey(rowKeys, rowKey);
    addSortedKey(columnKeys, columnKey);

    for (const valueField of valueFields) {
      const rawValue = record.values[valueField.fieldId] ?? "";

      addValue(getBucket(buckets, rowKey, columnKey, valueField), rawValue);
      for (const subtotalKey of rowSubtotalKeysForRecord) {
        addSortedKey(rowSubtotalKeys, subtotalKey);
        addValue(
          getBucket(rowSubtotalBuckets, subtotalKey, columnKey, valueField),
          rawValue,
        );
        addValue(
          getBucket(rowSubtotalTotalBuckets, subtotalKey, TOTAL_KEY, valueField),
          rawValue,
        );
      }
      addValue(getBucket(rowTotalBuckets, rowKey, TOTAL_KEY, valueField), rawValue);
      addValue(
        getBucket(columnTotalBuckets, TOTAL_KEY, columnKey, valueField),
        rawValue,
      );
      addValue(
        getBucket(grandTotalBuckets, TOTAL_KEY, TOTAL_KEY, valueField),
        rawValue,
      );
    }
  }

  const sortedRowKeys = Array.from(rowKeys).sort((left, right) =>
    getDisplayKey(left).localeCompare(getDisplayKey(right)),
  );
  const sortedColumnKeys = Array.from(columnKeys).sort((left, right) =>
    getDisplayKey(left).localeCompare(getDisplayKey(right)),
  );
  const sortedSubtotalKeys = Array.from(rowSubtotalKeys).sort((left, right) =>
    getDisplayKey(left).localeCompare(getDisplayKey(right)),
  );
  const cells = sortedRowKeys.flatMap<PivotAggregationCell>((rowKey) =>
    sortedColumnKeys.map((columnKey) => {
      const values = valueFields.reduce<Record<string, number>>(
        (items, valueField) => {
          const bucket = buckets.get(getBucketKey(rowKey, columnKey, valueField));

          items[valueField.label] = bucket
            ? calculateBucketValue(bucket, valueField.aggregation)
            : 0;
          return items;
        },
        {},
      );

      return {
        columnKey: getDisplayKey(columnKey),
        rowKey: getDisplayKey(rowKey),
        values,
      };
    }),
  );
  const rowTotals = createTotalsByKey(
    sortedRowKeys,
    rowTotalBuckets,
    valueFields,
    (rowKey, valueField) => getBucketKey(rowKey, TOTAL_KEY, valueField),
  );
  const rowKeyPaths = sortedRowKeys.reduce<Record<string, string[]>>(
    (items, rowKey) => {
      items[getDisplayKey(rowKey)] = getKeyParts(rowKey);
      return items;
    },
    {},
  );
  const rowSubtotals = createSubtotalGroups({
    columnKeys: sortedColumnKeys,
    subtotalBuckets: rowSubtotalBuckets,
    subtotalKeys: sortedSubtotalKeys,
    subtotalTotalBuckets: rowSubtotalTotalBuckets,
    valueFields,
  });
  const columnTotals = createTotalsByKey(
    sortedColumnKeys,
    columnTotalBuckets,
    valueFields,
    (columnKey, valueField) => getBucketKey(TOTAL_KEY, columnKey, valueField),
  );
  const grandTotals = valueFields.reduce<Record<string, number>>(
    (items, valueField) => {
      const bucket = grandTotalBuckets.get(
        getBucketKey(TOTAL_KEY, TOTAL_KEY, valueField),
      );

      items[valueField.label] = bucket
        ? calculateBucketValue(bucket, valueField.aggregation)
        : 0;
      return items;
    },
    {},
  );

  return {
    cells,
    columnFields,
    columnKeys: sortedColumnKeys.map(getDisplayKey),
    columnTotals,
    grandTotals,
    rowFields,
    rowKeys: sortedRowKeys.map(getDisplayKey),
    rowKeyPaths,
    rowSubtotals,
    rowTotals,
    valueFields,
  };
}
