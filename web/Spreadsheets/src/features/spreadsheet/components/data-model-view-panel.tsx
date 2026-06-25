"use client";

import { Boxes, Gauge, Layers3, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ConfirmDestructiveButton } from "@/components/confirm-destructive-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type DataModelHierarchyDraft,
  type DataModelKpiDraft,
  type DataModelPerspectiveDraft,
} from "@/features/spreadsheet/data-model-view";
import { getDataModelTableColumns } from "@/features/spreadsheet/data-model";
import { columnLabel } from "@/features/workbooks/addresses";
import type {
  TableDefinition,
  WorkbookDataModelHierarchy,
  WorkbookDataModelKpi,
  WorkbookDataModelPerspective,
  WorkbookDocument,
} from "@/features/workbooks/types";

function selectClassName() {
  return "h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring";
}

function formatColumn(column: { columnIndex: number; name: string }) {
  return `${column.name} (${columnLabel(column.columnIndex)})`;
}

function tableName(tablesById: Map<string, TableDefinition>, tableId: string) {
  return tablesById.get(tableId)?.name ?? "Missing table";
}

export function DataModelViewPanel({
  activeSheetId,
  computedValues,
  disabled,
  document,
  onCreateHierarchy,
  onCreateKpi,
  onCreatePerspective,
  onDeleteHierarchy,
  onDeleteKpi,
  onDeletePerspective,
}: {
  activeSheetId: string;
  computedValues: Record<string, string>;
  disabled?: boolean;
  document: WorkbookDocument;
  onCreateHierarchy: (draft: DataModelHierarchyDraft) => string | null;
  onCreateKpi: (draft: DataModelKpiDraft) => string | null;
  onCreatePerspective: (draft: DataModelPerspectiveDraft) => string | null;
  onDeleteHierarchy: (hierarchyId: string) => void;
  onDeleteKpi: (kpiId: string) => void;
  onDeletePerspective: (perspectiveId: string) => void;
}) {
  const tables = document.tables ?? [];
  const firstTableId = tables[0]?.id ?? "";
  const [hierarchyTableId, setHierarchyTableId] = useState(firstTableId);
  const [hierarchyName, setHierarchyName] = useState("Model hierarchy");
  const [hierarchyLevelOne, setHierarchyLevelOne] = useState(0);
  const [hierarchyLevelTwo, setHierarchyLevelTwo] = useState(0);
  const [kpiTableId, setKpiTableId] = useState(firstTableId);
  const [kpiName, setKpiName] = useState("Model KPI");
  const [kpiColumnIndex, setKpiColumnIndex] = useState(0);
  const [kpiTarget, setKpiTarget] = useState("100");
  const [kpiDirection, setKpiDirection] =
    useState<WorkbookDataModelKpi["direction"]>("higherIsBetter");
  const [perspectiveTableId, setPerspectiveTableId] = useState(firstTableId);
  const [perspectiveName, setPerspectiveName] = useState("Perspective");
  const [message, setMessage] = useState("");
  const tablesById = useMemo(
    () => new Map(tables.map((table) => [table.id, table])),
    [tables],
  );
  const hierarchyTable =
    tablesById.get(hierarchyTableId) ?? tables[0] ?? null;
  const kpiTable = tablesById.get(kpiTableId) ?? tables[0] ?? null;
  const perspectiveTable =
    tablesById.get(perspectiveTableId) ?? tables[0] ?? null;
  const hierarchyColumns = useMemo(
    () =>
      hierarchyTable
        ? getDataModelTableColumns({
            activeSheetId,
            computedValues,
            document,
            table: hierarchyTable,
          })
        : [],
    [activeSheetId, computedValues, document, hierarchyTable],
  );
  const kpiColumns = useMemo(
    () =>
      kpiTable
        ? getDataModelTableColumns({
            activeSheetId,
            computedValues,
            document,
            table: kpiTable,
          })
        : [],
    [activeSheetId, computedValues, document, kpiTable],
  );
  const perspectiveColumns = useMemo(
    () =>
      perspectiveTable
        ? getDataModelTableColumns({
            activeSheetId,
            computedValues,
            document,
            table: perspectiveTable,
          })
        : [],
    [activeSheetId, computedValues, document, perspectiveTable],
  );
  const selectedHierarchyLevelOne = hierarchyColumns.some(
    (column) => column.columnIndex === hierarchyLevelOne,
  )
    ? hierarchyLevelOne
    : (hierarchyColumns[0]?.columnIndex ?? 0);
  const selectedHierarchyLevelTwo = hierarchyColumns.some(
    (column) => column.columnIndex === hierarchyLevelTwo,
  )
    ? hierarchyLevelTwo
    : (hierarchyColumns.find(
        (column) => column.columnIndex !== selectedHierarchyLevelOne,
      )?.columnIndex ??
      hierarchyColumns[1]?.columnIndex ??
      selectedHierarchyLevelOne);
  const selectedKpiColumn = kpiColumns.some(
    (column) => column.columnIndex === kpiColumnIndex,
  )
    ? kpiColumnIndex
    : (kpiColumns[0]?.columnIndex ?? 0);

  function selectOptions() {
    return tables.map((table) => (
      <option key={table.id} value={table.id}>
        {table.name}
      </option>
    ));
  }

  function createHierarchy() {
    const firstLevel = hierarchyColumns.find(
      (column) => column.columnIndex === selectedHierarchyLevelOne,
    );
    const secondLevel = hierarchyColumns.find(
      (column) => column.columnIndex === selectedHierarchyLevelTwo,
    );

    const nextMessage = onCreateHierarchy({
      levels: [firstLevel, secondLevel]
        .filter((column): column is NonNullable<typeof column> => Boolean(column))
        .map((column) => ({
          columnIndex: column.columnIndex,
          name: column.name,
        })),
      name: hierarchyName,
      tableId: hierarchyTable?.id ?? "",
    });

    setMessage(nextMessage ?? "");
  }

  function createKpi() {
    const nextMessage = onCreateKpi({
      direction: kpiDirection,
      name: kpiName,
      tableId: kpiTable?.id ?? "",
      target: Number(kpiTarget),
      valueColumnIndex: selectedKpiColumn,
    });

    setMessage(nextMessage ?? "");
  }

  function createPerspective() {
    const nextMessage = onCreatePerspective({
      fields: perspectiveColumns.map((column) => ({
        columnIndex: column.columnIndex,
        tableId: perspectiveTable?.id ?? "",
      })),
      name: perspectiveName,
      tableIds: perspectiveTable ? [perspectiveTable.id] : [],
    });

    setMessage(nextMessage ?? "");
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-md border border-dashed p-2">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Layers3 className="size-3.5" />
            Hierarchies
          </div>
          <p className="mt-1 font-mono text-sm">
            {document.dataModelHierarchies?.length ?? 0}
          </p>
        </div>
        <div className="rounded-md border border-dashed p-2">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Gauge className="size-3.5" />
            KPIs
          </div>
          <p className="mt-1 font-mono text-sm">
            {document.dataModelKpis?.length ?? 0}
          </p>
        </div>
        <div className="rounded-md border border-dashed p-2">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Boxes className="size-3.5" />
            Perspectives
          </div>
          <p className="mt-1 font-mono text-sm">
            {document.dataModelPerspectives?.length ?? 0}
          </p>
        </div>
      </div>

      <div className="grid gap-2 rounded-md border bg-background p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">Hierarchy</span>
          <Badge variant="outline">2 levels</Badge>
        </div>
        <Input
          value={hierarchyName}
          disabled={disabled}
          className="h-8"
          onChange={(event) => setHierarchyName(event.target.value)}
        />
        <select
          value={hierarchyTable?.id ?? ""}
          disabled={disabled}
          aria-label="Hierarchy table"
          className={selectClassName()}
          onChange={(event) => setHierarchyTableId(event.target.value)}
        >
          {selectOptions()}
        </select>
        <select
          value={selectedHierarchyLevelOne}
          disabled={disabled || hierarchyColumns.length === 0}
          aria-label="Hierarchy first level"
          className={selectClassName()}
          onChange={(event) =>
            setHierarchyLevelOne(Number(event.target.value))
          }
        >
          {hierarchyColumns.map((column) => (
            <option key={column.columnIndex} value={column.columnIndex}>
              {formatColumn(column)}
            </option>
          ))}
        </select>
        <select
          value={selectedHierarchyLevelTwo}
          disabled={disabled || hierarchyColumns.length < 2}
          aria-label="Hierarchy second level"
          className={selectClassName()}
          onChange={(event) =>
            setHierarchyLevelTwo(Number(event.target.value))
          }
        >
          {hierarchyColumns.map((column) => (
            <option key={column.columnIndex} value={column.columnIndex}>
              {formatColumn(column)}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          disabled={disabled || hierarchyColumns.length < 2}
          onClick={createHierarchy}
        >
          <Layers3 />
          Add hierarchy
        </Button>
      </div>

      <div className="grid gap-2 rounded-md border bg-background p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">KPI</span>
          <Badge variant="outline">Status field</Badge>
        </div>
        <Input
          value={kpiName}
          disabled={disabled}
          className="h-8"
          onChange={(event) => setKpiName(event.target.value)}
        />
        <select
          value={kpiTable?.id ?? ""}
          disabled={disabled}
          aria-label="KPI table"
          className={selectClassName()}
          onChange={(event) => setKpiTableId(event.target.value)}
        >
          {selectOptions()}
        </select>
        <select
          value={selectedKpiColumn}
          disabled={disabled || kpiColumns.length === 0}
          aria-label="KPI value column"
          className={selectClassName()}
          onChange={(event) => setKpiColumnIndex(Number(event.target.value))}
        >
          {kpiColumns.map((column) => (
            <option key={column.columnIndex} value={column.columnIndex}>
              {formatColumn(column)}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={kpiTarget}
            disabled={disabled}
            type="number"
            className="h-8"
            onChange={(event) => setKpiTarget(event.target.value)}
          />
          <select
            value={kpiDirection}
            disabled={disabled}
            aria-label="KPI direction"
            className={selectClassName()}
            onChange={(event) =>
              setKpiDirection(
                event.target.value as WorkbookDataModelKpi["direction"],
              )
            }
          >
            <option value="higherIsBetter">Higher is better</option>
            <option value="lowerIsBetter">Lower is better</option>
          </select>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={disabled || kpiColumns.length === 0}
          onClick={createKpi}
        >
          <Gauge />
          Add KPI
        </Button>
      </div>

      <div className="grid gap-2 rounded-md border bg-background p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">Perspective</span>
          <Badge variant="outline">Table view</Badge>
        </div>
        <Input
          value={perspectiveName}
          disabled={disabled}
          className="h-8"
          onChange={(event) => setPerspectiveName(event.target.value)}
        />
        <select
          value={perspectiveTable?.id ?? ""}
          disabled={disabled}
          aria-label="Perspective table"
          className={selectClassName()}
          onChange={(event) => setPerspectiveTableId(event.target.value)}
        >
          {selectOptions()}
        </select>
        <Button
          type="button"
          size="sm"
          disabled={disabled || perspectiveColumns.length === 0}
          onClick={createPerspective}
        >
          <Boxes />
          Add perspective
        </Button>
      </div>

      {message ? (
        <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
          {message}
        </p>
      ) : null}

      <ModelViewList
        hierarchies={document.dataModelHierarchies ?? []}
        kpis={document.dataModelKpis ?? []}
        perspectives={document.dataModelPerspectives ?? []}
        tablesById={tablesById}
        disabled={disabled}
        onDeleteHierarchy={onDeleteHierarchy}
        onDeleteKpi={onDeleteKpi}
        onDeletePerspective={onDeletePerspective}
      />
    </div>
  );
}

function ModelViewList({
  disabled,
  hierarchies,
  kpis,
  onDeleteHierarchy,
  onDeleteKpi,
  onDeletePerspective,
  perspectives,
  tablesById,
}: {
  disabled?: boolean;
  hierarchies: WorkbookDataModelHierarchy[];
  kpis: WorkbookDataModelKpi[];
  onDeleteHierarchy: (hierarchyId: string) => void;
  onDeleteKpi: (kpiId: string) => void;
  onDeletePerspective: (perspectiveId: string) => void;
  perspectives: WorkbookDataModelPerspective[];
  tablesById: Map<string, TableDefinition>;
}) {
  const items = [
    ...hierarchies.map((item) => ({
      id: item.id,
      label: item.name,
      meta: `${tableName(tablesById, item.tableId)} - ${item.levels.length} levels`,
      type: "Hierarchy",
      onDelete: () => onDeleteHierarchy(item.id),
    })),
    ...kpis.map((item) => ({
      id: item.id,
      label: item.name,
      meta: `${tableName(tablesById, item.tableId)} - target ${item.target}`,
      type: "KPI",
      onDelete: () => onDeleteKpi(item.id),
    })),
    ...perspectives.map((item) => ({
      id: item.id,
      label: item.name,
      meta: `${item.tableIds.length} tables - ${item.fields.length} fields`,
      type: "Perspective",
      onDelete: () => onDeletePerspective(item.id),
    })),
  ];

  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        No model hierarchies, KPIs, or perspectives yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <section key={item.id} className="rounded-md border p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{item.type}</Badge>
                <p className="truncate text-sm font-medium">{item.label}</p>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {item.meta}
              </p>
            </div>
            <ConfirmDestructiveButton
              title={`Delete ${item.type.toLowerCase()}?`}
              description="This removes the model-view metadata and keeps workbook tables unchanged."
              label={`Delete ${item.type.toLowerCase()}`}
              disabled={disabled}
              onConfirm={item.onDelete}
            >
              <Trash2 />
            </ConfirmDestructiveButton>
          </div>
        </section>
      ))}
    </div>
  );
}
