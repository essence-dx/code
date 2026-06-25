import type PptxGenJS from "pptxgenjs"

import { shapeKind } from "./shape-formatting"
import { shapeConnectorGeometry } from "./shape-geometry"
import type { PresentationElement } from "./types"

export type PptxConnectorFrame = {
  h: number
  w: number
}

export type PptxConnectorCustomGeometryPoints = NonNullable<
  PptxGenJS.ShapeProps["points"]
>

type ConnectorPoint = Extract<
  PptxConnectorCustomGeometryPoints[number],
  { x: PptxGenJS.Coord; y: PptxGenJS.Coord }
>

function point(
  xPercent: number,
  yPercent: number,
  frame: PptxConnectorFrame,
): ConnectorPoint {
  return {
    x: (frame.w * xPercent) / 100,
    y: (frame.h * yPercent) / 100,
  }
}

export function pptxConnectorCustomGeometryPoints(
  element: PresentationElement,
  frame: PptxConnectorFrame,
): PptxConnectorCustomGeometryPoints | null {
  const kind = shapeKind(element)
  if (kind !== "elbowConnector" && kind !== "curvedConnector") return null

  const geometry = shapeConnectorGeometry(element)
  const start = point(geometry.startX, geometry.startY, frame)
  const control = point(geometry.controlX, geometry.controlY, frame)
  const end = point(geometry.endX, geometry.endY, frame)

  if (kind === "curvedConnector") {
    return [
      { ...start, moveTo: true },
      {
        ...end,
        curve: {
          type: "quadratic",
          x1: control.x,
          y1: control.y,
        },
      },
    ]
  }

  return [
    { ...start, moveTo: true },
    { x: control.x, y: start.y },
    control,
    { x: end.x, y: control.y },
    end,
  ]
}
