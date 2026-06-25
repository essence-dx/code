"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Check,
  FileDiff,
  GitCompareArrows,
  MousePointer,
  Upload,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  WorkbookCompareItem,
  WorkbookCompareResult,
  WorkbookCompareStatus,
} from "@/features/spreadsheet/workbook-compare";
import { getWorkbookCompareRangeLabel } from "@/features/spreadsheet/workbook-compare";

const statusLabels: Record<WorkbookCompareStatus, string> = {
  added: "Added",
  changed: "Changed",
  removed: "Removed",
};

const statusVariants: Record<
  WorkbookCompareStatus,
  "default" | "destructive" | "secondary"
> = {
  added: "default",
  changed: "secondary",
  removed: "destructive",
};

function categoryLabel(value: WorkbookCompareItem["category"]) {
  return value.replace(/^\w/, (letter) => letter.toUpperCase());
}

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

export function WorkbookComparePanel({
  compareError,
  compareNotice,
  disabled,
  fileName,
  result,
  onApplyItems,
  onClearComparison,
  onSelectFile,
  onSelectItem,
}: {
  compareError: string | null;
  compareNotice: string | null;
  disabled: boolean;
  fileName: string;
  result: WorkbookCompareResult | null;
  onApplyItems: (itemIds: string[]) => void;
  onClearComparison: () => void;
  onSelectFile: (file: File) => void;
  onSelectItem: (item: WorkbookCompareItem) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const mergeableItems = useMemo(
    () => result?.items.filter((item) => item.merge) ?? [],
    [result],
  );

  useEffect(() => {
    setSelectedIds((currentIds) => {
      const availableIds = new Set(mergeableItems.map((item) => item.id));

      return currentIds.filter((itemId) => availableIds.has(itemId));
    });
  }, [mergeableItems]);

  const visibleItems = result?.items.slice(0, 80) ?? [];
  const selectedIdSet = new Set(selectedIds);

  function toggleSelected(itemId: string) {
    setSelectedIds((currentIds) =>
      currentIds.includes(itemId)
        ? currentIds.filter((currentId) => currentId !== itemId)
        : [...currentIds, itemId],
    );
  }

  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold">
          <GitCompareArrows className="size-4" />
          Workbook compare
        </h2>
        <Badge variant="secondary" className="font-mono">
          {formatCount(result?.summary.total ?? 0)}
        </Badge>
      </div>

      <div className="space-y-2 rounded-md border border-dashed p-3">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".json,.xlsx,.xlsm,.xltx,.xltm,.xls,.ods"
          className="sr-only"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];

            event.currentTarget.value = "";

            if (file) {
              onSelectFile(file);
            }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {fileName || "No comparison workbook selected"}
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              Compare against JSON, backup, XLSX, XLSM, XLTX, XLTM, XLS, or ODS files.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="size-3.5" />
            File
          </Button>
        </div>
        {compareError ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs leading-5 text-destructive">
            {compareError}
          </p>
        ) : null}
        {compareNotice ? (
          <p className="rounded-md border bg-muted/50 p-2 text-xs leading-5 text-muted-foreground">
            {compareNotice}
          </p>
        ) : null}
      </div>

      {result ? (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md border p-2">
              <p className="font-mono text-sm">{formatCount(result.summary.added)}</p>
              <p className="text-muted-foreground">Added</p>
            </div>
            <div className="rounded-md border p-2">
              <p className="font-mono text-sm">{formatCount(result.summary.changed)}</p>
              <p className="text-muted-foreground">Changed</p>
            </div>
            <div className="rounded-md border p-2">
              <p className="font-mono text-sm">{formatCount(result.summary.removed)}</p>
              <p className="text-muted-foreground">Removed</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {Object.entries(result.summary.byCategory).map(([category, count]) =>
              count > 0 ? (
                <div
                  key={category}
                  className="flex items-center justify-between rounded-md border px-2 py-1"
                >
                  <span className="text-muted-foreground">
                    {categoryLabel(category as WorkbookCompareItem["category"])}
                  </span>
                  <span className="font-mono">{formatCount(count)}</span>
                </div>
              ) : null,
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={mergeableItems.length === 0}
              onClick={() =>
                setSelectedIds(mergeableItems.map((item) => item.id))
              }
            >
              <Check className="size-3.5" />
              Select mergeable
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={selectedIds.length === 0}
              onClick={() => setSelectedIds([])}
            >
              <X className="size-3.5" />
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={disabled || selectedIds.length === 0}
              onClick={() => onApplyItems(selectedIds)}
            >
              Apply {formatCount(selectedIds.length)}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onClearComparison}
            >
              Close
            </Button>
          </div>

          {disabled ? (
            <p className="rounded-md border p-2 text-xs leading-5 text-muted-foreground">
              Merge actions are disabled while the workbook is read-only or structure-protected.
            </p>
          ) : null}

          {visibleItems.length === 0 ? (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              No differences found against the selected workbook.
            </p>
          ) : (
            <div className="space-y-2">
              {visibleItems.map((item) => {
                const isSelected = selectedIdSet.has(item.id);
                const canSelectRange = Boolean(item.sheetId && item.range);

                return (
                  <section key={item.id} className="rounded-lg border bg-card p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        {item.merge ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            aria-label={`Select ${item.title} for merge`}
                            className="size-3.5 accent-primary"
                            onChange={() => toggleSelected(item.id)}
                          />
                        ) : null}
                        <Badge variant={statusVariants[item.status]}>
                          {statusLabels[item.status]}
                        </Badge>
                        <Badge variant="outline">{categoryLabel(item.category)}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        {canSelectRange ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`Select ${getWorkbookCompareRangeLabel(item)}`}
                            onClick={() => onSelectItem(item)}
                          >
                            <MousePointer className="size-3" />
                          </Button>
                        ) : null}
                        {item.merge ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`Apply ${item.title}`}
                            disabled={disabled}
                            onClick={() => onApplyItems([item.id])}
                          >
                            <FileDiff className="size-3" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {item.details}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {getWorkbookCompareRangeLabel(item)}
                    </p>
                    {item.baseValue || item.incomingValue ? (
                      <div className="mt-2 grid gap-1 text-xs">
                        <div className="rounded-md bg-muted/50 px-2 py-1">
                          <span className="text-muted-foreground">Current: </span>
                          <span className="font-mono">{item.baseValue ?? "Missing"}</span>
                        </div>
                        <div className="rounded-md bg-muted/50 px-2 py-1">
                          <span className="text-muted-foreground">Incoming: </span>
                          <span className="font-mono">
                            {item.incomingValue ?? "Missing"}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          )}
          {result.summary.truncated > 0 ? (
            <p className="text-xs leading-5 text-muted-foreground">
              {formatCount(result.summary.truncated)} additional differences were summarized but not listed.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
