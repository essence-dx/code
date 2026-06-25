"use client";

import { useRef } from "react";
import {
  moveInsertedObjectAnchor,
  resizeInsertedObjectAnchor,
  type ObjectResizeHandle,
} from "@/features/spreadsheet/worksheet-object-transform";
import type {
  InsertedObjectAnchor,
  SheetData,
} from "@/features/workbooks/types";

export type WorksheetAnchorUpdate = {
  anchor?: Partial<InsertedObjectAnchor>;
};

type TransformTarget = {
  anchor: InsertedObjectAnchor;
  id: string;
  locked?: boolean;
};

type TransformSession = {
  lastClientX: number;
  lastClientY: number;
  mode: "move" | ObjectResizeHandle;
  objectId: string;
  pointerId: number;
};

export function useWorksheetObjectTransform({
  sheet,
  zoomScale,
  onSelectObject,
  onUpdateObject,
}: {
  sheet: SheetData;
  zoomScale: number;
  onSelectObject: (objectId: string) => void;
  onUpdateObject: (objectId: string, updates: WorksheetAnchorUpdate) => void;
}) {
  const transformRef = useRef<TransformSession | null>(null);

  function startTransform(
    event: React.PointerEvent<HTMLElement>,
    object: TransformTarget,
    mode: "move" | ObjectResizeHandle,
  ) {
    if (object.locked || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onSelectObject(object.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    transformRef.current = {
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      mode,
      objectId: object.id,
      pointerId: event.pointerId,
    };
  }

  function updateTransform(
    event: React.PointerEvent<HTMLElement>,
    object: TransformTarget,
  ) {
    const transform = transformRef.current;

    if (
      !transform ||
      transform.objectId !== object.id ||
      transform.pointerId !== event.pointerId
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const deltaX = (event.clientX - transform.lastClientX) / zoomScale;
    const deltaY = (event.clientY - transform.lastClientY) / zoomScale;
    const anchor =
      transform.mode === "move"
        ? moveInsertedObjectAnchor({ deltaX, deltaY, object, sheet })
        : resizeInsertedObjectAnchor({
            deltaX,
            deltaY,
            handle: transform.mode,
            object,
            sheet,
          });

    transformRef.current = {
      ...transform,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
    };
    onUpdateObject(object.id, { anchor });
  }

  function stopTransform(event: React.PointerEvent<HTMLElement>) {
    if (transformRef.current?.pointerId === event.pointerId) {
      transformRef.current = null;
    }
  }

  function handleObjectKeyDown(
    event: React.KeyboardEvent<HTMLElement>,
    object: TransformTarget,
    selected: boolean,
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectObject(object.id);
      return;
    }

    if (!selected || object.locked || !event.key.startsWith("Arrow")) {
      return;
    }

    event.preventDefault();
    const step = event.altKey ? 1 : event.ctrlKey || event.metaKey ? 32 : 8;
    const delta = {
      ArrowDown: { x: 0, y: step },
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
    }[event.key];

    if (!delta) {
      return;
    }

    const anchor = event.shiftKey
      ? resizeInsertedObjectAnchor({
          deltaX: delta.x,
          deltaY: delta.y,
          handle: delta.x !== 0 ? "east" : "south",
          object,
          sheet,
        })
      : moveInsertedObjectAnchor({
          deltaX: delta.x,
          deltaY: delta.y,
          object,
          sheet,
        });

    onUpdateObject(object.id, { anchor });
  }

  return {
    handleObjectKeyDown,
    startTransform,
    stopTransform,
    updateTransform,
  };
}
