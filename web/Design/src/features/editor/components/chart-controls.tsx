"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ColorPalettePicker } from "@/features/editor/components/color-palette-picker";
import {
  chartTypeOptions,
  clampChartValue,
  defaultChartData,
  maxChartDataPoints,
} from "@/features/editor/chart";
import {
  applyDataChartTheme,
  dataChartThemes,
} from "@/features/editor/data-visualization-themes";
import {
  createChartDataFromTable,
  formatTableDataSourceLabel,
  getLinkedChartData,
  getTableColumnOptions,
  getTableElements,
  manualChartDataSourceId,
} from "@/features/editor/chart-data-binding";
import type { EditorColorPalette } from "@/features/editor/color-palettes";
import type {
  ChartDataPoint,
  ChartElement,
  ChartType,
  DesignElement,
} from "@/features/editor/types";

type ChartControlsProps = {
  element: ChartElement;
  pageElements?: readonly DesignElement[];
  palettes: readonly EditorColorPalette[];
  onUpdateElement: (updates: Partial<DesignElement>) => void;
};

export function ChartControls({
  element,
  pageElements = [],
  palettes,
  onUpdateElement,
}: ChartControlsProps) {
  const tableElements = getTableElements(pageElements);
  const linkedTable =
    tableElements.find((table) => table.id === element.dataSourceTableId) ??
    null;
  const linkedData = getLinkedChartData(element, pageElements);
  const isLinked = Boolean(element.dataSourceTableId && linkedTable);
  const data = isLinked
    ? linkedData.length
      ? linkedData
      : element.data.length
        ? element.data
        : defaultChartData
    : element.data.length
      ? element.data
      : defaultChartData;

  function updateDataPoint(index: number, updates: Partial<ChartDataPoint>) {
    onUpdateElement({
      data: data.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...updates } : item,
      ),
    } as Partial<DesignElement>);
  }

  return (
    <div className="space-y-4">
      <ControlField label="Chart type">
        <Select
          value={element.chartType}
          onValueChange={(chartType) =>
            onUpdateElement({
              chartType: chartType as ChartType,
            } as Partial<DesignElement>)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {chartTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ControlField>

      <ControlField label="Chart themes">
        <div className="grid grid-cols-2 gap-2">
          {dataChartThemes.map((theme) => (
            <Button
              key={theme.id}
              type="button"
              variant="outline"
              className="h-auto justify-start whitespace-normal"
              onClick={() =>
                onUpdateElement(
                  applyDataChartTheme(element, theme) as Partial<DesignElement>,
                )
              }
            >
              <span className="flex min-w-0 flex-col items-start gap-1">
                <span>{theme.label}</span>
                <span className="flex gap-1">
                  {theme.colors.slice(0, 4).map((color) => (
                    <span
                      key={color}
                      className="h-2 w-4 rounded-sm border border-border"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
              </span>
            </Button>
          ))}
        </div>
      </ControlField>

      <ControlField label="Data source">
        <div className="space-y-3">
          <Select
            value={linkedTable ? linkedTable.id : manualChartDataSourceId}
            onValueChange={(value) => {
              if (value === manualChartDataSourceId) {
                onUpdateElement({
                  data: data.length ? data : defaultChartData,
                  dataSourceTableId: undefined,
                } as Partial<DesignElement>);
                return;
              }

              const table = tableElements.find((item) => item.id === value);

              if (!table) return;

              const valueColumnIndex = Math.min(1, Math.max(0, table.columns - 1));
              const useFilteredRows = element.dataSourceUseFilteredRows ?? true;

              onUpdateElement({
                dataSourceTableId: table.id,
                dataSourceLabelColumnIndex: 0,
                dataSourceValueColumnIndex: valueColumnIndex,
                dataSourceUseFilteredRows: useFilteredRows,
                data: createChartDataFromTable({
                  fallbackData: data,
                  labelColumnIndex: 0,
                  table,
                  useFilteredRows,
                  valueColumnIndex,
                }),
              } as Partial<DesignElement>);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={manualChartDataSourceId}>Manual data</SelectItem>
              {tableElements.map((table, index) => (
                <SelectItem key={table.id} value={table.id}>
                  {formatTableDataSourceLabel(table, index)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {linkedTable ? (
            <LinkedTableControls
              element={element}
              table={linkedTable}
              fallbackData={data}
              onUpdateElement={onUpdateElement}
            />
          ) : element.dataSourceTableId ? (
            <p className="rounded-md border border-dashed border-border p-2 text-xs text-muted-foreground">
              The linked table is no longer on this page.
            </p>
          ) : null}

          {isLinked && linkedData.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-2 text-xs text-muted-foreground">
              Choose a value column with numeric table rows to populate this chart.
            </p>
          ) : null}
        </div>
      </ControlField>

      <ControlField label="Data">
        <div className="space-y-2">
          {data.map((item, index) => (
            <div
              key={`${item.label}-${index}`}
              className="grid grid-cols-[1fr_72px_38px_32px] items-center gap-2"
            >
              <Input
                value={item.label}
                disabled={isLinked}
                onChange={(event) =>
                  updateDataPoint(index, {
                    label: event.target.value,
                  })
                }
                aria-label={`Chart label ${index + 1}`}
              />
              <Input
                type="number"
                min={0}
                value={item.value}
                disabled={isLinked}
                onChange={(event) =>
                  updateDataPoint(index, {
                    value: clampChartValue(Number(event.target.value)),
                  })
                }
                aria-label={`Chart value ${index + 1}`}
              />
              <Input
                type="color"
                value={item.color}
                onChange={(event) =>
                  updateDataPoint(index, {
                    color: event.target.value,
                  })
                }
                aria-label={`Chart color ${index + 1}`}
              />
              <Button
                variant="ghost"
                size="icon"
                disabled={isLinked || data.length <= 1}
                onClick={() =>
                  onUpdateElement({
                    data: data.filter((_, itemIndex) => itemIndex !== index),
                  } as Partial<DesignElement>)
                }
                aria-label={`Remove chart item ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isLinked || data.length >= maxChartDataPoints}
            onClick={() =>
              onUpdateElement({
                data: [
                  ...data,
                  {
                    label: `Item ${data.length + 1}`,
                    value: 10,
                    color:
                      defaultChartData[data.length % defaultChartData.length]
                        .color,
                  },
                ],
              } as Partial<DesignElement>)
            }
          >
            <Plus className="h-4 w-4" />
            Add row
          </Button>
        </div>
      </ControlField>

      <div className="grid grid-cols-3 gap-2">
        <ToggleControl
          label="Axis"
          checked={element.showAxis}
          onChange={(showAxis) =>
            onUpdateElement({ showAxis } as Partial<DesignElement>)
          }
        />
        <ToggleControl
          label="Labels"
          checked={element.showLabels}
          onChange={(showLabels) =>
            onUpdateElement({ showLabels } as Partial<DesignElement>)
          }
        />
        <ToggleControl
          label="Values"
          checked={element.showValues}
          onChange={(showValues) =>
            onUpdateElement({ showValues } as Partial<DesignElement>)
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberControl
          label="Font size"
          value={element.fontSize}
          min={8}
          max={64}
          onChange={(fontSize) =>
            onUpdateElement({ fontSize } as Partial<DesignElement>)
          }
        />
        <NumberControl
          label="Stroke"
          value={element.strokeWidth}
          min={1}
          max={12}
          onChange={(strokeWidth) =>
            onUpdateElement({ strokeWidth } as Partial<DesignElement>)
          }
        />
        <NumberControl
          label="Donut hole"
          value={element.innerRadius}
          min={35}
          max={85}
          onChange={(innerRadius) =>
            onUpdateElement({ innerRadius } as Partial<DesignElement>)
          }
        />
      </div>

      <ColorControl
        label="Background"
        value={element.backgroundColor}
        palettes={palettes}
        onChange={(backgroundColor) =>
          onUpdateElement({ backgroundColor } as Partial<DesignElement>)
        }
      />
      <ColorControl
        label="Text color"
        value={element.textColor}
        palettes={palettes}
        onChange={(textColor) =>
          onUpdateElement({ textColor } as Partial<DesignElement>)
        }
      />
      <ColorControl
        label="Axis color"
        value={element.axisColor}
        palettes={palettes}
        onChange={(axisColor) =>
          onUpdateElement({ axisColor } as Partial<DesignElement>)
        }
      />
    </div>
  );
}

function LinkedTableControls({
  element,
  table,
  fallbackData,
  onUpdateElement,
}: {
  element: ChartElement;
  table: Extract<DesignElement, { type: "table" }>;
  fallbackData: ChartDataPoint[];
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  const columnOptions = getTableColumnOptions(table);
  const labelColumnIndex = clampColumnIndex(
    element.dataSourceLabelColumnIndex ?? 0,
    columnOptions.length,
  );
  const valueColumnIndex = clampColumnIndex(
    element.dataSourceValueColumnIndex ?? Math.min(1, columnOptions.length - 1),
    columnOptions.length,
  );
  const useFilteredRows = element.dataSourceUseFilteredRows ?? true;

  function updateSource(updates: Partial<ChartElement>) {
    const nextLabelColumnIndex =
      updates.dataSourceLabelColumnIndex ?? labelColumnIndex;
    const nextValueColumnIndex =
      updates.dataSourceValueColumnIndex ?? valueColumnIndex;
    const nextUseFilteredRows =
      updates.dataSourceUseFilteredRows ?? useFilteredRows;

    onUpdateElement({
      ...updates,
      data: createChartDataFromTable({
        fallbackData,
        labelColumnIndex: nextLabelColumnIndex,
        table,
        useFilteredRows: nextUseFilteredRows,
        valueColumnIndex: nextValueColumnIndex,
      }),
    } as Partial<DesignElement>);
  }

  return (
    <div className="grid grid-cols-2 gap-3 rounded-md border border-border p-3">
      <ControlField label="Label column">
        <Select
          value={String(labelColumnIndex)}
          onValueChange={(value) =>
            updateSource({
              dataSourceLabelColumnIndex: Number(value),
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {columnOptions.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ControlField>
      <ControlField label="Value column">
        <Select
          value={String(valueColumnIndex)}
          onValueChange={(value) =>
            updateSource({
              dataSourceValueColumnIndex: Number(value),
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {columnOptions.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ControlField>
      <div className="col-span-2 flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
        <Label className="text-xs">Use current table view</Label>
        <Switch
          size="sm"
          checked={useFilteredRows}
          onCheckedChange={(checked) =>
            updateSource({
              dataSourceUseFilteredRows: checked,
            })
          }
          aria-label="Use current table view"
        />
      </div>
    </div>
  );
}

function clampColumnIndex(value: number, columnCount: number) {
  return Math.max(0, Math.min(Math.max(0, columnCount - 1), value));
}

function ToggleControl({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-border p-2">
      <Label className="text-xs">{label}</Label>
      <Switch
        size="sm"
        checked={checked}
        onCheckedChange={onChange}
        aria-label={`Toggle chart ${label.toLowerCase()}`}
      />
    </div>
  );
}

function ColorControl({
  label,
  value,
  palettes,
  onChange,
}: {
  label: string;
  value: string;
  palettes: readonly EditorColorPalette[];
  onChange: (color: string) => void;
}) {
  return (
    <ControlField label={label}>
      <Input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <ColorPalettePicker
        selectedColor={value}
        palettes={palettes}
        onSelectColor={onChange}
      />
    </ControlField>
  );
}

function NumberControl({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <ControlField label={label}>
      <Input
        type="number"
        value={Number.isFinite(value) ? value : min}
        min={min}
        max={max}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </ControlField>
  );
}

function ControlField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
