"use client";

import { Download, Trash2 } from "lucide-react";
import { ConfirmDestructiveButton } from "@/components/confirm-destructive-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AreaChart,
  BarChart,
  BubbleChart,
  ChartLegend,
  ComboChart,
  LineChart,
  PieChart,
  RadarChart,
  ScatterChart,
  StockChart,
} from "@/features/spreadsheet/components/chart-renderers";
import {
  BoxWhiskerChart,
  FunnelChart,
  HistogramChart,
  MapStyleChart,
  StackedBarChart,
  SunburstChart,
  SurfaceChart,
  TreemapChart,
  WaterfallChart,
} from "@/features/spreadsheet/components/chart-variant-renderers";
import { ChartDataTableView } from "@/features/spreadsheet/components/chart-data-table";
import { ChartFormatControls } from "@/features/spreadsheet/components/chart-format-controls";
import {
  getBubblePoints,
  getChartPoints,
  getComboPoints,
  getScatterPoints,
  getStockPoints,
} from "@/features/spreadsheet/chart-data";
import { getChartDataTable } from "@/features/spreadsheet/chart-data-table";
import {
  getBoxWhiskerPoints,
  getHierarchyChartPoints,
  getHistogramBins,
  getStackedChartPoints,
  getSurfaceChartCells,
  getWaterfallPoints,
} from "@/features/spreadsheet/chart-variant-data";
import {
  getEffectiveChartFormat,
  type ChartFormatUpdate,
} from "@/features/spreadsheet/chart-formatting";
import { renderThreeDimensionalChartSvgBody } from "@/features/spreadsheet/chart-3d";
import {
  chartTemplatePresets,
  getChartSeriesEditorRows,
  isChartSeriesHidden,
} from "@/features/spreadsheet/chart-editor";
import type {
  ChartDefinition,
  SheetData,
} from "@/features/workbooks/types";

const chartTypeLabels = {
  bar: "Bar",
  line: "Line",
  area: "Area",
  pie: "Pie",
  scatter: "Scatter",
  bubble: "Bubble",
  radar: "Radar",
  combo: "Combo",
  stock: "Stock",
  "stacked-bar": "Stacked bar",
  "stacked-100-bar": "100% stacked",
  waterfall: "Waterfall",
  funnel: "Funnel",
  histogram: "Histogram",
  "box-whisker": "Box and whisker",
  treemap: "Treemap",
  sunburst: "Sunburst",
  surface: "Surface",
  map: "Map",
} satisfies Record<ChartDefinition["type"], string>;

function getChartLegendItems({
  chart,
  colors,
  points,
  seriesNames,
  template,
}: {
  chart: ChartDefinition;
  colors: string[];
  points: ReturnType<typeof getChartPoints>;
  seriesNames: string[];
  template: (typeof chartTemplatePresets)[number];
}) {
  if (chart.type === "stacked-bar" || chart.type === "stacked-100-bar") {
    return seriesNames.map((series, index) => ({
      label: series,
      color: colors[index % colors.length] ?? template.color,
    }));
  }

  if (chart.type === "waterfall") {
    return [
      { label: "Increase", color: "#16a34a" },
      { label: "Decrease", color: "#dc2626" },
      { label: "Total", color: template.color },
    ];
  }

  if (chart.type === "combo") {
    return [
      { label: "Column", color: template.color },
      { label: "Line", color: template.color },
    ];
  }

  if (chart.type === "stock") {
    return [
      { label: "Gain", color: "#16a34a" },
      { label: "Loss", color: "#dc2626" },
    ];
  }

  if (chart.type === "scatter" || chart.type === "bubble") {
    return [{ label: "Points", color: template.color }];
  }

  if (
    chart.type === "histogram" ||
    chart.type === "box-whisker" ||
    chart.type === "surface" ||
    chart.type === "map"
  ) {
    return [{ label: chartTypeLabels[chart.type], color: template.color }];
  }

  return points.map((point, index) => ({
    label: point.label,
    color: colors[index % colors.length] ?? template.color,
  }));
}

export function ChartPanel({
  sheet,
  charts,
  computedValues,
  disabled,
  onDeleteChart,
  onRenameChart,
  onToggleChartAxes,
  onToggleChartDataLabels,
  onToggleChartLegend,
  onUpdateChartFormat,
  onUpdateChartTemplate,
  onExportChart,
}: {
  sheet: SheetData;
  charts: ChartDefinition[];
  computedValues: Record<string, string>;
  disabled?: boolean;
  onDeleteChart: (chartId: string) => void;
  onRenameChart: (chartId: string, title: string) => void;
  onToggleChartAxes: (chartId: string) => void;
  onToggleChartDataLabels: (chartId: string) => void;
  onToggleChartLegend: (chartId: string) => void;
  onUpdateChartFormat: (chartId: string, updates: ChartFormatUpdate) => void;
  onUpdateChartTemplate: (
    chartId: string,
    template: NonNullable<ChartDefinition["template"]>,
  ) => void;
  onExportChart: (chart: ChartDefinition) => void;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Charts</h2>
        <Badge variant="secondary" className="font-mono">
          {charts.length}
        </Badge>
      </div>
      <div className="space-y-3">
        {charts.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm leading-6 text-muted-foreground">
            Select labels and numeric values, then use the chart buttons in the toolbar.
          </p>
        ) : (
          charts.map((chart) => {
            const chartTemplate =
              chartTemplatePresets.find(
                (template) => template.value === (chart.template ?? "standard"),
              ) ?? chartTemplatePresets[0];
            const format = getEffectiveChartFormat(chart);
            const showAxes = chart.showAxes !== false;
            const showDataLabels = chart.showDataLabels !== false;
            const showLegend = chart.showLegend !== false;
            const chartDataTable = format.dataTable.enabled
              ? getChartDataTable({ chart, computedValues, sheet })
              : null;
            const seriesRows = getChartSeriesEditorRows({
              chart,
              computedValues,
              format,
              sheet,
            });
            const primaryColor =
              seriesRows.find((row) => row.id === "combo-column")?.color ??
              seriesRows.find((row) => row.id === "series-1")?.color ??
              format.primaryColor ??
              chartTemplate.color;
            const secondaryColor =
              seriesRows.find((row) => row.id === "combo-line")?.color ??
              format.secondaryColor ??
              "#dc2626";
            const points = isChartSeriesHidden(format, "series-1")
              ? []
              : getChartPoints(sheet, computedValues, chart);
            const hiddenStackedSeries = new Set(
              seriesRows
                .filter((row) => row.hidden)
                .map((row) => row.label),
            );
            const stackedPoints =
              chart.type === "stacked-bar" || chart.type === "stacked-100-bar"
                ? getStackedChartPoints(sheet, computedValues, chart)
                    .map((point) => ({
                      ...point,
                      values: point.values.filter(
                        (item) => !hiddenStackedSeries.has(item.series),
                      ),
                    }))
                    .filter((point) => point.values.length > 0)
                : [];
            const waterfallPoints =
              chart.type === "waterfall"
                ? getWaterfallPoints(sheet, computedValues, chart)
                : [];
            const histogramBins =
              chart.type === "histogram"
                ? getHistogramBins(sheet, computedValues, chart)
                : [];
            const boxWhiskerPoints =
              chart.type === "box-whisker"
                ? getBoxWhiskerPoints(sheet, computedValues, chart)
                : [];
            const hierarchyPoints =
              chart.type === "treemap" || chart.type === "sunburst"
                ? getHierarchyChartPoints(sheet, computedValues, chart)
                : [];
            const surfaceCells =
              chart.type === "surface"
                ? getSurfaceChartCells(sheet, computedValues, chart)
                : [];
            const scatterPoints =
              chart.type === "scatter"
                ? getScatterPoints(sheet, computedValues, chart)
                : [];
            const bubblePoints =
              chart.type === "bubble"
                ? getBubblePoints(sheet, computedValues, chart)
                : [];
            const comboPoints =
              chart.type === "combo"
                ? getComboPoints(sheet, computedValues, chart)
                : [];
            const stockPoints =
              chart.type === "stock"
                ? getStockPoints(sheet, computedValues, chart)
                : [];
            const variantColors = [
              primaryColor,
              secondaryColor,
              ...seriesRows.flatMap((row) => (row.color ? [row.color] : [])),
              ...chartTemplate.pieColors,
            ];
            const threeDimensionalBody = renderThreeDimensionalChartSvgBody({
              chart,
              colors: variantColors,
              computedValues,
              format,
              primaryColor,
              sheet,
            });
            const stackedSeriesNames =
              stackedPoints[0]?.values.map((item) => item.series) ?? [];
            const hasPoints =
              chart.type === "stacked-bar" || chart.type === "stacked-100-bar"
                ? stackedPoints.length > 0
                : chart.type === "waterfall"
                  ? waterfallPoints.length > 0
                  : chart.type === "histogram"
                    ? histogramBins.length > 0
                    : chart.type === "box-whisker"
                      ? boxWhiskerPoints.length > 0
                      : chart.type === "treemap" || chart.type === "sunburst"
                        ? hierarchyPoints.length > 0
                        : chart.type === "surface"
                          ? surfaceCells.length > 0
                          : chart.type === "scatter"
                            ? scatterPoints.length > 0
                            : chart.type === "bubble"
                              ? bubblePoints.length > 0
                              : chart.type === "combo"
                                ? comboPoints.length > 0
                                : chart.type === "stock"
                                  ? stockPoints.length > 0
                                  : points.length > 0;

            return (
              <section key={chart.id} className="rounded-lg border bg-card p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Input
                      value={chart.title}
                      placeholder="Chart title"
                      disabled={disabled}
                      onChange={(event) =>
                        onRenameChart(chart.id, event.target.value)
                      }
                      className="h-7 px-2 text-sm font-medium"
                    />
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <span className="font-mono text-xs text-muted-foreground">
                        {chartTypeLabels[chart.type]}
                      </span>
                      {chart.sourcePivotTableId ? (
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                          PivotChart
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant={showDataLabels ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={disabled}
                      onClick={() => onToggleChartDataLabels(chart.id)}
                    >
                      Labels
                    </Button>
                    {chart.type !== "pie" ? (
                      <Button
                        type="button"
                        variant={showAxes ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={disabled}
                        onClick={() => onToggleChartAxes(chart.id)}
                      >
                        Axes
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant={showLegend ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={disabled}
                      onClick={() => onToggleChartLegend(chart.id)}
                    >
                      Legend
                    </Button>
                    {chartTemplatePresets.map((template) => (
                      <Button
                        key={template.value}
                        type="button"
                        variant={
                          chartTemplate.value === template.value
                            ? "secondary"
                            : "ghost"
                        }
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={disabled}
                        onClick={() => onUpdateChartTemplate(chart.id, template.value)}
                      >
                        {template.label}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={!hasPoints}
                      onClick={() => onExportChart(chart)}
                    >
                      <Download />
                      <span className="sr-only">Export chart image</span>
                    </Button>
                    <ConfirmDestructiveButton
                      title="Delete this chart?"
                      description="This removes the chart from the workbook. The source cells are kept."
                      label="Delete chart"
                      disabled={disabled}
                      onConfirm={() => onDeleteChart(chart.id)}
                    >
                      <Trash2 />
                    </ConfirmDestructiveButton>
                  </div>
                </div>
                <ChartFormatControls
                  chart={chart}
                  computedValues={computedValues}
                  disabled={disabled}
                  format={format}
                  sheet={sheet}
                  showAxes={showAxes}
                  showDataLabels={showDataLabels}
                  showLegend={showLegend}
                  onUpdateChartFormat={onUpdateChartFormat}
                />
                {hasPoints ? (
                  <>
                    <div
                      className={
                        showLegend && format.legendPosition === "right"
                          ? "grid gap-3 lg:grid-cols-[1fr_120px]"
                          : ""
                      }
                      style={{ color: primaryColor }}
                    >
                    {threeDimensionalBody !== null ? (
                      <svg
                        viewBox="0 0 720 420"
                        role="img"
                        aria-label={`${chart.title || chartTypeLabels[chart.type]} 3D chart`}
                        className="h-40 w-full"
                        dangerouslySetInnerHTML={{
                          __html: threeDimensionalBody,
                        }}
                      />
                    ) : chart.type === "bar" ? (
                      <BarChart
                        format={format}
                        points={points}
                        showAxes={showAxes}
                        showDataLabels={showDataLabels}
                      />
                    ) : chart.type === "line" ? (
                      <LineChart
                        format={format}
                        points={points}
                        showAxes={showAxes}
                        showDataLabels={showDataLabels}
                      />
                    ) : chart.type === "area" ? (
                      <AreaChart
                        format={format}
                        points={points}
                        showAxes={showAxes}
                        showDataLabels={showDataLabels}
                      />
                    ) : chart.type === "radar" ? (
                      <RadarChart points={points} showAxes={showAxes} />
                    ) : chart.type === "combo" ? (
                      <ComboChart
                        format={format}
                        points={comboPoints}
                        showAxes={showAxes}
                      />
                    ) : chart.type === "stock" ? (
                      <StockChart
                        format={format}
                        points={stockPoints}
                        showAxes={showAxes}
                      />
                    ) : chart.type === "stacked-bar" ? (
                      <StackedBarChart
                        colors={variantColors}
                        format={format}
                        points={stackedPoints}
                        showAxes={showAxes}
                        showDataLabels={showDataLabels}
                      />
                    ) : chart.type === "stacked-100-bar" ? (
                      <StackedBarChart
                        colors={variantColors}
                        format={format}
                        percentage
                        points={stackedPoints}
                        showAxes={showAxes}
                        showDataLabels={showDataLabels}
                      />
                    ) : chart.type === "waterfall" ? (
                      <WaterfallChart
                        format={format}
                        points={waterfallPoints}
                        showAxes={showAxes}
                        showDataLabels={showDataLabels}
                      />
                    ) : chart.type === "funnel" ? (
                      <FunnelChart
                        colors={variantColors}
                        points={points}
                        showDataLabels={showDataLabels}
                      />
                    ) : chart.type === "histogram" ? (
                      <HistogramChart
                        bins={histogramBins}
                        format={format}
                        showAxes={showAxes}
                      />
                    ) : chart.type === "box-whisker" ? (
                      <BoxWhiskerChart
                        format={format}
                        points={boxWhiskerPoints}
                        showAxes={showAxes}
                      />
                    ) : chart.type === "treemap" ? (
                      <TreemapChart
                        colors={variantColors}
                        points={hierarchyPoints}
                        showDataLabels={showDataLabels}
                      />
                    ) : chart.type === "sunburst" ? (
                      <SunburstChart colors={variantColors} points={hierarchyPoints} />
                    ) : chart.type === "surface" ? (
                      <SurfaceChart cells={surfaceCells} />
                    ) : chart.type === "map" ? (
                      <MapStyleChart colors={variantColors} points={points} />
                    ) : chart.type === "scatter" ? (
                      <ScatterChart
                        format={format}
                        points={scatterPoints}
                        showAxes={showAxes}
                      />
                    ) : chart.type === "bubble" ? (
                      <BubbleChart
                        format={format}
                        points={bubblePoints}
                        showAxes={showAxes}
                      />
                    ) : (
                      <PieChart
                        format={format}
                        points={points}
                        colors={[primaryColor, ...chartTemplate.pieColors]}
                        showDataLabels={showDataLabels}
                        showLegend={showLegend}
                      />
                    )}
                    {showAxes &&
                    (format.axisTitles.value ||
                      format.axisTitles.category ||
                      (format.secondaryAxis &&
                        format.axisTitles.secondaryValue)) ? (
                      <div className="mt-2 grid gap-1 text-[10px] text-muted-foreground">
                        {format.axisTitles.value ? (
                          <span>Y: {format.axisTitles.value}</span>
                        ) : null}
                        {format.axisTitles.category ? (
                          <span>X: {format.axisTitles.category}</span>
                        ) : null}
                        {format.secondaryAxis &&
                        format.axisTitles.secondaryValue ? (
                          <span>Y2: {format.axisTitles.secondaryValue}</span>
                        ) : null}
                      </div>
                    ) : null}
                    {showLegend && chart.type !== "pie" ? (
                      <ChartLegend
                        items={getChartLegendItems({
                          chart,
                          colors: variantColors,
                          points,
                          seriesNames: stackedSeriesNames,
                          template: {
                            ...chartTemplate,
                            color: primaryColor,
                            pieColors: [
                              primaryColor,
                              secondaryColor,
                              ...chartTemplate.pieColors,
                            ],
                          },
                        })}
                      />
                    ) : null}
                    </div>
                    {chartDataTable ? (
                      <ChartDataTableView
                        dataTable={chartDataTable}
                        showLegendKeys={format.dataTable.showLegendKeys}
                      />
                    ) : null}
                  </>
                ) : (
                  <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                    No numeric values found in this range.
                  </p>
                )}
              </section>
            );
          })
        )}
      </div>
    </section>
  );
}
