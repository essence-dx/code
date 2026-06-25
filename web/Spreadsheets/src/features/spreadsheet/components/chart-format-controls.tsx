"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chartFormatTemplatePresets } from "@/features/spreadsheet/chart-editor";
import { ChartColorSwatches } from "@/features/spreadsheet/components/chart-color-swatches";
import { ChartSeriesEditor } from "@/features/spreadsheet/components/chart-series-editor";
import {
  type ChartFormatUpdate,
  type EffectiveChartFormat,
} from "@/features/spreadsheet/chart-formatting";
import type { ChartDefinition, SheetData } from "@/features/workbooks/types";

function FormatButton({
  active,
  children,
  disabled,
  onClick,
}: {
  active: boolean;
  children: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="sm"
      className="h-7 px-2 text-xs"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function ChartFormatControls({
  chart,
  computedValues,
  disabled,
  format,
  sheet,
  showAxes,
  showDataLabels,
  showLegend,
  onUpdateChartFormat,
}: {
  chart: ChartDefinition;
  computedValues: Record<string, string>;
  disabled?: boolean;
  format: EffectiveChartFormat;
  sheet: SheetData;
  showAxes: boolean;
  showDataLabels: boolean;
  showLegend: boolean;
  onUpdateChartFormat: (chartId: string, updates: ChartFormatUpdate) => void;
}) {
  function updateAxisBound(
    key: "valueMin" | "valueMax" | "secondaryValueMax",
    value: string,
  ) {
    onUpdateChartFormat(chart.id, {
      axisBounds: {
        ...(chart.format?.axisBounds ?? {}),
        [key]: value.trim() ? Number(value) : undefined,
      },
    });
  }

  return (
    <div className="mb-3 space-y-3 rounded-md border bg-background/60 p-2">
      <div className="grid gap-2 sm:grid-cols-3">
        {chartFormatTemplatePresets.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            variant="outline"
            className="h-auto justify-start px-2 py-2 text-left"
            disabled={disabled}
            onClick={() => onUpdateChartFormat(chart.id, preset.updates)}
          >
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium">
                {preset.label}
              </span>
              <span className="block truncate text-[10px] text-muted-foreground">
                {preset.description}
              </span>
            </span>
          </Button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          value={format.axisTitles.value}
          placeholder="Value axis title"
          disabled={disabled || !showAxes}
          onChange={(event) =>
            onUpdateChartFormat(chart.id, {
              axisTitles: { value: event.target.value },
            })
          }
          className="h-7 px-2 text-xs"
        />
        <Input
          value={format.axisTitles.category}
          placeholder="Category axis title"
          disabled={disabled || !showAxes}
          onChange={(event) =>
            onUpdateChartFormat(chart.id, {
              axisTitles: { category: event.target.value },
            })
          }
          className="h-7 px-2 text-xs"
        />
        <Input
          value={format.axisTitles.secondaryValue}
          placeholder="Secondary axis title"
          disabled={disabled || !showAxes || !format.secondaryAxis}
          onChange={(event) =>
            onUpdateChartFormat(chart.id, {
              axisTitles: { secondaryValue: event.target.value },
            })
          }
          className="h-7 px-2 text-xs"
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Input
          type="number"
          value={chart.format?.axisBounds?.valueMin ?? ""}
          placeholder="Y min"
          disabled={disabled || !showAxes}
          onChange={(event) => updateAxisBound("valueMin", event.target.value)}
          className="h-7 px-2 text-xs"
        />
        <Input
          type="number"
          value={chart.format?.axisBounds?.valueMax ?? ""}
          placeholder="Y max"
          disabled={disabled || !showAxes}
          onChange={(event) => updateAxisBound("valueMax", event.target.value)}
          className="h-7 px-2 text-xs"
        />
        <Input
          type="number"
          value={chart.format?.axisBounds?.secondaryValueMax ?? ""}
          placeholder="Y2 max"
          disabled={disabled || !showAxes || !format.secondaryAxis}
          onChange={(event) =>
            updateAxisBound("secondaryValueMax", event.target.value)
          }
          className="h-7 px-2 text-xs"
        />
      </div>
      <div className="flex flex-wrap gap-1">
        <FormatButton
          active={format.showGridlines}
          disabled={disabled || !showAxes}
          onClick={() =>
            onUpdateChartFormat(chart.id, {
              showGridlines: !format.showGridlines,
            })
          }
        >
          Grid
        </FormatButton>
        <FormatButton
          active={format.showTrendline}
          disabled={disabled || chart.type !== "scatter"}
          onClick={() =>
            onUpdateChartFormat(chart.id, {
              trendline: {
                ...format.trendline,
                enabled: !format.trendline.enabled,
              },
            })
          }
        >
          Trend
        </FormatButton>
        <FormatButton
          active={format.showErrorBars}
          disabled={disabled || chart.type === "pie"}
          onClick={() =>
            onUpdateChartFormat(chart.id, {
              errorBars: {
                ...format.errorBars,
                enabled: !format.errorBars.enabled,
              },
            })
          }
        >
          Error
        </FormatButton>
        <FormatButton
          active={format.secondaryAxis}
          disabled={disabled || chart.type !== "combo"}
          onClick={() =>
            onUpdateChartFormat(chart.id, {
              secondaryAxis: !format.secondaryAxis,
            })
          }
        >
          2nd axis
        </FormatButton>
        <FormatButton
          active={format.legendPosition === "right"}
          disabled={disabled || !showLegend}
          onClick={() =>
            onUpdateChartFormat(chart.id, {
              legendPosition:
                format.legendPosition === "right" ? "bottom" : "right",
            })
          }
        >
          Legend right
        </FormatButton>
        <FormatButton
          active={format.dataLabelPosition === "inside"}
          disabled={disabled || !showDataLabels}
          onClick={() =>
            onUpdateChartFormat(chart.id, {
              dataLabelPosition:
                format.dataLabelPosition === "inside" ? "outside" : "inside",
            })
          }
        >
          Labels in
        </FormatButton>
        <FormatButton
          active={format.dataTable.enabled}
          disabled={disabled}
          onClick={() =>
            onUpdateChartFormat(chart.id, {
              dataTable: {
                enabled: !format.dataTable.enabled,
                showLegendKeys: format.dataTable.showLegendKeys,
              },
            })
          }
        >
          Data table
        </FormatButton>
        <FormatButton
          active={format.dataTable.showLegendKeys}
          disabled={disabled || !format.dataTable.enabled}
          onClick={() =>
            onUpdateChartFormat(chart.id, {
              dataTable: {
                enabled: format.dataTable.enabled,
                showLegendKeys: !format.dataTable.showLegendKeys,
              },
            })
          }
        >
          Table keys
        </FormatButton>
        <FormatButton
          active={format.threeDimensional.enabled}
          disabled={disabled}
          onClick={() =>
            onUpdateChartFormat(chart.id, {
              threeDimensional: {
                ...format.threeDimensional,
                enabled: !format.threeDimensional.enabled,
              },
            })
          }
        >
          3D
        </FormatButton>
        <FormatButton
          active={format.lineStyle === "dashed"}
          disabled={disabled}
          onClick={() =>
            onUpdateChartFormat(chart.id, {
              lineStyle: format.lineStyle === "dashed" ? "solid" : "dashed",
            })
          }
        >
          Dash
        </FormatButton>
        <FormatButton
          active={format.markerStyle === "square"}
          disabled={disabled || chart.type === "bar" || chart.type === "pie"}
          onClick={() =>
            onUpdateChartFormat(chart.id, {
              markerStyle: format.markerStyle === "square" ? "circle" : "square",
            })
          }
        >
          Square
        </FormatButton>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_96px_96px]">
        <select
          value={format.errorBars.type}
          disabled={disabled || !format.errorBars.enabled}
          onChange={(event) =>
            onUpdateChartFormat(chart.id, {
              errorBars: {
                ...format.errorBars,
                type: event.target.value === "fixed" ? "fixed" : "percentage",
              },
            })
          }
          className="h-7 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="percentage">Error percentage</option>
          <option value="fixed">Fixed error</option>
        </select>
        <Input
          type="number"
          value={format.errorBars.value}
          min={format.errorBars.type === "fixed" ? 0 : 1}
          max={100}
          disabled={disabled || !format.errorBars.enabled}
          onChange={(event) =>
            onUpdateChartFormat(chart.id, {
              errorBars: {
                ...format.errorBars,
                value: Number(event.target.value),
              },
            })
          }
          className="h-7 px-2 text-xs"
        />
        <Button
          type="button"
          variant={format.trendline.displayEquation ? "secondary" : "outline"}
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={disabled || !format.trendline.enabled}
          onClick={() =>
            onUpdateChartFormat(chart.id, {
              trendline: {
                ...format.trendline,
                displayEquation: !format.trendline.displayEquation,
              },
            })
          }
        >
          Equation
        </Button>
      </div>
      <ChartSeriesEditor
        chart={chart}
        computedValues={computedValues}
        disabled={disabled}
        format={format}
        sheet={sheet}
        onUpdateChartFormat={onUpdateChartFormat}
      />
      {format.threeDimensional.enabled ? (
        <div className="grid gap-2 sm:grid-cols-4">
          <Input
            type="number"
            value={format.threeDimensional.rotationX}
            min={-90}
            max={90}
            aria-label="3D rotation X"
            disabled={disabled}
            onChange={(event) =>
              onUpdateChartFormat(chart.id, {
                threeDimensional: {
                  ...format.threeDimensional,
                  rotationX: Number(event.target.value),
                },
              })
            }
            className="h-7 px-2 text-xs"
          />
          <Input
            type="number"
            value={format.threeDimensional.rotationY}
            min={-90}
            max={90}
            aria-label="3D rotation Y"
            disabled={disabled}
            onChange={(event) =>
              onUpdateChartFormat(chart.id, {
                threeDimensional: {
                  ...format.threeDimensional,
                  rotationY: Number(event.target.value),
                },
              })
            }
            className="h-7 px-2 text-xs"
          />
          <Input
            type="number"
            value={format.threeDimensional.perspective}
            min={0}
            max={240}
            aria-label="3D perspective"
            disabled={disabled}
            onChange={(event) =>
              onUpdateChartFormat(chart.id, {
                threeDimensional: {
                  ...format.threeDimensional,
                  perspective: Number(event.target.value),
                },
              })
            }
            className="h-7 px-2 text-xs"
          />
          <Input
            type="number"
            value={format.threeDimensional.depthPercent}
            min={20}
            max={500}
            aria-label="3D depth percent"
            disabled={disabled}
            onChange={(event) =>
              onUpdateChartFormat(chart.id, {
                threeDimensional: {
                  ...format.threeDimensional,
                  depthPercent: Number(event.target.value),
                },
              })
            }
            className="h-7 px-2 text-xs"
          />
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <ChartColorSwatches
          label="Series"
          disabled={disabled}
          selectedColor={format.primaryColor}
          onSelectColor={(color) =>
            onUpdateChartFormat(chart.id, { primaryColor: color })
          }
        />
        <ChartColorSwatches
          label="Secondary"
          disabled={disabled || chart.type !== "combo"}
          selectedColor={format.secondaryColor}
          onSelectColor={(color) =>
            onUpdateChartFormat(chart.id, { secondaryColor: color })
          }
        />
      </div>
    </div>
  );
}
