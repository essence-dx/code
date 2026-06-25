"use client";

import type { ObjectResizeHandle } from "@/features/spreadsheet/worksheet-object-transform";
import type { InsertedObjectDefinition } from "@/features/workbooks/types";
import { cn } from "@/lib/utils";

export function ObjectContent({ object }: { object: InsertedObjectDefinition }) {
  if (object.kind === "image" && object.source?.dataUrl) {
    return (
      <img
        src={object.source.dataUrl}
        alt={object.altText || object.name}
        className="h-full w-full object-contain"
        draggable={false}
      />
    );
  }

  if (object.kind === "shape" && object.shapeType === "connector") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        className="h-full w-full overflow-visible"
      >
        <line
          x1="8"
          y1="82"
          x2="92"
          y2="18"
          stroke={object.format.strokeColor}
          strokeLinecap="round"
          strokeWidth={Math.max(object.format.strokeWidth ?? 2, 2)}
        />
      </svg>
    );
  }

  if (object.kind === "shape" && object.shapeType === "diamond") {
    return (
      <span
        className="absolute inset-4 rotate-45 border"
        style={{
          backgroundColor: object.format.fillColor,
          borderColor: object.format.strokeColor,
          borderWidth: `${object.format.strokeWidth ?? 1}px`,
        }}
      />
    );
  }

  return (
    <span
      className="flex h-full w-full items-center justify-center whitespace-pre-wrap p-2 text-center leading-snug"
      style={{ backgroundColor: object.format.fillColor }}
    >
      {object.text || object.name}
    </span>
  );
}

export function ObjectSelectionHandles({
  onStartResize,
}: {
  onStartResize: (
    event: React.PointerEvent<HTMLElement>,
    handle: ObjectResizeHandle,
  ) => void;
}) {
  return (
    <>
      {resizeHandles.map((handle) => (
        <span
          key={handle.handle}
          aria-hidden="true"
          data-object-handle="true"
          className={cn(
            "absolute z-10 size-3 rounded-full border border-primary bg-background shadow-sm",
            handle.className,
          )}
          onPointerDown={(event) => onStartResize(event, handle.handle)}
        />
      ))}
    </>
  );
}

export function AlignmentGuides({
  guides,
  totalHeight,
}: {
  guides: { horizontal: number[]; vertical: number[] };
  totalHeight: number;
}) {
  return (
    <>
      {guides.vertical.map((left) => (
        <span
          key={`vertical-${left}`}
          aria-hidden="true"
          className="absolute top-0 z-[80] w-px bg-primary/70"
          style={{ height: `${totalHeight}px`, left: `${left}px` }}
        />
      ))}
      {guides.horizontal.map((top) => (
        <span
          key={`horizontal-${top}`}
          aria-hidden="true"
          className="absolute left-0 z-[80] h-px bg-primary/70"
          style={{ top: `${top}px`, width: "100%" }}
        />
      ))}
    </>
  );
}

const resizeHandles: Array<{
  className: string;
  handle: ObjectResizeHandle;
}> = [
  { handle: "northWest", className: "-left-1.5 -top-1.5 cursor-nwse-resize" },
  {
    handle: "north",
    className: "left-1/2 -top-1.5 -translate-x-1/2 cursor-ns-resize",
  },
  { handle: "northEast", className: "-right-1.5 -top-1.5 cursor-nesw-resize" },
  {
    handle: "east",
    className: "-right-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize",
  },
  { handle: "southEast", className: "-bottom-1.5 -right-1.5 cursor-nwse-resize" },
  {
    handle: "south",
    className: "-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize",
  },
  { handle: "southWest", className: "-bottom-1.5 -left-1.5 cursor-nesw-resize" },
  {
    handle: "west",
    className: "-left-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize",
  },
];
