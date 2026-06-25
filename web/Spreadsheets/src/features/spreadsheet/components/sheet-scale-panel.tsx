"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  EXCEL_MAX_COLUMNS,
  EXCEL_MAX_ROWS,
  getSheetScaleSummary,
} from "@/features/spreadsheet/sheet-scale";
import type { SheetData } from "@/features/workbooks/types";

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

export function SheetScalePanel({
  disabled,
  sheet,
  onEnableExcelScale,
}: {
  disabled: boolean;
  sheet: SheetData;
  onEnableExcelScale: () => void;
}) {
  const summary = getSheetScaleSummary(sheet);
  const excelScaleEnabled =
    summary.totalRows === EXCEL_MAX_ROWS &&
    summary.totalColumns === EXCEL_MAX_COLUMNS;

  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Sheet scale</h2>
        <Badge variant={summary.mode === "excel" ? "default" : "secondary"}>
          {summary.mode === "excel" ? "Excel scale" : "Standard"}
        </Badge>
      </div>
      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded-md border bg-background/70 p-2">
          <dt className="truncate text-xs text-muted-foreground">Rows</dt>
          <dd className="truncate font-mono text-sm font-medium">
            {formatCount(summary.totalRows)}
          </dd>
        </div>
        <div className="rounded-md border bg-background/70 p-2">
          <dt className="truncate text-xs text-muted-foreground">Columns</dt>
          <dd className="truncate font-mono text-sm font-medium">
            {formatCount(summary.totalColumns)}
          </dd>
        </div>
        <div className="rounded-md border bg-background/70 p-2">
          <dt className="truncate text-xs text-muted-foreground">Used range</dt>
          <dd className="truncate font-mono text-sm font-medium">
            {summary.usedRangeLabel}
          </dd>
        </div>
        <div className="rounded-md border bg-background/70 p-2">
          <dt className="truncate text-xs text-muted-foreground">Flat export</dt>
          <dd className="truncate font-mono text-sm font-medium">
            {summary.exportsUseUsedRange
              ? `${formatCount(summary.exportRowCount)} x ${formatCount(summary.exportColumnCount)}`
              : "Full sheet"}
          </dd>
        </div>
      </dl>
      <Button
        type="button"
        className="mt-3 w-full"
        size="sm"
        variant={excelScaleEnabled ? "secondary" : "default"}
        disabled={disabled || excelScaleEnabled}
        onClick={onEnableExcelScale}
      >
        {excelScaleEnabled ? "Excel-scale grid enabled" : "Enable Excel-scale grid"}
      </Button>
    </section>
  );
}
