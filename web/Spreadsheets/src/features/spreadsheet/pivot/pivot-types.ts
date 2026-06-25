import type { ChartRange } from "@/features/workbooks/types";

export type PivotFieldValueType = "empty" | "number" | "date" | "text";

export type PivotField = {
  id: string;
  name: string;
  sampleValues: string[];
  sourceColumnIndex: number;
  valueType: PivotFieldValueType;
};

export type PivotSourceRecord = {
  rowIndex: number;
  values: Record<string, string>;
};

export type PivotSourceModel = {
  fields: PivotField[];
  range: ChartRange;
  records: PivotSourceRecord[];
  sheetId: string;
  storage?: PivotSourceStorageStats;
};

export type PivotSourceStorageStats = {
  columnCount: number;
  compressionRatio: number;
  dictionaryValueCount: number;
  encodedCellCount: number;
  estimatedBytes: number;
  maxRowCount: number;
  mode: "columnar";
  rawCellCount: number;
  relationshipIndexCount: number;
  repeatedValueSavings: number;
  rowCount: number;
  segmentCount: number;
  segmentRowCount: number;
  tableId?: string;
};

export type PivotAggregation = "sum" | "count" | "average" | "min" | "max";

export type PivotValueField = {
  aggregation: PivotAggregation;
  fieldId: string;
  label: string;
};

export type PivotFieldListState = {
  availableFields: PivotField[];
  columnFieldIds: string[];
  filterFieldIds: string[];
  rowFieldIds: string[];
  valueFields: PivotValueField[];
};

export type PivotFieldRole = "available" | "row" | "column" | "filter" | "value";

export type PivotAggregationCell = {
  columnKey: string;
  rowKey: string;
  values: Record<string, number>;
};

export type PivotSubtotalGroup = {
  columnTotals: Record<string, Record<string, number>>;
  label: string;
  level: number;
  totals: Record<string, number>;
};

export type PivotAggregationResult = {
  cells: PivotAggregationCell[];
  columnFields: PivotField[];
  columnKeys: string[];
  columnTotals: Record<string, Record<string, number>>;
  grandTotals: Record<string, number>;
  rowFields: PivotField[];
  rowKeys: string[];
  rowKeyPaths: Record<string, string[]>;
  rowSubtotals: Record<string, PivotSubtotalGroup>;
  rowTotals: Record<string, Record<string, number>>;
  valueFields: PivotValueField[];
};
