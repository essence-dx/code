"use client";

import { Navigation } from "lucide-react";
import { useMemo, type KeyboardEvent, type MouseEvent } from "react";

import type { CanvasBounds } from "@/features/editor/canvas-bounds";
import type { DesignElement } from "@/features/editor/types";
import { cn } from "@/lib/utils";

export type CanvasViewport = {
  scrollLeft: number;
  scrollTop: number;
  width: number;
  height: number;
  zoom: number;
};

type CanvasMinimapProps = {
  bounds: CanvasBounds;
  pageSize: {
    width: number;
    height: number;
  };
  elements: DesignElement[];
  selectedElementIds: string[];
  viewport: CanvasViewport;
  onJumpToPoint: (point: { x: number; y: number }) => void;
  onSelectElement: (elementId: string) => void;
};

const mapWidth = 208;
const mapHeight = 144;

export function CanvasMinimap({
  bounds,
  pageSize,
  elements,
  selectedElementIds,
  viewport,
  onJumpToPoint,
  onSelectElement,
}: CanvasMinimapProps) {
  const visibleElements = useMemo(
    () => elements.filter((element) => !element.hidden),
    [elements],
  );
  const selectedElementIdSet = useMemo(
    () => new Set(selectedElementIds),
    [selectedElementIds],
  );
  const boundsWidth = Math.max(1, bounds.right - bounds.left);
  const boundsHeight = Math.max(1, bounds.bottom - bounds.top);
  const viewportBounds = {
    x: bounds.left + viewport.scrollLeft / viewport.zoom,
    y: bounds.top + viewport.scrollTop / viewport.zoom,
    width: viewport.width / viewport.zoom,
    height: viewport.height / viewport.zoom,
  };

  function handleMapClick(event: MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x =
      bounds.left + ((event.clientX - rect.left) / rect.width) * boundsWidth;
    const y =
      bounds.top + ((event.clientY - rect.top) / rect.height) * boundsHeight;

    onJumpToPoint({ x, y });
  }

  function handleElementNavigate(
    event: MouseEvent<SVGRectElement> | KeyboardEvent<SVGRectElement>,
    element: DesignElement,
  ) {
    event.stopPropagation();
    onSelectElement(element.id);
    onJumpToPoint({
      x: element.x + element.width / 2,
      y: element.y + element.height / 2,
    });
  }

  return (
    <section
      className="absolute bottom-4 right-4 z-30 w-60 rounded-md border border-border bg-background/95 p-3 shadow-xl backdrop-blur"
      onPointerDown={(event) => event.stopPropagation()}
      aria-label="Whiteboard minimap"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Navigation className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Minimap</span>
        </div>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {visibleElements.length}
        </span>
      </div>
      <svg
        className="block rounded-sm border border-border bg-muted/40"
        width={mapWidth}
        height={mapHeight}
        viewBox={`${bounds.left} ${bounds.top} ${boundsWidth} ${boundsHeight}`}
        role="img"
        aria-label="Whiteboard object map"
        onClick={handleMapClick}
      >
        <rect
          x={bounds.left}
          y={bounds.top}
          width={boundsWidth}
          height={boundsHeight}
          fill="var(--muted)"
        />
        <rect
          x={0}
          y={0}
          width={pageSize.width}
          height={pageSize.height}
          fill="var(--background)"
          stroke="var(--border)"
          strokeWidth={Math.max(boundsWidth, boundsHeight) / 280}
        />
        {visibleElements.map((element) => {
          const isSelected = selectedElementIdSet.has(element.id);

          return (
            <rect
              key={element.id}
              x={element.x}
              y={element.y}
              width={Math.max(16, element.width)}
              height={Math.max(16, element.height)}
              rx={Math.max(boundsWidth, boundsHeight) / 420}
              className={cn(
                "cursor-pointer outline-none transition-colors",
                isSelected ? "fill-primary" : "fill-sky-500/70",
              )}
              stroke={isSelected ? "var(--primary-foreground)" : "none"}
              strokeWidth={
                isSelected ? Math.max(boundsWidth, boundsHeight) / 360 : 0
              }
              role="button"
              tabIndex={0}
              aria-label={`Focus ${element.type} layer`}
              onClick={(event) => handleElementNavigate(event, element)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  handleElementNavigate(event, element);
                }
              }}
            />
          );
        })}
        <rect
          x={viewportBounds.x}
          y={viewportBounds.y}
          width={viewportBounds.width}
          height={viewportBounds.height}
          fill="transparent"
          stroke="var(--primary)"
          strokeWidth={Math.max(boundsWidth, boundsHeight) / 220}
          strokeDasharray={`${Math.max(boundsWidth, boundsHeight) / 80} ${
            Math.max(boundsWidth, boundsHeight) / 100
          }`}
          pointerEvents="none"
        />
      </svg>
    </section>
  );
}
