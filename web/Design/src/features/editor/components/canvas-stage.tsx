"use client";

import { RotateCw } from "lucide-react";
import {
  type PointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getCanvasBoundsSize,
  getPageBounds,
  getWhiteboardBounds,
} from "@/features/editor/canvas-bounds";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CanvasGuides } from "@/features/editor/components/canvas-guides";
import {
  CanvasMinimap,
  type CanvasViewport,
} from "@/features/editor/components/canvas-minimap";
import { CanvasDrawingLayer } from "@/features/editor/components/canvas-drawing-layer";
import { CanvasPrintMarks } from "@/features/editor/components/canvas-print-marks";
import { CanvasSmartGuides } from "@/features/editor/components/canvas-smart-guides";
import { ElementRenderer } from "@/features/editor/components/element-renderer";
import { PresenceCursors } from "@/features/editor/components/presence-cursors";
import { getElementAccessibilityLabel } from "@/features/editor/element-accessibility";
import { createMovedElementUpdates } from "@/features/editor/editor-operations";
import { getPageDimensions } from "@/features/editor/page-dimensions";
import { getSmartGuideSnap } from "@/features/editor/smart-guides";
import type {
  DesignDocument,
  DesignElement,
  DesignPage,
  DrawElement,
  DrawTool,
  ProjectPresenceSummary,
} from "@/features/editor/types";
import {
  getWorkshopReactionCount,
  getWorkshopVoteCount,
} from "@/features/editor/workshop-analytics";
import { cn } from "@/lib/utils";

type DragState = {
  elementId: string;
  snapshots: DragSnapshot[];
  mode: "move" | "resize" | "rotate";
  pointerId: number;
  startX: number;
  startY: number;
  originalX: number;
  originalY: number;
  originalWidth: number;
  originalHeight: number;
  originalRotation: number;
  centerX: number;
  centerY: number;
  startAngle: number;
};

type DragSnapshot = Pick<DesignElement, "id" | "x" | "y" | "width" | "height">;

type ElementUpdate = {
  elementId: string;
  updates: Partial<DesignElement>;
};

type CanvasStageProps = {
  document: DesignDocument;
  page: DesignPage;
  selectedElementIds: string[];
  showGrid: boolean;
  showGuides: boolean;
  showPrintMarks: boolean;
  showSelection: boolean;
  activeDrawTool: DrawTool | null;
  presence: ProjectPresenceSummary[];
  zoom: number;
  canvasRef: RefObject<HTMLDivElement | null>;
  onCreateDrawElement: (element: DrawElement) => void;
  onSelectElement: (elementId: string, additive?: boolean) => void;
  onClearSelection: () => void;
  onPointerPositionChange: (
    cursor: {
      x: number;
      y: number;
    } | null,
  ) => void;
  onDragStart: () => void;
  onDragMove: (updates: ElementUpdate[]) => void;
  onDragEnd: () => void;
};

export function CanvasStage({
  document,
  page,
  selectedElementIds,
  showGrid,
  showGuides,
  showPrintMarks,
  showSelection,
  activeDrawTool,
  presence,
  zoom,
  canvasRef,
  onCreateDrawElement,
  onSelectElement,
  onClearSelection,
  onPointerPositionChange,
  onDragStart,
  onDragMove,
  onDragEnd,
}: CanvasStageProps) {
  const dragRef = useRef<DragState | null>(null);
  const [smartGuideLines, setSmartGuideLines] = useState<
    ReturnType<typeof getSmartGuideSnap>["lines"]
  >([]);
  const selectedElementIdSet = new Set(selectedElementIds);
  const hasSingleSelection = selectedElementIds.length === 1;
  const spotlightElementId = page.workshopSession?.spotlightElementId ?? null;
  const pageSize = getPageDimensions(document, page);
  const isWhiteboardCanvas = isWhiteboardPage(document, page, pageSize);
  const boardBounds = isWhiteboardCanvas
    ? getWhiteboardBounds(pageSize, page.elements)
    : getPageBounds(pageSize);
  const boardSize = getCanvasBoundsSize(boardBounds);
  const boardOffsetX = isWhiteboardCanvas ? -boardBounds.left : 0;
  const boardOffsetY = isWhiteboardCanvas ? -boardBounds.top : 0;
  const viewportStorageKey = `essence:whiteboard-viewport:${page.id}`;
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState<CanvasViewport>({
    scrollLeft: 0,
    scrollTop: 0,
    width: 1,
    height: 1,
    zoom,
  });
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const visibleHoveredElementId =
    hoveredElementId &&
    page.elements.some((element) => element.id === hoveredElementId)
      ? hoveredElementId
      : null;

  const updateViewportFromNode = useCallback(
    (node: HTMLDivElement) => {
      const nextViewport = {
        scrollLeft: node.scrollLeft,
        scrollTop: node.scrollTop,
        width: Math.max(1, node.clientWidth),
        height: Math.max(1, node.clientHeight),
        zoom,
      };

      setViewport(nextViewport);
      return nextViewport;
    },
    [zoom],
  );

  const saveWhiteboardViewport = useCallback(
    (nextViewport: CanvasViewport) => {
      if (!isWhiteboardCanvas || typeof window === "undefined") return;

      const center = {
        x:
          boardBounds.left +
          (nextViewport.scrollLeft + nextViewport.width / 2) / zoom,
        y:
          boardBounds.top +
          (nextViewport.scrollTop + nextViewport.height / 2) / zoom,
      };

      window.localStorage.setItem(viewportStorageKey, JSON.stringify(center));
    },
    [
      boardBounds.left,
      boardBounds.top,
      isWhiteboardCanvas,
      viewportStorageKey,
      zoom,
    ],
  );

  const handleViewportScroll = useCallback(() => {
    const node = scrollContainerRef.current;

    if (!node) return;

    saveWhiteboardViewport(updateViewportFromNode(node));
  }, [saveWhiteboardViewport, updateViewportFromNode]);

  const scrollToWhiteboardPoint = useCallback(
    (point: { x: number; y: number }) => {
      const node = scrollContainerRef.current;

      if (!node) return;

      node.scrollTo({
        left: clampScroll(
          (point.x - boardBounds.left) * zoom - node.clientWidth / 2,
          node.scrollWidth - node.clientWidth,
        ),
        top: clampScroll(
          (point.y - boardBounds.top) * zoom - node.clientHeight / 2,
          node.scrollHeight - node.clientHeight,
        ),
        behavior: "smooth",
      });
    },
    [boardBounds.left, boardBounds.top, zoom],
  );

  useEffect(() => {
    const node = scrollContainerRef.current;

    if (!node) return;

    const frame = window.requestAnimationFrame(() => {
      if (isWhiteboardCanvas) {
        const restored = readStoredWhiteboardViewport(viewportStorageKey);
        const fallbackPoint = { x: 0, y: 0 };
        const center = restored ?? fallbackPoint;

        node.scrollTo({
          left: clampScroll(
            (center.x - boardBounds.left) * zoom - node.clientWidth / 2,
            node.scrollWidth - node.clientWidth,
          ),
          top: clampScroll(
            (center.y - boardBounds.top) * zoom - node.clientHeight / 2,
            node.scrollHeight - node.clientHeight,
          ),
          behavior: "auto",
        });
      }

      saveWhiteboardViewport(updateViewportFromNode(node));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    boardBounds.left,
    boardBounds.top,
    isWhiteboardCanvas,
    saveWhiteboardViewport,
    updateViewportFromNode,
    viewportStorageKey,
    zoom,
  ]);

  return (
    <div className="relative h-full min-h-0 min-w-0">
      <ScrollArea
        className="h-full min-h-0 min-w-0 bg-muted/30"
        viewportRef={scrollContainerRef}
        onViewportScroll={handleViewportScroll}
        showHorizontalScrollBar
        viewportClassName="h-full [&>div]:!block [&>div]:h-full"
      >
        <div
          className={cn(
            "flex h-full min-h-full min-w-full",
            isWhiteboardCanvas
              ? "items-start justify-start p-6 sm:p-10 xl:p-12"
              : "items-center justify-center p-4 sm:p-8 xl:p-10",
          )}
        >
          <div
            style={{
              width: boardSize.width * zoom,
              height: boardSize.height * zoom,
            }}
          >
            <div
              style={{
                transform: isWhiteboardCanvas
                  ? `translate(${boardOffsetX * zoom}px, ${boardOffsetY * zoom}px)`
                  : undefined,
              }}
            >
              <div
                ref={canvasRef}
                className={cn(
                  "relative shadow-2xl ring-1 ring-border",
                  isWhiteboardCanvas ? "overflow-visible" : "overflow-hidden",
                )}
                style={{
                  width: pageSize.width,
                  height: pageSize.height,
                  background: page.background,
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                }}
                onPointerDown={() => onClearSelection()}
                onPointerMove={(event) => {
                  onPointerPositionChange(
                    getCanvasPoint(event, canvasRef.current),
                  );
                }}
                onPointerLeave={() => {
                  setHoveredElementId(null);
                  onPointerPositionChange(null);
                }}
              >
                {isWhiteboardCanvas ? (
                  <div
                    className="pointer-events-none absolute"
                    style={{
                      left: boardBounds.left,
                      top: boardBounds.top,
                      width: boardSize.width,
                      height: boardSize.height,
                      backgroundColor: "#f8fafc",
                      backgroundImage: [
                        "radial-gradient(circle, rgba(15, 23, 42, 0.16) 1px, transparent 1px)",
                        "linear-gradient(to right, rgba(14, 165, 233, 0.12) 1px, transparent 1px)",
                        "linear-gradient(to bottom, rgba(14, 165, 233, 0.12) 1px, transparent 1px)",
                      ].join(", "),
                      backgroundPosition: "0 0, 0 0, 0 0",
                      backgroundSize: "24px 24px, 240px 240px, 240px 240px",
                    }}
                    aria-hidden="true"
                  />
                ) : null}
                {showGrid ? (
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      backgroundImage: [
                        "linear-gradient(to right, rgba(14, 165, 233, 0.16) 1px, transparent 1px)",
                        "linear-gradient(to bottom, rgba(14, 165, 233, 0.16) 1px, transparent 1px)",
                        "linear-gradient(to right, rgba(14, 165, 233, 0.28) 1px, transparent 1px)",
                        "linear-gradient(to bottom, rgba(14, 165, 233, 0.28) 1px, transparent 1px)",
                      ].join(", "),
                      backgroundSize:
                        "40px 40px, 40px 40px, 200px 200px, 200px 200px",
                    }}
                    aria-hidden="true"
                  />
                ) : null}
                {showGuides ? (
                  <CanvasGuides
                    width={pageSize.width}
                    height={pageSize.height}
                  />
                ) : null}
                {showPrintMarks ? (
                  <CanvasPrintMarks
                    width={pageSize.width}
                    height={pageSize.height}
                  />
                ) : null}
                {showSelection ? (
                  <CanvasSmartGuides lines={smartGuideLines} />
                ) : null}
                <PresenceCursors presence={presence} pageId={page.id} />
                {page.elements.map((element) => {
                  if (element.hidden) return null;

                  const isSelected = selectedElementIdSet.has(element.id);
                  const isHovered =
                    showSelection &&
                    visibleHoveredElementId === element.id &&
                    !isSelected;

                  return (
                    <div
                      key={element.id}
                      role="button"
                      tabIndex={0}
                      aria-label={getElementAccessibilityLabel(element)}
                      aria-keyshortcuts="Enter Space Delete Backspace ArrowUp ArrowDown ArrowLeft ArrowRight"
                      aria-pressed={isSelected}
                      className={cn(
                        "absolute select-none",
                        showSelection &&
                          isSelected &&
                          "outline outline-2 outline-offset-2 outline-sky-400",
                        isHovered &&
                          "outline outline-1 outline-offset-2 outline-primary/80 ring-2 ring-primary/20",
                        spotlightElementId === element.id &&
                          "outline outline-2 outline-offset-4 outline-amber-400",
                        element.locked ? "cursor-not-allowed" : "cursor-move",
                      )}
                      style={{
                        left: element.x,
                        top: element.y,
                        width: element.width,
                        height: element.height,
                        transform: `rotate(${element.rotation}deg)`,
                        transformOrigin: "center",
                      }}
                      onPointerEnter={() => {
                        if (!dragRef.current) setHoveredElementId(element.id);
                      }}
                      onPointerLeave={() => {
                        setHoveredElementId((currentElementId) =>
                          currentElementId === element.id
                            ? null
                            : currentElementId,
                        );
                      }}
                      onFocus={(event) => {
                        if (event.currentTarget.matches(":focus-visible")) {
                          onSelectElement(element.id);
                        }
                      }}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        setHoveredElementId(null);
                        const additive =
                          event.shiftKey || event.ctrlKey || event.metaKey;
                        onSelectElement(element.id, additive);
                        setSmartGuideLines([]);

                        if (element.locked || additive) return;

                        const snapshots = getDragSnapshots({
                          element,
                          page,
                          selectedElementIds,
                          selectedElementIdSet,
                        });

                        event.currentTarget.setPointerCapture(event.pointerId);
                        dragRef.current = {
                          elementId: element.id,
                          snapshots,
                          mode: "move",
                          pointerId: event.pointerId,
                          startX: event.clientX,
                          startY: event.clientY,
                          originalX: element.x,
                          originalY: element.y,
                          originalWidth: element.width,
                          originalHeight: element.height,
                          originalRotation: element.rotation,
                          centerX: 0,
                          centerY: 0,
                          startAngle: 0,
                        };
                        onDragStart();
                      }}
                      onPointerMove={(event) => {
                        const drag = dragRef.current;

                        if (!drag || drag.pointerId !== event.pointerId) return;

                        const deltaX = (event.clientX - drag.startX) / zoom;
                        const deltaY = (event.clientY - drag.startY) / zoom;

                        if (drag.mode === "rotate") {
                          setSmartGuideLines([]);
                          const angle = Math.atan2(
                            event.clientY - drag.centerY,
                            event.clientX - drag.centerX,
                          );
                          const deltaDegrees =
                            ((angle - drag.startAngle) * 180) / Math.PI;

                          onDragMove([
                            {
                              elementId: drag.elementId,
                              updates: {
                                rotation: Math.round(
                                  drag.originalRotation + deltaDegrees,
                                ),
                              } as Partial<DesignElement>,
                            },
                          ]);
                          return;
                        }

                        onDragMove(
                          getDragUpdates({
                            mode: drag.mode,
                            document,
                            page,
                            elementId: drag.elementId,
                            originalX: drag.originalX,
                            originalY: drag.originalY,
                            originalWidth: drag.originalWidth,
                            originalHeight: drag.originalHeight,
                            snapshots: drag.snapshots,
                            deltaX,
                            deltaY,
                            onSmartGuidesChange: setSmartGuideLines,
                          }),
                        );
                      }}
                      onPointerUp={(event) => {
                        const drag = dragRef.current;

                        if (drag?.pointerId === event.pointerId) {
                          dragRef.current = null;
                          setSmartGuideLines([]);
                          onDragEnd();
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          onSelectElement(element.id);
                        }
                      }}
                    >
                      <ElementRenderer
                        element={element}
                        pageElements={page.elements}
                      />
                      {showSelection &&
                      hasSingleSelection &&
                      selectedElementIdSet.has(element.id) &&
                      !element.locked ? (
                        <>
                          <div
                            className="absolute -top-8 left-1/2 flex h-5 w-5 -translate-x-1/2 cursor-grab items-center justify-center rounded-full border border-sky-500 bg-background shadow-sm"
                            onPointerDown={(event) => {
                              event.stopPropagation();
                              const parent = event.currentTarget.parentElement;

                              if (!parent) return;

                              const rect = parent.getBoundingClientRect();
                              const centerX = rect.left + rect.width / 2;
                              const centerY = rect.top + rect.height / 2;

                              event.currentTarget.setPointerCapture(
                                event.pointerId,
                              );
                              dragRef.current = {
                                elementId: element.id,
                                snapshots: [toDragSnapshot(element)],
                                mode: "rotate",
                                pointerId: event.pointerId,
                                startX: event.clientX,
                                startY: event.clientY,
                                originalX: element.x,
                                originalY: element.y,
                                originalWidth: element.width,
                                originalHeight: element.height,
                                originalRotation: element.rotation,
                                centerX,
                                centerY,
                                startAngle: Math.atan2(
                                  event.clientY - centerY,
                                  event.clientX - centerX,
                                ),
                              };
                              onDragStart();
                            }}
                            aria-hidden="true"
                          >
                            <RotateCw className="h-3 w-3 text-sky-400" />
                          </div>
                          <div
                            className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-sm border border-sky-500 bg-background shadow-sm"
                            onPointerDown={(event) => {
                              event.stopPropagation();
                              event.currentTarget.setPointerCapture(
                                event.pointerId,
                              );
                              dragRef.current = {
                                elementId: element.id,
                                snapshots: [toDragSnapshot(element)],
                                mode: "resize",
                                pointerId: event.pointerId,
                                startX: event.clientX,
                                startY: event.clientY,
                                originalX: element.x,
                                originalY: element.y,
                                originalWidth: element.width,
                                originalHeight: element.height,
                                originalRotation: element.rotation,
                                centerX: 0,
                                centerY: 0,
                                startAngle: 0,
                              };
                              onDragStart();
                            }}
                            aria-hidden="true"
                          />
                        </>
                      ) : null}
                      {isHovered ? (
                        <span className="pointer-events-none absolute left-0 top-0 z-30 max-w-full -translate-y-[calc(100%+0.35rem)] truncate rounded-md bg-primary px-2 py-1 text-[11px] font-medium leading-none text-primary-foreground shadow-lg">
                          {getElementAccessibilityLabel(element)}
                        </span>
                      ) : null}
                      {getWorkshopVoteCount(element) > 0 ? (
                        <div className="pointer-events-none absolute -right-3 -top-3 flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-background bg-primary px-2 text-xs font-bold text-primary-foreground shadow">
                          {getWorkshopVoteCount(element)}
                        </div>
                      ) : null}
                      {getWorkshopReactionCount(element) > 0 ? (
                        <div className="pointer-events-none absolute -bottom-3 -right-3 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-background bg-amber-400 px-2 text-[11px] font-bold text-amber-950 shadow">
                          {getWorkshopReactionCount(element)}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {activeDrawTool ? (
                  <CanvasDrawingLayer
                    activeDrawTool={activeDrawTool}
                    pageBackground={page.background}
                    canvasRef={canvasRef}
                    onClearSelection={() => {
                      setSmartGuideLines([]);
                      onClearSelection();
                    }}
                    onCreateDrawElement={onCreateDrawElement}
                    onPointerPositionChange={onPointerPositionChange}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
      {isWhiteboardCanvas ? (
        <CanvasMinimap
          bounds={boardBounds}
          pageSize={pageSize}
          elements={page.elements}
          selectedElementIds={selectedElementIds}
          viewport={viewport}
          onJumpToPoint={scrollToWhiteboardPoint}
          onSelectElement={onSelectElement}
        />
      ) : null}
    </div>
  );
}

function isWhiteboardPage(
  document: DesignDocument,
  page: DesignPage,
  pageSize: { width: number; height: number },
) {
  return (
    page.format === "whiteboard" ||
    document.metadata?.canvasMode === "whiteboard" ||
    (pageSize.width >= 2200 && pageSize.height >= 1200)
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

function readStoredWhiteboardViewport(storageKey: string) {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(storageKey);

    if (!stored) return null;

    const parsed = JSON.parse(stored) as { x?: unknown; y?: unknown };

    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") {
      return null;
    }

    return { x: parsed.x, y: parsed.y };
  } catch {
    return null;
  }
}

function clampScroll(value: number, maxScroll: number) {
  return Math.max(0, Math.min(Math.max(0, maxScroll), value));
}

function getDragUpdates({
  mode,
  document,
  page,
  elementId,
  originalX,
  originalY,
  originalWidth,
  originalHeight,
  snapshots,
  deltaX,
  deltaY,
  onSmartGuidesChange,
}: {
  mode: DragState["mode"];
  document: DesignDocument;
  page: DesignPage;
  elementId: string;
  originalX: number;
  originalY: number;
  originalWidth: number;
  originalHeight: number;
  snapshots: DragSnapshot[];
  deltaX: number;
  deltaY: number;
  onSmartGuidesChange: (
    lines: ReturnType<typeof getSmartGuideSnap>["lines"],
  ) => void;
}): ElementUpdate[] {
  const pageSize = getPageDimensions(document, page);

  if (mode === "move") {
    if (snapshots.length > 1) {
      onSmartGuidesChange([]);

      return createMovedElementUpdates(snapshots, {
        x: Math.round(deltaX),
        y: Math.round(deltaY),
      });
    }

    const snap = getSmartGuideSnap({
      canvasWidth: pageSize.width,
      canvasHeight: pageSize.height,
      elements: page.elements,
      elementId,
      x: Math.round(originalX + deltaX),
      y: Math.round(originalY + deltaY),
      width: originalWidth,
      height: originalHeight,
    });

    onSmartGuidesChange(snap.lines);

    return [
      {
        elementId,
        updates: {
          x: snap.x,
          y: snap.y,
        } as Partial<DesignElement>,
      },
    ];
  }

  onSmartGuidesChange([]);

  return [
    {
      elementId,
      updates: {
        width: Math.max(8, Math.round(originalWidth + deltaX)),
        height: Math.max(8, Math.round(originalHeight + deltaY)),
      } as Partial<DesignElement>,
    },
  ];
}

function getDragSnapshots({
  element,
  page,
  selectedElementIds,
  selectedElementIdSet,
}: {
  element: DesignElement;
  page: DesignPage;
  selectedElementIds: string[];
  selectedElementIdSet: Set<string>;
}) {
  if (element.groupId) {
    return page.elements
      .filter((item) => item.groupId === element.groupId && !item.locked)
      .map(toDragSnapshot);
  }

  if (selectedElementIdSet.has(element.id) && selectedElementIds.length > 1) {
    return page.elements
      .filter((item) => selectedElementIdSet.has(item.id) && !item.locked)
      .map(toDragSnapshot);
  }

  return [toDragSnapshot(element)];
}

function toDragSnapshot(element: DesignElement): DragSnapshot {
  return {
    id: element.id,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  };
}
