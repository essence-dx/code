import { chartTypeLabels } from "./chart-formatting"
import { iconDefinition } from "./icon-library"
import { shapeKind, shapeKindLabels } from "./shape-formatting"
import type { PresentationElement } from "./types"

function oneLine(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function clipped(value: string, fallback: string, maxLength: number) {
  const label = oneLine(value) || fallback
  return label.length > maxLength ? `${label.slice(0, maxLength - 3)}...` : label
}

export function presentationElementLabel(
  element: PresentationElement,
  maxLength = 48,
) {
  if (element.type === "title") {
    return clipped(element.content, "Title", maxLength)
  }

  if (element.type === "text") {
    return clipped(element.content, "Text", maxLength)
  }

  if (element.type === "shape") {
    return shapeKindLabels[shapeKind(element)]
  }

  if (element.type === "icon") {
    return iconDefinition(element.iconName).label
  }

  if (element.type === "image") {
    return clipped(element.alt, "Image", maxLength)
  }

  if (element.type === "video") {
    return clipped(element.alt, "Video", maxLength)
  }

  if (element.type === "audio") {
    return clipped(element.alt, "Audio", maxLength)
  }

  if (element.type === "table") {
    return "Table"
  }

  return clipped(element.content, `${chartTypeLabels[element.chartType]} chart`, maxLength)
}
