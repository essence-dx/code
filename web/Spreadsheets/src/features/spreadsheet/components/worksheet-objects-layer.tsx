"use client";

import {
  getVisibleRowsHeight,
  ROW_HEADER_WIDTH,
  scaleSize,
} from "@/features/spreadsheet/components/grid-geometry";
import { useWorksheetObjectTransform } from "@/features/spreadsheet/components/use-worksheet-object-transform";
import {
  getAlignmentGuides,
  getObjectGeometry,
} from "@/features/spreadsheet/components/worksheet-object-layout";
import {
  AlignmentGuides,
  ObjectContent,
  ObjectSelectionHandles,
} from "@/features/spreadsheet/components/worksheet-object-parts";
import type { InsertedObjectUpdate } from "@/features/spreadsheet/inserted-objects";
import type {
  InsertedObjectDefinition,
  SheetData,
} from "@/features/workbooks/types";
import { cn } from "@/lib/utils";

export function WorksheetObjectsLayer({
  objects,
  selectedObjectId,
  sheet,
  totalColumnWidth,
  visibleColumnIndexes,
  visibleRowIndexes,
  zoomScale,
  onSelectObject,
  onUpdateObject,
}: {
  objects: InsertedObjectDefinition[];
  selectedObjectId: string | null;
  sheet: SheetData;
  totalColumnWidth: number;
  visibleColumnIndexes: number[];
  visibleRowIndexes: number[];
  zoomScale: number;
  onSelectObject: (objectId: string) => void;
  onUpdateObject: (objectId: string, updates: InsertedObjectUpdate) => void;
}) {
  const {
    handleObjectKeyDown,
    startTransform,
    stopTransform,
    updateTransform,
  } = useWorksheetObjectTransform({
    onSelectObject,
    onUpdateObject,
    sheet,
    zoomScale,
  });

  if (objects.length === 0) {
    return null;
  }

  const totalHeight = getVisibleRowsHeight(sheet, visibleRowIndexes, zoomScale);
  const positionedObjects = objects
    .slice()
    .sort((left, right) => left.zIndex - right.zIndex)
    .flatMap((object) => {
      const geometry = getObjectGeometry({
        object,
        sheet,
        visibleColumnIndexes,
        visibleRowIndexes,
        zoomScale,
      });

      return geometry ? [{ geometry, object }] : [];
    });
  const selectedPositionedObject =
    positionedObjects.find((item) => item.object.id === selectedObjectId) ?? null;
  const alignmentGuides = selectedPositionedObject
    ? getAlignmentGuides(
        selectedPositionedObject.geometry,
        positionedObjects
          .filter((item) => item.object.id !== selectedObjectId)
          .map((item) => item.geometry),
      )
    : { horizontal: [], vertical: [] };

  return (
    <div
      aria-label="Worksheet objects"
      className="pointer-events-none absolute left-0 top-0 z-[16]"
      style={{
        height: `${totalHeight}px`,
        width: `${scaleSize(ROW_HEADER_WIDTH, zoomScale) + totalColumnWidth}px`,
      }}
    >
      <AlignmentGuides guides={alignmentGuides} totalHeight={totalHeight} />
      {positionedObjects.map(({ geometry, object }) => {
        const selected = selectedObjectId === object.id;

        return (
          <div
            key={object.id}
            role="button"
            tabIndex={0}
            aria-label={
              selected
                ? `${object.name} selected. Arrow keys move. Shift plus arrow keys resize.`
                : `Select ${object.name}`
            }
            aria-pressed={selected}
            className={cn(
              "pointer-events-auto absolute border bg-background text-left shadow-sm transition",
              "hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected && "ring-2 ring-primary",
              object.locked ? "cursor-not-allowed" : "cursor-move",
              object.kind === "shape" &&
                object.shapeType === "ellipse" &&
                "rounded-full",
              object.kind === "shape" &&
                object.shapeType === "roundedRectangle" &&
                "rounded-md",
            )}
            style={{
              borderColor: object.format.strokeColor,
              borderWidth: `${object.format.strokeWidth ?? 1}px`,
              color: object.format.textColor,
              fontSize: `${scaleSize(object.format.fontSize ?? 13, zoomScale)}px`,
              height: `${geometry.height}px`,
              left: `${geometry.left}px`,
              opacity: object.format.opacity,
              top: `${geometry.top}px`,
              width: `${geometry.width}px`,
              zIndex: 20 + object.zIndex,
            }}
            onPointerDown={(event) => {
              if ((event.target as HTMLElement).dataset.objectHandle) {
                return;
              }

              startTransform(event, object, "move");
            }}
            onPointerMove={(event) => updateTransform(event, object)}
            onPointerUp={stopTransform}
            onPointerCancel={stopTransform}
            onKeyDown={(event) => handleObjectKeyDown(event, object, selected)}
            onClick={(event) => {
              event.stopPropagation();
              onSelectObject(object.id);
            }}
          >
            <ObjectContent object={object} />
            {selected && !object.locked ? (
              <ObjectSelectionHandles
                onStartResize={(event, handle) =>
                  startTransform(event, object, handle)
                }
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
