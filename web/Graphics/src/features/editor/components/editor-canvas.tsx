"use client";

import {
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type WheelEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { nanoid } from "nanoid";
import { X } from "lucide-react";
import type {
  CanvasView,
  DesignComment,
  DesignDocument,
  DesignGuide,
  DesignLayer,
  DesignLayoutGrid,
  DesignPage,
  EditorTool,
} from "@/features/editor/types";
import {
  createComment,
  createLayerFromTool,
  getActivePage,
  type LayerPatch,
} from "@/features/editor/document-utils";
import { createFrameResizeConstraintPatches } from "@/features/editor/constraints";
import {
  getSnappedLayerPatches,
  toLayerPatches,
  type LayerDragOrigin,
  type SnapGuide,
} from "@/features/editor/canvas-guides";
import { Button } from "@/components/ui/button";
import {
  getLayoutGridCssColor,
  normalizeLayoutGrid,
} from "@/features/editor/layout-grids";
import {
  createPageLayerIndex,
  getLayerEntriesAtPoint,
  type PageLayerIndex,
} from "@/features/editor/layer-index";
import { getLayerFillPaints } from "@/features/editor/paint-stack";
import { cutLayerAtPoint } from "@/features/editor/vector-operations";
import {
  createDeletedVectorPathPointPatch,
  createInsertedVectorPathPointPatch,
  createRefinedPencilPathPatch,
  createVectorPathPointPatch,
  getVectorPathControlTethers,
  getVectorPathInsertPoints,
  getVectorPathCanvasPoints,
  type VectorPathCanvasPoint,
  type VectorPathControlTether,
  type VectorPathInsertPoint,
} from "@/features/editor/vector-path-editing";
import { detectImportKind } from "@/features/editor/importers/import-diagnostics";
import { getTextLayerTextPatch } from "@/features/editor/text-layer-review";
import type {
  CollaborationCursor,
  CollaborationPeer,
} from "@/features/editor/collaboration-presence";
import { cn } from "@/lib/utils";

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
type Point = { x: number; y: number };
type CanvasRect = { x: number; y: number; width: number; height: number };
type SelectionTransformOrigin = LayerDragOrigin & Pick<DesignLayer, "rotation">;
type VectorPointSelection = {
  layerId: string;
  pointIds: string[];
  primaryPointId: string;
};

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.5;
const WHEEL_ZOOM_INTENSITY = 0.0015;
const MAX_VECTOR_CANVAS_HANDLES = 120;
const GUIDE_TOGGLE_DISTANCE = 24;

type DragState =
  | {
      mode: "layer";
      origins: LayerDragOrigin[];
      start: Point;
      snapshot: DesignDocument;
    }
  | {
      mode: "resize";
      layerId: string;
      handle: ResizeHandle;
      origin: Pick<DesignLayer, "x" | "y" | "width" | "height">;
      start: Point;
      snapshot: DesignDocument;
    }
  | {
      mode: "selection-resize";
      origins: LayerDragOrigin[];
      bounds: CanvasRect;
      handle: ResizeHandle;
      start: Point;
      snapshot: DesignDocument;
    }
  | {
      mode: "selection-rotate";
      origins: SelectionTransformOrigin[];
      center: Point;
      startAngle: number;
      snapshot: DesignDocument;
    }
  | {
      mode: "rotate";
      layerId: string;
      center: Point;
      startAngle: number;
      startRotation: number;
      snapshot: DesignDocument;
    }
  | {
      mode: "marquee";
      start: Point;
      current: Point;
    }
  | {
      mode: "measure";
      start: Point;
      current: Point;
    }
  | {
      mode: "draw";
      layer: DesignLayer;
      start: Point;
    }
  | {
      mode: "pencil";
      layerId: string;
      points: Point[];
      snapshot: DesignDocument;
    }
  | {
      mode: "guide";
      guideId: string;
      orientation: DesignGuide["orientation"];
      start: Point;
      snapshot: DesignDocument;
    }
  | {
      mode: "comment";
      commentId: string;
      start: Point;
      origin: Point;
      snapshot: DesignDocument;
    }
  | {
      mode: "path-node";
      layerId: string;
      pointId: string;
      pointIds: string[];
      origins: { pointId: string; point: Point }[];
      start: Point;
      snapshot: DesignDocument;
    }
  | {
      mode: "pan";
      start: Point;
      view: CanvasView;
    };

type EditorCanvasProps = {
  document: DesignDocument;
  page: DesignPage;
  tool: EditorTool;
  view: CanvasView;
  guides: DesignGuide[];
  selectedLayerId: string | null;
  selectedLayerIds: string[];
  selectedCommentId: string | null;
  onToolChange: (tool: EditorTool) => void;
  onViewChange: (view: CanvasView) => void;
  onViewportSizeChange: (size: { width: number; height: number }) => void;
  onSelectLayer: (layerId: string | null) => void;
  onSelectLayers: (layerIds: string[]) => void;
  onSelectComment: (comment: DesignComment) => void;
  onUpdateComment: (
    commentId: string,
    patch: Partial<Pick<DesignComment, "x" | "y">>,
  ) => void;
  onAddLayer: (layer: DesignLayer) => void;
  onAddLayers: (layers: DesignLayer[]) => void;
  onImportMediaFiles: (files: File[], point: Point) => void;
  onAddComment: (comment: DesignComment) => void;
  onAddGuide: (orientation: DesignGuide["orientation"], position: number) => void;
  onUpdateGuide: (guideId: string, position: number) => void;
  onRemoveGuide: (guideId: string) => void;
  onUpdateLayer: (layerId: string, patch: Partial<DesignLayer>) => void;
  onUpdateLayers: (patches: LayerPatch[]) => void;
  onDuplicateLayers: (layerIds: string[]) => void;
  onReorderLayer: (
    layerId: string,
    direction: "forward" | "backward" | "front" | "back",
  ) => void;
  onDeleteLayers: (layerIds: string[]) => void;
  onReplaceLayers: (layerIds: string[], replacementLayers: DesignLayer[]) => void;
  onRemember: (document: DesignDocument) => void;
  presencePeers?: CollaborationPeer[];
  onPresenceCursorMove?: (cursor: CollaborationCursor) => void;
};

export function EditorCanvas({
  document,
  page,
  tool,
  view,
  guides,
  selectedLayerId,
  selectedLayerIds,
  selectedCommentId,
  onToolChange,
  onViewChange,
  onViewportSizeChange,
  onSelectLayer,
  onSelectLayers,
  onSelectComment,
  onUpdateComment,
  onAddLayer,
  onAddLayers,
  onImportMediaFiles,
  onAddComment,
  onAddGuide,
  onUpdateGuide,
  onRemoveGuide,
  onUpdateLayer,
  onUpdateLayers,
  onDuplicateLayers,
  onReorderLayer,
  onDeleteLayers,
  onReplaceLayers,
  onRemember,
  presencePeers = [],
  onPresenceCursorMove,
}: EditorCanvasProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const textEditSnapshotRef = useRef<DesignDocument | null>(null);
  const [activeDragMode, setActiveDragMode] = useState<
    DragState["mode"] | null
  >(null);
  const [marquee, setMarquee] = useState<CanvasRect | null>(null);
  const [measurement, setMeasurement] = useState<{
    start: Point;
    current: Point;
  } | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [vectorEditingLayerId, setVectorEditingLayerId] = useState<string | null>(
    null,
  );
  const [activeVectorPoint, setActiveVectorPoint] =
    useState<VectorPointSelection | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    canvasPoint: Point;
    layerId: string | null;
  } | null>(null);
  const selectedLayerIdSet = useMemo(
    () => new Set(selectedLayerIds),
    [selectedLayerIds],
  );
  const selectionBounds = useMemo(
    () => getSelectionBounds(page.layers, selectedLayerIds),
    [page.layers, selectedLayerIds],
  );
  const visibleLayers = useMemo(
    () => page.layers.filter((layer) => layer.visible),
    [page.layers],
  );
  const pageLayerIndex = useMemo(() => createPageLayerIndex(page), [page]);
  const pageGrid = getPageGrid(page);
  const reconciledActiveVectorPoint = useMemo(
    () =>
      getReconciledVectorPointSelection(
        activeVectorPoint,
        page.layers,
        selectedLayerIds,
      ),
    [activeVectorPoint, page.layers, selectedLayerIds],
  );

  const dismissVectorEditing = useCallback(() => {
    setActiveVectorPoint(null);
    setVectorEditingLayerId(null);
  }, []);

  const setDragState = useCallback((state: DragState) => {
    dragRef.current = state;
    setActiveDragMode(state.mode);
  }, []);

  const clearDragState = useCallback(() => {
    dragRef.current = null;
    setActiveDragMode(null);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;

    if (!stage) {
      return;
    }

    const updateSize = () => {
      const rect = stage.getBoundingClientRect();
      onViewportSizeChange({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    };
    const observer = new ResizeObserver(updateSize);

    updateSize();
    observer.observe(stage);

    return () => observer.disconnect();
  }, [onViewportSizeChange]);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    function closeMenu() {
      setContextMenu(null);
    }

    window.addEventListener("pointerdown", closeMenu);
    window.addEventListener("keydown", closeMenu);

    return () => {
      window.removeEventListener("pointerdown", closeMenu);
      window.removeEventListener("keydown", closeMenu);
    };
  }, [contextMenu]);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (
        event.key === "Escape" &&
        vectorEditingLayerId &&
        !isEditableTarget(event.target)
      ) {
        setVectorEditingLayerId(null);
        setActiveVectorPoint(null);
        return;
      }

      if (
        !reconciledActiveVectorPoint ||
        tool !== "select" ||
        isEditableTarget(event.target) ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        (!event.key.startsWith("Arrow") &&
          event.key !== "Delete" &&
          event.key !== "Backspace")
      ) {
        return;
      }

      const layer = page.layers.find(
        (item) => item.id === reconciledActiveVectorPoint.layerId,
      );

      event.preventDefault();
      event.stopImmediatePropagation();

      if (!layer || layer.locked || layer.type !== "path") {
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        let workingLayer = layer;
        let patch: Pick<DesignLayer, "pathData" | "pathViewBox"> | null = null;

        for (const pointId of [...reconciledActiveVectorPoint.pointIds].sort(
          compareVectorPointIdsDescending,
        )) {
          const nextPatch = createDeletedVectorPathPointPatch(
            workingLayer,
            pointId,
          );

          if (nextPatch) {
            patch = nextPatch;
            workingLayer = { ...workingLayer, ...nextPatch };
          }
        }

        if (!patch) {
          return;
        }

        onRemember(document);
        onUpdateLayer(layer.id, {
          pathData: workingLayer.pathData,
          pathViewBox: workingLayer.pathViewBox,
        });
        setActiveVectorPoint(null);
        return;
      }

      const movement = getArrowMovement(
        event.key,
        getVectorNodeNudgeDistance(page, event.shiftKey),
      );

      if (!movement) {
        return;
      }

      const patch = createVectorPathPointMovePatch(
        layer,
        reconciledActiveVectorPoint.pointIds,
        movement,
      );

      if (patch) {
        onRemember(document);
        onUpdateLayer(layer.id, patch);
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);

    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [
    document,
    onRemember,
    onUpdateLayer,
    page,
    reconciledActiveVectorPoint,
    tool,
    vectorEditingLayerId,
  ]);

  function clientToCanvas(clientX: number, clientY: number) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) {
      return { x: 0, y: 0 };
    }

    return {
      x: (clientX - rect.left - view.x) / view.zoom,
      y: (clientY - rect.top - view.y) / view.zoom,
    };
  }

  function screenToCanvas(event: PointerEvent) {
    return clientToCanvas(event.clientX, event.clientY);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!hasMediaFiles(event.dataTransfer.files)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    const files = Array.from(event.dataTransfer.files).filter((file) =>
      isMediaFile(file),
    );

    if (files.length === 0) {
      return;
    }

    event.preventDefault();
    onImportMediaFiles(files, clientToCanvas(event.clientX, event.clientY));
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    const rect = stageRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    event.preventDefault();

    const delta = getNormalizedWheelDelta(event);

    if (event.ctrlKey || event.metaKey) {
      const nextZoom = clampZoom(
        view.zoom * Math.exp(-delta.y * WHEEL_ZOOM_INTENSITY),
      );
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const canvasX = (pointerX - view.x) / view.zoom;
      const canvasY = (pointerY - view.y) / view.zoom;

      onViewChange({
        zoom: nextZoom,
        x: Math.round(pointerX - canvasX * nextZoom),
        y: Math.round(pointerY - canvasY * nextZoom),
      });
      return;
    }

    const panX = event.shiftKey && delta.x === 0 ? delta.y : delta.x;
    const panY = event.shiftKey ? 0 : delta.y;

    onViewChange({
      ...view,
      x: Math.round(view.x - panX),
      y: Math.round(view.y - panY),
    });
  }

  function handleCanvasPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    setContextMenu(null);
    setHoveredLayerId(null);
    dismissVectorEditing();

    if (!isCanvasSurfaceTarget(event.target, event.currentTarget)) {
      return;
    }

    if (tool === "hand") {
      setDragState({
        mode: "pan",
        start: { x: event.clientX, y: event.clientY },
        view,
      });
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    const point = getGridSnappedPoint(screenToCanvas(event), page);

    if (tool === "measure") {
      const nextMeasurement = {
        start: point,
        current: point,
      };

      setDragState({
        mode: "measure",
        ...nextMeasurement,
      });
      setMeasurement(nextMeasurement);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (tool === "comment") {
      onAddComment(createComment(point));
      return;
    }

    if (tool === "pen") {
      if (appendPointToSelectedPath(point)) {
        return;
      }

      startPenPath(point);
      return;
    }

    if (tool === "pencil") {
      startPencilPath(point, event.currentTarget, event.pointerId);
      return;
    }

    const layer = createLayerFromTool(tool, point);

    if (layer) {
      onAddLayer(layer);
      onSelectLayer(layer.id);
      onToolChange("select");
      setDragState({
        mode: "draw",
        layer,
        start: point,
      });
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (tool === "select") {
      setDragState({
        mode: "marquee",
        start: point,
        current: point,
      });
      setMarquee(toCanvasRect(point, point));
      onSelectLayers([]);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    onSelectLayer(null);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    onPresenceCursorMove?.({
      ...clientToCanvas(event.clientX, event.clientY),
      pageId: page.id,
    });

    const drag = dragRef.current;
    if (!drag) {
      return;
    }

    if (drag.mode === "pan") {
      onViewChange({
        ...drag.view,
        x: drag.view.x + event.clientX - drag.start.x,
        y: drag.view.y + event.clientY - drag.start.y,
      });
      return;
    }

    const rawPoint = screenToCanvas(event);
    if (drag.mode === "marquee") {
      dragRef.current = { ...drag, current: rawPoint };
      setMarquee(toCanvasRect(drag.start, rawPoint));
      setSnapGuides([]);
      return;
    }

    if (drag.mode === "measure") {
      const point = getGridSnappedPoint(rawPoint, page);
      const nextMeasurement = {
        start: drag.start,
        current: point,
      };

      dragRef.current = { ...drag, current: point };
      setMeasurement(nextMeasurement);
      setSnapGuides([]);
      return;
    }

    if (drag.mode === "draw") {
      const point = getGridSnappedPoint(rawPoint, page);

      if (!hasMeaningfulDrag(drag.start, point)) {
        return;
      }

      setSnapGuides([]);
      onUpdateLayer(
        drag.layer.id,
        getDrawPatch(drag.layer, drag.start, point, event.shiftKey),
      );
      return;
    }

    if (drag.mode === "pencil") {
      const previousPoint = drag.points[drag.points.length - 1];

      if (
        previousPoint &&
        getPointDistance(previousPoint, rawPoint) < Math.max(2, 4 / view.zoom)
      ) {
        return;
      }

      const points = [...drag.points, rawPoint];
      const patch = createRefinedPencilPathPatch(points);

      dragRef.current = { ...drag, points };

      if (patch) {
        onUpdateLayer(drag.layerId, patch);
      }

      setSnapGuides([]);
      return;
    }

    if (drag.mode === "guide") {
      const point = getGridSnappedPoint(rawPoint, page);

      if (!hasMeaningfulDrag(drag.start, point)) {
        return;
      }

      const nextPosition =
        drag.orientation === "vertical" ? point.x : point.y;
      onUpdateGuide(drag.guideId, nextPosition);
      setSnapGuides([]);
      return;
    }

    if (drag.mode === "comment") {
      const point = getGridSnappedPoint(rawPoint, page);
      onUpdateComment(drag.commentId, {
        x: Math.round(drag.origin.x + point.x - drag.start.x),
        y: Math.round(drag.origin.y + point.y - drag.start.y),
      });
      setSnapGuides([]);
      return;
    }

    if (drag.mode === "path-node") {
      const layer = page.layers.find((item) => item.id === drag.layerId);
      const point = getGridSnappedPoint(rawPoint, page);
      const patch = layer
        ? createVectorPathPointMovePatch(
            layer,
            drag.pointIds,
            {
              x: point.x - drag.start.x,
              y: point.y - drag.start.y,
            },
            drag.origins,
          )
        : null;

      if (patch) {
        onUpdateLayer(drag.layerId, patch);
      }

      setSnapGuides([]);
      return;
    }

    if (drag.mode === "resize") {
      const point = rawPoint;
      setSnapGuides([]);
      const patch = getResizePatch(
        drag.origin,
        drag.start,
        point,
        drag.handle,
        event.shiftKey,
      );
      const snappedPatch = snapLayerPatchToGrid(patch, page);
      const snapshotPage = getActivePage(drag.snapshot);
      const frame = snapshotPage.layers.find((layer) => layer.id === drag.layerId);

      if (frame?.type === "frame") {
        onUpdateLayers([
          { layerId: drag.layerId, patch: snappedPatch },
          ...createFrameResizeConstraintPatches({
            frame,
            nextFrame: {
              x: snappedPatch.x ?? frame.x,
              y: snappedPatch.y ?? frame.y,
              width: snappedPatch.width ?? frame.width,
              height: snappedPatch.height ?? frame.height,
            },
            layers: snapshotPage.layers,
          }),
        ]);
        return;
      }

      onUpdateLayer(drag.layerId, snappedPatch);
      return;
    }

    if (drag.mode === "selection-resize") {
      const point = rawPoint;
      setSnapGuides([]);
      onUpdateLayers(
        getSelectionResizePatches({
          origins: drag.origins,
          bounds: drag.bounds,
          start: drag.start,
          point,
          handle: drag.handle,
          preserveAspectRatio: event.shiftKey,
          page,
        }),
      );
      return;
    }

    if (drag.mode === "selection-rotate") {
      const point = rawPoint;
      const angle = getAngle(drag.center, point);
      const rotation = angle - drag.startAngle;
      const nextRotation = event.shiftKey
        ? Math.round(rotation / 15) * 15
        : Math.round(rotation);

      setSnapGuides([]);
      onUpdateLayers(
        getSelectionRotatePatches(drag.origins, drag.center, nextRotation),
      );
      return;
    }

    if (drag.mode === "rotate") {
      const point = rawPoint;
      setSnapGuides([]);
      const angle = getAngle(drag.center, point);
      const rotation = drag.startRotation + angle - drag.startAngle;
      onUpdateLayer(drag.layerId, {
        rotation: event.shiftKey
          ? Math.round(rotation / 15) * 15
          : Math.round(rotation),
      });
      return;
    }

    const snappedDelta = snapLayerDeltaToGrid(
      drag.origins,
      rawPoint.x - drag.start.x,
      rawPoint.y - drag.start.y,
      page,
    );
    const result = pageGrid.objectSnap
      ? getSnappedLayerPatches({
          origins: drag.origins,
          layers: page.layers,
          ...snappedDelta,
        })
      : {
          patches: toLayerPatches(
            drag.origins,
            snappedDelta.deltaX,
            snappedDelta.deltaY,
          ),
          guides: [],
        };

    setSnapGuides(result.guides);
    onUpdateLayers(result.patches);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (drag?.mode === "marquee") {
      const rect = toCanvasRect(drag.start, drag.current);
      const hasDragged = rect.width > 4 || rect.height > 4;
      const nextLayerIds = hasDragged
        ? page.layers
            .filter((layer) => layer.visible)
            .filter((layer) => rectsIntersect(rect, getLayerRect(layer)))
            .map((layer) => layer.id)
        : [];

      onSelectLayers(nextLayerIds);
      setMarquee(null);
    }

    if (drag?.mode === "measure" && !hasMeaningfulDrag(drag.start, drag.current)) {
      setMeasurement(null);
    }

    if (
      drag?.mode === "comment" &&
      hasMeaningfulDrag(drag.start, screenToCanvas(event))
    ) {
      onRemember(drag.snapshot);
    }

    if (drag?.mode === "guide") {
      const point = getGridSnappedPoint(screenToCanvas(event), page);

      if (!hasMeaningfulDrag(drag.start, point)) {
        onRemoveGuide(drag.guideId);
      } else {
        onRemember(drag.snapshot);
      }

      clearDragState();
      setSnapGuides([]);

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      return;
    }

    if (
      drag?.mode === "layer" ||
      drag?.mode === "resize" ||
      drag?.mode === "selection-resize" ||
      drag?.mode === "selection-rotate" ||
      drag?.mode === "rotate" ||
      drag?.mode === "path-node" ||
      drag?.mode === "pencil"
    ) {
      onRemember(drag.snapshot);
    }
    clearDragState();
    setSnapGuides([]);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleResizePointerDown(
    event: PointerEvent<HTMLDivElement>,
    layer: DesignLayer,
    handle: ResizeHandle,
  ) {
    event.stopPropagation();
    onSelectLayer(layer.id);

    if (layer.locked) {
      return;
    }

    setDragState({
      mode: "resize",
      layerId: layer.id,
      handle,
      origin: {
        x: layer.x,
        y: layer.y,
        width: layer.width,
        height: layer.height,
      },
      start: screenToCanvas(event),
      snapshot: document,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleSelectionResizePointerDown(
    event: PointerEvent<HTMLDivElement>,
    handle: ResizeHandle,
  ) {
    event.stopPropagation();

    if (!selectionBounds) {
      return;
    }

    const selectedIds = new Set(selectedLayerIds);
    const origins = page.layers
      .filter((layer) => selectedIds.has(layer.id) && layer.visible && !layer.locked)
      .map((layer) => ({
        layerId: layer.id,
        x: layer.x,
        y: layer.y,
        width: layer.width,
        height: layer.height,
      }));

    if (origins.length < 2) {
      return;
    }

    setDragState({
      mode: "selection-resize",
      origins,
      bounds: getOriginBounds(origins),
      handle,
      start: screenToCanvas(event),
      snapshot: document,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleSelectionRotatePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.stopPropagation();

    if (!selectionBounds) {
      return;
    }

    const selectedIds = new Set(selectedLayerIds);
    const origins = page.layers
      .filter((layer) => selectedIds.has(layer.id) && layer.visible && !layer.locked)
      .map((layer) => ({
        layerId: layer.id,
        x: layer.x,
        y: layer.y,
        width: layer.width,
        height: layer.height,
        rotation: layer.rotation,
      }));

    if (origins.length < 2) {
      return;
    }

    const center = {
      x: selectionBounds.x + selectionBounds.width / 2,
      y: selectionBounds.y + selectionBounds.height / 2,
    };

    setDragState({
      mode: "selection-rotate",
      origins,
      center,
      startAngle: getAngle(center, screenToCanvas(event)),
      snapshot: document,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleRulerPointerDown(
    event: PointerEvent<HTMLDivElement>,
    orientation: DesignGuide["orientation"],
  ) {
    event.stopPropagation();

    const point = screenToCanvas(event);
    const position = orientation === "vertical" ? point.x : point.y;
    const existingGuide = findGuideNearPosition(
      guides,
      orientation,
      position,
      GUIDE_TOGGLE_DISTANCE / view.zoom,
    );

    if (existingGuide) {
      onRemoveGuide(existingGuide.id);
      return;
    }

    onAddGuide(orientation, position);
  }

  function handleGuidePointerDown(
    event: PointerEvent<HTMLDivElement>,
    guide: DesignGuide,
  ) {
    event.stopPropagation();

    if (event.altKey) {
      onRemoveGuide(guide.id);
      return;
    }

    setDragState({
      mode: "guide",
      guideId: guide.id,
      orientation: guide.orientation,
      start: screenToCanvas(event),
      snapshot: document,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCommentPointerDown(
    event: PointerEvent<HTMLButtonElement>,
    comment: DesignComment,
  ) {
    if (event.button !== 0) {
      return;
    }

    event.stopPropagation();
    onSelectComment(comment);
    setDragState({
      mode: "comment",
      commentId: comment.id,
      start: screenToCanvas(event),
      origin: { x: comment.x, y: comment.y },
      snapshot: document,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleRotatePointerDown(
    event: PointerEvent<HTMLDivElement>,
    layer: DesignLayer,
  ) {
    event.stopPropagation();
    onSelectLayer(layer.id);

    if (layer.locked) {
      return;
    }

    const center = {
      x: layer.x + layer.width / 2,
      y: layer.y + layer.height / 2,
    };

    setDragState({
      mode: "rotate",
      layerId: layer.id,
      center,
      startAngle: getAngle(center, screenToCanvas(event)),
      startRotation: layer.rotation,
      snapshot: document,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function appendPointToSelectedPath(point: Point) {
    const layer =
      selectedLayerIds.length === 1
        ? page.layers.find((item) => item.id === selectedLayerId)
        : null;

    if (!layer || layer.type !== "path" || layer.locked) {
      return false;
    }

    const patch = createExtendedPenPathPatch(layer, point);

    if (!patch) {
      return false;
    }

    onRemember(document);
    onUpdateLayer(layer.id, patch);
    onSelectLayer(layer.id);
    dismissVectorEditing();
    return true;
  }

  function startPenPath(point: Point) {
    const layer = createLayerFromTool("pen", point);

    if (!layer) {
      return;
    }

    onAddLayer(layer);
    onSelectLayer(layer.id);
    dismissVectorEditing();
  }

  function startPencilPath(
    point: Point,
    target: HTMLDivElement,
    pointerId: number,
  ) {
    const layer = createLayerFromTool("pencil", point);

    if (!layer) {
      return;
    }

    onAddLayer(layer);
    onSelectLayer(layer.id);
    dismissVectorEditing();
    setDragState({
      mode: "pencil",
      layerId: layer.id,
      points: [point],
      snapshot: document,
    });
    target.setPointerCapture(pointerId);
  }

  function handlePathNodePointerDown(
    event: PointerEvent<HTMLButtonElement>,
    layer: DesignLayer,
    pointId: string,
  ) {
    event.stopPropagation();
    setContextMenu(null);
    onSelectLayer(layer.id);
    setVectorEditingLayerId(layer.id);
    const selection = getNextVectorPointSelection(
      reconciledActiveVectorPoint,
      layer.id,
      pointId,
      event.shiftKey,
    );

    setActiveVectorPoint(selection);

    if (layer.locked) {
      return;
    }

    if (event.altKey) {
      const patch = createDeletedVectorPathPointPatch(layer, pointId);

      if (patch) {
        onRemember(document);
        onUpdateLayer(layer.id, patch);
        setActiveVectorPoint(null);
        return;
      }
    }

    if (event.shiftKey) {
      return;
    }

    const pointIds =
      reconciledActiveVectorPoint?.layerId === layer.id &&
      reconciledActiveVectorPoint.pointIds.includes(pointId)
        ? reconciledActiveVectorPoint.pointIds
        : selection.pointIds;
    const pointOrigins = getVectorPathPointOrigins(layer, pointIds);
    const primaryOrigin =
      pointOrigins.find((origin) => origin.pointId === pointId)?.point ??
      pointOrigins[0]?.point;

    if (!primaryOrigin) {
      return;
    }

    setDragState({
      mode: "path-node",
      layerId: layer.id,
      pointId,
      pointIds,
      origins: pointOrigins,
      start: primaryOrigin,
      snapshot: document,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePathInsertPointerDown(
    event: PointerEvent<HTMLButtonElement>,
    layer: DesignLayer,
    insertPointId: string,
  ) {
    event.stopPropagation();
    setContextMenu(null);
    onSelectLayer(layer.id);
    setVectorEditingLayerId(layer.id);
    setActiveVectorPoint(null);

    if (layer.locked) {
      return;
    }

    const patch = createInsertedVectorPathPointPatch(layer, insertPointId);

    if (!patch) {
      return;
    }

    onRemember(document);
    onUpdateLayer(layer.id, patch);
  }

  function handleLayerPointerDown(
    event: PointerEvent<HTMLDivElement>,
    layer: DesignLayer,
  ) {
    if (event.button !== 0) {
      return;
    }

    event.stopPropagation();
    setContextMenu(null);
    dismissVectorEditing();

    const layerGroupSelection = getLayerGroupSelection(layer, page.layers);
    const isSelected =
      selectedLayerIdSet.has(layer.id) &&
      layerGroupSelection.every((layerId) => selectedLayerIdSet.has(layerId));

    if (tool === "hand") {
      setDragState({
        mode: "pan",
        start: { x: event.clientX, y: event.clientY },
        view,
      });
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (tool === "measure") {
      const point = getGridSnappedPoint(screenToCanvas(event), page);
      const nextMeasurement = {
        start: point,
        current: point,
      };

      setDragState({
        mode: "measure",
        ...nextMeasurement,
      });
      setMeasurement(nextMeasurement);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (tool === "comment") {
      onAddComment(
        createComment(getGridSnappedPoint(screenToCanvas(event), page)),
      );
      return;
    }

    if (tool === "cutter") {
      if (!layer.locked) {
        const slices = cutLayerAtPoint(layer, getGridSnappedPoint(screenToCanvas(event), page));

        if (slices) {
          onReplaceLayers([layer.id], slices);
          return;
        }
      }
      return;
    }

    if (tool === "pen") {
      const point = getGridSnappedPoint(screenToCanvas(event), page);

      if (appendPointToSelectedPath(point)) {
        return;
      }

      if (layer.type === "path") {
        onSelectLayer(layer.id);
        return;
      }

      startPenPath(point);
      return;
    }

    if (tool === "pencil") {
      startPencilPath(
        getGridSnappedPoint(screenToCanvas(event), page),
        event.currentTarget,
        event.pointerId,
      );
      return;
    }

    const creationPoint = getGridSnappedPoint(screenToCanvas(event), page);
    const createdLayer = createLayerFromTool(tool, creationPoint);

    if (createdLayer) {
      onAddLayer(createdLayer);
      onSelectLayer(createdLayer.id);
      onToolChange("select");
      setDragState({
        mode: "draw",
        layer: createdLayer,
        start: creationPoint,
      });
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (tool === "select" && event.shiftKey) {
      onSelectLayers(
        isSelected
          ? selectedLayerIds.filter((layerId) => layerId !== layer.id)
          : [...selectedLayerIds, layer.id],
      );
      return;
    }

    const nextSelection = isSelected ? selectedLayerIds : layerGroupSelection;
    const dragSourceLayers = page.layers.filter((item) =>
      nextSelection.includes(item.id),
    );

    if (!isSelected) {
      onSelectLayers(layerGroupSelection);
    }

    if (tool !== "select" || layer.locked) {
      return;
    }

    const point = screenToCanvas(event);
    const draggedLayers =
      event.altKey && dragSourceLayers.length > 0
        ? duplicateLayersForDrag(dragSourceLayers)
        : page.layers;
    const draggedIds =
      event.altKey && dragSourceLayers.length > 0
        ? draggedLayers.map((item) => item.id)
        : nextSelection;

    if (event.altKey && dragSourceLayers.length > 0) {
      onAddLayers(draggedLayers);
      onSelectLayers(draggedIds);
    }

    const movableIds = new Set(draggedIds);
    const origins = draggedLayers
      .filter((item) => movableIds.has(item.id) && !item.locked)
      .map((item) => ({
        layerId: item.id,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
      }));

    if (origins.length === 0) {
      return;
    }

    setDragState({
      mode: "layer",
      origins,
      start: point,
      snapshot: document,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCanvasContextMenu(event: MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      canvasPoint: clientToCanvas(event.clientX, event.clientY),
      layerId: null,
    });
  }

  function handleLayerContextMenu(
    event: MouseEvent<HTMLDivElement>,
    layer: DesignLayer,
  ) {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      canvasPoint: clientToCanvas(event.clientX, event.clientY),
      layerId: layer.id,
    });
  }

  function startTextEdit(layer: DesignLayer) {
    if (!isTextLayer(layer) || layer.locked) {
      return;
    }

    textEditSnapshotRef.current = document;
    setEditingLayerId(layer.id);
    onSelectLayer(layer.id);
  }

  function finishTextEdit() {
    const snapshot = textEditSnapshotRef.current;

    if (snapshot) {
      onRemember(snapshot);
    }

    textEditSnapshotRef.current = null;
    setEditingLayerId(null);
  }

  return (
    <section
      ref={stageRef}
      className={cn(
        "relative h-full min-h-0 w-full overflow-hidden touch-none",
        getCanvasCursorClass(tool, activeDragMode),
      )}
      style={{ backgroundColor: page.background }}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      onContextMenu={handleCanvasContextMenu}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div
        data-canvas-surface="true"
        className="absolute left-0 top-0 h-[3000px] w-[4200px] will-change-transform"
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
          transformOrigin: "0 0",
          backgroundImage: pageGrid.visible
            ? "linear-gradient(to right, oklch(1 0 0 / 0.12) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0 / 0.12) 1px, transparent 1px)"
            : undefined,
          backgroundSize: pageGrid.visible
            ? `${pageGrid.size}px ${pageGrid.size}px`
            : undefined,
        }}
      >
        {visibleLayers.map((layer) => {
          const isVectorEditingSelection =
            tool === "select" &&
            vectorEditingLayerId === layer.id &&
            selectedLayerIdSet.has(layer.id);

          return (
            <LayerNode
              key={layer.id}
              layer={layer}
              tool={tool}
              prototypeTargetName={getPrototypeTargetName(layer, document.pages)}
              selectionChromeVisible={tool === "select" && selectedLayerIdSet.has(layer.id)}
              hoverChromeVisible={
                tool === "select" &&
                activeDragMode === null &&
                editingLayerId !== layer.id &&
                layer.id === hoveredLayerId &&
                !selectedLayerIdSet.has(layer.id)
              }
              showControls={
                tool === "select" &&
                layer.id === selectedLayerId &&
                selectedLayerIds.length === 1
              }
              editing={editingLayerId === layer.id}
              activeVectorPointId={
                reconciledActiveVectorPoint?.layerId === layer.id
                  ? reconciledActiveVectorPoint.primaryPointId
                  : null
              }
              selectedVectorPointIds={
                reconciledActiveVectorPoint?.layerId === layer.id
                  ? reconciledActiveVectorPoint.pointIds
                  : []
              }
              vectorEditing={isVectorEditingSelection}
              onPointerDown={(event) => handleLayerPointerDown(event, layer)}
              onPointerEnter={() => setHoveredLayerId(layer.id)}
              onPointerLeave={() =>
                setHoveredLayerId((currentLayerId) =>
                  currentLayerId === layer.id ? null : currentLayerId,
                )
              }
              onResizePointerDown={(event, handle) =>
                handleResizePointerDown(event, layer, handle)
              }
              onRotatePointerDown={(event) => handleRotatePointerDown(event, layer)}
              onPathNodePointerDown={(event, pointId) =>
                handlePathNodePointerDown(event, layer, pointId)
              }
              onPathInsertPointerDown={(event, insertPointId) =>
                handlePathInsertPointerDown(event, layer, insertPointId)
              }
              onContextMenu={(event) => handleLayerContextMenu(event, layer)}
              onStartTextEdit={() => startTextEdit(layer)}
              onStartVectorEdit={() => {
                if (layer.type !== "path" || layer.locked) {
                  return;
                }

                onSelectLayer(layer.id);
                setVectorEditingLayerId(layer.id);
                setActiveVectorPoint(null);
              }}
              onTextChange={(text) =>
                onUpdateLayer(layer.id, getTextLayerTextPatch(layer, text))
              }
              onFinishTextEdit={finishTextEdit}
            />
          );
        })}
        {(page.comments ?? []).map((comment, index) => (
          <CommentPin
            key={comment.id}
            comment={comment}
            index={index + 1}
            selected={selectedCommentId === comment.id}
            onPointerDown={(event) => handleCommentPointerDown(event, comment)}
          />
        ))}
        {guides.map((guide) => (
          <PersistentGuide
            key={guide.id}
            guide={guide}
            onPointerDown={(event) => handleGuidePointerDown(event, guide)}
            onRemove={() => onRemoveGuide(guide.id)}
          />
        ))}
        {snapGuides.map((guide) => (
          <SnapGuideLine key={`${guide.orientation}-${guide.position}`} guide={guide} />
        ))}
        {tool === "select" && selectionBounds && selectedLayerIds.length > 1 ? (
          <SelectionBoundsOverlay
            rect={selectionBounds}
            onResizePointerDown={handleSelectionResizePointerDown}
            onRotatePointerDown={handleSelectionRotatePointerDown}
          />
        ) : null}
        {marquee ? <MarqueeRect rect={marquee} /> : null}
        {measurement ? <MeasurementOverlay measurement={measurement} /> : null}
        <PresenceCursorLayer peers={presencePeers} pageId={page.id} view={view} />
      </div>
      <CanvasRulers
        view={view}
        onPointerDown={handleRulerPointerDown}
      />
      {contextMenu ? (
        <CanvasContextMenu
          contextMenu={contextMenu}
          layers={page.layers}
          layerIndex={pageLayerIndex}
          layer={page.layers.find((item) => item.id === contextMenu.layerId)}
          hasSelection={selectedLayerIds.length > 0}
          onSelectLayer={onSelectLayer}
          onSelectLayers={onSelectLayers}
          onUpdateLayer={(layerId, patch) => {
            onRemember(document);
            onUpdateLayer(layerId, patch);
          }}
          onUpdateLayers={(patches) => {
            onRemember(document);
            onUpdateLayers(patches);
          }}
          onDuplicateLayers={onDuplicateLayers}
          onReorderLayer={onReorderLayer}
          onDeleteLayers={onDeleteLayers}
          onClose={() => setContextMenu(null)}
        />
      ) : null}
    </section>
  );
}

function CanvasContextMenu({
  contextMenu,
  layers,
  layerIndex,
  layer,
  hasSelection,
  onSelectLayer,
  onSelectLayers,
  onUpdateLayer,
  onUpdateLayers,
  onDuplicateLayers,
  onReorderLayer,
  onDeleteLayers,
  onClose,
}: {
  contextMenu: {
    x: number;
    y: number;
    canvasPoint: Point;
    layerId: string | null;
  };
  layers: DesignLayer[];
  layerIndex: PageLayerIndex;
  layer?: DesignLayer;
  hasSelection: boolean;
  onSelectLayer: (layerId: string | null) => void;
  onSelectLayers: (layerIds: string[]) => void;
  onUpdateLayer: (layerId: string, patch: Partial<DesignLayer>) => void;
  onUpdateLayers: (patches: LayerPatch[]) => void;
  onDuplicateLayers: (layerIds: string[]) => void;
  onReorderLayer: (
    layerId: string,
    direction: "forward" | "backward" | "front" | "back",
  ) => void;
  onDeleteLayers: (layerIds: string[]) => void;
  onClose: () => void;
}) {
  const hitLayers = getLayersAtPoint(layerIndex, contextMenu.canvasPoint);
  const nextHitLayer = getNextHitLayer(hitLayers, layer);

  function run(action: () => void) {
    action();
    onClose();
  }

  return (
    <div
      className="fixed z-50 w-48 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onPointerDown={(event) => event.stopPropagation()}
      role="menu"
    >
      {layer ? (
        <>
          <ContextMenuButton onClick={() => run(() => onSelectLayer(layer.id))}>
            Select layer
          </ContextMenuButton>
          <ContextMenuButton
            disabled={!nextHitLayer}
            onClick={() => {
              if (nextHitLayer) {
                run(() => onSelectLayer(nextHitLayer.id));
              }
            }}
          >
            Select next under cursor
          </ContextMenuButton>
          <ContextMenuButton
            onClick={() =>
              run(() =>
                onSelectLayers(
                  layers
                    .filter((item) => item.visible && item.type === layer.type)
                    .map((item) => item.id),
                ),
              )
            }
          >
            Select same type
          </ContextMenuButton>
          <ContextMenuButton
            onClick={() => run(() => onDuplicateLayers([layer.id]))}
          >
            Duplicate layer
          </ContextMenuButton>
          <ContextMenuButton
            onClick={() => run(() => onReorderLayer(layer.id, "front"))}
          >
            Bring to front
          </ContextMenuButton>
          <ContextMenuButton
            onClick={() => run(() => onReorderLayer(layer.id, "forward"))}
          >
            Bring forward
          </ContextMenuButton>
          <ContextMenuButton
            onClick={() => run(() => onReorderLayer(layer.id, "backward"))}
          >
            Send backward
          </ContextMenuButton>
          <ContextMenuButton
            onClick={() => run(() => onReorderLayer(layer.id, "back"))}
          >
            Send to back
          </ContextMenuButton>
          <ContextMenuButton
            onClick={() =>
              run(() => onUpdateLayer(layer.id, { visible: !layer.visible }))
            }
          >
            {layer.visible ? "Hide layer" : "Show layer"}
          </ContextMenuButton>
          <ContextMenuButton
            onClick={() =>
              run(() =>
                onUpdateLayers(
                  layers
                    .filter((item) => item.id !== layer.id && item.visible)
                    .map((item) => ({
                      layerId: item.id,
                      patch: { visible: false },
                    })),
                ),
              )
            }
          >
            Hide others
          </ContextMenuButton>
          <ContextMenuButton
            onClick={() =>
              run(() => onUpdateLayer(layer.id, { locked: !layer.locked }))
            }
          >
            {layer.locked ? "Unlock layer" : "Lock layer"}
          </ContextMenuButton>
          <ContextMenuButton
            onClick={() =>
              run(() =>
                onUpdateLayers(
                  layers
                    .filter((item) => item.id !== layer.id && !item.locked)
                    .map((item) => ({
                      layerId: item.id,
                      patch: { locked: true },
                    })),
                ),
              )
            }
          >
            Lock others
          </ContextMenuButton>
          <ContextMenuButton
            destructive
            onClick={() => run(() => onDeleteLayers([layer.id]))}
          >
            Delete layer
          </ContextMenuButton>
          {hitLayers.length > 1 ? (
            <div className="mt-1 border-t border-border pt-1">
              {hitLayers.slice(0, 5).map((hitLayer) => (
                <ContextMenuButton
                  key={hitLayer.id}
                  onClick={() => run(() => onSelectLayer(hitLayer.id))}
                >
                  {hitLayer.name}
                </ContextMenuButton>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <ContextMenuButton
            disabled={!hasSelection}
            onClick={() => run(() => onSelectLayers([]))}
          >
            Clear selection
          </ContextMenuButton>
          <ContextMenuButton onClick={() => run(() => onSelectLayer(null))}>
            Select canvas
          </ContextMenuButton>
          <ContextMenuButton
            onClick={() =>
              run(() =>
                onUpdateLayers(
                  layers
                    .filter((layer) => !layer.visible)
                    .map((layer) => ({
                      layerId: layer.id,
                      patch: { visible: true },
                    })),
                ),
              )
            }
          >
            Show all layers
          </ContextMenuButton>
          <ContextMenuButton
            onClick={() =>
              run(() =>
                onUpdateLayers(
                  layers
                    .filter((layer) => layer.locked)
                    .map((layer) => ({
                      layerId: layer.id,
                      patch: { locked: false },
                    })),
                ),
              )
            }
          >
            Unlock all layers
          </ContextMenuButton>
        </>
      )}
    </div>
  );
}

function ContextMenuButton({
  children,
  destructive,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "h-8 w-full justify-start rounded-md px-2 text-xs",
        destructive && "text-destructive hover:text-destructive",
      )}
      disabled={disabled}
      onClick={onClick}
      role="menuitem"
    >
      {children}
    </Button>
  );
}

function duplicateLayersForDrag(layers: DesignLayer[]) {
  return layers.map((layer) => {
    const ungroupedLayer = { ...layer };
    delete ungroupedLayer.groupId;

    return {
      ...ungroupedLayer,
      id: nanoid(),
      name: `${layer.name} Copy`,
    };
  });
}

function getLayersAtPoint(index: PageLayerIndex, point: Point) {
  return getLayerEntriesAtPoint(index, point, { includeLocked: true }).map(
    (entry) => entry.layer,
  );
}

function getNextHitLayer(hitLayers: DesignLayer[], currentLayer?: DesignLayer) {
  if (hitLayers.length === 0) {
    return undefined;
  }

  if (!currentLayer) {
    return hitLayers[0];
  }

  const currentIndex = hitLayers.findIndex((layer) => layer.id === currentLayer.id);

  if (currentIndex === -1) {
    return hitLayers[0];
  }

  return hitLayers[(currentIndex + 1) % hitLayers.length];
}

function CanvasRulers({
  view,
  onPointerDown,
}: {
  view: CanvasView;
  onPointerDown: (
    event: PointerEvent<HTMLDivElement>,
    orientation: DesignGuide["orientation"],
  ) => void;
}) {
  return (
    <>
      <div className="pointer-events-none absolute left-0 top-0 z-50 size-6 border-b border-r border-border bg-card/95" />
      <div
        className="absolute left-6 right-0 top-0 z-50 h-6 cursor-col-resize border-b border-border bg-card/95"
        onPointerDown={(event) => onPointerDown(event, "vertical")}
      >
        <RulerTicks axis="horizontal" view={view} />
      </div>
      <div
        className="absolute bottom-0 left-0 top-6 z-50 w-6 cursor-row-resize border-r border-border bg-card/95"
        onPointerDown={(event) => onPointerDown(event, "horizontal")}
      >
        <RulerTicks axis="vertical" view={view} />
      </div>
    </>
  );
}

function RulerTicks({
  axis,
  view,
}: {
  axis: "horizontal" | "vertical";
  view: CanvasView;
}) {
  const ticks = Array.from({ length: 34 }, (_, index) => index * 120);

  return (
    <div className="relative h-full w-full overflow-hidden text-[9px] text-muted-foreground">
      {ticks.map((tick) => {
        const position =
          axis === "horizontal" ? view.x + tick * view.zoom : view.y + tick * view.zoom;

        return (
          <div
            key={tick}
            className={cn(
              "absolute bg-border",
              axis === "horizontal"
                ? "bottom-0 h-2 w-px"
                : "right-0 h-px w-2",
            )}
            style={
              axis === "horizontal"
                ? { left: position }
                : { top: position }
            }
          >
            {tick % 240 === 0 ? (
              <span
                className={cn(
                  "absolute font-mono leading-none",
                  axis === "horizontal"
                    ? "bottom-2 left-1"
                    : "left-0 top-1 origin-top-left -rotate-90",
                )}
              >
                {tick}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function PersistentGuide({
  guide,
  onPointerDown,
  onRemove,
}: {
  guide: DesignGuide;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onRemove: () => void;
}) {
  function handleDeletePointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
  }

  function handleDeleteClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onRemove();
  }

  if (guide.orientation === "vertical") {
    return (
      <div
        data-editor-guide="true"
        className="group/guide absolute top-0 z-30 h-[3000px] w-2 -translate-x-1 cursor-col-resize border-l border-dashed border-cyan-300/80"
        style={{ left: guide.position }}
        title="Drag to move. Click X to delete. Click the ruler near this guide to toggle it off."
        onPointerDown={onPointerDown}
      >
        <button
          type="button"
          aria-label={`Delete ${guide.orientation} guide`}
          data-editor-guide-delete-affordance="true"
          className="pointer-events-auto absolute left-1 top-12 grid size-5 -translate-x-1/2 place-items-center rounded-full border border-cyan-300/70 bg-background/95 text-cyan-100 opacity-0 shadow-sm transition-opacity hover:bg-cyan-300 hover:text-background group-hover/guide:opacity-100"
          title="Delete guide"
          onPointerDown={handleDeletePointerDown}
          onClick={handleDeleteClick}
        >
          <X className="size-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      data-editor-guide="true"
      className="group/guide absolute left-0 z-30 h-2 w-[4200px] -translate-y-1 cursor-row-resize border-t border-dashed border-cyan-300/80"
      style={{ top: guide.position }}
      title="Drag to move. Click X to delete. Click the ruler near this guide to toggle it off."
      onPointerDown={onPointerDown}
    >
      <button
        type="button"
        aria-label={`Delete ${guide.orientation} guide`}
        data-editor-guide-delete-affordance="true"
        className="pointer-events-auto absolute left-12 top-1 grid size-5 -translate-y-1/2 place-items-center rounded-full border border-cyan-300/70 bg-background/95 text-cyan-100 opacity-0 shadow-sm transition-opacity hover:bg-cyan-300 hover:text-background group-hover/guide:opacity-100"
        title="Delete guide"
        onPointerDown={handleDeletePointerDown}
        onClick={handleDeleteClick}
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

function SnapGuideLine({ guide }: { guide: SnapGuide }) {
  if (guide.orientation === "vertical") {
    return (
      <div
        className="pointer-events-none absolute z-40 w-px bg-sky-400 shadow-[0_0_0_1px_oklch(0.746_0.16_232.661/0.28)]"
        style={{
          left: guide.position,
          top: guide.start,
          height: guide.end - guide.start,
        }}
      />
    );
  }

  return (
    <div
      className="pointer-events-none absolute z-40 h-px bg-sky-400 shadow-[0_0_0_1px_oklch(0.746_0.16_232.661/0.28)]"
      style={{
        left: guide.start,
        top: guide.position,
        width: guide.end - guide.start,
      }}
    />
  );
}

function MarqueeRect({ rect }: { rect: CanvasRect }) {
  return (
    <div
      className="pointer-events-none absolute z-30 border border-primary bg-primary/10"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
      }}
    />
  );
}

function PresenceCursorLayer({
  peers,
  pageId,
  view,
}: {
  peers: CollaborationPeer[];
  pageId: string;
  view: CanvasView;
}) {
  const visiblePeers = peers.filter((peer) => peer.cursor?.pageId === pageId);

  if (visiblePeers.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-50">
      {visiblePeers.map((peer) => {
        const cursor = peer.cursor;

        if (!cursor) {
          return null;
        }

        return (
          <div
            key={peer.id}
            className="absolute left-0 top-0"
            style={{
              transform: `translate(${cursor.x}px, ${cursor.y}px) scale(${
                1 / view.zoom
              })`,
              transformOrigin: "0 0",
            }}
          >
            <div
              className="h-0 w-0 border-b-[10px] border-r-[7px] border-b-transparent"
              style={{ borderLeft: `10px solid ${peer.color}` }}
            />
            <div
              className="mt-1 rounded-sm px-1.5 py-0.5 text-[10px] font-medium text-white shadow"
              style={{ backgroundColor: peer.color }}
            >
              {peer.spotlight ? "Live: " : ""}
              {peer.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MeasurementOverlay({
  measurement,
}: {
  measurement: { start: Point; current: Point };
}) {
  const deltaX = measurement.current.x - measurement.start.x;
  const deltaY = measurement.current.y - measurement.start.y;
  const distance = Math.hypot(deltaX, deltaY);
  const labelX = measurement.start.x + deltaX / 2;
  const labelY = measurement.start.y + deltaY / 2;

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      <svg className="absolute inset-0 size-full overflow-visible">
        <line
          x1={measurement.start.x}
          y1={measurement.start.y}
          x2={measurement.current.x}
          y2={measurement.current.y}
          stroke="oklch(0.746 0.16 232.661)"
          strokeWidth={2}
          strokeDasharray="6 4"
        />
        <circle
          cx={measurement.start.x}
          cy={measurement.start.y}
          r={4}
          fill="oklch(0.746 0.16 232.661)"
        />
        <circle
          cx={measurement.current.x}
          cy={measurement.current.y}
          r={4}
          fill="oklch(0.746 0.16 232.661)"
        />
      </svg>
      <div
        className="absolute rounded-md border border-sky-300/40 bg-background/95 px-2 py-1 font-mono text-[10px] text-foreground shadow"
        style={{
          left: labelX,
          top: labelY,
          transform: "translate(-50%, -130%)",
        }}
      >
        {Math.round(distance)}px / X {Math.round(deltaX)} / Y{" "}
        {Math.round(deltaY)}
      </div>
    </div>
  );
}

function SelectionBoundsOverlay({
  rect,
  onResizePointerDown,
  onRotatePointerDown,
}: {
  rect: CanvasRect;
  onResizePointerDown: (
    event: PointerEvent<HTMLDivElement>,
    handle: ResizeHandle,
  ) => void;
  onRotatePointerDown: (event: PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className="pointer-events-none absolute z-30 border border-primary"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
      }}
    >
      <div className="absolute -bottom-7 left-0 rounded-sm bg-primary px-1.5 py-0.5 font-mono text-[10px] leading-none text-primary-foreground shadow-sm">
        {Math.round(rect.x)}, {Math.round(rect.y)} / {Math.round(rect.width)} x{" "}
        {Math.round(rect.height)}
      </div>
      <RotateHandle onPointerDown={onRotatePointerDown} />
      <ResizeHandles onPointerDown={onResizePointerDown} />
    </div>
  );
}

function LayerNode({
  layer,
  tool,
  prototypeTargetName,
  selectionChromeVisible,
  hoverChromeVisible,
  showControls,
  editing,
  activeVectorPointId,
  selectedVectorPointIds,
  vectorEditing,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
  onContextMenu,
  onResizePointerDown,
  onRotatePointerDown,
  onPathNodePointerDown,
  onPathInsertPointerDown,
  onStartTextEdit,
  onStartVectorEdit,
  onTextChange,
  onFinishTextEdit,
}: {
  layer: DesignLayer;
  tool: EditorTool;
  prototypeTargetName?: string;
  selectionChromeVisible: boolean;
  hoverChromeVisible: boolean;
  showControls: boolean;
  editing: boolean;
  activeVectorPointId: string | null;
  selectedVectorPointIds: string[];
  vectorEditing: boolean;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onContextMenu: (event: MouseEvent<HTMLDivElement>) => void;
  onResizePointerDown: (
    event: PointerEvent<HTMLDivElement>,
    handle: ResizeHandle,
  ) => void;
  onRotatePointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPathNodePointerDown: (
    event: PointerEvent<HTMLButtonElement>,
    pointId: string,
  ) => void;
  onPathInsertPointerDown: (
    event: PointerEvent<HTMLButtonElement>,
    insertPointId: string,
  ) => void;
  onStartTextEdit: () => void;
  onStartVectorEdit: () => void;
  onTextChange: (text: string) => void;
  onFinishTextEdit: () => void;
}) {
  const isTextual = layer.type === "text" || layer.type === "sticky";
  const mediaSrc = layer.type === "image" ? layer.imageSrc : undefined;
  const isVideoMedia = isVideoMediaLayer(layer);
  const pathData = layer.type === "path" ? layer.pathData : undefined;
  const usesBoxPaint = layer.type !== "path";
  const fillPaints = getLayerFillPaints(layer);
  const hoverableChromeVisible =
    tool === "select" && !selectionChromeVisible && !editing;

  return (
    <div
      data-editor-layer-id={layer.id}
      data-editor-layer-type={layer.type}
      data-editor-layer-hovered={hoverChromeVisible || undefined}
      className={cn(
        "absolute select-none border",
        hoverableChromeVisible &&
          "hover:ring-1 hover:ring-primary/80 hover:ring-offset-1 hover:ring-offset-background",
        selectionChromeVisible &&
          "ring-2 ring-primary ring-offset-2 ring-offset-background",
        hoverChromeVisible &&
          "ring-1 ring-primary/80 ring-offset-1 ring-offset-background",
        getLayerCursorClass(layer, tool),
      )}
      style={{
        left: layer.x,
        top: layer.y,
        width: layer.width,
        height: layer.height,
        opacity: layer.opacity,
        overflow: layer.clipContent ? "hidden" : "visible",
        mixBlendMode:
          (layer.blendMode ?? "normal") as React.CSSProperties["mixBlendMode"],
        background: "transparent",
        borderColor: usesBoxPaint ? layer.stroke : "transparent",
        borderWidth: usesBoxPaint ? layer.strokeWidth : 0,
        borderStyle:
          usesBoxPaint && layer.strokeDash?.trim() ? "dashed" : "solid",
        borderRadius:
          layer.type === "ellipse" ? "999px" : `${layer.cornerRadius}px`,
        boxShadow: getLayerBoxShadow(layer),
        filter: getLayerFilter(layer),
        backdropFilter: getLayerBackdropFilter(layer),
        WebkitBackdropFilter: getLayerBackdropFilter(layer),
        clipPath: getLayerMaskClipPath(layer),
        transform: `rotate(${layer.rotation}deg)`,
      }}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onContextMenu={onContextMenu}
      onDoubleClick={(event) => {
        if (isTextual) {
          event.stopPropagation();
          onStartTextEdit();
          return;
        }

        if (layer.type === "path") {
          event.stopPropagation();
          onStartVectorEdit();
        }
      }}
    >
      {usesBoxPaint ? (
        <PaintStackBackground
          paints={fillPaints}
          radius={layer.type === "ellipse" ? "999px" : `${layer.cornerRadius}px`}
        />
      ) : null}
      {mediaSrc && isVideoMedia ? (
        <video
          src={mediaSrc}
          className="absolute inset-0 h-full w-full"
          controls={selectionChromeVisible}
          muted
          playsInline
          preload="metadata"
          draggable={false}
          style={{
            borderRadius:
              layer.type === "ellipse" ? "999px" : `${layer.cornerRadius}px`,
            objectFit: layer.imageFit ?? "contain",
          }}
        />
      ) : null}
      {mediaSrc && !isVideoMedia ? (
        <Image
          src={mediaSrc}
          alt={layer.imageAlt ?? layer.name}
          fill
          unoptimized
          sizes={`${Math.max(24, Math.round(layer.width))}px`}
          draggable={false}
          style={{
            borderRadius:
              layer.type === "ellipse" ? "999px" : `${layer.cornerRadius}px`,
            objectFit: layer.imageFit ?? "cover",
          }}
        />
      ) : null}
      {pathData ? (
        <svg
          aria-hidden="true"
          focusable="false"
          className={cn(
            "h-full w-full",
            layer.clipContent ? "overflow-hidden" : "overflow-visible",
          )}
          preserveAspectRatio="none"
          viewBox={getPathViewBox(layer)}
        >
          {fillPaints
            .filter((paint) => paint.visible && paint.opacity > 0)
            .reverse()
            .map((paint) => (
              <path
                key={paint.id}
                d={pathData}
                fill={paint.value}
                opacity={paint.opacity}
                style={{
                  mixBlendMode:
                    (paint.blendMode ?? "normal") as React.CSSProperties["mixBlendMode"],
                }}
                fillRule={layer.fillRule ?? "nonzero"}
                clipRule={layer.fillRule ?? "nonzero"}
              />
            ))}
          <path
            d={pathData}
            fill="transparent"
            stroke={layer.stroke}
            strokeWidth={layer.strokeWidth}
            strokeDasharray={getStrokeDashArray(layer)}
            strokeLinecap={layer.strokeLineCap ?? "butt"}
            strokeLinejoin={layer.strokeLineJoin ?? "miter"}
          />
        </svg>
      ) : null}
      {selectionChromeVisible && pathData ? <PathSelectionContainer /> : null}
      {showControls && vectorEditing && pathData && !editing ? (
        <VectorPathCanvasHandles
          layer={layer}
          activePointId={activeVectorPointId}
          selectedPointIds={selectedVectorPointIds}
          onPointerDown={onPathNodePointerDown}
          onInsertPointerDown={onPathInsertPointerDown}
        />
      ) : null}
      {isTextual && editing ? (
        <InlineTextEditor
          layer={layer}
          onTextChange={onTextChange}
          onFinishTextEdit={onFinishTextEdit}
        />
      ) : null}
      {isTextual && !editing ? <LayerText layer={layer} /> : null}
      {layer.type === "frame" ? (
        <LayoutGridOverlay grids={layer.layoutGrids ?? []} />
      ) : null}
      {layer.prototype ? (
        <PrototypeHotspotBadge
          layer={layer}
          targetName={prototypeTargetName ?? "Unknown page"}
        />
      ) : null}
      {showControls && !layer.locked ? (
        <>
          <MeasurementBadge layer={layer} />
          <RotateHandle onPointerDown={onRotatePointerDown} />
          <ResizeHandles onPointerDown={onResizePointerDown} />
        </>
      ) : null}
    </div>
  );
}

function PathSelectionContainer() {
  return (
    <div
      aria-hidden="true"
      data-editor-path-selection-container="true"
      className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-[2px] border border-primary/80 shadow-[0_0_0_1px_oklch(0.746_0.16_232.661/0.18)]"
      style={{
        width: "max(100%, 24px)",
        height: "max(100%, 24px)",
      }}
    />
  );
}

function VectorPathCanvasHandles({
  layer,
  activePointId,
  selectedPointIds,
  onPointerDown,
  onInsertPointerDown,
}: {
  layer: DesignLayer;
  activePointId: string | null;
  selectedPointIds: string[];
  onPointerDown: (
    event: PointerEvent<HTMLButtonElement>,
    pointId: string,
  ) => void;
  onInsertPointerDown: (
    event: PointerEvent<HTMLButtonElement>,
    insertPointId: string,
  ) => void;
}) {
  const points = getVectorPathCanvasPoints(layer);
  const insertPoints = getVectorPathInsertPoints(layer);
  const tethers = getVectorPathControlTethers(layer);
  const selectedPointIdSet = new Set(selectedPointIds);

  if (points.length > MAX_VECTOR_CANVAS_HANDLES) {
    return null;
  }

  if (
    points.length === 0 &&
    insertPoints.length === 0 &&
    tethers.length === 0
  ) {
    return null;
  }

  return (
    <div
      data-editor-vector-node-handles="true"
      className="pointer-events-none absolute inset-0 z-30"
    >
      <VectorPathControlTethers tethers={tethers} />
      {insertPoints.map((point) => (
        <VectorPathInsertHandle
          key={point.id}
          point={point}
          onPointerDown={onInsertPointerDown}
        />
      ))}
      {points.map((point) => (
        <VectorPathCanvasHandle
          key={point.id}
          point={point}
          active={point.id === activePointId}
          selected={selectedPointIdSet.has(point.id)}
          onPointerDown={onPointerDown}
        />
      ))}
    </div>
  );
}

function VectorPathControlTethers({
  tethers,
}: {
  tethers: VectorPathControlTether[];
}) {
  if (tethers.length === 0) {
    return null;
  }

  return (
    <svg
      className="absolute inset-0 h-full w-full overflow-visible"
      aria-hidden="true"
    >
      {tethers.map((tether) => (
        <line
          key={tether.id}
          x1={tether.localX1}
          y1={tether.localY1}
          x2={tether.localX2}
          y2={tether.localY2}
          className="stroke-primary/50"
          strokeDasharray="3 3"
          strokeLinecap="round"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

function VectorPathInsertHandle({
  point,
  onPointerDown,
}: {
  point: VectorPathInsertPoint;
  onPointerDown: (
    event: PointerEvent<HTMLButtonElement>,
    insertPointId: string,
  ) => void;
}) {
  return (
    <button
      type="button"
      className="pointer-events-auto absolute size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] border border-primary bg-background/90 shadow-sm hover:bg-primary hover:text-primary-foreground"
      style={{
        left: point.localX,
        top: point.localY,
      }}
      aria-label={point.label}
      title={point.label}
      onPointerDown={(event) => onPointerDown(event, point.id)}
    />
  );
}

function VectorPathCanvasHandle({
  point,
  active,
  selected,
  onPointerDown,
}: {
  point: VectorPathCanvasPoint;
  active: boolean;
  selected: boolean;
  onPointerDown: (
    event: PointerEvent<HTMLButtonElement>,
    pointId: string,
  ) => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "pointer-events-auto absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border shadow-sm",
        point.kind === "anchor"
          ? "border-background bg-primary"
          : "border-primary bg-background",
        selected &&
          "ring-1 ring-primary/70 ring-offset-1 ring-offset-background",
        active && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
      style={{
        left: point.localX,
        top: point.localY,
      }}
      aria-label={`${point.label} ${point.command} vector point`}
      title={`${point.label} / ${point.command}`}
      onPointerDown={(event) => onPointerDown(event, point.id)}
    />
  );
}

function PaintStackBackground({
  paints,
  radius,
}: {
  paints: ReturnType<typeof getLayerFillPaints>;
  radius: string;
}) {
  const visiblePaints = paints
    .filter((paint) => paint.visible && paint.opacity > 0)
    .reverse();

  if (visiblePaints.length === 0) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ borderRadius: radius }}
    >
      {visiblePaints.map((paint) => (
        <span
          key={paint.id}
          className="absolute inset-0"
          style={{
            background: paint.value,
            opacity: paint.opacity,
            mixBlendMode:
              (paint.blendMode ?? "normal") as React.CSSProperties["mixBlendMode"],
          }}
        />
      ))}
    </div>
  );
}

function LayoutGridOverlay({ grids }: { grids: DesignLayoutGrid[] }) {
  const visibleGrids = grids
    .map(normalizeLayoutGrid)
    .filter((grid) => grid.visible);

  if (visibleGrids.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {visibleGrids.map((grid) =>
        grid.kind === "grid" ? (
          <SquareLayoutGrid key={grid.id} grid={grid} />
        ) : (
          <TrackLayoutGrid key={grid.id} grid={grid} />
        ),
      )}
    </div>
  );
}

function SquareLayoutGrid({ grid }: { grid: DesignLayoutGrid }) {
  const color = getLayoutGridCssColor(grid);

  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: [
          `linear-gradient(to right, ${color} 1px, transparent 1px)`,
          `linear-gradient(to bottom, ${color} 1px, transparent 1px)`,
        ].join(", "),
        backgroundSize: `${grid.size}px ${grid.size}px`,
      }}
    />
  );
}

function TrackLayoutGrid({ grid }: { grid: DesignLayoutGrid }) {
  const color = getLayoutGridCssColor(grid);
  const tracks = Array.from({ length: grid.count }, (_, index) => index);
  const gutterTotal = grid.gutter * Math.max(0, grid.count - 1);
  const fixedLayoutSize = Math.max(1, grid.size) * grid.count + gutterTotal;

  return (
    <div
      className="absolute grid"
      style={getTrackContainerStyle(grid, fixedLayoutSize)}
    >
      {tracks.map((track) => (
        <div
          key={track}
          className="min-h-0 min-w-0"
          style={
            grid.kind === "columns"
              ? {
                  height: "100%",
                  backgroundColor: color,
                }
              : {
                  width: "100%",
                  backgroundColor: color,
                }
          }
        />
      ))}
    </div>
  );
}

function getTrackContainerStyle(
  grid: DesignLayoutGrid,
  fixedLayoutSize: number,
): React.CSSProperties {
  const start = getTrackStart(grid, fixedLayoutSize);

  if (grid.kind === "columns") {
    return {
      left: start,
      top: 0,
      width:
        grid.alignment === "stretch"
          ? `calc(100% - ${grid.margin * 2}px)`
          : `${fixedLayoutSize}px`,
      height: "100%",
      columnGap: `${grid.gutter}px`,
      gridTemplateColumns:
        grid.alignment === "stretch"
          ? `repeat(${grid.count}, minmax(0, 1fr))`
          : `repeat(${grid.count}, ${Math.max(1, grid.size)}px)`,
    };
  }

  return {
    left: 0,
    top: start,
    width: "100%",
    height:
      grid.alignment === "stretch"
        ? `calc(100% - ${grid.margin * 2}px)`
        : `${fixedLayoutSize}px`,
    rowGap: `${grid.gutter}px`,
    gridTemplateRows:
      grid.alignment === "stretch"
        ? `repeat(${grid.count}, minmax(0, 1fr))`
        : `repeat(${grid.count}, ${Math.max(1, grid.size)}px)`,
  };
}

function getTrackStart(grid: DesignLayoutGrid, fixedLayoutSize: number) {
  if (grid.alignment === "start" || grid.alignment === "stretch") {
    return `${grid.margin}px`;
  }

  if (grid.alignment === "center") {
    return `calc((100% - ${fixedLayoutSize}px) / 2)`;
  }

  return `calc(100% - ${grid.margin}px - ${fixedLayoutSize}px)`;
}

function LayerText({ layer }: { layer: DesignLayer }) {
  const autoWidth = layer.textResizeMode === "auto-width";

  return (
    <div
      className="h-full w-full overflow-hidden whitespace-pre-wrap p-3"
      style={{
        color: layer.textColor,
        fontFamily: layer.fontFamily,
        fontSize: layer.fontSize,
        fontWeight: layer.fontWeight,
        letterSpacing: layer.letterSpacing,
        lineHeight: layer.lineHeight ?? 1.25,
        textAlign: layer.textAlign,
        whiteSpace: autoWidth ? "pre" : "pre-wrap",
      }}
    >
      {layer.text}
    </div>
  );
}

function InlineTextEditor({
  layer,
  onTextChange,
  onFinishTextEdit,
}: {
  layer: DesignLayer;
  onTextChange: (text: string) => void;
  onFinishTextEdit: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.focus();
    textarea.select();
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    event.stopPropagation();

    if (event.key === "Escape") {
      event.currentTarget.blur();
    }

    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.currentTarget.blur();
    }
  }

  return (
    <textarea
      ref={textareaRef}
      value={layer.text ?? ""}
      className="absolute inset-0 z-20 h-full w-full resize-none overflow-hidden border-0 bg-transparent p-3 outline-none ring-2 ring-primary/70"
      spellCheck={false}
      style={{
        color: layer.textColor,
        fontFamily: layer.fontFamily,
        fontSize: layer.fontSize,
        fontWeight: layer.fontWeight,
        letterSpacing: layer.letterSpacing,
        lineHeight: layer.lineHeight ?? 1.25,
        textAlign: layer.textAlign,
        whiteSpace: layer.textResizeMode === "auto-width" ? "pre" : "pre-wrap",
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onChange={(event) => onTextChange(event.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={onFinishTextEdit}
    />
  );
}

function MeasurementBadge({ layer }: { layer: DesignLayer }) {
  return (
    <div className="pointer-events-none absolute -bottom-7 left-0 z-20 rounded-sm bg-primary px-1.5 py-0.5 font-mono text-[10px] leading-none text-primary-foreground shadow-sm">
      {Math.round(layer.x)}, {Math.round(layer.y)} /{" "}
      {Math.round(layer.width)} x {Math.round(layer.height)} /{" "}
      {Math.round(layer.rotation)} deg
    </div>
  );
}

function PrototypeHotspotBadge({
  layer,
  targetName,
}: {
  layer: DesignLayer;
  targetName: string;
}) {
  return (
    <div className="pointer-events-none absolute right-1 top-1 z-20 flex max-w-[calc(100%-0.5rem)] items-center gap-1 rounded-full border border-sky-300/50 bg-sky-950/90 px-2 py-0.5 text-[10px] font-medium text-sky-100 shadow">
      <span className="size-1.5 shrink-0 rounded-full bg-sky-300" />
      <span className="truncate">
        {getPrototypeTriggerLabel(layer.prototype?.trigger)} {"->"} {targetName}
      </span>
    </div>
  );
}

function CommentPin({
  comment,
  index,
  selected,
  onPointerDown,
}: {
  comment: DesignComment;
  index: number;
  selected: boolean;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "absolute z-20 grid size-6 select-none place-items-center rounded-full border border-background bg-primary font-mono text-[11px] font-bold text-primary-foreground shadow-lg outline-none ring-offset-2 ring-offset-background transition",
        selected && "scale-110 ring-2 ring-primary",
        comment.resolved && "bg-muted text-muted-foreground",
      )}
      style={{
        left: comment.x - 12,
        top: comment.y - 12,
      }}
      title={comment.text}
      onPointerDown={onPointerDown}
    >
      {index}
    </button>
  );
}

function RotateHandle({
  onPointerDown,
}: {
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className="absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2">
      <div className="absolute bottom-1.5 left-1/2 h-6 w-px -translate-x-1/2 bg-primary" />
      <div
        className="pointer-events-auto absolute bottom-7 left-1/2 size-3 -translate-x-1/2 rounded-full border border-background bg-primary"
        style={{ cursor: "grab" }}
        onPointerDown={onPointerDown}
      />
    </div>
  );
}

function ResizeHandles({
  onPointerDown,
}: {
  onPointerDown: (
    event: PointerEvent<HTMLDivElement>,
    handle: ResizeHandle,
  ) => void;
}) {
  return (
    <>
      {resizeHandles.map((handle) => (
        <div
          key={handle.id}
          className={cn(
            "absolute z-10 size-2.5 rounded-[2px] border border-background bg-primary",
            "pointer-events-auto",
            handle.className,
          )}
          style={{ cursor: handle.cursor }}
          onPointerDown={(event) => onPointerDown(event, handle.id)}
        />
      ))}
    </>
  );
}

const resizeHandles: Array<{
  id: ResizeHandle;
  className: string;
  cursor: string;
}> = [
  {
    id: "nw",
    className: "-left-1.5 -top-1.5",
    cursor: "nwse-resize",
  },
  {
    id: "n",
    className: "-top-1.5 left-1/2 -translate-x-1/2",
    cursor: "ns-resize",
  },
  {
    id: "ne",
    className: "-right-1.5 -top-1.5",
    cursor: "nesw-resize",
  },
  {
    id: "e",
    className: "-right-1.5 top-1/2 -translate-y-1/2",
    cursor: "ew-resize",
  },
  {
    id: "se",
    className: "-bottom-1.5 -right-1.5",
    cursor: "nwse-resize",
  },
  {
    id: "s",
    className: "-bottom-1.5 left-1/2 -translate-x-1/2",
    cursor: "ns-resize",
  },
  {
    id: "sw",
    className: "-bottom-1.5 -left-1.5",
    cursor: "nesw-resize",
  },
  {
    id: "w",
    className: "-left-1.5 top-1/2 -translate-y-1/2",
    cursor: "ew-resize",
  },
];

function getResizePatch(
  origin: Pick<DesignLayer, "x" | "y" | "width" | "height">,
  start: { x: number; y: number },
  point: { x: number; y: number },
  handle: ResizeHandle,
  preserveAspectRatio: boolean,
): Partial<DesignLayer> {
  const minSize = 12;
  const deltaX = point.x - start.x;
  const deltaY = point.y - start.y;
  let x = origin.x;
  let y = origin.y;
  let width = origin.width;
  let height = origin.height;

  if (handle.includes("e")) {
    width = Math.max(minSize, origin.width + deltaX);
  }

  if (handle.includes("s")) {
    height = Math.max(minSize, origin.height + deltaY);
  }

  if (handle.includes("w")) {
    width = Math.max(minSize, origin.width - deltaX);
    x = origin.x + origin.width - width;
  }

  if (handle.includes("n")) {
    height = Math.max(minSize, origin.height - deltaY);
    y = origin.y + origin.height - height;
  }

  if (preserveAspectRatio && origin.width > 0 && origin.height > 0) {
    const aspectRatio = origin.width / origin.height;
    const affectsWidth = handle.includes("e") || handle.includes("w");
    const affectsHeight = handle.includes("n") || handle.includes("s");

    if (affectsWidth && affectsHeight) {
      if (width / aspectRatio > height) {
        height = width / aspectRatio;
      } else {
        width = height * aspectRatio;
      }
    }

    if (affectsWidth && !affectsHeight) {
      height = width / aspectRatio;
      y = origin.y + (origin.height - height) / 2;
    }

    if (!affectsWidth && affectsHeight) {
      width = height * aspectRatio;
      x = origin.x + (origin.width - width) / 2;
    }

    width = Math.max(minSize, width);
    height = Math.max(minSize, height);

    if (handle.includes("w")) {
      x = origin.x + origin.width - width;
    }

    if (handle.includes("n")) {
      y = origin.y + origin.height - height;
    }
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

function getDrawPatch(
  layer: DesignLayer,
  start: Point,
  point: Point,
  square: boolean,
): Partial<DesignLayer> {
  const minSize = layer.type === "text" ? 24 : 12;
  let deltaX = point.x - start.x;
  let deltaY = point.y - start.y;

  if (square) {
    const size = Math.max(Math.abs(deltaX), Math.abs(deltaY));
    deltaX = deltaX < 0 ? -size : size;
    deltaY = deltaY < 0 ? -size : size;
  }

  const width = Math.max(minSize, Math.abs(deltaX));
  const height = Math.max(minSize, Math.abs(deltaY));

  return {
    x: Math.round(deltaX < 0 ? start.x - width : start.x),
    y: Math.round(deltaY < 0 ? start.y - height : start.y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

function getSelectionResizePatches({
  origins,
  bounds,
  start,
  point,
  handle,
  preserveAspectRatio,
  page,
}: {
  origins: LayerDragOrigin[];
  bounds: CanvasRect;
  start: Point;
  point: Point;
  handle: ResizeHandle;
  preserveAspectRatio: boolean;
  page: DesignPage;
}): LayerPatch[] {
  const resizedBounds = snapLayerPatchToGrid(
    getResizePatch(bounds, start, point, handle, preserveAspectRatio),
    page,
  );
  const nextBounds = {
    x: resizedBounds.x ?? bounds.x,
    y: resizedBounds.y ?? bounds.y,
    width: resizedBounds.width ?? bounds.width,
    height: resizedBounds.height ?? bounds.height,
  };
  const scaleX = nextBounds.width / bounds.width;
  const scaleY = nextBounds.height / bounds.height;

  return origins.map((origin) => ({
    layerId: origin.layerId,
    patch: {
      x: Math.round(nextBounds.x + (origin.x - bounds.x) * scaleX),
      y: Math.round(nextBounds.y + (origin.y - bounds.y) * scaleY),
      width: Math.max(1, Math.round(origin.width * scaleX)),
      height: Math.max(1, Math.round(origin.height * scaleY)),
    },
  }));
}

function getSelectionRotatePatches(
  origins: SelectionTransformOrigin[],
  center: Point,
  rotation: number,
): LayerPatch[] {
  return origins.map((origin) => {
    const originCenter = {
      x: origin.x + origin.width / 2,
      y: origin.y + origin.height / 2,
    };
    const rotatedCenter = rotatePoint(originCenter, center, rotation);

    return {
      layerId: origin.layerId,
      patch: {
        x: Math.round(rotatedCenter.x - origin.width / 2),
        y: Math.round(rotatedCenter.y - origin.height / 2),
        rotation: Math.round(origin.rotation + rotation),
      },
    };
  });
}

function rotatePoint(point: Point, center: Point, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const deltaX = point.x - center.x;
  const deltaY = point.y - center.y;

  return {
    x: center.x + deltaX * cos - deltaY * sin,
    y: center.y + deltaX * sin + deltaY * cos,
  };
}

function getPageGrid(page: DesignPage) {
  return {
    visible: page.grid?.visible ?? true,
    snap: page.grid?.snap ?? false,
    objectSnap: page.grid?.objectSnap ?? true,
    size: Math.max(4, page.grid?.size ?? 24),
  };
}

function getGridSnappedPoint(point: Point, page: DesignPage) {
  const grid = getPageGrid(page);

  if (!grid.snap) {
    return point;
  }

  return {
    x: snapToGrid(point.x, grid.size),
    y: snapToGrid(point.y, grid.size),
  };
}

function getNextVectorPointSelection(
  current: VectorPointSelection | null,
  layerId: string,
  pointId: string,
  additive: boolean,
): VectorPointSelection {
  if (!additive || current?.layerId !== layerId) {
    return { layerId, pointIds: [pointId], primaryPointId: pointId };
  }

  const pointIds = current.pointIds.includes(pointId)
    ? current.pointIds.filter((id) => id !== pointId)
    : [...current.pointIds, pointId];
  const nextPointIds = pointIds.length > 0 ? pointIds : [pointId];

  return {
    layerId,
    pointIds: nextPointIds,
    primaryPointId: nextPointIds.includes(pointId)
      ? pointId
      : nextPointIds[nextPointIds.length - 1],
  };
}

function getReconciledVectorPointSelection(
  selection: VectorPointSelection | null,
  layers: DesignLayer[],
  selectedLayerIds: string[],
): VectorPointSelection | null {
  if (!selection || !selectedLayerIds.includes(selection.layerId)) {
    return null;
  }

  const layer = layers.find((item) => item.id === selection.layerId);
  const existingPointIds = new Set(
    layer?.type === "path"
      ? getVectorPathCanvasPoints(layer).map((point) => point.id)
      : [],
  );
  const pointIds = selection.pointIds.filter((pointId) =>
    existingPointIds.has(pointId),
  );

  if (pointIds.length === 0) {
    return null;
  }

  return {
    layerId: selection.layerId,
    pointIds,
    primaryPointId: existingPointIds.has(selection.primaryPointId)
      ? selection.primaryPointId
      : pointIds[pointIds.length - 1],
  };
}

function getVectorPathPointOrigins(layer: DesignLayer, pointIds: string[]) {
  const pointIdSet = new Set(pointIds);

  return getVectorPathCanvasPoints(layer)
    .filter((point) => pointIdSet.has(point.id))
    .map((point) => ({
      pointId: point.id,
      point: {
        x: layer.x + point.localX,
        y: layer.y + point.localY,
      },
    }));
}

function createExtendedPenPathPatch(
  layer: DesignLayer,
  canvasPoint: Point,
): Partial<DesignLayer> | null {
  if (layer.type !== "path") {
    return null;
  }

  const existingPoints = getVectorPathCanvasPoints(layer)
    .filter((point) => point.kind === "anchor")
    .sort(
      (left, right) =>
        getVectorPointSegmentIndex(left.id) - getVectorPointSegmentIndex(right.id),
    )
    .map((point) => ({
      x: layer.x + point.localX,
      y: layer.y + point.localY,
    }));
  const previousPoint = existingPoints[existingPoints.length - 1];

  if (previousPoint && getPointDistance(previousPoint, canvasPoint) < 1) {
    return null;
  }

  return createPolylinePathPatch([...existingPoints, canvasPoint]);
}

function createPolylinePathPatch(points: Point[]): Partial<DesignLayer> | null {
  const finitePoints = points.filter(
    (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
  );

  if (finitePoints.length === 0) {
    return null;
  }

  const left = Math.min(...finitePoints.map((point) => point.x));
  const top = Math.min(...finitePoints.map((point) => point.y));
  const right = Math.max(...finitePoints.map((point) => point.x));
  const bottom = Math.max(...finitePoints.map((point) => point.y));
  const width = Math.max(1, right - left);
  const height = Math.max(1, bottom - top);
  const pathData = finitePoints
    .map((point, index) =>
      [
        index === 0 ? "M" : "L",
        formatCanvasPathNumber(point.x - left),
        formatCanvasPathNumber(point.y - top),
      ].join(" "),
    )
    .join(" ");

  return {
    x: roundCanvasValue(left),
    y: roundCanvasValue(top),
    width: roundCanvasValue(width),
    height: roundCanvasValue(height),
    pathData,
    pathViewBox: {
      x: 0,
      y: 0,
      width: roundCanvasValue(width),
      height: roundCanvasValue(height),
    },
    strokeLineCap: "round",
    strokeLineJoin: "round",
  };
}

function createVectorPathPointMovePatch(
  layer: DesignLayer,
  pointIds: string[],
  movement: Point,
  origins = getVectorPathPointOrigins(layer, pointIds),
) {
  if (layer.type !== "path" || origins.length === 0) {
    return null;
  }

  const pointIdSet = new Set(pointIds);
  let workingLayer = layer;
  let pathData: string | undefined;

  for (const origin of origins) {
    if (!pointIdSet.has(origin.pointId)) {
      continue;
    }

    const patch = createVectorPathPointPatch(workingLayer, origin.pointId, {
      x: origin.point.x + movement.x,
      y: origin.point.y + movement.y,
    });

    if (patch?.pathData) {
      workingLayer = { ...workingLayer, ...patch };
      pathData = patch.pathData;
    }
  }

  return pathData ? { pathData } : null;
}

function compareVectorPointIdsDescending(first: string, second: string) {
  return getVectorPointSegmentIndex(second) - getVectorPointSegmentIndex(first);
}

function getVectorPointSegmentIndex(pointId: string) {
  return Number.parseInt(pointId.split(":")[0] ?? "0", 10) || 0;
}

function getCanvasCursorClass(
  tool: EditorTool,
  activeDragMode: DragState["mode"] | null,
) {
  if (activeDragMode) {
    return getActiveDragCursorClass(activeDragMode);
  }

  if (tool === "hand") {
    return "cursor-grab";
  }

  if (tool === "text") {
    return "cursor-text";
  }

  if (tool === "select") {
    return "cursor-default";
  }

  if (tool === "comment") {
    return "cursor-copy";
  }

  return "cursor-crosshair";
}

function getActiveDragCursorClass(mode: DragState["mode"]) {
  if (
    mode === "pan" ||
    mode === "layer" ||
    mode === "comment" ||
    mode === "path-node" ||
    mode === "selection-rotate" ||
    mode === "rotate" ||
    mode === "guide"
  ) {
    return "cursor-grabbing";
  }

  if (mode === "resize" || mode === "selection-resize") {
    return "cursor-nwse-resize";
  }

  return "cursor-crosshair";
}

function getLayerCursorClass(layer: DesignLayer, tool: EditorTool) {
  if (layer.locked) {
    return "cursor-not-allowed";
  }

  if (tool === "select") {
    return "cursor-default";
  }

  if (tool === "hand") {
    return "cursor-grab";
  }

  if (tool === "text") {
    return "cursor-text";
  }

  if (tool === "comment") {
    return "cursor-copy";
  }

  return "cursor-crosshair";
}

function roundCanvasValue(value: number) {
  return Number(value.toFixed(3));
}

function formatCanvasPathNumber(value: number) {
  return roundCanvasValue(value).toString();
}

function getVectorNodeNudgeDistance(page: DesignPage, shiftKey: boolean) {
  const grid = getPageGrid(page);

  if (grid.snap) {
    return grid.size * (shiftKey ? 10 : 1);
  }

  return shiftKey ? 10 : 1;
}

function getArrowMovement(key: string, distance: number) {
  if (key === "ArrowUp") {
    return { x: 0, y: -distance };
  }

  if (key === "ArrowDown") {
    return { x: 0, y: distance };
  }

  if (key === "ArrowLeft") {
    return { x: -distance, y: 0 };
  }

  if (key === "ArrowRight") {
    return { x: distance, y: 0 };
  }

  return null;
}

function snapLayerDeltaToGrid(
  origins: LayerDragOrigin[],
  deltaX: number,
  deltaY: number,
  page: DesignPage,
) {
  const grid = getPageGrid(page);

  if (!grid.snap || origins.length === 0) {
    return { deltaX, deltaY };
  }

  const left = Math.min(...origins.map((origin) => origin.x + deltaX));
  const top = Math.min(...origins.map((origin) => origin.y + deltaY));

  return {
    deltaX: deltaX + snapToGrid(left, grid.size) - left,
    deltaY: deltaY + snapToGrid(top, grid.size) - top,
  };
}

function snapLayerPatchToGrid(
  patch: Partial<DesignLayer>,
  page: DesignPage,
): Partial<DesignLayer> {
  const grid = getPageGrid(page);

  if (!grid.snap) {
    return patch;
  }

  return {
    ...patch,
    x:
      typeof patch.x === "number" ? snapToGrid(patch.x, grid.size) : patch.x,
    y:
      typeof patch.y === "number" ? snapToGrid(patch.y, grid.size) : patch.y,
    width:
      typeof patch.width === "number"
        ? Math.max(1, snapToGrid(patch.width, grid.size))
        : patch.width,
    height:
      typeof patch.height === "number"
        ? Math.max(1, snapToGrid(patch.height, grid.size))
        : patch.height,
  };
}

function snapToGrid(value: number, gridSize: number) {
  return Math.round(value / gridSize) * gridSize;
}

function hasMeaningfulDrag(start: Point, point: Point) {
  return Math.abs(point.x - start.x) > 4 || Math.abs(point.y - start.y) > 4;
}

function getPointDistance(first: Point, second: Point) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function getNormalizedWheelDelta(event: WheelEvent) {
  const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;

  return {
    x: event.deltaX * scale,
    y: event.deltaY * scale,
  };
}

function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

function getAngle(
  center: Point,
  point: Point,
) {
  return (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI;
}

function toCanvasRect(start: Point, end: Point): CanvasRect {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

function getLayerRect(layer: DesignLayer): CanvasRect {
  return {
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
  };
}

function getSelectionBounds(
  layers: DesignLayer[],
  selectedLayerIds: string[],
): CanvasRect | null {
  if (selectedLayerIds.length < 2) {
    return null;
  }

  const selectedIds = new Set(selectedLayerIds);
  const selectedLayers = layers.filter(
    (layer) => layer.visible && selectedIds.has(layer.id),
  );

  if (selectedLayers.length < 2) {
    return null;
  }

  const left = Math.min(...selectedLayers.map((layer) => layer.x));
  const top = Math.min(...selectedLayers.map((layer) => layer.y));
  const right = Math.max(
    ...selectedLayers.map((layer) => layer.x + layer.width),
  );
  const bottom = Math.max(
    ...selectedLayers.map((layer) => layer.y + layer.height),
  );

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function getOriginBounds(origins: LayerDragOrigin[]): CanvasRect {
  const left = Math.min(...origins.map((origin) => origin.x));
  const top = Math.min(...origins.map((origin) => origin.y));
  const right = Math.max(
    ...origins.map((origin) => origin.x + origin.width),
  );
  const bottom = Math.max(
    ...origins.map((origin) => origin.y + origin.height),
  );

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function rectsIntersect(first: CanvasRect, second: CanvasRect) {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

function hasMediaFiles(files: FileList) {
  return Array.from(files).some(isMediaFile);
}

function isMediaFile(file: File) {
  const kind = detectImportKind(file);
  return kind === "image" || kind === "video";
}

function isVideoMediaLayer(layer: DesignLayer) {
  return (
    layer.type === "image" &&
    (layer.assetMetadata?.mimeType?.startsWith("video/") ||
      layer.imageSrc?.startsWith("data:video/"))
  );
}

function findGuideNearPosition(
  guides: DesignGuide[],
  orientation: DesignGuide["orientation"],
  position: number,
  threshold: number,
) {
  return (
    guides
      .filter((guide) => guide.orientation === orientation)
      .map((guide) => ({
        guide,
        distance: Math.abs(guide.position - position),
      }))
      .filter((entry) => entry.distance <= threshold)
      .sort((first, second) => first.distance - second.distance)[0]?.guide ??
    null
  );
}

function isCanvasSurfaceTarget(target: EventTarget, stage: EventTarget) {
  if (target === stage) {
    return true;
  }

  return (
    target instanceof HTMLElement && target.dataset.canvasSurface === "true"
  );
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']"),
  );
}

function isTextLayer(layer: DesignLayer) {
  return layer.type === "text" || layer.type === "sticky";
}

function getPathViewBox(layer: DesignLayer) {
  const box = layer.pathViewBox ?? {
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
  };

  return [
    box.x,
    box.y,
    Math.max(1, box.width),
    Math.max(1, box.height),
  ].join(" ");
}

function getStrokeDashArray(layer: DesignLayer) {
  const dash = layer.strokeDash?.trim();

  return dash ? dash : undefined;
}

function getLayerMaskClipPath(layer: DesignLayer) {
  const mask = layer.mask;

  if (!mask) {
    return undefined;
  }

  if (mask.kind === "ellipse") {
    return `ellipse(${round(mask.width / 2)}px ${round(mask.height / 2)}px at ${round(mask.x + mask.width / 2)}px ${round(mask.y + mask.height / 2)}px)`;
  }

  if (mask.kind === "path" && mask.pathData) {
    return `path("${mask.pathData.replace(/"/g, "'")}")`;
  }

  const right = layer.width - mask.x - mask.width;
  const bottom = layer.height - mask.y - mask.height;
  const radius = mask.cornerRadius ?? 0;

  return `inset(${round(mask.y)}px ${round(right)}px ${round(bottom)}px ${round(mask.x)}px round ${round(radius)}px)`;
}

function getPrototypeTargetName(layer: DesignLayer, pages: DesignPage[]) {
  if (!layer.prototype?.targetPageId) {
    return undefined;
  }

  return (
    pages.find((page) => page.id === layer.prototype?.targetPageId)?.name ??
    "Unknown page"
  );
}

function getPrototypeTriggerLabel(
  trigger: NonNullable<DesignLayer["prototype"]>["trigger"] | undefined,
) {
  if (trigger === "hover") {
    return "Hover";
  }

  if (trigger === "drag") {
    return "Drag";
  }

  if (trigger === "delay") {
    return "Delay";
  }

  return "Click";
}

function getLayerBoxShadow(layer: DesignLayer) {
  if (!areLayerEffectsVisible(layer) || !layer.shadowEnabled) {
    return undefined;
  }

  return [
    `${layer.shadowX ?? 0}px`,
    `${layer.shadowY ?? 12}px`,
    `${layer.shadowBlur ?? 24}px`,
    `${layer.shadowSpread ?? 0}px`,
    layer.shadowColor ?? "rgb(0 0 0 / 0.24)",
  ].join(" ");
}

function getLayerFilter(layer: DesignLayer) {
  if (!areLayerEffectsVisible(layer)) {
    return undefined;
  }

  const blur = Math.max(0, layer.layerBlur ?? 0);

  return blur > 0 ? `blur(${blur}px)` : undefined;
}

function getLayerBackdropFilter(layer: DesignLayer) {
  if (!areLayerEffectsVisible(layer)) {
    return undefined;
  }

  const blur = Math.max(0, layer.backgroundBlur ?? 0);

  return blur > 0 ? `blur(${blur}px)` : undefined;
}

function areLayerEffectsVisible(layer: DesignLayer) {
  return layer.effectsVisible ?? true;
}

function round(value: number) {
  return Number(value.toFixed(2));
}

function getLayerGroupSelection(layer: DesignLayer, layers: DesignLayer[]) {
  if (!layer.groupId) {
    return [layer.id];
  }

  const groupLayerIds = layers
    .filter((item) => item.groupId === layer.groupId)
    .map((item) => item.id);

  return groupLayerIds.length > 0 ? groupLayerIds : [layer.id];
}
