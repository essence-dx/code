import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getChartSeriesEditorRows,
  getChartSeriesFormatUpdate,
} from "@/features/spreadsheet/chart-editor";
import { ChartColorSwatches } from "@/features/spreadsheet/components/chart-color-swatches";
import type {
  ChartFormatUpdate,
  EffectiveChartFormat,
} from "@/features/spreadsheet/chart-formatting";
import type { ChartDefinition, SheetData } from "@/features/workbooks/types";

export function ChartSeriesEditor({
  chart,
  computedValues,
  disabled,
  format,
  sheet,
  onUpdateChartFormat,
}: {
  chart: ChartDefinition;
  computedValues: Record<string, string>;
  disabled?: boolean;
  format: EffectiveChartFormat;
  sheet: SheetData;
  onUpdateChartFormat: (chartId: string, updates: ChartFormatUpdate) => void;
}) {
  const seriesRows = getChartSeriesEditorRows({
    chart,
    computedValues,
    format,
    sheet,
  });

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Series
      </p>
      {seriesRows.map((row) => (
        <div
          key={row.id}
          className="grid gap-2 rounded-md border bg-background/70 p-2"
        >
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <Input
              value={row.name}
              disabled={disabled}
              aria-label={`${row.label} series name`}
              onChange={(event) =>
                onUpdateChartFormat(
                  chart.id,
                  getChartSeriesFormatUpdate(format, row, {
                    name: event.target.value,
                  }),
                )
              }
              className="h-7 px-2 text-xs"
            />
            <Button
              type="button"
              variant={row.hidden ? "outline" : "secondary"}
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={disabled}
              onClick={() =>
                onUpdateChartFormat(
                  chart.id,
                  getChartSeriesFormatUpdate(format, row, {
                    hidden: !row.hidden,
                  }),
                )
              }
            >
              {row.hidden ? "Hidden" : "Visible"}
            </Button>
            <Button
              type="button"
              variant={row.axis === "secondary" ? "secondary" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={disabled || chart.type !== "combo"}
              onClick={() =>
                onUpdateChartFormat(
                  chart.id,
                  getChartSeriesFormatUpdate(format, row, {
                    axis: row.axis === "secondary" ? "primary" : "secondary",
                  }),
                )
              }
            >
              {row.axis === "secondary" ? "Y2" : "Y1"}
            </Button>
          </div>
          <ChartColorSwatches
            label={row.label}
            disabled={disabled}
            selectedColor={row.color}
            onSelectColor={(color) =>
              onUpdateChartFormat(
                chart.id,
                getChartSeriesFormatUpdate(format, row, { color }),
              )
            }
          />
        </div>
      ))}
    </div>
  );
}
