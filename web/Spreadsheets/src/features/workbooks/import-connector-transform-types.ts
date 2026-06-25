export type ImportConnectorTransformType =
  | "trimCells"
  | "removeEmptyRows"
  | "removeTopRows"
  | "keepColumns"
  | "removeColumns"
  | "filterContains"
  | "filterRows"
  | "splitColumn"
  | "changeType"
  | "groupBy"
  | "appendRows"
  | "mergeLookup"
  | "unpivotColumns"
  | "pivotColumns"
  | "customColumn";

export type ImportConnectorFilterMode =
  | "contains"
  | "equals"
  | "notEquals"
  | "startsWith"
  | "endsWith"
  | "greaterThan"
  | "lessThan"
  | "isBlank"
  | "isNotBlank";

export type ImportConnectorDataType = "text" | "number" | "date" | "boolean";

export type ImportConnectorAggregate =
  | "count"
  | "sum"
  | "average"
  | "min"
  | "max"
  | "first";

export type ImportConnectorTransformStep = {
  id: string;
  type: ImportConnectorTransformType;
  aggregate?: ImportConnectorAggregate;
  count?: number;
  columnIndex?: number;
  columns?: string;
  dataType?: ImportConnectorDataType;
  delimiter?: string;
  mode?: ImportConnectorFilterMode;
  name?: string;
  targetColumnIndex?: number;
  value?: string;
};

export const maxTransformSteps = 12;

export const transformTypes = new Set<ImportConnectorTransformType>([
  "trimCells",
  "removeEmptyRows",
  "removeTopRows",
  "keepColumns",
  "removeColumns",
  "filterContains",
  "filterRows",
  "splitColumn",
  "changeType",
  "groupBy",
  "appendRows",
  "mergeLookup",
  "unpivotColumns",
  "pivotColumns",
  "customColumn",
]);

export const filterModes = new Set<ImportConnectorFilterMode>([
  "contains",
  "equals",
  "notEquals",
  "startsWith",
  "endsWith",
  "greaterThan",
  "lessThan",
  "isBlank",
  "isNotBlank",
]);

export const dataTypes = new Set<ImportConnectorDataType>([
  "text",
  "number",
  "date",
  "boolean",
]);

export const aggregateTypes = new Set<ImportConnectorAggregate>([
  "count",
  "sum",
  "average",
  "min",
  "max",
  "first",
]);
