import type {
  PresentationElement,
  ShapeArrowhead,
  ShapeKind,
  ShapeStrokeDash,
} from "./types"

export const shapeKinds = [
  "rectangle",
  "rounded",
  "ellipse",
  "diamond",
  "triangle",
  "pentagon",
  "hexagon",
  "parallelogram",
  "trapezoid",
  "rightArrow",
  "chevron",
  "plus",
  "star",
  "speechBubble",
  "line",
  "arrow",
  "doubleArrow",
  "elbowConnector",
  "curvedConnector",
] as const satisfies readonly ShapeKind[]

export const shapeKindLabels: Record<ShapeKind, string> = {
  rectangle: "Rectangle",
  rounded: "Rounded",
  ellipse: "Ellipse",
  diamond: "Diamond",
  triangle: "Triangle",
  pentagon: "Pentagon",
  hexagon: "Hexagon",
  parallelogram: "Parallelogram",
  trapezoid: "Trapezoid",
  rightArrow: "Right arrow",
  chevron: "Chevron",
  plus: "Plus",
  star: "Star",
  speechBubble: "Speech bubble",
  line: "Line",
  arrow: "Arrow",
  doubleArrow: "Double arrow",
  elbowConnector: "Elbow connector",
  curvedConnector: "Curved connector",
}

const shapeKindSet = new Set<string>(shapeKinds)

export const shapeStrokeDashOptions = [
  "solid",
  "dash",
  "dot",
  "dashDot",
] as const satisfies readonly ShapeStrokeDash[]

export const shapeStrokeDashLabels: Record<ShapeStrokeDash, string> = {
  solid: "Solid",
  dash: "Dashed",
  dot: "Dotted",
  dashDot: "Dash dot",
}

const shapeStrokeDashSet = new Set<string>(shapeStrokeDashOptions)

export const shapeArrowheadOptions = [
  "none",
  "triangle",
  "diamond",
  "oval",
] as const satisfies readonly ShapeArrowhead[]

export const shapeArrowheadLabels: Record<ShapeArrowhead, string> = {
  none: "None",
  triangle: "Triangle",
  diamond: "Diamond",
  oval: "Oval",
}

const shapeArrowheadSet = new Set<string>(shapeArrowheadOptions)

export function normalizeShapeKind(value: unknown, radius = 0): ShapeKind {
  if (typeof value === "string" && shapeKindSet.has(value)) {
    return value as ShapeKind
  }

  return radius > 0 ? "rounded" : "rectangle"
}

export function normalizeShapeStrokeDash(value: unknown): ShapeStrokeDash {
  if (typeof value === "string" && shapeStrokeDashSet.has(value)) {
    return value as ShapeStrokeDash
  }

  return "solid"
}

export function normalizeShapeArrowhead(
  value: unknown,
  fallback: ShapeArrowhead = "none",
): ShapeArrowhead {
  if (typeof value === "string" && shapeArrowheadSet.has(value)) {
    return value as ShapeArrowhead
  }

  return fallback
}

export function shapeKind(element: PresentationElement): ShapeKind {
  return normalizeShapeKind(element.shapeKind, element.radius)
}

export function isLinearShape(element: PresentationElement) {
  const kind = shapeKind(element)
  return (
    kind === "line" ||
    kind === "arrow" ||
    kind === "doubleArrow" ||
    kind === "elbowConnector" ||
    kind === "curvedConnector"
  )
}

export function shapeStrokeWidth(element: PresentationElement) {
  const value = Number(element.shapeStrokeWidth)
  if (!Number.isFinite(value)) return 2

  return Math.max(1, Math.min(24, Math.round(value)))
}

export function shapeStrokeColor(element: PresentationElement) {
  return element.shapeStrokeColor || element.background || "#2563eb"
}

export function shapeStrokeDash(element: PresentationElement): ShapeStrokeDash {
  return normalizeShapeStrokeDash(element.shapeStrokeDash)
}

export function shapeStrokeDashArray(element: PresentationElement) {
  const strokeWidth = shapeStrokeWidth(element)

  if (shapeStrokeDash(element) === "dash") return `${strokeWidth * 4} ${strokeWidth * 2}`
  if (shapeStrokeDash(element) === "dot") return `${strokeWidth} ${strokeWidth * 2}`
  if (shapeStrokeDash(element) === "dashDot") {
    return `${strokeWidth * 4} ${strokeWidth * 2} ${strokeWidth} ${strokeWidth * 2}`
  }

  return undefined
}

export function shapeStrokePptxDash(element: PresentationElement) {
  const dash = shapeStrokeDash(element)

  if (dash === "dot") return "sysDot"

  return dash
}

export function shapeStartArrowhead(element: PresentationElement): ShapeArrowhead {
  return normalizeShapeArrowhead(
    element.shapeStartArrowhead,
    shapeKind(element) === "doubleArrow" ? "triangle" : "none",
  )
}

export function shapeEndArrowhead(element: PresentationElement): ShapeArrowhead {
  return normalizeShapeArrowhead(
    element.shapeEndArrowhead,
    shapeKind(element) === "arrow" ||
      shapeKind(element) === "doubleArrow" ||
      shapeKind(element) === "elbowConnector" ||
      shapeKind(element) === "curvedConnector"
      ? "triangle"
      : "none",
  )
}

export function shapeFill(element: PresentationElement) {
  return isLinearShape(element) ? "transparent" : element.background || "#2563eb"
}
