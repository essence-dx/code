"use client";

import { Activity, Trash2 } from "lucide-react";
import { ConfirmDestructiveButton } from "@/components/confirm-destructive-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { columnLabel, parseCellKey } from "@/features/workbooks/addresses";
import type { CellSelection } from "@/features/spreadsheet/state/selection-state";
import type { SparklineDefinition } from "@/features/workbooks/types";

function formatRange(sparkline: SparklineDefinition) {
  const start = `${columnLabel(sparkline.range.startColumnIndex)}${
    sparkline.range.startRowIndex + 1
  }`;
  const end = `${columnLabel(sparkline.range.endColumnIndex)}${
    sparkline.range.endRowIndex + 1
  }`;

  return `${start}:${end}`;
}

export function SparklinesPanel({
  disabled,
  sparklines,
  onDeleteSparkline,
  onSelectCell,
}: {
  disabled?: boolean;
  sparklines: SparklineDefinition[];
  onDeleteSparkline: (sparklineId: string) => void;
  onSelectCell: (selection: CellSelection) => void;
}) {
  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Sparklines</h2>
        <Badge variant="secondary" className="font-mono">
          {sparklines.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {sparklines.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No sparklines on this sheet.
          </p>
        ) : (
          sparklines.map((sparkline) => {
            const position = parseCellKey(sparkline.targetCellKey);

            return (
              <section key={sparkline.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 font-mono"
                    disabled={!position}
                    onClick={() => {
                      if (position) {
                        onSelectCell(position);
                      }
                    }}
                  >
                    <Activity />
                    {sparkline.targetCellKey}
                  </Button>
                  <ConfirmDestructiveButton
                    title="Delete this sparkline?"
                    description="This removes the sparkline from its target cell while keeping the source data."
                    label="Delete sparkline"
                    disabled={disabled}
                    onConfirm={() => onDeleteSparkline(sparkline.id)}
                  >
                    <Trash2 />
                  </ConfirmDestructiveButton>
                </div>
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  {formatRange(sparkline)}
                </p>
              </section>
            );
          })
        )}
      </div>
    </section>
  );
}
