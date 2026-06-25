import { getLargeDataModelValue } from "@/features/spreadsheet/large-data-model";
import type { PivotField } from "@/features/spreadsheet/pivot/pivot-types";
import type {
  TableDefinition,
  WorkbookDataModelHierarchy,
  WorkbookDataModelHierarchyLevel,
  WorkbookDataModelKpi,
  WorkbookDataModelPerspective,
  WorkbookDataModelPerspectiveField,
  WorkbookDocument,
} from "@/features/workbooks/types";
import type { LargeDataModelTable } from "@/features/spreadsheet/large-data-model";

export type DataModelHierarchyDraft = {
  levels: WorkbookDataModelHierarchyLevel[];
  name: string;
  tableId: string;
};

export type DataModelKpiDraft = {
  direction: WorkbookDataModelKpi["direction"];
  goodThreshold?: number;
  name: string;
  tableId: string;
  target: number;
  valueColumnIndex: number;
  warningThreshold?: number;
};

export type DataModelPerspectiveDraft = {
  fields: WorkbookDataModelPerspectiveField[];
  name: string;
  tableIds: string[];
};

type DataModelViewFieldDescriptor = {
  field: PivotField;
  readValue: (rowOffset: number | undefined) => string;
};

function normalizeName(value: string, fallback: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 120) || fallback;
}

function getTableById(document: WorkbookDocument, tableId: string) {
  return (document.tables ?? []).find((table) => table.id === tableId) ?? null;
}

function isTableColumn(table: TableDefinition | null, columnIndex: number) {
  return Boolean(
    table &&
      Number.isInteger(columnIndex) &&
      columnIndex >= table.range.startColumnIndex &&
      columnIndex <= table.range.endColumnIndex,
  );
}

function normalizeThreshold(value: number | undefined, fallback: number) {
  return Number.isFinite(value)
    ? Math.min(Math.max(Number(value), 0), 10)
    : fallback;
}

function modelFieldId(prefix: string, kind: "hierarchy" | "kpi", id: string) {
  return `${prefix}${kind}_${id}`;
}

function fieldForColumn(model: LargeDataModelTable, columnIndex: number) {
  return model.fields.find((field) => field.sourceColumnIndex === columnIndex);
}

function sampleValues(
  model: LargeDataModelTable,
  readValue: (rowOffset: number | undefined) => string,
) {
  return Array.from({ length: Math.min(model.rowCount, 5) }, (_, rowOffset) =>
    readValue(rowOffset),
  ).filter(Boolean);
}

function hierarchyValue(
  model: LargeDataModelTable,
  hierarchy: WorkbookDataModelHierarchy,
  rowOffset: number | undefined,
) {
  if (rowOffset === undefined) {
    return "";
  }

  return hierarchy.levels
    .map((level) => fieldForColumn(model, level.columnIndex))
    .filter((field): field is PivotField => Boolean(field))
    .map((field) => getLargeDataModelValue(model, field.id, rowOffset).trim())
    .filter(Boolean)
    .join(" > ");
}

function kpiStatus(
  model: LargeDataModelTable,
  kpi: WorkbookDataModelKpi,
  rowOffset: number | undefined,
) {
  const valueField = fieldForColumn(model, kpi.valueColumnIndex);

  if (!valueField || rowOffset === undefined) {
    return "";
  }

  const value = Number(getLargeDataModelValue(model, valueField.id, rowOffset));

  if (!Number.isFinite(value)) {
    return "";
  }

  const score =
    kpi.direction === "higherIsBetter"
      ? value / Math.max(kpi.target, Number.EPSILON)
      : kpi.target / Math.max(value, Number.EPSILON);

  if (score >= kpi.goodThreshold) {
    return "Good";
  }

  if (score >= kpi.warningThreshold) {
    return "Watch";
  }

  return "Bad";
}

export function createDataModelViewFieldDescriptors({
  document,
  fieldIdPrefix = "",
  fieldNamePrefix = "",
  model,
  table,
}: {
  document: WorkbookDocument;
  fieldIdPrefix?: string;
  fieldNamePrefix?: string;
  model: LargeDataModelTable;
  table: TableDefinition;
}): DataModelViewFieldDescriptor[] {
  const hierarchies = (document.dataModelHierarchies ?? []).filter(
    (hierarchy) => hierarchy.active && hierarchy.tableId === table.id,
  );
  const kpis = (document.dataModelKpis ?? []).filter(
    (kpi) => kpi.active && kpi.tableId === table.id,
  );

  return [
    ...hierarchies.flatMap((hierarchy) => {
      const firstLevel = hierarchy.levels[0];

      if (!firstLevel || !isTableColumn(table, firstLevel.columnIndex)) {
        return [];
      }

      const readValue = (rowOffset: number | undefined) =>
        hierarchyValue(model, hierarchy, rowOffset);

      return [
        {
          field: {
            id: modelFieldId(fieldIdPrefix, "hierarchy", hierarchy.id),
            name: `${fieldNamePrefix}${hierarchy.name}`,
            sampleValues: sampleValues(model, readValue),
            sourceColumnIndex: firstLevel.columnIndex,
            valueType: "text" as const,
          },
          readValue,
        },
      ];
    }),
    ...kpis.flatMap((kpi) => {
      if (!isTableColumn(table, kpi.valueColumnIndex)) {
        return [];
      }

      const readValue = (rowOffset: number | undefined) =>
        kpiStatus(model, kpi, rowOffset);

      return [
        {
          field: {
            id: modelFieldId(fieldIdPrefix, "kpi", kpi.id),
            name: `${fieldNamePrefix}${kpi.name} Status`,
            sampleValues: sampleValues(model, readValue),
            sourceColumnIndex: kpi.valueColumnIndex,
            valueType: "text" as const,
          },
          readValue,
        },
      ];
    }),
  ];
}

export function addDataModelHierarchyToDocument({
  document,
  draft,
  now = new Date().toISOString(),
}: {
  document: WorkbookDocument;
  draft: DataModelHierarchyDraft;
  now?: string;
}) {
  const table = getTableById(document, draft.tableId);
  const levels = draft.levels
    .map((level) => ({
      columnIndex: Number(level.columnIndex),
      name: normalizeName(level.name, "Level"),
    }))
    .filter((level, index, allLevels) => {
      return (
        isTableColumn(table, level.columnIndex) &&
        allLevels.findIndex((item) => item.columnIndex === level.columnIndex) ===
          index
      );
    })
    .slice(0, 8);

  if (!table || levels.length < 2) {
    return "Choose one table and at least two hierarchy levels.";
  }

  const name = normalizeName(draft.name, "Hierarchy");
  const duplicate = (document.dataModelHierarchies ?? []).some(
    (hierarchy) =>
      hierarchy.tableId === table.id &&
      hierarchy.name.trim().toLowerCase() === name.toLowerCase(),
  );

  if (duplicate) {
    return "That hierarchy already exists for this table.";
  }

  document.dataModelHierarchies ??= [];
  document.dataModelHierarchies.push({
    id: `hierarchy_${crypto.randomUUID()}`,
    active: true,
    createdAt: now,
    levels,
    name,
    tableId: table.id,
    updatedAt: now,
  });

  return null;
}

export function deleteDataModelHierarchyFromDocument(
  document: WorkbookDocument,
  hierarchyId: string,
) {
  document.dataModelHierarchies = (document.dataModelHierarchies ?? []).filter(
    (hierarchy) => hierarchy.id !== hierarchyId,
  );
}

export function addDataModelKpiToDocument({
  document,
  draft,
  now = new Date().toISOString(),
}: {
  document: WorkbookDocument;
  draft: DataModelKpiDraft;
  now?: string;
}) {
  const table = getTableById(document, draft.tableId);
  const target = Number(draft.target);

  if (!table || !isTableColumn(table, draft.valueColumnIndex)) {
    return "Choose an existing table value column for this KPI.";
  }

  if (!Number.isFinite(target)) {
    return "Enter a numeric KPI target.";
  }

  const name = normalizeName(draft.name, "KPI");
  const duplicate = (document.dataModelKpis ?? []).some(
    (kpi) =>
      kpi.tableId === table.id &&
      kpi.name.trim().toLowerCase() === name.toLowerCase(),
  );

  if (duplicate) {
    return "That KPI already exists for this table.";
  }

  document.dataModelKpis ??= [];
  document.dataModelKpis.push({
    id: `kpi_${crypto.randomUUID()}`,
    active: true,
    createdAt: now,
    direction: draft.direction,
    goodThreshold: normalizeThreshold(draft.goodThreshold, 1),
    name,
    tableId: table.id,
    target,
    updatedAt: now,
    valueColumnIndex: draft.valueColumnIndex,
    warningThreshold: normalizeThreshold(draft.warningThreshold, 0.8),
  });

  return null;
}

export function deleteDataModelKpiFromDocument(
  document: WorkbookDocument,
  kpiId: string,
) {
  document.dataModelKpis = (document.dataModelKpis ?? []).filter(
    (kpi) => kpi.id !== kpiId,
  );
}

export function addDataModelPerspectiveToDocument({
  document,
  draft,
  now = new Date().toISOString(),
}: {
  document: WorkbookDocument;
  draft: DataModelPerspectiveDraft;
  now?: string;
}) {
  const tableIds = Array.from(
    new Set(draft.tableIds.filter((tableId) => getTableById(document, tableId))),
  ).slice(0, 24);
  const fields = draft.fields
    .filter((field, index, allFields) => {
      const table = getTableById(document, field.tableId);
      const key = `${field.tableId}:${field.columnIndex}`;

      return (
        isTableColumn(table, field.columnIndex) &&
        allFields.findIndex(
          (item) => `${item.tableId}:${item.columnIndex}` === key,
        ) === index
      );
    })
    .slice(0, 200);

  if (tableIds.length === 0 || fields.length === 0) {
    return "Choose at least one table and field for this perspective.";
  }

  const name = normalizeName(draft.name, "Perspective");
  const duplicate = (document.dataModelPerspectives ?? []).some(
    (perspective) => perspective.name.trim().toLowerCase() === name.toLowerCase(),
  );

  if (duplicate) {
    return "That perspective already exists.";
  }

  document.dataModelPerspectives ??= [];
  document.dataModelPerspectives.push({
    id: `perspective_${crypto.randomUUID()}`,
    active: true,
    createdAt: now,
    fields,
    name,
    tableIds,
    updatedAt: now,
  });

  return null;
}

export function deleteDataModelPerspectiveFromDocument(
  document: WorkbookDocument,
  perspectiveId: string,
) {
  document.dataModelPerspectives = (document.dataModelPerspectives ?? []).filter(
    (perspective) => perspective.id !== perspectiveId,
  );
}
