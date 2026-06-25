"use client";

import { workbookChartToSvg } from "@/features/spreadsheet/chart-export";
import { createChartObjectAnchor } from "@/features/spreadsheet/chart-object-anchor";
import { useWorksheetObjectTransform } from "@/features/spreadsheet/components/use-worksheet-object-transform";
import {
  getAlignmentGuides,
  getObjectGeometry,
} from "@/features/spreadsheet/components/worksheet-object-layout";
import {
  AlignmentGuides,
  ObjectSelectionHandles,
} from "@/features/spreadsheet/components/worksheet-object-parts";
import type {
  ChartDefinition,
  InsertedObjectAnchor,
  SheetData,
} from "@/features/workbooks/types";
import { cn } from "@/lib/utils";

export function WorksheetChartObjectsLayer({
  charts,
  computedValues,
  selectedObjectId,
  sheet,
  totalColumnWidth,
  totalHeight,
  visibleColumnIndexes,
  visibleRowIndexes,
  zoomScale,
  onSelectObject,
  onUpdateChartAnchor,
}: {
  charts: ChartDefinition[];
  computedValues: Record<string, string>;
  selectedObjectId: string | null;
  sheet: SheetData;
  totalColumnWidth: number;
  totalHeight: number;
  visibleColumnIndexes: number[];
  visibleRowIndexes: number[];
  zoomScale: number;
  onSelectObject: (objectId: string) => void;
  onUpdateChartAnchor: (
    chartId: string,
    anchor: Partial<InsertedObjectAnchor>,
  ) => void;
}) {
  const {
    handleObjectKeyDown,
    startTransform,
    stopTransform,
    updateTransform,
  } = useWorksheetObjectTransform({
    onSelectObject,
    onUpdateObject: (chartId, updates) => {
      if (updates.anchor) {
        onUpdateChartAnchor(chartId, updates.anchor);
      }
    },
    sheet,
    zoomScale,
  });

  if (charts.length === 0) {
    return null;
  }

  const positionedCharts = charts.flatMap((chart, index) => {
    const anchor = chart.anchor ?? createChartObjectAnchor(sheet, chart.range);
    const geometry = getObjectGeometry({
      object: { anchor },
      sheet,
      visibleColumnIndexes,
      visibleRowIndexes,
      zoomScale,
    });

    return geometry ? [{ anchor, chart, geometry, index }] : [];
  });
  const selectedPositionedChart =
    positionedCharts.find((item) => item.chart.id === selectedObjectId) ?? null;
  const alignmentGuides = selectedPositionedChart
    ? getAlignmentGuides(
        selectedPositionedChart.geometry,
        positionedCharts
          .filter((item) => item.chart.id !== selectedObjectId)
          .map((item) => item.geometry),
      )
    : { horizontal: [], vertical: [] };

  return (
    <div
      aria-label="Worksheet chart objects"
      className="pointer-events-none absolute left-0 top-0 z-[17]"
      style={{ height: `${totalHeight}px`, width: `${totalColumnWidth}px` }}
    >
      <AlignmentGuides guides={alignmentGuides} totalHeight={totalHeight} />
      {positionedCharts.map(({ anchor, chart, geometry, index }) => {
        const selected = selectedObjectId === chart.id;
        const chartObject = { anchor, id: chart.id };
        const svg = workbookChartToSvg({ chart, computedValues, sheet });

        return (
          <div
            key={chart.id}
            role="button"
            tabIndex={0}
            aria-label={
              selected
                ? `${chart.title} chart selected. Arrow keys move. Shift plus arrow keys resize.`
                : `Select ${chart.title} chart`
            }
            aria-pressed={selected}
            className={cn(
              "pointer-events-auto absolute overflow-hidden rounded-md border bg-background shadow-sm transition",
              "hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected && "ring-2 ring-primary",
            )}
            style={{
              height: `${geometry.height}px`,
              left: `${geometry.left}px`,
              top: `${geometry.top}px`,
              width: `${geometry.width}px`,
              zIndex: 40 + index,
            }}
            onPointerDown={(event) => {
              if ((event.target as HTMLElement).dataset.objectHandle) {
                return;
              }

              startTransform(event, chartObject, "move");
            }}
            onPointerMove={(event) => updateTransform(event, chartObject)}
            onPointerUp={stopTransform}
            onPointerCancel={stopTransform}
            onKeyDown={(event) =>
              handleObjectKeyDown(event, chartObject, selected)
            }
            onClick={(event) => {
              event.stopPropagation();
              onSelectObject(chart.id);
            }}
          >
            <div
              aria-hidden="true"
              className="h-full w-full bg-white [&_svg]:h-full [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            {selected ? (
              <ObjectSelectionHandles
                onStartResize={(event, handle) =>
                  startTransform(event, chartObject, handle)
                }
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
