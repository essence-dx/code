"use client";

import {
  type PointerEvent,
  type RefObject,
  useCallback,
  useState,
} from "react";

import {
  appendDrawPoint,
  createDrawElementFromPoints,
  getDrawSvgPath,
  getDrawToolSettings,
  normalizeDrawPoints,
} from "@/features/editor/draw-strokes";
import type {
  DrawElement,
  DrawPoint,
  DrawTool,
} from "@/features/editor/types";

type DrawDraftState = {
  pointerId: number;
  tool: DrawTool;
  points: DrawPoint[];
};

type CanvasDrawingLayerProps = {
  activeDrawTool: DrawTool;
  pageBackground: string;
  canvasRef: RefObject<HTMLDivElement | null>;
  onClearSelection: () => void;
  onCreateDrawElement: (element: DrawElement) => void;
  onPointerPositionChange: (
    cursor: {
      x: number;
      y: number;
    } | null,
  ) => void;
};

export function CanvasDrawingLayer({
  activeDrawTool,
  pageBackground,
  canvasRef,
  onClearSelection,
  onCreateDrawElement,
  onPointerPositionChange,
}: CanvasDrawingLayerProps) {
  const [drawDraft, setDrawDraft] = useState<DrawDraftState | null>(null);

  const handleDrawPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;

      const point = getCanvasPoint(event, canvasRef.current);
      if (!point) return;

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      onClearSelection();
      setDrawDraft({
        pointerId: event.pointerId,
        tool: activeDrawTool,
        points: [point],
      });
      onPointerPositionChange(point);
    },
    [activeDrawTool, canvasRef, onClearSelection, onPointerPositionChange],
  );

  const handleDrawPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const point = getCanvasPoint(event, canvasRef.current);

      onPointerPositionChange(point);

      if (!point) return;

      setDrawDraft((current) => {
        if (!current || current.pointerId !== event.pointerId) return current;

        return {
          ...current,
          points: appendDrawPoint(current.points, point),
        };
      });
    },
    [canvasRef, onPointerPositionChange],
  );

  const finishDrawStroke = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!drawDraft || drawDraft.pointerId !== event.pointerId) return;

      const point = getCanvasPoint(event, canvasRef.current);
      const points = point
        ? appendDrawPoint(drawDraft.points, point, 0)
        : drawDraft.points;
      const element = createDrawElementFromPoints({
        points,
        tool: drawDraft.tool,
        pageBackground,
      });

      if (element) {
        onCreateDrawElement(element);
      }

      onPointerPositionChange(point);
      setDrawDraft(null);
    },
    [
      canvasRef,
      drawDraft,
      onCreateDrawElement,
      onPointerPositionChange,
      pageBackground,
    ],
  );

  return (
    <div
      className="absolute inset-0 z-40"
      style={{
        cursor: activeDrawTool === "eraser" ? "cell" : "crosshair",
        touchAction: "none",
      }}
      onPointerDown={handleDrawPointerDown}
      onPointerMove={handleDrawPointerMove}
      onPointerUp={finishDrawStroke}
      onPointerCancel={finishDrawStroke}
      onPointerLeave={(event) => {
        if (!drawDraft) {
          onPointerPositionChange(null);
        } else {
          handleDrawPointerMove(event);
        }
      }}
    >
      {drawDraft ? (
        <DrawDraftPreview
          points={drawDraft.points}
          tool={drawDraft.tool}
          pageBackground={pageBackground}
        />
      ) : null}
    </div>
  );
}

function DrawDraftPreview({
  points,
  tool,
  pageBackground,
}: {
  points: DrawPoint[];
  tool: DrawTool;
  pageBackground: string;
}) {
  const settings = getDrawToolSettings(tool, pageBackground);
  const frame = normalizeDrawPoints(points, settings.strokeWidth);

  if (!frame) return null;

  return (
    <svg
      className="pointer-events-none absolute"
      viewBox={`0 0 ${frame.width} ${frame.height}`}
      preserveAspectRatio="none"
      style={{
        left: frame.x,
        top: frame.y,
        width: frame.width,
        height: frame.height,
        overflow: "visible",
      }}
      aria-hidden="true"
    >
      <path
        d={getDrawSvgPath(frame.points)}
        fill="none"
        stroke={settings.stroke}
        strokeWidth={settings.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={settings.strokeOpacity}
      />
    </svg>
  );
}

function getCanvasPoint(
  event: PointerEvent,
  canvasNode: HTMLDivElement | null,
) {
  if (!canvasNode) return null;

  const rect = canvasNode.getBoundingClientRect();
  if (canvasNode.offsetWidth === 0 || canvasNode.offsetHeight === 0) {
    return null;
  }

  const scaleX = rect.width / canvasNode.offsetWidth;
  const scaleY = rect.height / canvasNode.offsetHeight;

  return {
    x: Math.max(
      0,
      Math.min(
        canvasNode.offsetWidth,
        Math.round((event.clientX - rect.left) / scaleX),
      ),
    ),
    y: Math.max(
      0,
      Math.min(
        canvasNode.offsetHeight,
        Math.round((event.clientY - rect.top) / scaleY),
      ),
    ),
  };
}
