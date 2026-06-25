"use client";

import {
  BarChart3,
  ListTree,
  Palette,
  RefreshCw,
  Table2,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PivotTableFieldControls } from "@/features/spreadsheet/components/pivot-table-field-controls";
import { PivotTableFilterControl } from "@/features/spreadsheet/components/pivot-table-filter-control";
import type { PivotTableLayoutUpdate } from "@/features/spreadsheet/components/pivot-table-layout-types";
import { PivotTableTimelineControl } from "@/features/spreadsheet/components/pivot-table-timeline-control";
import { columnLabel } from "@/features/workbooks/addresses";
import { getPivotConditionalFormatCount } from "@/features/spreadsheet/pivot/pivot-conditional-formatting";
import { getPivotTableSyncedControls } from "@/features/spreadsheet/pivot/pivot-control-sync";
import type { PivotSourceModel } from "@/features/spreadsheet/pivot/pivot-types";
import type { ConditionalFormatInput } from "@/features/spreadsheet/state/rule-state";
import type {
  ConditionalFormatRule,
  PivotTableConditionalFormatScope,
  PivotTableDefinition,
  WorkbookDocument,
} from "@/features/workbooks/types";

function formatRange(range: PivotTableDefinition["outputRange"]) {
  const start = `${columnLabel(range.startColumnIndex)}${range.startRowIndex + 1}`;
  const end = `${columnLabel(range.endColumnIndex)}${range.endRowIndex + 1}`;

  return `${start}:${end}`;
}

function formatSource(pivotTable: PivotTableDefinition) {
  return pivotTable.sourceTableId
    ? "Structured table"
    : formatRange(pivotTable.sourceRange);
}

export function PivotTableCard({
  disabled,
  document,
  pivotTable,
  conditionalFormats,
  source,
  onDeletePivotTable,
  onAddPivotChart,
  onAddPivotTableDrillDownSheet,
  onAddPivotTableConditionalFormat,
  onRefreshPivotTable,
  onSelectPivotTable,
  onSetMessage,
  onUpdatePivotTableLayout,
}: {
  disabled?: boolean;
  document: WorkbookDocument;
  pivotTable: PivotTableDefinition;
  conditionalFormats: ConditionalFormatRule[];
  source: PivotSourceModel | null;
  onDeletePivotTable: (pivotTableId: string) => void;
  onAddPivotChart: (pivotTableId: string) => string | null;
  onAddPivotTableDrillDownSheet: (pivotTableId: string) => string | null;
  onAddPivotTableConditionalFormat: (
    pivotTableId: string,
    rule: ConditionalFormatInput,
    scope?: PivotTableConditionalFormatScope,
  ) => string | null;
  onRefreshPivotTable: (pivotTableId: string) => string | null;
  onSelectPivotTable: (pivotTable: PivotTableDefinition) => void;
  onSetMessage: (message: string) => void;
  onUpdatePivotTableLayout: (
    pivotTableId: string,
    updates: PivotTableLayoutUpdate,
  ) => string | null;
}) {
  const fields = source?.fields ?? [];
  const valueCount = pivotTable.valueFields.length + (pivotTable.measures ?? []).length;
  const conditionalFormatCount = getPivotConditionalFormatCount(
    conditionalFormats,
    pivotTable.id,
  );
  const syncedControls = source
    ? getPivotTableSyncedControls({ document, pivotTable, source })
    : [];

  function updateLayout(updates: PivotTableLayoutUpdate) {
    const nextMessage = onUpdatePivotTableLayout(pivotTable.id, updates);

    onSetMessage(nextMessage ?? "");
  }

  function createPivotConditionalFormat(
    rule: ConditionalFormatInput,
    scope: PivotTableConditionalFormatScope = "values",
  ) {
    const nextMessage = onAddPivotTableConditionalFormat(
      pivotTable.id,
      rule,
      scope,
    );

    onSetMessage(nextMessage ?? "");
  }

  return (
    <section className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <button
          type="button"
          className="min-w-0 text-left"
          onClick={() => onSelectPivotTable(pivotTable)}
        >
          <span className="block truncate text-sm font-medium">
            {pivotTable.name}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            Output {formatRange(pivotTable.outputRange)}
          </span>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          onClick={() => onDeletePivotTable(pivotTable.id)}
        >
          <Trash2 />
          <span className="sr-only">Delete PivotTable</span>
        </Button>
      </div>
      <div className="mb-3 flex flex-wrap gap-1">
        <Badge variant="outline">{formatSource(pivotTable)}</Badge>
        <Badge variant="secondary">
          {valueCount === 1
            ? "1 value"
            : `${valueCount} values`}
        </Badge>
        {syncedControls.length > 0 ? (
          <Badge variant="outline">
            {syncedControls.length === 1
              ? "1 synced control"
              : `${syncedControls.length} synced controls`}
          </Badge>
        ) : null}
        {conditionalFormatCount > 0 ? (
          <Badge variant="outline">
            {conditionalFormatCount === 1
              ? "1 format rule"
              : `${conditionalFormatCount} format rules`}
          </Badge>
        ) : null}
      </div>
      {syncedControls.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-1 rounded-md border border-dashed bg-background p-2">
          {syncedControls.map((control) => (
            <Badge key={control.id} variant="secondary" className="max-w-full">
              <span className="truncate">
                {control.type === "slicer" ? "Slicer" : "Timeline"}:{" "}
                {control.fieldName}
              </span>
              <span className="ml-1 font-mono">{control.selectedCount}</span>
            </Badge>
          ))}
        </div>
      ) : null}
      {!source || fields.length === 0 ? (
        <p className="mb-2 rounded-md border border-dashed p-2 text-xs text-muted-foreground">
          Source fields are not available.
        </p>
      ) : (
        <div className="mb-3">
          <PivotTableFieldControls
            disabled={disabled}
            fields={fields}
            pivotTable={pivotTable}
            source={source}
            onUpdateLayout={updateLayout}
          />
        </div>
      )}
      {source ? (
        <div className="mb-3 space-y-2">
          <PivotTableFilterControl
            disabled={disabled}
            pivotTable={pivotTable}
            source={source}
            onUpdateLayout={updateLayout}
          />
          <PivotTableTimelineControl
            disabled={disabled}
            pivotTable={pivotTable}
            source={source}
            onUpdateLayout={updateLayout}
          />
        </div>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full justify-start"
        disabled={disabled}
        onClick={() => {
          const nextMessage = onRefreshPivotTable(pivotTable.id);

          onSetMessage(nextMessage ?? "");
        }}
      >
        <RefreshCw />
        Refresh
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-1 w-full justify-start"
        disabled={disabled}
        onClick={() => {
          const nextMessage = onAddPivotChart(pivotTable.id);

          onSetMessage(nextMessage ?? "");
        }}
      >
        <BarChart3 />
        Create PivotChart
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 w-full justify-start"
            disabled={disabled}
          >
            <Palette />
            Conditional format
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>PivotTable values</DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={() =>
              createPivotConditionalFormat({
                operator: "dataBar",
                value: "",
                style: {
                  foreground: "#111827",
                  scale: {
                    minColor: "#dbeafe",
                    maxColor: "#60a5fa",
                    thresholds: {
                      low: 0,
                      high: 100,
                    },
                  },
                },
              })
            }
          >
            Data bars
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              createPivotConditionalFormat({
                operator: "colorScale",
                value: "",
                style: {
                  foreground: "#111827",
                  scale: {
                    minColor: "#fee2e2",
                    maxColor: "#dcfce7",
                  },
                },
              })
            }
          >
            Color scale
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              createPivotConditionalFormat({
                operator: "topValues",
                value: "10",
                style: {
                  background: "#dcfce7",
                  bold: true,
                  foreground: "#14532d",
                },
              })
            }
          >
            Top 10 values
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              createPivotConditionalFormat({
                operator: "bottomValues",
                value: "10",
                style: {
                  background: "#fef3c7",
                  bold: true,
                  foreground: "#713f12",
                },
              })
            }
          >
            Bottom 10 values
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() =>
              createPivotConditionalFormat(
                {
                  operator: "notEmpty",
                  value: "",
                  style: {
                    background: "#e0f2fe",
                    bold: true,
                    foreground: "#075985",
                  },
                },
                "labels",
              )
            }
          >
            Highlight row labels
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-1 w-full justify-start"
        disabled={disabled}
        onClick={() => {
          const nextMessage = onAddPivotTableDrillDownSheet(pivotTable.id);

          onSetMessage(nextMessage ?? "");
        }}
      >
        <ListTree />
        Show details
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-1 w-full justify-start"
        onClick={() => onSelectPivotTable(pivotTable)}
      >
        <Table2 />
        Select output
      </Button>
    </section>
  );
}
