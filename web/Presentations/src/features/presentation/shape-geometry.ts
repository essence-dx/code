import type { PresentationElement, ShapeKind } from "./types"

type ShapeFrame = {
  x: number
  y: number
  width: number
  height: number
}

export type ShapeConnectorGeometry = {
  controlX: number
  controlY: number
  endX: number
  endY: number
  startX: number
  startY: number
}

export type ShapeConnectorPointHandle = "control" | "end" | "start"

type ShapeConnectorElement = Pick<
  PresentationElement,
  | "height"
  | "shapeConnectorControlX"
  | "shapeConnectorControlY"
  | "shapeConnectorEndX"
  | "shapeConnectorEndY"
  | "shapeConnectorStartX"
  | "shapeConnectorStartY"
  | "shapeKind"
  | "width"
  | "x"
  | "y"
>

export const defaultShapeLineGeometry: ShapeConnectorGeometry = {
  controlX: 50,
  controlY: 50,
  endX: 92,
  endY: 50,
  startX: 6,
  startY: 50,
}

export const defaultShapeConnectorGeometry: ShapeConnectorGeometry = {
  controlX: 50,
  controlY: 50,
  endX: 92,
  endY: 84,
  startX: 8,
  startY: 16,
}

const polygonRatios: Partial<Record<ShapeKind, ReadonlyArray<readonly [number, number]>>> = {
  diamond: [
    [0.5, 0.02],
    [0.98, 0.5],
    [0.5, 0.98],
    [0.02, 0.5],
  ],
  triangle: [
    [0.5, 0.02],
    [0.98, 0.98],
    [0.02, 0.98],
  ],
  pentagon: [
    [0.5, 0.02],
    [0.98, 0.38],
    [0.8, 0.98],
    [0.2, 0.98],
    [0.02, 0.38],
  ],
  hexagon: [
    [0.25, 0.02],
    [0.75, 0.02],
    [0.98, 0.5],
    [0.75, 0.98],
    [0.25, 0.98],
    [0.02, 0.5],
  ],
  parallelogram: [
    [0.24, 0.02],
    [0.98, 0.02],
    [0.76, 0.98],
    [0.02, 0.98],
  ],
  trapezoid: [
    [0.2, 0.02],
    [0.8, 0.02],
    [0.98, 0.98],
    [0.02, 0.98],
  ],
  rightArrow: [
    [0.02, 0.24],
    [0.62, 0.24],
    [0.62, 0.02],
    [0.98, 0.5],
    [0.62, 0.98],
    [0.62, 0.76],
    [0.02, 0.76],
  ],
  chevron: [
    [0.28, 0.02],
    [0.98, 0.5],
    [0.28, 0.98],
    [0.02, 0.76],
    [0.42, 0.5],
    [0.02, 0.24],
  ],
  plus: [
    [0.36, 0.02],
    [0.64, 0.02],
    [0.64, 0.36],
    [0.98, 0.36],
    [0.98, 0.64],
    [0.64, 0.64],
    [0.64, 0.98],
    [0.36, 0.98],
    [0.36, 0.64],
    [0.02, 0.64],
    [0.02, 0.36],
    [0.36, 0.36],
  ],
  star: [
    [0.5, 0.02],
    [0.61, 0.36],
    [0.98, 0.36],
    [0.68, 0.57],
    [0.8, 0.98],
    [0.5, 0.72],
    [0.2, 0.98],
    [0.32, 0.57],
    [0.02, 0.36],
    [0.39, 0.36],
  ],
}

function clampConnectorPercent(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback

  return Math.max(0, Math.min(100, value))
}

export function isConnectorShapeKind(kind: ShapeKind) {
  return kind === "elbowConnector" || kind === "curvedConnector"
}

export function isRoutableShapeKind(kind: ShapeKind) {
  return (
    kind === "line" ||
    kind === "arrow" ||
    kind === "doubleArrow" ||
    isConnectorShapeKind(kind)
  )
}

export function defaultConnectorGeometryForShape(kind: ShapeKind) {
  return isConnectorShapeKind(kind)
    ? defaultShapeConnectorGeometry
    : defaultShapeLineGeometry
}

export function shapeConnectorGeometry(
  element: Pick<
    PresentationElement,
    | "shapeConnectorControlX"
    | "shapeConnectorControlY"
    | "shapeConnectorEndX"
    | "shapeConnectorEndY"
    | "shapeConnectorStartX"
    | "shapeConnectorStartY"
    | "shapeKind"
  >,
): ShapeConnectorGeometry {
  const defaults = defaultConnectorGeometryForShape(element.shapeKind)

  return {
    controlX: clampConnectorPercent(
      element.shapeConnectorControlX,
      defaults.controlX,
    ),
    controlY: clampConnectorPercent(
      element.shapeConnectorControlY,
      defaults.controlY,
    ),
    endX: clampConnectorPercent(element.shapeConnectorEndX, defaults.endX),
    endY: clampConnectorPercent(element.shapeConnectorEndY, defaults.endY),
    startX: clampConnectorPercent(element.shapeConnectorStartX, defaults.startX),
    startY: clampConnectorPercent(element.shapeConnectorStartY, defaults.startY),
  }
}

function point(frame: ShapeFrame, x: number, y: number) {
  return {
    x: frame.x + frame.width * (x / 100),
    y: frame.y + frame.height * (y / 100),
  }
}

function connectorPointPercent(
  geometry: ShapeConnectorGeometry,
  handle: ShapeConnectorPointHandle,
) {
  if (handle === "control") {
    return {
      x: geometry.controlX,
      y: geometry.controlY,
    }
  }

  if (handle === "end") {
    return {
      x: geometry.endX,
      y: geometry.endY,
    }
  }

  return {
    x: geometry.startX,
    y: geometry.startY,
  }
}

function positionToConnectorPercent(
  origin: number,
  size: number,
  value: number,
  fallback: number,
) {
  if (size <= 0 || !Number.isFinite(size)) return fallback

  return clampConnectorPercent(((value - origin) / size) * 100, fallback)
}

export function connectorPointPosition(
  element: ShapeConnectorElement,
  handle: ShapeConnectorPointHandle,
) {
  const percent = connectorPointPercent(shapeConnectorGeometry(element), handle)

  return point(element, percent.x, percent.y)
}

export function connectorPointPatchFromPosition(
  element: ShapeConnectorElement,
  handle: ShapeConnectorPointHandle,
  position: { x: number; y: number },
) {
  const geometry = shapeConnectorGeometry(element)
  const fallback = connectorPointPercent(geometry, handle)
  const x = positionToConnectorPercent(
    element.x,
    element.width,
    position.x,
    fallback.x,
  )
  const y = positionToConnectorPercent(
    element.y,
    element.height,
    position.y,
    fallback.y,
  )

  if (handle === "control") {
    return {
      shapeConnectorControlX: x,
      shapeConnectorControlY: y,
    }
  }

  if (handle === "end") {
    return {
      shapeConnectorEndX: x,
      shapeConnectorEndY: y,
    }
  }

  return {
    shapeConnectorStartX: x,
    shapeConnectorStartY: y,
  }
}

export function shapePolygonPoints(kind: ShapeKind, frame: ShapeFrame) {
  const points = polygonRatios[kind]

  if (!points) return ""

  return points
    .map(([x, y]) => `${frame.x + frame.width * x},${frame.y + frame.height * y}`)
    .join(" ")
}

export function shapePath(kind: ShapeKind, frame: ShapeFrame) {
  if (kind !== "speechBubble") return ""

  const x = (ratio: number) => frame.x + frame.width * ratio
  const y = (ratio: number) => frame.y + frame.height * ratio

  return [
    `M ${x(0.08)} ${y(0.06)}`,
    `H ${x(0.92)}`,
    `Q ${x(0.98)} ${y(0.06)} ${x(0.98)} ${y(0.14)}`,
    `V ${y(0.7)}`,
    `Q ${x(0.98)} ${y(0.78)} ${x(0.9)} ${y(0.78)}`,
    `H ${x(0.58)}`,
    `L ${x(0.48)} ${y(0.96)}`,
    `L ${x(0.44)} ${y(0.78)}`,
    `H ${x(0.08)}`,
    `Q ${x(0.02)} ${y(0.78)} ${x(0.02)} ${y(0.7)}`,
    `V ${y(0.14)}`,
    `Q ${x(0.02)} ${y(0.06)} ${x(0.08)} ${y(0.06)}`,
    "Z",
  ].join(" ")
}

export function shapeLineEndpoints(
  frame: ShapeFrame,
  geometry: ShapeConnectorGeometry = defaultShapeLineGeometry,
) {
  const start = point(frame, geometry.startX, geometry.startY)
  const end = point(frame, geometry.endX, geometry.endY)

  return {
    x1: start.x,
    x2: end.x,
    y1: start.y,
    y2: end.y,
  }
}

export function shapeConnectorPath(
  kind: ShapeKind,
  frame: ShapeFrame,
  geometry: ShapeConnectorGeometry = defaultShapeConnectorGeometry,
) {
  const start = point(frame, geometry.startX, geometry.startY)
  const control = point(frame, geometry.controlX, geometry.controlY)
  const end = point(frame, geometry.endX, geometry.endY)

  if (kind === "curvedConnector") {
    return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`
  }

  if (kind !== "elbowConnector") return ""

  return [
    `M ${start.x} ${start.y}`,
    `L ${control.x} ${start.y}`,
    `L ${control.x} ${control.y}`,
    `L ${end.x} ${control.y}`,
    `L ${end.x} ${end.y}`,
  ].join(" ")
}
