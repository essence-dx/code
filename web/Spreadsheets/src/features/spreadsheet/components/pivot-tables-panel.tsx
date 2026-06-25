"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PivotTableCard,
} from "@/features/spreadsheet/components/pivot-table-card";
import type { PivotTableLayoutUpdate } from "@/features/spreadsheet/components/pivot-table-layout-types";
import { createDataModelPivotSourceModel } from "@/features/spreadsheet/data-model";
import { applyPivotCalculatedFields } from "@/features/spreadsheet/pivot/pivot-calculated-fields";
import type {
  ConditionalFormatRule,
  PivotTableDefinition,
  PivotTableConditionalFormatScope,
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";
import type { ConditionalFormatInput } from "@/features/spreadsheet/state/rule-state";

export function PivotTablesPanel({
  disabled,
  sheet,
  document,
  pivotTables,
  conditionalFormats,
  computedValues,
  onAddPivotTable,
  onAddPivotChart,
  onAddPivotTableDrillDownSheet,
  onAddPivotTableConditionalFormat,
  onDeletePivotTable,
  onRefreshPivotTable,
  onSelectPivotTable,
  onUpdatePivotTableLayout,
}: {
  disabled?: boolean;
  sheet: SheetData;
  document: WorkbookDocument;
  pivotTables: PivotTableDefinition[];
  conditionalFormats: ConditionalFormatRule[];
  computedValues: Record<string, string>;
  onAddPivotTable: () => string | null;
  onAddPivotChart: (pivotTableId: string) => string | null;
  onAddPivotTableDrillDownSheet: (pivotTableId: string) => string | null;
  onAddPivotTableConditionalFormat: (
    pivotTableId: string,
    rule: ConditionalFormatInput,
    scope?: PivotTableConditionalFormatScope,
  ) => string | null;
  onDeletePivotTable: (pivotTableId: string) => void;
  onRefreshPivotTable: (pivotTableId: string) => string | null;
  onSelectPivotTable: (pivotTable: PivotTableDefinition) => void;
  onUpdatePivotTableLayout: (
    pivotTableId: string,
    updates: PivotTableLayoutUpdate,
  ) => string | null;
}) {
  const [message, setMessage] = useState("");
  const sourcesByPivotId = useMemo(
    () =>
      new Map(
        pivotTables.map((pivotTable) => [
          pivotTable.id,
          applyPivotCalculatedFields(
            createDataModelPivotSourceModel({
              computedValues,
              document,
              pivotTable,
              sheet,
            }),
            pivotTable.calculatedFields ?? [],
          ),
        ]),
      ),
    [computedValues, document, pivotTables, sheet],
  );

  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">PivotTables</h2>
        <Badge variant="secondary" className="font-mono">
          {pivotTables.length}
        </Badge>
      </div>
      <div className="rounded-md border bg-background p-2">
        <Button
          type="button"
          size="sm"
          className="w-full"
          disabled={disabled}
          onClick={() => {
            const nextMessage = onAddPivotTable();

            setMessage(nextMessage ?? "");
          }}
        >
          <Plus />
          Create from selection
        </Button>
        {message ? (
          <p className="mt-2 rounded-md border border-dashed p-2 text-xs text-muted-foreground">
            {message}
          </p>
        ) : null}
      </div>
      <div className="mt-3 space-y-2">
        {pivotTables.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No PivotTables on this sheet.
          </p>
        ) : (
          pivotTables.map((pivotTable) => (
            <PivotTableCard
              key={pivotTable.id}
              disabled={disabled}
              document={document}
              pivotTable={pivotTable}
              conditionalFormats={conditionalFormats}
              source={sourcesByPivotId.get(pivotTable.id) ?? null}
              onAddPivotChart={onAddPivotChart}
              onAddPivotTableDrillDownSheet={onAddPivotTableDrillDownSheet}
              onAddPivotTableConditionalFormat={onAddPivotTableConditionalFormat}
              onDeletePivotTable={onDeletePivotTable}
              onRefreshPivotTable={onRefreshPivotTable}
              onSelectPivotTable={onSelectPivotTable}
              onSetMessage={setMessage}
              onUpdatePivotTableLayout={onUpdatePivotTableLayout}
            />
          ))
        )}
      </div>
    </section>
  );
}
