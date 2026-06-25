"use client"

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react"
import { AlertTriangle, MessageSquare, MousePointer2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { authClient } from "@/lib/auth-client"

import { CanvasRulerOverlay } from "./canvas-ruler-overlay"
import { CanvasTextEditor } from "./canvas-text-editor"
import { SlideMasterOverlay } from "./slide-master-overlay"
import { SlideElementContent } from "./slide-element-content"
import {
  elementAnimationClass,
  elementAnimationDelay,
  elementAnimationDuration,
  elementAnimationMotionX,
  elementAnimationMotionY,
} from "../animation-effects"
import {
  isElementEditable,
  isElementLocked,
  visibleElements,
} from "../element-visibility"
import { expandSelectionToGroups } from "../element-groups"
import { readImageFileAsDataUrl } from "../image-files"
import { fontFamilyStyle } from "../font-pairs"
import { presentationElementLabel } from "../element-labels"
import { usePresentationStore } from "../use-presentation-store"
import type { PresentationElement } from "../types"
import { transitionAnimationClass } from "../transition-effects"
import {
  elementEffectiveFontSize,
  elementLineHeight,
  elementTextAlign,
  textOverflowStatus,
} from "../text-formatting"
import {
  canvasElementContainmentStyle,
  canvasRenderBudget,
  shouldCheckTextOverflow,
} from "../canvas-render-budget"
import {
  connectorPointPatchFromPosition,
  isConnectorShapeKind,
  isRoutableShapeKind,
  shapeConnectorGeometry,
  type ShapeConnectorPointHandle,
} from "../shape-geometry"
import {
  createCloudDeckCollaborationEvent,
  listCloudDeckCollaborationEvents,
  type CloudDeckCollaborationEvent,
} from "../cloud-api"
import { recentCollaborationCursors } from "../collaboration-cursors"
import {
  recentCollaborationSelections,
  type CollaborationSelection,
} from "../collaboration-selections"
import {
  collaborationMutationApplySummary,
  collaborationMutationSkipDetails,
  collaborationMutationSkipReasonLabel,
  type CollaborationMutationSkipDetail,
} from "../collaboration-mutation-reconciliation"
import {
  collaborationMutationPayloadFromElements,
  recentCollaborationMutations,
  type CollaborationObjectMutation,
} from "../collaboration-mutations"
import {
  elementBounds,
  elementIdsInRect,
  moveElementPatches,
  resizeElementPatches,
  rotateElementPatches,
  type ElementPatch,
  type ElementBounds,
  type ResizeHandle,
  type SelectionRect,
  type SnapGuides,
} from "../selection-commands"

type DragState = {
  mode: "connector-point" | "move" | "resize" | "resize-selection" | "rotate"
  startX: number
  startY: number
  elements: PresentationElement[]
  referenceElements: PresentationElement[]
  connectorPointHandle?: ShapeConnectorPointHandle
  resizeHandle?: ResizeHandle
  selectionBounds?: ElementBounds
  rotationCenter?: { x: number; y: number }
  rotationAspectRatio?: number
  startAngle?: number
  startRotation?: number
}

type RemoteMutationNotice = {
  skipped: CollaborationMutationSkipDetail[]
  slideId: string
  summary: string
}

const RESIZE_HANDLES: Array<{
  handle: ResizeHandle
  className: string
}> = [
  {
    handle: "top-left",
    className:
      "top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
  },
  {
    handle: "top",
    className:
      "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize",
  },
  {
    handle: "top-right",
    className:
      "top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
  },
  {
    handle: "right",
    className:
      "top-1/2 right-0 translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
  },
  {
    handle: "bottom-right",
    className:
      "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
  },
  {
    handle: "bottom",
    className:
      "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize",
  },
  {
    handle: "bottom-left",
    className:
      "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
  },
  {
    handle: "left",
    className:
      "top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
  },
]

const CURSOR_EVENT_LIMIT = 80
const CURSOR_EVENT_POLL_MS = 3_000
const CURSOR_EVENT_PUBLISH_MS = 1_200
const MUTATION_EVENT_PUBLISH_MS = 350
const CANVAS_SHORTCUT_HELP_ID = "presentation-canvas-shortcut-help"

type MarqueeState = SelectionRect & {
  active: boolean
}

type TextEditState = {
  elementId: string
  originalContent: string
}

function percentDelta(delta: number, size: number) {
  return (delta / size) * 100
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function angleFromPoint(center: { x: number; y: number }, x: number, y: number) {
  return (Math.atan2(y - center.y, x - center.x) * 180) / Math.PI
}

function normalizeRotation(value: number) {
  return Math.round((((value % 360) + 360) % 360) * 10) / 10
}

function snapRotation(value: number, snap: boolean) {
  return snap ? Math.round(value / 15) * 15 : value
}

function resizeHandleLabel(handle: ResizeHandle, target: string) {
  return `Resize ${target} from ${handle.replace("-", " ")}`
}

function rotationReadout(rotation: number | undefined) {
  return `${normalizeRotation(rotation ?? 0)} deg`
}

function mergeCollaborationEvents(
  currentEvents: CloudDeckCollaborationEvent[],
  nextEvents: CloudDeckCollaborationEvent[],
) {
  return [...currentEvents, ...nextEvents]
    .filter(
      (event, index, all) =>
        all.findIndex((item) => item.id === event.id) === index,
    )
    .slice(-CURSOR_EVENT_LIMIT)
}

function cursorRoleClasses(role: CloudDeckCollaborationEvent["role"]) {
  if (role === "owner") {
    return {
      icon: "fill-emerald-500 text-emerald-700",
      label: "bg-emerald-600 text-white",
      outline: "border-emerald-500 ring-emerald-500/20",
    }
  }

  if (role === "viewer") {
    return {
      icon: "fill-violet-500 text-violet-700",
      label: "bg-violet-600 text-white",
      outline: "border-violet-500 ring-violet-500/20",
    }
  }

  return {
    icon: "fill-sky-500 text-sky-700",
    label: "bg-sky-600 text-white",
    outline: "border-sky-500 ring-sky-500/20",
  }
}

export function SlideCanvas() {
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [marqueeState, setMarqueeState] = useState<MarqueeState | null>(null)
  const [snapGuides, setSnapGuides] = useState<SnapGuides>({})
  const [textEditState, setTextEditState] = useState<TextEditState | null>(null)
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null)
  const [collaborationEvents, setCollaborationEvents] = useState<
    CloudDeckCollaborationEvent[]
  >([])
  const [resolvedRemoteMutationIds, setResolvedRemoteMutationIds] = useState<
    string[]
  >([])
  const [remoteMutationNotice, setRemoteMutationNotice] =
    useState<RemoteMutationNotice | null>(null)
  const { data: session } = authClient.useSession()
  const userId = session?.user?.id
  const lastCollaborationEventAtRef = useRef<string | null>(null)
  const lastCursorPublishAtRef = useRef(0)
  const lastMutationPublishAtRef = useRef(0)
  const deck = usePresentationStore((state) => state.deck)
  const selectedSlideId = usePresentationStore((state) => state.selectedSlideId)
  const selectedElementId = usePresentationStore(
    (state) => state.selectedElementId,
  )
  const selectedElementIds = usePresentationStore(
    (state) => state.selectedElementIds,
  )
  const selectSlide = usePresentationStore((state) => state.selectSlide)
  const selectElement = usePresentationStore((state) => state.selectElement)
  const selectElements = usePresentationStore((state) => state.selectElements)
  const addSlide = usePresentationStore((state) => state.addSlide)
  const copySelectedSlide = usePresentationStore(
    (state) => state.copySelectedSlide,
  )
  const cutSelectedSlide = usePresentationStore(
    (state) => state.cutSelectedSlide,
  )
  const pasteCopiedSlides = usePresentationStore(
    (state) => state.pasteCopiedSlides,
  )
  const duplicateSlide = usePresentationStore((state) => state.duplicateSlide)
  const moveSlide = usePresentationStore((state) => state.moveSlide)
  const addImageElement = usePresentationStore((state) => state.addImageElement)
  const addTextElement = usePresentationStore((state) => state.addTextElement)
  const updateElementLive = usePresentationStore(
    (state) => state.updateElementLive,
  )
  const updateElementsLive = usePresentationStore(
    (state) => state.updateElementsLive,
  )
  const applyRemoteObjectMutation = usePresentationStore(
    (state) => state.applyRemoteObjectMutation,
  )
  const nudgeSelectedElements = usePresentationStore(
    (state) => state.nudgeSelectedElements,
  )
  const duplicateSelectedElements = usePresentationStore(
    (state) => state.duplicateSelectedElements,
  )
  const copySelectedElements = usePresentationStore(
    (state) => state.copySelectedElements,
  )
  const cutSelectedElements = usePresentationStore(
    (state) => state.cutSelectedElements,
  )
  const copiedElements = usePresentationStore((state) => state.copiedElements)
  const copiedSlides = usePresentationStore((state) => state.copiedSlides)
  const pasteCopiedElements = usePresentationStore(
    (state) => state.pasteCopiedElements,
  )
  const copySelectedElementStyle = usePresentationStore(
    (state) => state.copySelectedElementStyle,
  )
  const pasteCopiedElementStyle = usePresentationStore(
    (state) => state.pasteCopiedElementStyle,
  )
  const copiedElementStyle = usePresentationStore(
    (state) => state.copiedElementStyle,
  )
  const moveSelectedElementLayer = usePresentationStore(
    (state) => state.moveSelectedElementLayer,
  )
  const groupSelectedElements = usePresentationStore(
    (state) => state.groupSelectedElements,
  )
  const ungroupSelectedElements = usePresentationStore(
    (state) => state.ungroupSelectedElements,
  )
  const deleteElement = usePresentationStore((state) => state.deleteElement)
  const undo = usePresentationStore((state) => state.undo)
  const redo = usePresentationStore((state) => state.redo)
  const captureHistory = usePresentationStore((state) => state.captureHistory)
  const zoom = usePresentationStore((state) => state.zoom)
  const setZoom = usePresentationStore((state) => state.setZoom)
  const showGrid = usePresentationStore((state) => state.showGrid)
  const showRulers = usePresentationStore((state) => state.showRulers)
  const transitionPreviewKey = usePresentationStore(
    (state) => state.transitionPreviewKey,
  )
  const objectAnimationPreviewElementId = usePresentationStore(
    (state) => state.objectAnimationPreviewElementId,
  )
  const objectAnimationPreviewKey = usePresentationStore(
    (state) => state.objectAnimationPreviewKey,
  )
  const slide = deck.slides.find((item) => item.id === selectedSlideId)

  useEffect(() => {
    if (
      textEditState &&
      !slide?.elements.some((element) => element.id === textEditState.elementId)
    ) {
      setTextEditState(null)
    }
  }, [slide?.elements, textEditState])

  useEffect(() => {
    if (
      hoveredElementId &&
      !slide?.elements.some((element) => element.id === hoveredElementId)
    ) {
      setHoveredElementId(null)
    }
  }, [hoveredElementId, slide?.elements])

  useEffect(() => {
    if (!userId) {
      setCollaborationEvents([])
      lastCollaborationEventAtRef.current = null
      return
    }

    let cancelled = false

    async function loadCollaborationEvents() {
      try {
        const nextEvents = await listCloudDeckCollaborationEvents(
          deck.id,
          lastCollaborationEventAtRef.current ?? undefined,
        )
        if (cancelled || !nextEvents.length) return

        lastCollaborationEventAtRef.current =
          nextEvents.at(-1)?.createdAt ?? lastCollaborationEventAtRef.current
        setCollaborationEvents((events) =>
          mergeCollaborationEvents(events, nextEvents),
        )
      } catch {
        if (!cancelled) {
          lastCollaborationEventAtRef.current = null
        }
      }
    }

    void loadCollaborationEvents()
    const interval = window.setInterval(
      () => void loadCollaborationEvents(),
      CURSOR_EVENT_POLL_MS,
    )

    return () => {
      cancelled = true
      window.clearInterval(interval)
      lastCollaborationEventAtRef.current = null
    }
  }, [deck.id, userId])

  if (!slide) {
    return null
  }
  const activeSlide = slide
  const activeSlideIndex = deck.slides.findIndex(
    (item) => item.id === activeSlide.id,
  )
  const slideNumber = activeSlideIndex + 1

  function selectSlideAtIndex(index: number) {
    const slideAtIndex = deck.slides[clamp(index, 0, deck.slides.length - 1)]
    if (slideAtIndex && slideAtIndex.id !== activeSlide.id) {
      selectSlide(slideAtIndex.id)
    }
  }

  function selectRelativeElement(direction: -1 | 1) {
    const editableElements = visibleElements(activeSlide).filter(isElementEditable)
    if (!editableElements.length) return

    const selectedId = selectedElementIds.at(-1) ?? selectedElementId
    const selectedIndex = editableElements.findIndex(
      (element) => element.id === selectedId,
    )
    const fallbackIndex = direction === 1 ? 0 : editableElements.length - 1
    const nextIndex =
      selectedIndex === -1
        ? fallbackIndex
        : (selectedIndex + direction + editableElements.length) %
          editableElements.length

    selectElement(editableElements[nextIndex].id)
  }

  function addPlainTextElement(
    text: string,
    position?: { x: number; y: number },
  ) {
    const content = text.trim()
    if (!content) return false

    const lineCount = content.split(/\r?\n/).length
    const width = 48
    const height = clamp(10 + lineCount * 4, 12, 42)
    addTextElement({
      content,
      fontSize: lineCount > 3 ? 20 : 24,
      width,
      height,
      ...(position ? centeredInsertPosition(position, width, height) : {}),
    })

    return true
  }

  function isTextElement(element: PresentationElement) {
    return element.type === "title" || element.type === "text"
  }

  function usesTextBoxLayout(element: PresentationElement) {
    return isTextElement(element)
  }

  function startTextEditing(element: PresentationElement) {
    if (!isTextElement(element) || isElementLocked(element)) return

    captureHistory()
    publishEditIntent("text", [element.id])
    selectElement(element.id)
    setDragState(null)
    setMarqueeState(null)
    setSnapGuides({})
    setTextEditState({
      elementId: element.id,
      originalContent: element.content,
    })
  }

  function commitTextEditing() {
    setTextEditState(null)
  }

  function cancelTextEditing() {
    if (textEditState) {
      updateElementLive(textEditState.elementId, {
        content: textEditState.originalContent,
      })
    }

    setTextEditState(null)
  }

  function clientPointToPercent(clientX: number, clientY: number) {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }

    return {
      x: clamp(percentDelta(clientX - rect.left, rect.width), 0, 100),
      y: clamp(percentDelta(clientY - rect.top, rect.height), 0, 100),
    }
  }

  function pointToPercent(event: PointerEvent<HTMLDivElement>) {
    return clientPointToPercent(event.clientX, event.clientY)
  }

  function maybePublishCursorEvent(event: PointerEvent<HTMLDivElement>) {
    if (!userId || !selectedSlideId) return

    const now = Date.now()
    if (now - lastCursorPublishAtRef.current < CURSOR_EVENT_PUBLISH_MS) {
      return
    }

    const point = pointToPercent(event)
    lastCursorPublishAtRef.current = now
    void createCloudDeckCollaborationEvent(deck.id, {
      clientEventId: `cursor:${now}:${Math.round(point.x * 10)}:${Math.round(
        point.y * 10,
      )}`,
      payload: {
        slideId: selectedSlideId,
        x: Math.round(point.x * 10) / 10,
        y: Math.round(point.y * 10) / 10,
      },
      type: "cursor",
    }).catch(() => undefined)
  }

  function publishEditIntent(action: string, elementIds: string[]) {
    if (!userId || !selectedSlideId || !elementIds.length) return

    const uniqueElementIds = Array.from(new Set(elementIds)).slice(0, 50)
    const safeAction = action.replace(/[^a-z-]/gi, "").slice(0, 24) || "edit"

    void createCloudDeckCollaborationEvent(deck.id, {
      clientEventId: `intent:${Date.now()}:${safeAction}`,
      payload: {
        action: safeAction,
        elementIds: uniqueElementIds,
        slideId: selectedSlideId,
      },
      type: "edit-intent",
    }).catch(() => undefined)
  }

  function applyPatchesToElements(
    elements: PresentationElement[],
    patches: ElementPatch[],
  ) {
    const patchesById = new Map(patches.map((patch) => [patch.id, patch.patch]))

    return elements.map((element) => {
      const patch = patchesById.get(element.id)
      return patch ? { ...element, ...patch } : element
    })
  }

  function publishObjectMutation(
    action: string,
    elements: PresentationElement[],
  ) {
    if (!userId || !selectedSlideId || !elements.length) return

    const now = Date.now()
    if (now - lastMutationPublishAtRef.current < MUTATION_EVENT_PUBLISH_MS) {
      return
    }

    const payload = collaborationMutationPayloadFromElements({
      action,
      elements,
      slideId: selectedSlideId,
    })

    if (!payload) return

    lastMutationPublishAtRef.current = now
    void createCloudDeckCollaborationEvent(deck.id, {
      clientEventId: `mutation:${now}:${action}:${elements.length}`,
      payload,
      type: "object-mutation",
    }).catch(() => undefined)
  }

  function centeredInsertPosition(
    point: { x: number; y: number },
    width: number,
    height: number,
  ) {
    return {
      x: clamp(point.x - width / 2, 0, 100 - width),
      y: clamp(point.y - height / 2, 0, 100 - height),
    }
  }

  function startMarquee(event: PointerEvent<HTMLDivElement>) {
    if (textEditState) return
    if (event.target !== event.currentTarget) return

    setHoveredElementId(null)
    event.currentTarget.setPointerCapture(event.pointerId)
    const point = pointToPercent(event)
    setMarqueeState({
      left: point.x,
      top: point.y,
      right: point.x,
      bottom: point.y,
      active: false,
    })
  }

  function moveElement(event: PointerEvent<HTMLDivElement>) {
    if (!dragState || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const dx = percentDelta(event.clientX - dragState.startX, rect.width)
    const dy = percentDelta(event.clientY - dragState.startY, rect.height)

    if (dragState.mode === "connector-point") {
      const element = dragState.elements[0]
      if (!element || !dragState.connectorPointHandle) return

      const patch = connectorPointPatchFromPosition(
        element,
        dragState.connectorPointHandle,
        clientPointToPercent(event.clientX, event.clientY),
      )

      updateElementLive(element.id, patch)
      publishObjectMutation("resize", [{ ...element, ...patch }])
      setSnapGuides({})
      return
    }

    if (dragState.mode === "resize-selection") {
      if (!dragState.selectionBounds) return

      const patches = resizeElementPatches(
        dragState.elements,
        dragState.selectionBounds,
        dx,
        dy,
        dragState.resizeHandle,
      )
      updateElementsLive(patches)
      publishObjectMutation(
        "resize",
        applyPatchesToElements(dragState.elements, patches),
      )
      return
    }

    if (dragState.mode === "rotate") {
      if (
        dragState.elements.length > 1 &&
        dragState.rotationCenter &&
        dragState.selectionBounds &&
        dragState.rotationAspectRatio &&
        dragState.startAngle !== undefined
      ) {
        const currentAngle = angleFromPoint(
          dragState.rotationCenter,
          event.clientX,
          event.clientY,
        )
        const deltaRotation = snapRotation(
          currentAngle - dragState.startAngle,
          event.shiftKey,
        )

        const patches = rotateElementPatches(
          dragState.elements,
          dragState.selectionBounds,
          deltaRotation,
          dragState.rotationAspectRatio,
        )
        updateElementsLive(patches)
        publishObjectMutation(
          "rotate",
          applyPatchesToElements(dragState.elements, patches),
        )
        return
      }

      const element = dragState.elements[0]
      if (
        !element ||
        !dragState.rotationCenter ||
        dragState.startAngle === undefined ||
        dragState.startRotation === undefined
      ) {
        return
      }

      const currentAngle = angleFromPoint(
        dragState.rotationCenter,
        event.clientX,
        event.clientY,
      )
      const nextRotation = normalizeRotation(
        snapRotation(
          dragState.startRotation + currentAngle - dragState.startAngle,
          event.shiftKey,
        ),
      )

      const nextElement = { ...element, rotation: nextRotation }
      updateElementLive(element.id, { rotation: nextRotation })
      publishObjectMutation("rotate", [nextElement])
      return
    }

    if (dragState.mode === "resize") {
      const element = dragState.elements[0]
      if (!element) return

      const patch = resizeElementPatches(
        [element],
        dragState.selectionBounds ?? elementBounds([element]),
        dx,
        dy,
        dragState.resizeHandle,
      )[0]

      if (patch) {
        updateElementLive(element.id, patch.patch)
        publishObjectMutation("resize", [{ ...element, ...patch.patch }])
      }
      return
    }

    const result = moveElementPatches(
      dragState.elements,
      dx,
      dy,
      dragState.referenceElements,
    )
    updateElementsLive(result.patches)
    publishObjectMutation(
      "move",
      applyPatchesToElements(dragState.elements, result.patches),
    )
    setSnapGuides(result.guides)
  }

  function moveMarquee(event: PointerEvent<HTMLDivElement>) {
    if (!marqueeState) return
    const point = pointToPercent(event)
    const width = Math.abs(point.x - marqueeState.left)
    const height = Math.abs(point.y - marqueeState.top)

    setMarqueeState({
      ...marqueeState,
      right: point.x,
      bottom: point.y,
      active: marqueeState.active || width > 0.75 || height > 0.75,
    })
  }

  function endPointerInteraction() {
    if (marqueeState) {
      const ids = marqueeState.active
        ? elementIdsInRect(activeSlide, marqueeState)
        : []
      selectElements(ids)
      setMarqueeState(null)
    }

    setDragState(null)
    setSnapGuides({})
  }

  function handleCanvasKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (textEditState) return

    const commandKey = event.ctrlKey || event.metaKey
    const key = event.key.toLowerCase()

    if (commandKey && key === "z" && event.shiftKey) {
      event.preventDefault()
      redo()
      return
    }

    if (commandKey && key === "z") {
      event.preventDefault()
      undo()
      return
    }

    if (commandKey && key === "y") {
      event.preventDefault()
      redo()
      return
    }

    if (commandKey && (event.key === "=" || event.key === "+")) {
      event.preventDefault()
      setZoom(zoom + 5)
      return
    }

    if (commandKey && event.key === "-") {
      event.preventDefault()
      setZoom(zoom - 5)
      return
    }

    if (commandKey && key === "0") {
      event.preventDefault()
      setZoom(88)
      return
    }

    if (commandKey && key === "a") {
      event.preventDefault()
      selectElements(
        visibleElements(activeSlide)
          .filter(isElementEditable)
          .map((element) => element.id),
      )
      return
    }

    if (commandKey && event.shiftKey && key === "v") {
      event.preventDefault()
      if (copiedElementStyle) {
        pasteCopiedElementStyle()
      }
      return
    }

    if (commandKey && key === "v" && copiedElements.length) {
      event.preventDefault()
      pasteCopiedElements()
      return
    }

    if (commandKey && key === "v" && copiedSlides.length) {
      event.preventDefault()
      pasteCopiedSlides()
      return
    }

    if (commandKey && key === "m") {
      event.preventDefault()
      addSlide()
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      selectElement(null)
      return
    }

    if (!commandKey && !event.altKey && key === "tab") {
      event.preventDefault()
      selectRelativeElement(event.shiftKey ? -1 : 1)
      return
    }

    if (
      !selectedElementIds.length &&
      commandKey &&
      key === "d" &&
      event.shiftKey
    ) {
      event.preventDefault()
      duplicateSlide()
      return
    }

    if (!commandKey && !event.altKey && event.key === "PageDown") {
      event.preventDefault()
      selectSlideAtIndex(activeSlideIndex + 1)
      return
    }

    if (!commandKey && !event.altKey && event.key === "PageUp") {
      event.preventDefault()
      selectSlideAtIndex(activeSlideIndex - 1)
      return
    }

    if (!commandKey && !event.altKey && event.key === "Home") {
      event.preventDefault()
      selectSlideAtIndex(0)
      return
    }

    if (!commandKey && !event.altKey && event.key === "End") {
      event.preventDefault()
      selectSlideAtIndex(deck.slides.length - 1)
      return
    }

    if (!selectedElementIds.length && event.altKey && event.key === "ArrowUp") {
      event.preventDefault()
      moveSlide(-1)
      return
    }

    if (
      !selectedElementIds.length &&
      event.altKey &&
      event.key === "ArrowDown"
    ) {
      event.preventDefault()
      moveSlide(1)
      return
    }

    if (
      !selectedElementIds.length &&
      commandKey &&
      !event.shiftKey &&
      key === "c"
    ) {
      event.preventDefault()
      copySelectedSlide()
      return
    }

    if (
      !selectedElementIds.length &&
      commandKey &&
      !event.shiftKey &&
      key === "x"
    ) {
      event.preventDefault()
      cutSelectedSlide()
      return
    }

    if (!selectedElementIds.length) return

    if (commandKey && event.shiftKey && key === "c") {
      event.preventDefault()
      copySelectedElementStyle()
      return
    }

    if (commandKey && key === "d") {
      event.preventDefault()
      duplicateSelectedElements()
      return
    }

    if (commandKey && key === "c") {
      event.preventDefault()
      copySelectedElements()
      return
    }

    if (commandKey && key === "x") {
      event.preventDefault()
      cutSelectedElements()
      return
    }

    if (commandKey && key === "]") {
      event.preventDefault()
      moveSelectedElementLayer(1, event.shiftKey ? "boundary" : "step")
      return
    }

    if (commandKey && key === "[") {
      event.preventDefault()
      moveSelectedElementLayer(-1, event.shiftKey ? "boundary" : "step")
      return
    }

    if (commandKey && key === "g" && event.shiftKey) {
      event.preventDefault()
      ungroupSelectedElements()
      return
    }

    if (commandKey && key === "g") {
      event.preventDefault()
      groupSelectedElements()
      return
    }

    const step = event.shiftKey ? 5 : 1
    const movement = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    }[event.key]

    if (movement) {
      event.preventDefault()
      nudgeSelectedElements(movement.x, movement.y)
      return
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault()
      deleteElement()
    }
  }

  async function handleCanvasPaste(event: ClipboardEvent<HTMLDivElement>) {
    if (textEditState || copiedElements.length || copiedSlides.length) return

    const items = Array.from(event.clipboardData.items)
    const imageItem = items.find(
      (item) => item.kind === "file" && item.type.startsWith("image/"),
    )
    const imageFile = imageItem?.getAsFile()

    if (imageFile) {
      event.preventDefault()

      try {
        const src = await readImageFileAsDataUrl(imageFile)
        addImageElement({
          src,
          alt: imageFile.name || "Pasted image",
        })
      } catch (error) {
        console.error("Could not paste image into slide", error)
      }

      return
    }

    if (addPlainTextElement(event.clipboardData.getData("text/plain"))) {
      event.preventDefault()
    }
  }

  function handleCanvasDragOver(event: DragEvent<HTMLDivElement>) {
    if (event.dataTransfer.items.length) {
      event.preventDefault()
    }
  }

  async function handleCanvasDrop(event: DragEvent<HTMLDivElement>) {
    const files = Array.from(event.dataTransfer.files)
    const imageFiles = files.filter((file) => file.type.startsWith("image/"))
    const textFile = files.find((file) => file.type.startsWith("text/"))
    const droppedText = event.dataTransfer.getData("text/plain")
    const dropPoint = clientPointToPercent(event.clientX, event.clientY)

    if (!imageFiles.length && !textFile && !droppedText.trim()) return

    event.preventDefault()

    for (const file of imageFiles) {
      try {
        const src = await readImageFileAsDataUrl(file)
        addImageElement({
          src,
          alt: file.name || "Dropped image",
          ...centeredInsertPosition(dropPoint, 52, 42),
        })
      } catch (error) {
        console.error("Could not drop image onto slide", error)
      }
    }

    if (textFile) {
      try {
        addPlainTextElement(await textFile.text(), dropPoint)
      } catch (error) {
        console.error("Could not drop text onto slide", error)
      }
      return
    }

    addPlainTextElement(droppedText, dropPoint)
  }

  const previewTransitionClass =
    transitionPreviewKey > 0
      ? transitionAnimationClass(activeSlide.transition ?? "none")
      : ""
  const assets = deck.assets ?? []
  const previewTransitionStyle = {
    background: activeSlide.background,
    "--slide-transition-duration": `${
      activeSlide.transitionDurationMs ?? 350
    }ms`,
  } as CSSProperties
  const slideGridStyle = {
    backgroundImage:
      "linear-gradient(to right, rgb(148 163 184 / 0.32) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.32) 1px, transparent 1px)",
    backgroundSize: "5% 5%",
  } as CSSProperties
  const visibleSlideElements = visibleElements(activeSlide)
  const renderBudget = canvasRenderBudget(activeSlide, selectedElementIds)
  const renderContainmentStyle = canvasElementContainmentStyle(renderBudget)
  const selectedEditableElements = visibleSlideElements.filter(
    (element) =>
      selectedElementIds.includes(element.id) && isElementEditable(element),
  )
  const openComments = (activeSlide.comments ?? []).filter(
    (comment) => !comment.resolved,
  )
  const slideCommentCount = openComments.filter(
    (comment) => !comment.targetElementId,
  ).length
  const commentCountByElementId = openComments.reduce((counts, comment) => {
    if (!comment.targetElementId) return counts

    counts.set(
      comment.targetElementId,
      (counts.get(comment.targetElementId) ?? 0) + 1,
    )
    return counts
  }, new Map<string, number>())
  const multiSelectionBounds =
    selectedEditableElements.length > 1
      ? elementBounds(selectedEditableElements)
      : null
  const remoteCursors = recentCollaborationCursors(collaborationEvents, {
    activeSlideId: selectedSlideId,
    currentUserId: userId,
  })
  const remoteSelections = recentCollaborationSelections(collaborationEvents, {
    activeSlideId: selectedSlideId,
    currentUserId: userId,
    requireElements: true,
    type: "selection",
  })
  const remoteEditIntents = recentCollaborationSelections(collaborationEvents, {
    activeSlideId: selectedSlideId,
    currentUserId: userId,
    maxAgeMs: 12_000,
    requireElements: true,
    type: "edit-intent",
  })
  const remoteMutations = recentCollaborationMutations(collaborationEvents, {
    activeSlideId: selectedSlideId,
    currentUserId: userId,
  }).filter((mutation) => !resolvedRemoteMutationIds.includes(mutation.eventId))

  function acceptRemoteMutation(mutation: CollaborationObjectMutation) {
    const result = applyRemoteObjectMutation(mutation)
    setResolvedRemoteMutationIds((ids) =>
      ids.includes(mutation.eventId) ? ids : [...ids, mutation.eventId].slice(-50),
    )
    setRemoteMutationNotice({
      skipped: collaborationMutationSkipDetails(result.deck, mutation, result),
      slideId: mutation.slideId,
      summary: collaborationMutationApplySummary(result),
    })

    if (result.appliedCount) {
      selectElements(mutation.elements.map((element) => element.id))
    }
  }

  function jumpToSkippedRemoteMutationObject(
    notice: RemoteMutationNotice,
    detail: CollaborationMutationSkipDetail,
  ) {
    if (!detail.canSelectLocalElement) return

    selectSlide(notice.slideId)
    selectElement(detail.elementId)
  }

  function renderRemoteSelection(
    selection: CollaborationSelection,
    variant: "selection" | "edit-intent",
  ) {
    const selectedElements = visibleSlideElements.filter((element) =>
      selection.elementIds.includes(element.id),
    )
    if (!selectedElements.length) return null

    const bounds = elementBounds(selectedElements)
    const classes = cursorRoleClasses(selection.role)
    const label =
      variant === "edit-intent"
        ? `${selection.role} ${selection.action ?? "editing"}`
        : `${selection.role} selected`

    return (
      <span
        key={`${variant}-${selection.userId}-${selection.eventId}`}
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute z-20 rounded-sm border-2 ring-2",
          variant === "edit-intent" ? "border-solid" : "border-dashed",
          classes.outline,
        )}
        style={{
          left: `${bounds.left}%`,
          top: `${bounds.top}%`,
          width: `${bounds.width}%`,
          height: `${bounds.height}%`,
        }}
      >
        <span
          className={cn(
            "absolute top-1 left-1 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none shadow",
            classes.label,
          )}
        >
          {label}
        </span>
      </span>
    )
  }

  function renderRemoteMutation(mutation: CollaborationObjectMutation) {
    const classes = cursorRoleClasses(mutation.role)
    const actionLabel =
      mutation.action === "move"
        ? "moved"
        : mutation.action === "resize"
          ? "resized"
          : mutation.action === "rotate"
            ? "rotated"
            : mutation.action === "text"
              ? "edited text"
              : "updated"

    return mutation.elements.map((element, index) => (
      <span
        key={`mutation-${mutation.userId}-${mutation.eventId}-${element.id}`}
        className={cn(
          "pointer-events-none absolute z-10 rounded-sm border bg-background/10 ring-2",
          classes.outline,
        )}
        style={{
          height: `${element.height}%`,
          left: `${element.x}%`,
          top: `${element.y}%`,
          transform: `rotate(${element.rotation}deg)`,
          width: `${element.width}%`,
        }}
      >
        <span
          className={cn(
            "absolute top-0 left-0 flex -translate-y-full items-center gap-1 rounded-t px-1.5 py-0.5 text-[10px] font-semibold leading-none shadow",
            classes.label,
          )}
        >
          {mutation.role} {actionLabel}
          {index === 0 ? (
            <button
              type="button"
              className="pointer-events-auto rounded bg-background/20 px-1 py-0.5 text-[10px] leading-none hover:bg-background/35 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-background"
              onClick={(event) => {
                event.stopPropagation()
                acceptRemoteMutation(mutation)
              }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              Apply
            </button>
          ) : null}
        </span>
      </span>
    ))
  }

  return (
    <main className="flex min-w-0 flex-1 items-center justify-center overflow-auto bg-[radial-gradient(circle_at_1px_1px,rgb(148_163_184_/_0.22)_1px,transparent_0)] [background-size:18px_18px] p-3 sm:p-5 lg:p-8">
      <div
        ref={canvasRef}
        role="application"
        tabIndex={0}
        aria-label="Slide canvas"
        aria-describedby={CANVAS_SHORTCUT_HELP_ID}
        className="relative aspect-video w-full max-w-[960px] shrink-0 cursor-default overflow-hidden rounded-md border bg-white text-left shadow-2xl outline-none"
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: "center center",
          background: slide.background,
        }}
        onPointerDown={startMarquee}
        onKeyDown={handleCanvasKeyDown}
        onPaste={handleCanvasPaste}
        onDragOver={handleCanvasDragOver}
        onDrop={handleCanvasDrop}
        onPointerMove={(event) => {
          moveElement(event)
          moveMarquee(event)
          maybePublishCursorEvent(event)
        }}
        onPointerUp={endPointerInteraction}
        onPointerCancel={endPointerInteraction}
      >
        <span id={CANVAS_SHORTCUT_HELP_ID} className="sr-only">
          Use Tab and Shift Tab to move between objects, arrow keys to nudge
          selected objects, Page Up and Page Down to change slides, and Escape to
          clear selection.
        </span>
        <div
          key={`${activeSlide.id}-${transitionPreviewKey}`}
          className={cn("absolute inset-0", previewTransitionClass)}
          style={previewTransitionStyle}
          onPointerDown={startMarquee}
        >
          {showGrid ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={slideGridStyle}
            />
          ) : null}
          {showRulers ? <CanvasRulerOverlay /> : null}
          {visibleSlideElements.map((element) => {
            const isSelected = selectedElementIds.includes(element.id)
            const isTextEditing = textEditState?.elementId === element.id
            const isHovered =
              hoveredElementId === element.id &&
              !isSelected &&
              !isTextEditing &&
              !dragState &&
              !marqueeState?.active
            const isLocked = isElementLocked(element)
            const isEditable = isElementEditable(element)
            const showSingleObjectHandles =
              isSelected &&
              isEditable &&
              selectedElementIds.length === 1 &&
              !isTextEditing
            const overflowStatus =
              (element.type === "title" || element.type === "text") &&
              shouldCheckTextOverflow(renderBudget, element.id)
                ? textOverflowStatus(element)
                : null
            const commentCount = commentCountByElementId.get(element.id) ?? 0
            const accessibleElementLabel = `${presentationElementLabel(
              element,
            )}, slide ${slideNumber}${isLocked ? ", locked" : ""}`
            const isObjectAnimationPreviewing =
              objectAnimationPreviewElementId === element.id &&
              objectAnimationPreviewKey > 0 &&
              (element.animation ?? "none") !== "none"
            const connectorGeometry =
              showSingleObjectHandles &&
              element.type === "shape" &&
              isRoutableShapeKind(element.shapeKind)
                ? shapeConnectorGeometry(element)
                : null
            const connectorPointHandles = connectorGeometry
              ? [
                  {
                    handle: "start" as const,
                    label: "Move connector start point",
                    x: connectorGeometry.startX,
                    y: connectorGeometry.startY,
                  },
                  ...(isConnectorShapeKind(element.shapeKind)
                    ? [
                        {
                          handle: "control" as const,
                          label: "Move connector control point",
                          x: connectorGeometry.controlX,
                          y: connectorGeometry.controlY,
                        },
                      ]
                    : []),
                  {
                    handle: "end" as const,
                    label: "Move connector end point",
                    x: connectorGeometry.endX,
                    y: connectorGeometry.endY,
                  },
                ]
              : []

            return (
              <span
                key={element.id}
                role="button"
                tabIndex={0}
                aria-label={accessibleElementLabel}
                aria-pressed={isSelected}
                className={cn(
                  "absolute flex border border-transparent text-pretty outline-none transition",
                  showSingleObjectHandles ? "overflow-visible" : "overflow-hidden",
                  usesTextBoxLayout(element) &&
                    "items-start",
                  isEditable &&
                    !isSelected &&
                    "hover:border-primary/60 hover:ring-1 hover:ring-primary/35",
                  isHovered &&
                    "border-primary/80 ring-1 ring-primary/60 ring-offset-1 ring-offset-background",
                  isSelected &&
                    (isLocked
                      ? "border-amber-500 ring-2 ring-amber-500/30"
                      : "border-primary ring-2 ring-primary/30"),
                )}
                style={{
                  left: `${element.x}%`,
                  top: `${element.y}%`,
                  width: `${element.width}%`,
                  height: `${element.height}%`,
                  color: element.color,
                  background:
                    element.type === "image" ||
                    element.type === "icon" ||
                    element.type === "video" ||
                    element.type === "audio" ||
                    element.type === "shape" ||
                    element.type === "chart"
                      ? "transparent"
                      : element.background,
                  borderRadius: `${element.radius}px`,
                  fontFamily: fontFamilyStyle(element.fontFamily),
                  fontSize: `${elementEffectiveFontSize(element)}px`,
                  fontWeight: element.fontWeight,
                  padding:
                    element.type === "shape" ||
                    element.type === "icon" ||
                    element.type === "video" ||
                    element.type === "audio" ||
                    element.type === "table" ||
                    element.type === "chart"
                      ? 0
                      : "6px 8px",
                  lineHeight: elementLineHeight(element),
                  textAlign: elementTextAlign(element),
                  transform: `rotate(${element.rotation ?? 0}deg)`,
                  transformOrigin: "center",
                  pointerEvents: isLocked ? "none" : "auto",
                  ...renderContainmentStyle,
                }}
                onClick={(event) => {
                  event.stopPropagation()
                }}
                onPointerEnter={() => {
                  if (!dragState && !textEditState) {
                    setHoveredElementId(element.id)
                  }
                }}
                onPointerLeave={() => {
                  setHoveredElementId((currentElementId) =>
                    currentElementId === element.id ? null : currentElementId,
                  )
                }}
                onPointerDown={(event) => {
                  if (event.detail > 1 && isTextElement(element)) return
                  event.stopPropagation()
                  setHoveredElementId(null)
                  event.currentTarget.setPointerCapture(event.pointerId)
                  const movingSelection =
                    selectedElementIds.includes(element.id) && !event.shiftKey
                  const moveIds = movingSelection
                    ? selectedElementIds
                    : expandSelectionToGroups(activeSlide, [element.id])
                  const selectedElements = activeSlide.elements.filter(
                    (item) => moveIds.includes(item.id) && isElementEditable(item),
                  )
                  const referenceElements = activeSlide.elements.filter(
                    (item) => !moveIds.includes(item.id),
                  )
                  publishEditIntent(
                    "move",
                    selectedElements.map((item) => item.id),
                  )
                  selectElement(element.id, { additive: event.shiftKey })
                  captureHistory()
                  setDragState({
                    mode: "move",
                    startX: event.clientX,
                    startY: event.clientY,
                    elements: selectedElements,
                    referenceElements,
                  })
                }}
                onDoubleClick={(event) => {
                  event.stopPropagation()
                  startTextEditing(element)
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && isTextElement(element)) {
                    event.preventDefault()
                    startTextEditing(element)
                    return
                  }

                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    selectElement(element.id)
                  }
                }}
              >
                <span
                  key={
                    isObjectAnimationPreviewing
                      ? `${element.id}-${objectAnimationPreviewKey}`
                      : element.id
                  }
                  className={cn(
                    "flex size-full overflow-hidden",
                    usesTextBoxLayout(element) && "items-start",
                    isObjectAnimationPreviewing &&
                      elementAnimationClass(element.animation),
                  )}
                  style={
                    isObjectAnimationPreviewing
                      ? ({
                          "--object-animation-duration": `${elementAnimationDuration(
                            element,
                          )}ms`,
                          "--object-animation-delay": `${elementAnimationDelay(
                            element,
                          )}ms`,
                          "--object-animation-motion-x": `${elementAnimationMotionX(
                            element,
                          )}%`,
                          "--object-animation-motion-y": `${elementAnimationMotionY(
                            element,
                          )}%`,
                        } as CSSProperties)
                      : undefined
                  }
                >
                  {isTextEditing ? (
                    <CanvasTextEditor
                      element={element}
                      onCancel={cancelTextEditing}
                      onChange={(content) => {
                        const nextElement = { ...element, content }
                        updateElementLive(element.id, { content })
                        publishObjectMutation("text", [nextElement])
                      }}
                      onCommit={commitTextEditing}
                    />
                  ) : (
                    <SlideElementContent element={element} assets={assets} />
                  )}
                </span>
                {showSingleObjectHandles ? (
                  <span
                    className="pointer-events-none absolute top-0 left-1/2 z-20 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium leading-none text-primary-foreground shadow"
                    style={{
                      transform: `translate(-50%, -3.5rem) rotate(-${
                        element.rotation ?? 0
                      }deg)`,
                    }}
                  >
                    {rotationReadout(element.rotation)}
                  </span>
                ) : null}
                {isHovered ? (
                  <span
                    className="pointer-events-none absolute top-0 left-0 z-20 max-w-full -translate-y-[calc(100%+0.25rem)] truncate rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium leading-none text-primary-foreground shadow"
                    style={{
                      transform: `translateY(calc(-100% - 0.25rem)) rotate(-${
                        element.rotation ?? 0
                      }deg)`,
                    }}
                  >
                    {presentationElementLabel(element)}
                  </span>
                ) : null}
                {showSingleObjectHandles ? (
                  <span
                    aria-label="Rotate object"
                    role="button"
                    tabIndex={0}
                    className="absolute top-0 left-1/2 z-20 size-4 -translate-x-1/2 -translate-y-8 cursor-grab rounded-full border border-primary bg-background shadow after:absolute after:top-full after:left-1/2 after:h-5 after:w-px after:-translate-x-1/2 after:bg-primary/70 active:cursor-grabbing"
                    onPointerDown={(event) => {
                      event.stopPropagation()
                      event.currentTarget.setPointerCapture(event.pointerId)
                      const rect = canvasRef.current?.getBoundingClientRect()
                      if (!rect) return

                      const rotationCenter = {
                        x:
                          rect.left +
                          ((element.x + element.width / 2) / 100) * rect.width,
                        y:
                          rect.top +
                          ((element.y + element.height / 2) / 100) * rect.height,
                      }

                      captureHistory()
                      publishEditIntent("rotate", [element.id])
                      setDragState({
                        mode: "rotate",
                        startX: event.clientX,
                        startY: event.clientY,
                        elements: [element],
                        referenceElements: [],
                        rotationCenter,
                        startAngle: angleFromPoint(
                          rotationCenter,
                          event.clientX,
                          event.clientY,
                        ),
                        startRotation: element.rotation ?? 0,
                      })
                    }}
                  />
                ) : null}
                {showSingleObjectHandles ? (
                  RESIZE_HANDLES.map((handle) => (
                    <span
                      key={handle.handle}
                      aria-label={resizeHandleLabel(handle.handle, "object")}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        "absolute size-3 rounded-full border border-primary bg-background shadow",
                        handle.className,
                      )}
                      onPointerDown={(event) => {
                        event.stopPropagation()
                        event.currentTarget.setPointerCapture(event.pointerId)
                        captureHistory()
                        publishEditIntent("resize", [element.id])
                        setDragState({
                          mode: "resize",
                          startX: event.clientX,
                          startY: event.clientY,
                          elements: [element],
                          referenceElements: [],
                          resizeHandle: handle.handle,
                          selectionBounds: elementBounds([element]),
                        })
                      }}
                    />
                  ))
                ) : null}
                {showSingleObjectHandles
                  ? connectorPointHandles.map((point) => (
                      <span
                        key={point.handle}
                        aria-label={point.label}
                        role="button"
                        tabIndex={0}
                        className={cn(
                          "absolute z-30 size-3.5 cursor-crosshair border-2 bg-background shadow",
                          point.handle === "control"
                            ? "rounded-sm border-amber-500"
                            : "rounded-full border-primary",
                        )}
                        style={{
                          left: `${point.x}%`,
                          top: `${point.y}%`,
                          transform: `translate(-50%, -50%) rotate(-${
                            element.rotation ?? 0
                          }deg)`,
                        }}
                        title={point.label}
                        onPointerDown={(event) => {
                          event.stopPropagation()
                          event.currentTarget.setPointerCapture(event.pointerId)
                          captureHistory()
                          publishEditIntent("resize", [element.id])
                          selectElement(element.id)
                          setSnapGuides({})
                          setDragState({
                            mode: "connector-point",
                            startX: event.clientX,
                            startY: event.clientY,
                            elements: [element],
                            referenceElements: [],
                            connectorPointHandle: point.handle,
                          })
                        }}
                      />
                    ))
                  : null}
                {isSelected && overflowStatus?.clipped ? (
                  <span
                    className="pointer-events-none absolute right-1 bottom-1 z-20 inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium leading-none text-amber-950 shadow"
                    style={{
                      transform: `rotate(-${element.rotation ?? 0}deg)`,
                    }}
                    title="Text is clipped inside this box"
                  >
                    <AlertTriangle className="size-3" />
                    Overflow
                  </span>
                ) : null}
                {commentCount ? (
                  <span
                    className="pointer-events-none absolute top-1 right-1 z-20 inline-flex items-center gap-1 rounded bg-amber-300 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-amber-950 shadow"
                    title={`${commentCount} open comments`}
                  >
                    <MessageSquare className="size-3" />
                    {commentCount}
                  </span>
                ) : null}
              </span>
            )
          })}
          <SlideMasterOverlay
            master={deck.master}
            slideNumber={slideNumber}
            slideCount={deck.slides.length}
          />
        </div>
        {slideCommentCount ? (
          <span className="pointer-events-none absolute top-3 right-3 z-20 inline-flex items-center gap-1 rounded bg-amber-300 px-2 py-1 text-xs font-semibold text-amber-950 shadow">
            <MessageSquare className="size-3.5" />
            {slideCommentCount}
          </span>
        ) : null}
        {remoteSelections.map((selection) =>
          renderRemoteSelection(selection, "selection"),
        )}
        {remoteEditIntents.map((selection) =>
          renderRemoteSelection(selection, "edit-intent"),
        )}
        {remoteMutations.map(renderRemoteMutation)}
        {remoteMutationNotice ? (
          <div className="pointer-events-auto absolute top-3 left-3 z-50 grid max-w-[24rem] gap-2 rounded-md border bg-background/95 px-3 py-2 text-xs text-foreground shadow-lg">
            <div>
              {remoteMutationNotice.summary}
              <button
                type="button"
                className="ml-2 rounded px-1 font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={() => setRemoteMutationNotice(null)}
              >
                Dismiss
              </button>
            </div>
            {remoteMutationNotice.skipped.length ? (
              <div className="flex flex-wrap gap-1">
                {remoteMutationNotice.skipped.map((detail) => (
                  <button
                    key={`${detail.reason}-${detail.elementId}`}
                    type="button"
                    className="rounded border bg-muted/40 px-1.5 py-0.5 text-[11px] text-muted-foreground enabled:hover:bg-muted enabled:hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!detail.canSelectLocalElement}
                    onClick={() =>
                      jumpToSkippedRemoteMutationObject(
                        remoteMutationNotice,
                        detail,
                      )
                    }
                  >
                    {collaborationMutationSkipReasonLabel(detail.reason)}
                    {detail.localElementType ? `: ${detail.localElementType}` : ""}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        {remoteCursors.map((cursor) => {
          const classes = cursorRoleClasses(cursor.role)

          return (
            <span
              key={`${cursor.userId}-${cursor.eventId}`}
              aria-hidden="true"
              className="pointer-events-none absolute z-40 flex -translate-y-1 items-start gap-1"
              style={{
                left: `${cursor.x}%`,
                top: `${cursor.y}%`,
              }}
            >
              <MousePointer2
                className={cn("size-4 drop-shadow", classes.icon)}
              />
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none shadow",
                  classes.label,
                )}
              >
                {cursor.role}
              </span>
            </span>
          )
        })}
        {multiSelectionBounds ? (
          <span
            className="pointer-events-none absolute z-20 border border-primary ring-2 ring-primary/20"
            style={{
              left: `${multiSelectionBounds.left}%`,
              top: `${multiSelectionBounds.top}%`,
              width: `${multiSelectionBounds.width}%`,
              height: `${multiSelectionBounds.height}%`,
            }}
          >
            <span
              aria-label="Rotate selected objects"
              role="button"
              tabIndex={0}
              className="pointer-events-auto absolute top-0 left-1/2 size-4 -translate-x-1/2 -translate-y-8 cursor-grab rounded-full border border-primary bg-background shadow after:absolute after:top-full after:left-1/2 after:h-5 after:w-px after:-translate-x-1/2 after:bg-primary/70 active:cursor-grabbing"
              onPointerDown={(event) => {
                event.stopPropagation()
                event.currentTarget.setPointerCapture(event.pointerId)
                const rect = canvasRef.current?.getBoundingClientRect()
                if (!rect) return

                const rotationCenter = {
                  x:
                    rect.left +
                    (multiSelectionBounds.center / 100) * rect.width,
                  y:
                    rect.top +
                    (multiSelectionBounds.middle / 100) * rect.height,
                }

                captureHistory()
                publishEditIntent(
                  "rotate",
                  selectedEditableElements.map((element) => element.id),
                )
                setDragState({
                  mode: "rotate",
                  startX: event.clientX,
                  startY: event.clientY,
                  elements: selectedEditableElements,
                  referenceElements: [],
                  selectionBounds: multiSelectionBounds,
                  rotationCenter,
                  rotationAspectRatio: rect.width / rect.height,
                  startAngle: angleFromPoint(
                    rotationCenter,
                    event.clientX,
                    event.clientY,
                  ),
                })
              }}
            />
            {RESIZE_HANDLES.map((handle) => (
              <span
                key={handle.handle}
                aria-label={resizeHandleLabel(
                  handle.handle,
                  "selected objects",
                )}
                role="button"
                tabIndex={0}
                className={cn(
                  "pointer-events-auto absolute size-3 rounded-full border border-primary bg-background shadow",
                  handle.className,
                )}
                onPointerDown={(event) => {
                  event.stopPropagation()
                  event.currentTarget.setPointerCapture(event.pointerId)
                  captureHistory()
                  publishEditIntent(
                    "resize",
                    selectedEditableElements.map((element) => element.id),
                  )
                  setDragState({
                    mode: "resize-selection",
                    startX: event.clientX,
                    startY: event.clientY,
                    elements: selectedEditableElements,
                    referenceElements: [],
                    resizeHandle: handle.handle,
                    selectionBounds: multiSelectionBounds,
                  })
                }}
              />
            ))}
          </span>
        ) : null}
        {snapGuides.x !== undefined ? (
          <span
            className="pointer-events-none absolute top-0 bottom-0 z-30 w-px bg-sky-500"
            style={{ left: `${snapGuides.x}%` }}
          />
        ) : null}
        {snapGuides.y !== undefined ? (
          <span
            className="pointer-events-none absolute right-0 left-0 z-30 h-px bg-sky-500"
            style={{ top: `${snapGuides.y}%` }}
          />
        ) : null}
        {marqueeState?.active ? (
          <span
            className="pointer-events-none absolute z-30 border border-sky-500 bg-sky-500/10"
            style={{
              left: `${Math.min(marqueeState.left, marqueeState.right)}%`,
              top: `${Math.min(marqueeState.top, marqueeState.bottom)}%`,
              width: `${Math.abs(marqueeState.right - marqueeState.left)}%`,
              height: `${Math.abs(marqueeState.bottom - marqueeState.top)}%`,
            }}
          />
        ) : null}
      </div>
    </main>
  )
}
