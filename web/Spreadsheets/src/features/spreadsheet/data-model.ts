import { cellKey, columnLabel } from "@/features/workbooks/addresses";
import { evaluateWorkbook } from "@/features/spreadsheet/formula-engine";
import {
  createLargeDataModelLookupIndex,
  createLargeDataModelTable,
  createPivotSourceModelFromLargeDataModel,
  getLargeDataModelStorageStats,
  getLargeDataModelValue,
} from "@/features/spreadsheet/large-data-model";
import { createDataModelViewFieldDescriptors } from "@/features/spreadsheet/data-model-view";
import { createPivotSourceModel } from "@/features/spreadsheet/pivot/pivot-source";
import type { PivotSourceModel } from "@/features/spreadsheet/pivot/pivot-types";
import type {
  PivotTableDefinition,
  SheetData,
  TableDefinition,
  WorkbookDataModelRelationship,
  WorkbookDocument,
} from "@/features/workbooks/types";

export type DataModelRelationshipDraft = {
  cardinality?: WorkbookDataModelRelationship["cardinality"];
  fromColumnIndex: number;
  fromTableId: string;
  toColumnIndex: number;
  toTableId: string;
};

export type DataModelRelationshipIssue = {
  id: string;
  relationshipId?: string;
  severity: "error" | "warning";
  title: string;
  details: string;
  tableId?: string;
};

export type DataModelTableColumn = {
  columnIndex: number;
  name: string;
  tableId: string;
  tableName: string;
};

type SheetValueReader = (sheetId: string) => Record<string, string>;

function getTableById(document: WorkbookDocument, tableId: string) {
  return (document.tables ?? []).find((table) => table.id === tableId) ?? null;
}

function getSheetById(document: WorkbookDocument, sheetId: string) {
  return document.sheets.find((sheet) => sheet.id === sheetId) ?? null;
}

function getCellDisplayValue({
  columnIndex,
  rowIndex,
  sheet,
  values,
}: {
  columnIndex: number;
  rowIndex: number;
  sheet: SheetData;
  values: Record<string, string>;
}) {
  const key = cellKey(rowIndex, columnIndex);

  return values[key] ?? sheet.cells[key]?.raw ?? "";
}

function createSheetValueReader({
  activeSheetId,
  computedValues,
  document,
}: {
  activeSheetId?: string;
  computedValues?: Record<string, string>;
  document: WorkbookDocument;
}): SheetValueReader {
  const cache = new Map<string, Record<string, string>>();

  if (activeSheetId && computedValues) {
    cache.set(activeSheetId, computedValues);
  }

  return (sheetId) => {
    const cached = cache.get(sheetId);

    if (cached) {
      return cached;
    }

    const values = evaluateWorkbook(document, sheetId);

    cache.set(sheetId, values);
    return values;
  };
}

function getTableDataRowIndexes(table: TableDefinition) {
  const startRowIndex =
    table.range.startRowIndex + (table.showHeaderRow ? 1 : 0);
  const endRowIndex = table.range.endRowIndex - (table.showTotalsRow ? 1 : 0);

  if (startRowIndex > endRowIndex) {
    return [];
  }

  return Array.from(
    { length: endRowIndex - startRowIndex + 1 },
    (_, index) => startRowIndex + index,
  );
}

function getTableColumnName({
  columnIndex,
  sheet,
  table,
  values,
}: {
  columnIndex: number;
  sheet: SheetData;
  table: TableDefinition;
  values: Record<string, string>;
}) {
  if (!table.showHeaderRow) {
    return columnLabel(columnIndex);
  }

  return (
    getCellDisplayValue({
      columnIndex,
      rowIndex: table.range.startRowIndex,
      sheet,
      values,
    }).trim() || columnLabel(columnIndex)
  );
}

function isTableColumn(table: TableDefinition | null, columnIndex: number) {
  return Boolean(
    table &&
      Number.isInteger(columnIndex) &&
      columnIndex >= table.range.startColumnIndex &&
      columnIndex <= table.range.endColumnIndex,
  );
}

function normalizeKey(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function createRelationshipName({
  document,
  fromColumnIndex,
  fromTable,
  reader,
  toColumnIndex,
  toTable,
}: {
  document: WorkbookDocument;
  fromColumnIndex: number;
  fromTable: TableDefinition;
  reader: SheetValueReader;
  toColumnIndex: number;
  toTable: TableDefinition;
}) {
  const fromSheet = getSheetById(document, fromTable.sheetId);
  const toSheet = getSheetById(document, toTable.sheetId);

  if (!fromSheet || !toSheet) {
    return `${fromTable.name} -> ${toTable.name}`;
  }

  const fromColumnName = getTableColumnName({
    columnIndex: fromColumnIndex,
    sheet: fromSheet,
    table: fromTable,
    values: reader(fromSheet.id),
  });
  const toColumnName = getTableColumnName({
    columnIndex: toColumnIndex,
    sheet: toSheet,
    table: toTable,
    values: reader(toSheet.id),
  });

  return `${fromTable.name}.${fromColumnName} -> ${toTable.name}.${toColumnName}`;
}

function getColumnValues({
  columnIndex,
  document,
  reader,
  table,
}: {
  columnIndex: number;
  document: WorkbookDocument;
  reader: SheetValueReader;
  table: TableDefinition;
}) {
  const sheet = getSheetById(document, table.sheetId);

  if (!sheet) {
    return [];
  }

  const values = reader(sheet.id);

  return getTableDataRowIndexes(table).map((rowIndex) =>
    getCellDisplayValue({ columnIndex, rowIndex, sheet, values }),
  );
}

function countDuplicateKeys(values: string[]) {
  const counts = new Map<string, number>();

  for (const value of values) {
    const key = normalizeKey(value);

    if (!key) {
      continue;
    }

    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.values()].filter((count) => count > 1).length;
}

function getRelationshipValidationMessage({
  document,
  draft,
}: {
  document: WorkbookDocument;
  draft: DataModelRelationshipDraft;
}) {
  const fromTable = getTableById(document, draft.fromTableId);
  const toTable = getTableById(document, draft.toTableId);

  if (!fromTable || !toTable) {
    return "Choose two existing workbook tables.";
  }

  if (fromTable.id === toTable.id) {
    return "Choose two different tables for a data model relationship.";
  }

  if (
    !isTableColumn(fromTable, draft.fromColumnIndex) ||
    !isTableColumn(toTable, draft.toColumnIndex)
  ) {
    return "Choose columns inside both table ranges.";
  }

  const duplicate = (document.dataModelRelationships ?? []).some(
    (relationship) =>
      relationship.fromTableId === draft.fromTableId &&
      relationship.fromColumnIndex === draft.fromColumnIndex &&
      relationship.toTableId === draft.toTableId &&
      relationship.toColumnIndex === draft.toColumnIndex,
  );

  if (duplicate) {
    return "That relationship already exists.";
  }

  return null;
}

export function getDataModelTableColumns({
  activeSheetId,
  computedValues,
  document,
  table,
}: {
  activeSheetId?: string;
  computedValues?: Record<string, string>;
  document: WorkbookDocument;
  table: TableDefinition;
}): DataModelTableColumn[] {
  const sheet = getSheetById(document, table.sheetId);

  if (!sheet) {
    return [];
  }

  const reader = createSheetValueReader({ activeSheetId, computedValues, document });
  const values = reader(sheet.id);

  return Array.from(
    {
      length: table.range.endColumnIndex - table.range.startColumnIndex + 1,
    },
    (_, index) => table.range.startColumnIndex + index,
  ).map((columnIndex) => ({
    columnIndex,
    name: getTableColumnName({ columnIndex, sheet, table, values }),
    tableId: table.id,
    tableName: table.name,
  }));
}

export function getDataModelRelationshipIssues({
  activeSheetId,
  computedValues,
  document,
}: {
  activeSheetId?: string;
  computedValues?: Record<string, string>;
  document: WorkbookDocument;
}): DataModelRelationshipIssue[] {
  const reader = createSheetValueReader({ activeSheetId, computedValues, document });
  const seenKeys = new Set<string>();
  const issues: DataModelRelationshipIssue[] = [];

  for (const relationship of document.dataModelRelationships ?? []) {
    const fromTable = getTableById(document, relationship.fromTableId);
    const toTable = getTableById(document, relationship.toTableId);
    const title = relationship.name || "Data model relationship";
    const relationshipKey = [
      relationship.fromTableId,
      relationship.fromColumnIndex,
      relationship.toTableId,
      relationship.toColumnIndex,
    ].join("\u001f");

    if (!fromTable || !toTable) {
      issues.push({
        id: `${relationship.id}:missing-table`,
        relationshipId: relationship.id,
        severity: "error",
        title,
        details: "One of the related tables no longer exists.",
      });
      continue;
    }

    if (fromTable.id === toTable.id) {
      issues.push({
        id: `${relationship.id}:same-table`,
        relationshipId: relationship.id,
        severity: "error",
        tableId: fromTable.id,
        title,
        details: "Relationships must connect two different tables.",
      });
    }

    if (
      !isTableColumn(fromTable, relationship.fromColumnIndex) ||
      !isTableColumn(toTable, relationship.toColumnIndex)
    ) {
      issues.push({
        id: `${relationship.id}:missing-column`,
        relationshipId: relationship.id,
        severity: "error",
        title,
        details: "One of the related columns is outside its table range.",
      });
      continue;
    }

    if (seenKeys.has(relationshipKey)) {
      issues.push({
        id: `${relationship.id}:duplicate`,
        relationshipId: relationship.id,
        severity: "warning",
        title,
        details: "This relationship duplicates another model path.",
      });
    }

    seenKeys.add(relationshipKey);

    const fromValues = getColumnValues({
      columnIndex: relationship.fromColumnIndex,
      document,
      reader,
      table: fromTable,
    });
    const toValues = getColumnValues({
      columnIndex: relationship.toColumnIndex,
      document,
      reader,
      table: toTable,
    });
    const blankFromCount = fromValues.filter((value) => !normalizeKey(value)).length;
    const blankToCount = toValues.filter((value) => !normalizeKey(value)).length;
    const duplicateToCount = countDuplicateKeys(toValues);
    const duplicateFromCount = countDuplicateKeys(fromValues);

    if (fromValues.length === 0 || toValues.length === 0) {
      issues.push({
        id: `${relationship.id}:empty-table`,
        relationshipId: relationship.id,
        severity: "warning",
        title,
        details: "One of the related tables has no data rows.",
      });
    }

    if (blankFromCount > 0 || blankToCount > 0) {
      issues.push({
        id: `${relationship.id}:blank-keys`,
        relationshipId: relationship.id,
        severity: "warning",
        title,
        details: `${blankFromCount + blankToCount} blank relationship keys were found.`,
      });
    }

    if (duplicateToCount > 0) {
      issues.push({
        id: `${relationship.id}:lookup-duplicates`,
        relationshipId: relationship.id,
        severity: "warning",
        title,
        details: "The lookup-side column has duplicate keys, so the first match is used.",
      });
    }

    if (relationship.cardinality === "oneToOne" && duplicateFromCount > 0) {
      issues.push({
        id: `${relationship.id}:source-duplicates`,
        relationshipId: relationship.id,
        severity: "warning",
        title,
        details: "The source-side column has duplicate keys but the relationship is one-to-one.",
      });
    }
  }

  return issues;
}

export function addDataModelRelationshipToDocument({
  activeSheetId,
  computedValues,
  document,
  draft,
  now = new Date().toISOString(),
}: {
  activeSheetId?: string;
  computedValues?: Record<string, string>;
  document: WorkbookDocument;
  draft: DataModelRelationshipDraft;
  now?: string;
}) {
  const message = getRelationshipValidationMessage({ document, draft });

  if (message) {
    return message;
  }

  const fromTable = getTableById(document, draft.fromTableId);
  const toTable = getTableById(document, draft.toTableId);

  if (!fromTable || !toTable) {
    return "Choose two existing workbook tables.";
  }

  const reader = createSheetValueReader({ activeSheetId, computedValues, document });

  document.dataModelRelationships ??= [];
  document.dataModelRelationships.push({
    id: `relationship_${crypto.randomUUID()}`,
    active: true,
    cardinality: draft.cardinality ?? "manyToOne",
    fromColumnIndex: draft.fromColumnIndex,
    fromTableId: draft.fromTableId,
    name: createRelationshipName({
      document,
      fromColumnIndex: draft.fromColumnIndex,
      fromTable,
      reader,
      toColumnIndex: draft.toColumnIndex,
      toTable,
    }),
    toColumnIndex: draft.toColumnIndex,
    toTableId: draft.toTableId,
    createdAt: now,
    updatedAt: now,
  });

  return null;
}

export function deleteDataModelRelationshipFromDocument(
  document: WorkbookDocument,
  relationshipId: string,
) {
  document.dataModelRelationships = (document.dataModelRelationships ?? []).filter(
    (relationship) => relationship.id !== relationshipId,
  );
}

export function deleteDataModelRelationshipsForTable(
  document: WorkbookDocument,
  tableId: string,
) {
  document.dataModelRelationships = (document.dataModelRelationships ?? []).filter(
    (relationship) =>
      relationship.fromTableId !== tableId && relationship.toTableId !== tableId,
  );
}

function createModelFieldId(
  relationship: WorkbookDataModelRelationship,
  fieldId: string,
) {
  return `model_${relationship.id}_${fieldId}`;
}

function appendModelViewFields({
  descriptors,
  resolveRowOffset,
  source,
}: {
  descriptors: ReturnType<typeof createDataModelViewFieldDescriptors>;
  resolveRowOffset: (recordIndex: number) => number | undefined;
  source: PivotSourceModel;
}) {
  source.fields.push(...descriptors.map((descriptor) => descriptor.field));
  source.records.forEach((record, recordIndex) => {
    const rowOffset = resolveRowOffset(recordIndex);

    descriptors.forEach((descriptor) => {
      record.values[descriptor.field.id] = descriptor.readValue(rowOffset);
    });
  });
}

export function createDataModelTableSourceModel({
  computedValues,
  document,
  sheet,
  table,
}: {
  computedValues: Record<string, string>;
  document: WorkbookDocument;
  sheet: SheetData;
  table: TableDefinition;
}): PivotSourceModel {
  const sourceSheet = getSheetById(document, table.sheetId) ?? sheet;
  const reader = createSheetValueReader({
    activeSheetId: table.sheetId === sheet.id ? sheet.id : undefined,
    computedValues: table.sheetId === sheet.id ? computedValues : undefined,
    document,
  });
  const sourceModel = createLargeDataModelTable({
    computedValues: reader(sourceSheet.id),
    range: table.range,
    sheet: sourceSheet,
    storageSettings: document.dataModelStorage,
    tableId: table.id,
  });
  const source = createPivotSourceModelFromLargeDataModel(sourceModel);
  const sourceFieldsByColumn = new Map(
    source.fields.map((field) => [field.sourceColumnIndex, field]),
  );
  appendModelViewFields({
    descriptors: createDataModelViewFieldDescriptors({
      document,
      model: sourceModel,
      table,
    }),
    resolveRowOffset: (recordIndex) => recordIndex,
    source,
  });
  let relationshipIndexCount = 0;

  for (const relationship of document.dataModelRelationships ?? []) {
    if (
      !relationship.active ||
      relationship.fromTableId !== table.id ||
      !isTableColumn(table, relationship.fromColumnIndex)
    ) {
      continue;
    }

    const relatedTable = getTableById(document, relationship.toTableId);
    const sourceKeyField = sourceFieldsByColumn.get(relationship.fromColumnIndex);

    if (!relatedTable || !sourceKeyField) {
      continue;
    }

    const relatedSheet = getSheetById(document, relatedTable.sheetId);

    if (!relatedSheet || !isTableColumn(relatedTable, relationship.toColumnIndex)) {
      continue;
    }

    const relatedModel = createLargeDataModelTable({
      computedValues: reader(relatedSheet.id),
      range: relatedTable.range,
      sheet: relatedSheet,
      storageSettings: document.dataModelStorage,
      tableId: relatedTable.id,
    });
    const relatedKeyField = relatedModel.fields.find(
      (field) => field.sourceColumnIndex === relationship.toColumnIndex,
    );

    if (!relatedKeyField) {
      continue;
    }

    const lookup = createLargeDataModelLookupIndex(relatedModel, relatedKeyField.id);
    const relatedFields = relatedModel.fields.map((field) => ({
      ...field,
      id: createModelFieldId(relationship, field.id),
      name: `${relatedTable.name}.${field.name}`,
    }));
    const relatedViewFieldDescriptors = createDataModelViewFieldDescriptors({
      document,
      fieldIdPrefix: `model_${relationship.id}_`,
      fieldNamePrefix: `${relatedTable.name}.`,
      model: relatedModel,
      table: relatedTable,
    });

    source.fields.push(
      ...relatedFields,
      ...relatedViewFieldDescriptors.map((descriptor) => descriptor.field),
    );
    relationshipIndexCount += 1;

    source.records.forEach((record, rowOffset) => {
      const relatedRowOffset = lookup.get(
        normalizeKey(getLargeDataModelValue(sourceModel, sourceKeyField.id, rowOffset)),
      );

      relatedModel.fields.forEach((field, index) => {
        const modelField = relatedFields[index];

        if (!modelField) {
          return;
        }

        record.values[modelField.id] =
          relatedRowOffset === undefined
            ? ""
            : getLargeDataModelValue(relatedModel, field.id, relatedRowOffset);
      });
      relatedViewFieldDescriptors.forEach((descriptor) => {
        record.values[descriptor.field.id] = descriptor.readValue(relatedRowOffset);
      });
    });
  }

  source.storage = getLargeDataModelStorageStats(
    sourceModel,
    relationshipIndexCount,
  );

  return source;
}

export function createDataModelPivotSourceModel({
  computedValues,
  document,
  pivotTable,
  sheet,
}: {
  computedValues: Record<string, string>;
  document: WorkbookDocument;
  pivotTable: PivotTableDefinition;
  sheet: SheetData;
}): PivotSourceModel {
  const sourceTable = pivotTable.sourceTableId
    ? getTableById(document, pivotTable.sourceTableId)
    : null;

  if (!sourceTable) {
    return createPivotSourceModel({
      computedValues,
      range: pivotTable.sourceRange,
      sheet,
    });
  }

  return createDataModelTableSourceModel({
    computedValues,
    document,
    sheet,
    table: sourceTable,
  });
}
