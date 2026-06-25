"use client";

import { AlertCircle, Database, Link2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ConfirmDestructiveButton } from "@/components/confirm-destructive-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type DataModelRelationshipDraft,
  type DataModelRelationshipIssue,
  getDataModelTableColumns,
} from "@/features/spreadsheet/data-model";
import { DataModelViewPanel } from "@/features/spreadsheet/components/data-model-view-panel";
import type {
  DataModelHierarchyDraft,
  DataModelKpiDraft,
  DataModelPerspectiveDraft,
} from "@/features/spreadsheet/data-model-view";
import { getLargeDataModelWorkbookStats } from "@/features/spreadsheet/large-data-model";
import { columnLabel } from "@/features/workbooks/addresses";
import type {
  TableDefinition,
  WorkbookDataModelRelationship,
  WorkbookDocument,
} from "@/features/workbooks/types";

function tableSheetName(document: WorkbookDocument, table: TableDefinition) {
  return document.sheets.find((sheet) => sheet.id === table.sheetId)?.name ?? "Sheet";
}

function formatColumn(column: { columnIndex: number; name: string }) {
  return `${column.name} (${columnLabel(column.columnIndex)})`;
}

function relationshipPath(
  relationship: WorkbookDataModelRelationship,
  tablesById: Map<string, TableDefinition>,
) {
  const fromTable = tablesById.get(relationship.fromTableId);
  const toTable = tablesById.get(relationship.toTableId);

  return `${fromTable?.name ?? "Missing table"} -> ${toTable?.name ?? "Missing table"}`;
}

function selectClassName() {
  return "h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring";
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value);
}

function formatSavedRatio(value: number) {
  return `${Math.round((1 - Math.min(1, value)) * 100)}%`;
}

export function DataModelPanel({
  activeSheetId,
  computedValues,
  disabled,
  document,
  issues,
  relationships,
  onCreateRelationship,
  onCreateHierarchy,
  onCreateKpi,
  onCreatePerspective,
  onDeleteHierarchy,
  onDeleteKpi,
  onDeletePerspective,
  onDeleteRelationship,
  onSelectTable,
}: {
  activeSheetId: string;
  computedValues: Record<string, string>;
  disabled?: boolean;
  document: WorkbookDocument;
  issues: DataModelRelationshipIssue[];
  relationships: WorkbookDataModelRelationship[];
  onCreateHierarchy: (draft: DataModelHierarchyDraft) => string | null;
  onCreateKpi: (draft: DataModelKpiDraft) => string | null;
  onCreatePerspective: (draft: DataModelPerspectiveDraft) => string | null;
  onCreateRelationship: (draft: DataModelRelationshipDraft) => string | null;
  onDeleteHierarchy: (hierarchyId: string) => void;
  onDeleteKpi: (kpiId: string) => void;
  onDeletePerspective: (perspectiveId: string) => void;
  onDeleteRelationship: (relationshipId: string) => void;
  onSelectTable: (table: TableDefinition) => void;
}) {
  const tables = document.tables ?? [];
  const firstTableId = tables[0]?.id ?? "";
  const secondTableId = tables.find((table) => table.id !== firstTableId)?.id ??
    "";
  const [fromTableId, setFromTableId] = useState(firstTableId);
  const [toTableId, setToTableId] = useState(secondTableId);
  const [fromColumnIndex, setFromColumnIndex] = useState(0);
  const [toColumnIndex, setToColumnIndex] = useState(0);
  const [cardinality, setCardinality] =
    useState<WorkbookDataModelRelationship["cardinality"]>("manyToOne");
  const [message, setMessage] = useState("");
  const tablesById = useMemo(
    () => new Map(tables.map((table) => [table.id, table])),
    [tables],
  );
  const fromTable = tablesById.get(fromTableId) ?? tables[0] ?? null;
  const toTable =
    tablesById.get(toTableId) ??
    tables.find((table) => table.id !== fromTable?.id) ??
    null;
  const fromColumns = useMemo(
    () =>
      fromTable
        ? getDataModelTableColumns({
            activeSheetId,
            computedValues,
            document,
            table: fromTable,
          })
        : [],
    [activeSheetId, computedValues, document, fromTable],
  );
  const toColumns = useMemo(
    () =>
      toTable
        ? getDataModelTableColumns({
            activeSheetId,
            computedValues,
            document,
            table: toTable,
          })
        : [],
    [activeSheetId, computedValues, document, toTable],
  );
  const selectedFromColumn = fromColumns.some(
    (column) => column.columnIndex === fromColumnIndex,
  )
    ? fromColumnIndex
    : (fromColumns[0]?.columnIndex ?? 0);
  const selectedToColumn = toColumns.some(
    (column) => column.columnIndex === toColumnIndex,
  )
    ? toColumnIndex
    : (toColumns[0]?.columnIndex ?? 0);
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const modelStats = useMemo(
    () =>
      getLargeDataModelWorkbookStats({
        activeSheetId,
        computedValues,
        document,
      }),
    [activeSheetId, computedValues, document],
  );

  useEffect(() => {
    if (!fromTable || !tablesById.has(fromTableId)) {
      setFromTableId(firstTableId);
    }

    if (!toTable || !tablesById.has(toTableId) || toTableId === fromTableId) {
      setToTableId(
        tables.find((table) => table.id !== (fromTable?.id ?? firstTableId))?.id ??
          "",
      );
    }
  }, [
    firstTableId,
    fromTable,
    fromTableId,
    tables,
    tablesById,
    toTable,
    toTableId,
  ]);

  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Data model</h2>
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="font-mono">
            {relationships.length}
          </Badge>
          {issues.length > 0 ? (
            <Badge variant={errorCount > 0 ? "destructive" : "outline"}>
              {issues.length}
            </Badge>
          ) : null}
        </div>
      </div>

      {tables.length < 2 ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Create at least two structured tables to model relationships.
        </p>
      ) : (
        <div className="rounded-md border bg-background p-3">
          <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border border-dashed p-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Database className="size-3.5" />
                Rows
              </div>
              <p className="mt-1 font-mono text-sm">
                {formatCount(modelStats.rowCount)}
              </p>
            </div>
            <div className="rounded-md border border-dashed p-2">
              <p className="text-muted-foreground">Distinct values</p>
              <p className="mt-1 font-mono text-sm">
                {formatCount(modelStats.dictionaryValueCount)}
              </p>
            </div>
            <div className="rounded-md border border-dashed p-2">
              <p className="text-muted-foreground">Repeated saved</p>
              <p className="mt-1 font-mono text-sm">
                {formatSavedRatio(modelStats.compressionRatio)}
              </p>
            </div>
            <div className="rounded-md border border-dashed p-2">
              <p className="text-muted-foreground">Lookup indexes</p>
              <p className="mt-1 font-mono text-sm">
                {formatCount(modelStats.relationshipIndexCount)}
              </p>
            </div>
            <div className="rounded-md border border-dashed p-2">
              <p className="text-muted-foreground">Segments</p>
              <p className="mt-1 font-mono text-sm">
                {formatCount(modelStats.segmentCount)}
              </p>
            </div>
            <div className="rounded-md border border-dashed p-2">
              <p className="text-muted-foreground">Max rows</p>
              <p className="mt-1 font-mono text-sm">
                {formatCount(modelStats.maxRowCount)}
              </p>
            </div>
          </div>
          <div className="grid gap-2">
            <select
              value={fromTable?.id ?? ""}
              disabled={disabled}
              aria-label="Relationship source table"
              className={selectClassName()}
              onChange={(event) => setFromTableId(event.target.value)}
            >
              {tables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name} - {tableSheetName(document, table)}
                </option>
              ))}
            </select>
            <select
              value={selectedFromColumn}
              disabled={disabled || fromColumns.length === 0}
              aria-label="Relationship source column"
              className={selectClassName()}
              onChange={(event) => setFromColumnIndex(Number(event.target.value))}
            >
              {fromColumns.map((column) => (
                <option key={column.columnIndex} value={column.columnIndex}>
                  {formatColumn(column)}
                </option>
              ))}
            </select>
            <select
              value={toTable?.id ?? ""}
              disabled={disabled}
              aria-label="Relationship lookup table"
              className={selectClassName()}
              onChange={(event) => setToTableId(event.target.value)}
            >
              {tables
                .filter((table) => table.id !== fromTable?.id)
                .map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.name} - {tableSheetName(document, table)}
                  </option>
                ))}
            </select>
            <select
              value={selectedToColumn}
              disabled={disabled || toColumns.length === 0}
              aria-label="Relationship lookup column"
              className={selectClassName()}
              onChange={(event) => setToColumnIndex(Number(event.target.value))}
            >
              {toColumns.map((column) => (
                <option key={column.columnIndex} value={column.columnIndex}>
                  {formatColumn(column)}
                </option>
              ))}
            </select>
            <select
              value={cardinality}
              disabled={disabled}
              aria-label="Relationship cardinality"
              className={selectClassName()}
              onChange={(event) =>
                setCardinality(
                  event.target.value as WorkbookDataModelRelationship["cardinality"],
                )
              }
            >
              <option value="manyToOne">Many to one</option>
              <option value="oneToOne">One to one</option>
            </select>
            <Button
              type="button"
              size="sm"
              disabled={disabled || !fromTable || !toTable}
              onClick={() => {
                const nextMessage = onCreateRelationship({
                  cardinality,
                  fromColumnIndex: selectedFromColumn,
                  fromTableId: fromTable?.id ?? "",
                  toColumnIndex: selectedToColumn,
                  toTableId: toTable?.id ?? "",
                });

                setMessage(nextMessage ?? "");
              }}
            >
              <Link2 />
              Add relationship
            </Button>
          </div>
          {message ? (
            <p className="mt-2 rounded-md border border-dashed p-2 text-xs text-muted-foreground">
              {message}
            </p>
          ) : null}
        </div>
      )}

      <div className="mt-3 space-y-2">
        {relationships.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No workbook relationships yet.
          </p>
        ) : (
          relationships.map((relationship) => {
            const fromTableItem = tablesById.get(relationship.fromTableId);
            const toTableItem = tablesById.get(relationship.toTableId);

            return (
              <section key={relationship.id} className="rounded-md border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {relationship.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {relationshipPath(relationship, tablesById)}
                    </p>
                  </div>
                  <ConfirmDestructiveButton
                    title="Delete this relationship?"
                    description="This removes the model link and keeps the workbook tables unchanged."
                    label="Delete relationship"
                    disabled={disabled}
                    onConfirm={() => onDeleteRelationship(relationship.id)}
                  >
                    <Trash2 />
                  </ConfirmDestructiveButton>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={relationship.active ? "secondary" : "outline"}>
                    {relationship.active ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant="outline">
                    {relationship.cardinality === "oneToOne"
                      ? "One to one"
                      : "Many to one"}
                  </Badge>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {fromTableItem ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="justify-start px-2"
                      onClick={() => onSelectTable(fromTableItem)}
                    >
                      {fromTableItem.name}
                    </Button>
                  ) : null}
                  {toTableItem ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="justify-start px-2"
                      onClick={() => onSelectTable(toTableItem)}
                    >
                      {toTableItem.name}
                    </Button>
                  ) : null}
                </div>
              </section>
            );
          })
        )}
      </div>

      {issues.length > 0 ? (
        <div className="mt-3 space-y-2">
          {issues.slice(0, 6).map((issue) => (
            <div
              key={issue.id}
              className="rounded-md border border-dashed p-2 text-xs"
            >
              <div className="flex items-center gap-2 font-medium">
                <AlertCircle className="size-3.5" />
                {issue.title}
              </div>
              <p className="mt-1 text-muted-foreground">{issue.details}</p>
            </div>
          ))}
        </div>
      ) : null}

      {tables.length > 0 ? (
        <DataModelViewPanel
          activeSheetId={activeSheetId}
          computedValues={computedValues}
          disabled={disabled}
          document={document}
          onCreateHierarchy={onCreateHierarchy}
          onCreateKpi={onCreateKpi}
          onCreatePerspective={onCreatePerspective}
          onDeleteHierarchy={onDeleteHierarchy}
          onDeleteKpi={onDeleteKpi}
          onDeletePerspective={onDeletePerspective}
        />
      ) : null}
    </section>
  );
}
