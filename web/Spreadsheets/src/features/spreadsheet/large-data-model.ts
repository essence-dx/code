import { evaluateWorkbook } from "@/features/spreadsheet/formula-engine";
import { createPivotSourceModel } from "@/features/spreadsheet/pivot/pivot-source";
import type {
  PivotField,
  PivotSourceModel,
  PivotSourceRecord,
  PivotSourceStorageStats,
} from "@/features/spreadsheet/pivot/pivot-types";
import type {
  ChartRange,
  SheetData,
  TableDefinition,
  WorkbookDataModelStorageSettings,
  WorkbookDocument,
} from "@/features/workbooks/types";

export type LargeDataModelColumn = {
  dictionary: string[];
  field: PivotField;
  valueIndexes: Uint32Array;
};

export type LargeDataModelTable = {
  columns: LargeDataModelColumn[];
  fieldIndexById: Map<string, number>;
  fields: PivotField[];
  range: ChartRange;
  rowCount: number;
  rowIndexes: number[];
  sheetId: string;
  storageSettings: WorkbookDataModelStorageSettings;
  tableId?: string;
};

export type LargeDataModelWorkbookStats = PivotSourceStorageStats & {
  tableCount: number;
};

export const defaultLargeDataModelStorageSettings: WorkbookDataModelStorageSettings =
  {
    maxRows: 10_000_000,
    mode: "automatic",
    segmentRowCount: 100_000,
  };

export function resolveLargeDataModelStorageSettings(
  settings?: Partial<WorkbookDataModelStorageSettings>,
): WorkbookDataModelStorageSettings {
  const segmentRowCount = Number(settings?.segmentRowCount);
  const maxRows = Number(settings?.maxRows);

  return {
    maxRows: Number.isFinite(maxRows)
      ? Math.min(Math.max(Math.round(maxRows), 1_048_576), 50_000_000)
      : defaultLargeDataModelStorageSettings.maxRows,
    mode: settings?.mode === "columnar" ? "columnar" : "automatic",
    segmentRowCount: Number.isFinite(segmentRowCount)
      ? Math.min(Math.max(Math.round(segmentRowCount), 1), 1_000_000)
      : defaultLargeDataModelStorageSettings.segmentRowCount,
  };
}

function normalizeLookupKey(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function createCompressedColumn(field: PivotField, values: string[]) {
  const dictionary: string[] = [];
  const dictionaryIndexes = new Map<string, number>();
  const valueIndexes = new Uint32Array(values.length);

  values.forEach((value, rowOffset) => {
    let dictionaryIndex = dictionaryIndexes.get(value);

    if (dictionaryIndex === undefined) {
      dictionaryIndex = dictionary.length;
      dictionaryIndexes.set(value, dictionaryIndex);
      dictionary.push(value);
    }

    valueIndexes[rowOffset] = dictionaryIndex;
  });

  return {
    dictionary,
    field,
    valueIndexes,
  };
}

export function createLargeDataModelTable({
  computedValues,
  range,
  sheet,
  storageSettings,
  tableId,
}: {
  computedValues: Record<string, string>;
  range: ChartRange;
  sheet: SheetData;
  storageSettings?: Partial<WorkbookDataModelStorageSettings>;
  tableId?: string;
}): LargeDataModelTable {
  const source = createPivotSourceModel({ computedValues, range, sheet });
  const resolvedStorageSettings =
    resolveLargeDataModelStorageSettings(storageSettings);
  const columns = source.fields.map((field) =>
    createCompressedColumn(
      field,
      source.records.map((record) => record.values[field.id] ?? ""),
    ),
  );

  return {
    columns,
    fieldIndexById: new Map(
      source.fields.map((field, index) => [field.id, index]),
    ),
    fields: source.fields,
    range,
    rowCount: source.records.length,
    rowIndexes: source.records.map((record) => record.rowIndex),
    sheetId: sheet.id,
    storageSettings: resolvedStorageSettings,
    ...(tableId ? { tableId } : {}),
  };
}

export function getLargeDataModelValue(
  model: LargeDataModelTable,
  fieldId: string,
  rowOffset: number,
) {
  const columnIndex = model.fieldIndexById.get(fieldId);

  if (columnIndex === undefined) {
    return "";
  }

  const column = model.columns[columnIndex];
  const dictionaryIndex = column?.valueIndexes[rowOffset];

  if (column === undefined || dictionaryIndex === undefined) {
    return "";
  }

  return column.dictionary[dictionaryIndex] ?? "";
}

export function* streamLargeDataModelRecords(
  model: LargeDataModelTable,
): Generator<PivotSourceRecord> {
  for (let rowOffset = 0; rowOffset < model.rowCount; rowOffset += 1) {
    const values = model.fields.reduce<Record<string, string>>((items, field) => {
      items[field.id] = getLargeDataModelValue(model, field.id, rowOffset);
      return items;
    }, {});

    yield {
      rowIndex: model.rowIndexes[rowOffset] ?? rowOffset,
      values,
    };
  }
}

export function createLargeDataModelLookupIndex(
  model: LargeDataModelTable,
  fieldId: string,
) {
  const lookup = new Map<string, number>();

  for (let rowOffset = 0; rowOffset < model.rowCount; rowOffset += 1) {
    const key = normalizeLookupKey(
      getLargeDataModelValue(model, fieldId, rowOffset),
    );

    if (key && !lookup.has(key)) {
      lookup.set(key, rowOffset);
    }
  }

  return lookup;
}

export function getLargeDataModelStorageStats(
  model: LargeDataModelTable,
  relationshipIndexCount = 0,
): PivotSourceStorageStats {
  const rawCellCount = model.rowCount * model.columns.length;
  const dictionaryValueCount = model.columns.reduce(
    (total, column) => total + column.dictionary.length,
    0,
  );
  const segmentRowCount = model.storageSettings.segmentRowCount;
  const segmentCount =
    model.rowCount === 0 ? 0 : Math.ceil(model.rowCount / segmentRowCount);
  const estimatedBytes =
    dictionaryValueCount * 32 + rawCellCount * 4 + model.columns.length * 128;
  const compressionRatio =
    rawCellCount === 0 ? 1 : dictionaryValueCount / rawCellCount;

  return {
    columnCount: model.columns.length,
    compressionRatio,
    dictionaryValueCount,
    encodedCellCount: rawCellCount,
    estimatedBytes,
    maxRowCount: model.storageSettings.maxRows,
    mode: "columnar",
    rawCellCount,
    relationshipIndexCount,
    repeatedValueSavings: Math.max(0, rawCellCount - dictionaryValueCount),
    rowCount: model.rowCount,
    segmentCount,
    segmentRowCount,
    ...(model.tableId ? { tableId: model.tableId } : {}),
  };
}

export function createPivotSourceModelFromLargeDataModel(
  model: LargeDataModelTable,
): PivotSourceModel {
  return {
    fields: [...model.fields],
    range: model.range,
    records: Array.from(streamLargeDataModelRecords(model)),
    sheetId: model.sheetId,
    storage: getLargeDataModelStorageStats(model),
  };
}

function getSheetById(document: WorkbookDocument, sheetId: string) {
  return document.sheets.find((sheet) => sheet.id === sheetId) ?? null;
}

function readSheetValues({
  activeSheetId,
  computedValues,
  document,
  sheetId,
}: {
  activeSheetId?: string;
  computedValues?: Record<string, string>;
  document: WorkbookDocument;
  sheetId: string;
}) {
  if (activeSheetId === sheetId && computedValues) {
    return computedValues;
  }

  return evaluateWorkbook(document, sheetId);
}

export function getLargeDataModelWorkbookStats({
  activeSheetId,
  computedValues,
  document,
}: {
  activeSheetId?: string;
  computedValues?: Record<string, string>;
  document: WorkbookDocument;
}): LargeDataModelWorkbookStats {
  const tableStats = (document.tables ?? []).flatMap((table) => {
    const sheet = getSheetById(document, table.sheetId);

    if (!sheet) {
      return [];
    }

    return [
      getLargeDataModelStorageStats(
        createLargeDataModelTable({
          computedValues: readSheetValues({
            activeSheetId,
            computedValues,
            document,
            sheetId: sheet.id,
          }),
          range: table.range,
          sheet,
          storageSettings: document.dataModelStorage,
          tableId: table.id,
        }),
      ),
    ];
  });
  const relationshipIndexCount = (document.dataModelRelationships ?? []).filter(
    (relationship) => relationship.active,
  ).length;
  const rawCellCount = tableStats.reduce(
    (total, stats) => total + stats.rawCellCount,
    0,
  );
  const dictionaryValueCount = tableStats.reduce(
    (total, stats) => total + stats.dictionaryValueCount,
    0,
  );
  const columnCount = tableStats.reduce(
    (total, stats) => total + stats.columnCount,
    0,
  );
  const rowCount = tableStats.reduce((total, stats) => total + stats.rowCount, 0);
  const segmentCount = tableStats.reduce(
    (total, stats) => total + stats.segmentCount,
    0,
  );
  const estimatedBytes = tableStats.reduce(
    (total, stats) => total + stats.estimatedBytes,
    0,
  );
  const storageSettings = resolveLargeDataModelStorageSettings(
    document.dataModelStorage,
  );

  return {
    columnCount,
    compressionRatio:
      rawCellCount === 0 ? 1 : dictionaryValueCount / rawCellCount,
    dictionaryValueCount,
    encodedCellCount: rawCellCount,
    estimatedBytes,
    maxRowCount: storageSettings.maxRows,
    mode: "columnar",
    rawCellCount,
    relationshipIndexCount,
    repeatedValueSavings: Math.max(0, rawCellCount - dictionaryValueCount),
    rowCount,
    segmentCount,
    segmentRowCount: storageSettings.segmentRowCount,
    tableCount: tableStats.length,
  };
}

export function getLargeDataModelTableForWorkbookTable({
  computedValues,
  document,
  table,
}: {
  computedValues: Record<string, string>;
  document: WorkbookDocument;
  table: TableDefinition;
}) {
  const sheet = getSheetById(document, table.sheetId);

  if (!sheet) {
    return null;
  }

  return createLargeDataModelTable({
    computedValues,
    range: table.range,
    sheet,
    storageSettings: document.dataModelStorage,
    tableId: table.id,
  });
}
