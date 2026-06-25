"use client";

import type { SelectionSummary } from "@/features/spreadsheet/selection-summary";

function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 4,
  }).format(value);
}

export function SelectionSummaryBar({
  summary,
}: {
  summary: SelectionSummary;
}) {
  const items = [
    ["Cells", summary.cells],
    ["Filled", summary.nonEmpty],
    ["Numbers", summary.numeric],
    ["Sum", summary.numeric > 0 ? formatNumber(summary.sum) : null],
    ["Avg", summary.average === null ? null : formatNumber(summary.average)],
    ["Min", summary.min === null ? null : formatNumber(summary.min)],
    ["Max", summary.max === null ? null : formatNumber(summary.max)],
  ].filter(([, value]) => value !== null);

  return (
    <div className="ml-auto hidden min-w-0 items-center gap-3 overflow-hidden font-mono text-xs text-muted-foreground lg:flex">
      {items.map(([label, value]) => (
        <span key={label} className="whitespace-nowrap">
          {label}: {value}
        </span>
      ))}
    </div>
  );
}
