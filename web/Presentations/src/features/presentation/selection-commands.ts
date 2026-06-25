import type { PresentationElement, Slide } from "./types"
import {
  isElementEditable,
  isElementHidden,
  isElementLocked,
} from "./element-visibility"

export type Alignment =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom"

export type DistributionAxis = "horizontal" | "vertical"

export type ResizeHandle =
  | "top-left"
  | "top"
  | "top-right"
  | "right"
  | "bottom-right"
  | "bottom"
  | "bottom-left"
  | "left"

export type ElementPatch = {
  id: string
  patch: Partial<Omit<PresentationElement, "id">>
}

export type ElementBounds = {
  left: number
  top: number
  right: number
  bottom: number
  center: number
  middle: number
  width: number
  height: number
}

export type SelectionRect = {
  left: number
  top: number
  right: number
  bottom: number
}

export type SnapGuides = {
  x?: number
  y?: number
}

type Point = {
  x: number
  y: number
}

export function resolveSelectedElementIds(
  primaryId: string | null,
  selectedIds: string[] | undefined,
) {
  if (selectedIds?.length) {
    return selectedIds
  }

  return primaryId ? [primaryId] : []
}

function selectedElements(slide: Slide, ids: Set<string>) {
  return slide.elements.filter((element) => ids.has(element.id))
}

export function elementBounds(elements: PresentationElement[]): ElementBounds {
  const left = Math.min(...elements.map((element) => element.x))
  const top = Math.min(...elements.map((element) => element.y))
  const right = Math.max(
    ...elements.map((element) => element.x + element.width),
  )
  const bottom = Math.max(
    ...elements.map((element) => element.y + element.height),
  )

  return {
    left,
    top,
    right,
    bottom,
    center: (left + right) / 2,
    middle: (top + bottom) / 2,
    width: right - left,
    height: bottom - top,
  }
}

function clampPercent(value: number, max = 100) {
  return Math.max(0, Math.min(max, value))
}

function clampBetween(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function normalizeRotation(value: number) {
  return Math.round((((value % 360) + 360) % 360) * 10) / 10
}

function rotatePoint(point: Point, center: Point, degrees: number) {
  const radians = (degrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const x = point.x - center.x
  const y = point.y - center.y

  return {
    x: center.x + x * cos - y * sin,
    y: center.y + x * sin + y * cos,
  }
}

function normalizeRect(rect: SelectionRect): SelectionRect {
  return {
    left: Math.min(rect.left, rect.right),
    top: Math.min(rect.top, rect.bottom),
    right: Math.max(rect.left, rect.right),
    bottom: Math.max(rect.top, rect.bottom),
  }
}

function intersects(first: SelectionRect, second: SelectionRect) {
  return !(
    first.right < second.left ||
    first.left > second.right ||
    first.bottom < second.top ||
    first.top > second.bottom
  )
}

function snapOffset(
  values: Array<{ value: number; guide: number }>,
  threshold = 1.25,
) {
  let best: { distance: number; offset: number; guide: number } | null = null

  for (const item of values) {
    const distance = Math.abs(item.guide - item.value)
    if (distance <= threshold && (!best || distance < best.distance)) {
      best = {
        distance,
        offset: item.guide - item.value,
        guide: item.guide,
      }
    }
  }

  return best
}

function snapCandidates(values: number[], guides: number[]) {
  return values.flatMap((value) =>
    guides.map((guide) => ({
      value,
      guide,
    })),
  )
}

function snapGuideValues(referenceElements: PresentationElement[]) {
  const x = [0, 50, 100]
  const y = [0, 50, 100]

  for (const element of referenceElements) {
    if (isElementHidden(element)) continue

    const bounds = elementBounds([element])
    x.push(bounds.left, bounds.center, bounds.right)
    y.push(bounds.top, bounds.middle, bounds.bottom)
  }

  return { x, y }
}

export function nudgeSlideElements(
  slide: Slide,
  selectedIds: string[],
  deltaX: number,
  deltaY: number,
) {
  const ids = new Set(selectedIds)

  return {
    ...slide,
    elements: slide.elements.map((element) =>
      ids.has(element.id) && !isElementLocked(element)
        ? {
            ...element,
            x: clampPercent(element.x + deltaX, 100 - element.width),
            y: clampPercent(element.y + deltaY, 100 - element.height),
          }
        : element,
    ),
  }
}

export function moveElementPatches(
  elements: PresentationElement[],
  deltaX: number,
  deltaY: number,
  referenceElements: PresentationElement[] = [],
) {
  const movableElements = elements.filter(isElementEditable)

  if (!movableElements.length) {
    return { patches: [], guides: {} } satisfies {
      patches: ElementPatch[]
      guides: SnapGuides
    }
  }

  const bounds = elementBounds(movableElements)
  const nextBounds = {
    left: bounds.left + deltaX,
    top: bounds.top + deltaY,
    right: bounds.right + deltaX,
    bottom: bounds.bottom + deltaY,
    center: bounds.center + deltaX,
    middle: bounds.middle + deltaY,
  }
  const guides = snapGuideValues(referenceElements)
  const xSnap = snapOffset(
    snapCandidates(
      [nextBounds.left, nextBounds.center, nextBounds.right],
      guides.x,
    ),
  )
  const ySnap = snapOffset(
    snapCandidates(
      [nextBounds.top, nextBounds.middle, nextBounds.bottom],
      guides.y,
    ),
  )
  const snappedDeltaX = deltaX + (xSnap?.offset ?? 0)
  const snappedDeltaY = deltaY + (ySnap?.offset ?? 0)

  return {
    patches: movableElements.map((element) => ({
      id: element.id,
      patch: {
        x: clampPercent(element.x + snappedDeltaX, 100 - element.width),
        y: clampPercent(element.y + snappedDeltaY, 100 - element.height),
      },
    })),
    guides: {
      x: xSnap?.guide,
      y: ySnap?.guide,
    },
  } satisfies {
    patches: ElementPatch[]
    guides: SnapGuides
  }
}

export function resizeElementPatches(
  elements: PresentationElement[],
  startBounds: ElementBounds,
  deltaX: number,
  deltaY: number,
  handle: ResizeHandle = "bottom-right",
) {
  const resizableElements = elements.filter(isElementEditable)

  if (
    !resizableElements.length ||
    startBounds.width <= 0 ||
    startBounds.height <= 0
  ) {
    return [] satisfies ElementPatch[]
  }

  let nextLeft = startBounds.left
  let nextTop = startBounds.top
  let nextRight = startBounds.right
  let nextBottom = startBounds.bottom

  if (handle.includes("left")) {
    nextLeft = clampBetween(startBounds.left + deltaX, 0, startBounds.right - 4)
  }
  if (handle.includes("right")) {
    nextRight = clampBetween(
      startBounds.right + deltaX,
      startBounds.left + 4,
      100,
    )
  }
  if (handle.includes("top")) {
    nextTop = clampBetween(startBounds.top + deltaY, 0, startBounds.bottom - 4)
  }
  if (handle.includes("bottom")) {
    nextBottom = clampBetween(
      startBounds.bottom + deltaY,
      startBounds.top + 4,
      100,
    )
  }

  const scaleX = (nextRight - nextLeft) / startBounds.width
  const scaleY = (nextBottom - nextTop) / startBounds.height

  return resizableElements.map((element) => {
    const width = clampBetween(element.width * scaleX, 4, 100)
    const height = clampBetween(element.height * scaleY, 4, 100)

    return {
      id: element.id,
      patch: {
        x: clampPercent(
          nextLeft + (element.x - startBounds.left) * scaleX,
          100 - width,
        ),
        y: clampPercent(
          nextTop + (element.y - startBounds.top) * scaleY,
          100 - height,
        ),
        width,
        height,
      },
    }
  }) satisfies ElementPatch[]
}

export function rotateElementPatches(
  elements: PresentationElement[],
  startBounds: ElementBounds,
  deltaRotation: number,
  aspectRatio: number,
) {
  const rotatableElements = elements.filter(isElementEditable)
  const safeAspectRatio =
    Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 16 / 9

  if (!rotatableElements.length) {
    return [] satisfies ElementPatch[]
  }

  const rotationCenter = {
    x: startBounds.center * safeAspectRatio,
    y: startBounds.middle,
  }

  return rotatableElements.map((element) => {
    const elementCenter = {
      x: (element.x + element.width / 2) * safeAspectRatio,
      y: element.y + element.height / 2,
    }
    const rotatedCenter = rotatePoint(
      elementCenter,
      rotationCenter,
      deltaRotation,
    )
    const nextCenter = {
      x: rotatedCenter.x / safeAspectRatio,
      y: rotatedCenter.y,
    }

    return {
      id: element.id,
      patch: {
        x: clampPercent(nextCenter.x - element.width / 2, 100 - element.width),
        y: clampPercent(
          nextCenter.y - element.height / 2,
          100 - element.height,
        ),
        rotation: normalizeRotation((element.rotation ?? 0) + deltaRotation),
      },
    }
  }) satisfies ElementPatch[]
}

export function elementIdsInRect(slide: Slide, rect: SelectionRect) {
  const normalized = normalizeRect(rect)

  return slide.elements
    .filter((element) =>
      isElementEditable(element) &&
      !isElementHidden(element) &&
      intersects(normalized, {
        left: element.x,
        top: element.y,
        right: element.x + element.width,
        bottom: element.y + element.height,
      }),
    )
    .map((element) => element.id)
}

export function alignSlideElements(
  slide: Slide,
  selectedIds: string[],
  alignment: Alignment,
) {
  const ids = new Set(selectedIds)
  const elements = selectedElements(slide, ids).filter(
    (element) => !isElementLocked(element),
  )
  if (!elements.length) return slide

  const bounds =
    elements.length === 1
      ? {
          left: 0,
          top: 0,
          right: 100,
          bottom: 100,
          center: 50,
          middle: 50,
          width: 100,
          height: 100,
        }
      : elementBounds(elements)

  return {
    ...slide,
    elements: slide.elements.map((element) => {
      if (!ids.has(element.id) || isElementLocked(element)) {
        return element
      }

      if (alignment === "left") {
        return { ...element, x: bounds.left }
      }
      if (alignment === "center") {
        return {
          ...element,
          x: clampPercent(bounds.center - element.width / 2, 100 - element.width),
        }
      }
      if (alignment === "right") {
        return { ...element, x: bounds.right - element.width }
      }
      if (alignment === "top") {
        return { ...element, y: bounds.top }
      }
      if (alignment === "middle") {
        return {
          ...element,
          y: clampPercent(
            bounds.middle - element.height / 2,
            100 - element.height,
          ),
        }
      }

      return { ...element, y: bounds.bottom - element.height }
    }),
  }
}

export function distributeSlideElements(
  slide: Slide,
  selectedIds: string[],
  axis: DistributionAxis,
) {
  const ids = new Set(selectedIds)
  const elements = selectedElements(slide, ids).filter(
    (element) => !isElementLocked(element),
  )
  if (elements.length < 3) return slide

  const sorted = [...elements].sort((a, b) =>
    axis === "horizontal" ? a.x - b.x : a.y - b.y,
  )
  const first = sorted[0]
  const last = sorted.at(-1)
  if (!first || !last) return slide

  const firstCenter =
    axis === "horizontal"
      ? first.x + first.width / 2
      : first.y + first.height / 2
  const lastCenter =
    axis === "horizontal"
      ? last.x + last.width / 2
      : last.y + last.height / 2
  const step = (lastCenter - firstCenter) / (sorted.length - 1)
  const targets = new Map(
    sorted.map((element, index) => [element.id, firstCenter + step * index]),
  )

  return {
    ...slide,
    elements: slide.elements.map((element) => {
      if (isElementLocked(element)) return element

      const center = targets.get(element.id)
      if (center === undefined) return element

      if (axis === "horizontal") {
        return {
          ...element,
          x: clampPercent(center - element.width / 2, 100 - element.width),
        }
      }

      return {
        ...element,
        y: clampPercent(center - element.height / 2, 100 - element.height),
      }
    }),
  }
}
