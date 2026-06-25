"use client"

import {
  isLinearShape,
  shapeFill,
  shapeEndArrowhead,
  shapeKind,
  shapeStartArrowhead,
  shapeStrokeColor,
  shapeStrokeDashArray,
  shapeStrokeWidth,
} from "../shape-formatting"
import {
  shapeConnectorGeometry,
  shapeConnectorPath,
  shapeLineEndpoints,
  shapePath,
  shapePolygonPoints,
} from "../shape-geometry"
import type { PresentationElement, ShapeArrowhead } from "../types"

type ShapePreviewProps = {
  element: PresentationElement
}

function ArrowheadMarker({
  id,
  kind,
  stroke,
}: {
  id: string
  kind: ShapeArrowhead
  stroke: string
}) {
  if (kind === "none") return null

  return (
    <marker
      id={id}
      markerHeight="8"
      markerWidth="8"
      orient="auto-start-reverse"
      refX="8"
      refY="4"
      viewBox="0 0 8 8"
    >
      {kind === "diamond" ? (
        <path d="M4,0 L8,4 L4,8 L0,4 Z" fill={stroke} />
      ) : kind === "oval" ? (
        <circle cx="4" cy="4" fill={stroke} r="3.5" />
      ) : (
        <path d="M0,0 L8,4 L0,8 Z" fill={stroke} />
      )}
    </marker>
  )
}

export function ShapePreview({ element }: ShapePreviewProps) {
  const kind = shapeKind(element)
  const fill = shapeFill(element)
  const stroke = shapeStrokeColor(element)
  const strokeWidth = shapeStrokeWidth(element)
  const startArrowhead = shapeStartArrowhead(element)
  const endArrowhead = shapeEndArrowhead(element)
  const startMarkerId = `start-arrow-${element.id}`
  const endMarkerId = `end-arrow-${element.id}`
  const connectorGeometry = shapeConnectorGeometry(element)
  const polygonPoints = shapePolygonPoints(kind, {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  })
  const connectorPath = shapeConnectorPath(kind, {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  }, connectorGeometry)
  const lineEndpoints = shapeLineEndpoints(
    {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    },
    connectorGeometry,
  )
  const customPath = shapePath(kind, {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  })
  const shared = {
    fill,
    stroke,
    strokeDasharray: shapeStrokeDashArray(element),
    strokeWidth,
  }

  return (
    <span className="block size-full overflow-hidden rounded-[inherit]">
      <svg
        aria-hidden="true"
        className="size-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        {kind === "ellipse" ? (
          <ellipse cx="50" cy="50" rx="48" ry="48" {...shared} />
        ) : polygonPoints ? (
          <polygon points={polygonPoints} {...shared} />
        ) : customPath ? (
          <path d={customPath} {...shared} />
        ) : connectorPath ? (
          <>
            <defs>
              <ArrowheadMarker id={startMarkerId} kind={startArrowhead} stroke={stroke} />
              <ArrowheadMarker id={endMarkerId} kind={endArrowhead} stroke={stroke} />
            </defs>
            <path
              d={connectorPath}
              fill="none"
              markerEnd={
                endArrowhead !== "none" ? `url(#${endMarkerId})` : undefined
              }
              markerStart={
                startArrowhead !== "none" ? `url(#${startMarkerId})` : undefined
              }
              stroke={stroke}
              strokeDasharray={shapeStrokeDashArray(element)}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={strokeWidth}
            />
          </>
        ) : kind === "line" || kind === "arrow" ? (
          <>
            <defs>
              <ArrowheadMarker id={startMarkerId} kind={startArrowhead} stroke={stroke} />
              <ArrowheadMarker id={endMarkerId} kind={endArrowhead} stroke={stroke} />
            </defs>
            <line
              markerEnd={
                endArrowhead !== "none" ? `url(#${endMarkerId})` : undefined
              }
              markerStart={
                startArrowhead !== "none" ? `url(#${startMarkerId})` : undefined
              }
              stroke={stroke}
              strokeDasharray={shapeStrokeDashArray(element)}
              strokeLinecap="round"
              strokeWidth={strokeWidth}
              x1={lineEndpoints.x1}
              x2={lineEndpoints.x2}
              y1={lineEndpoints.y1}
              y2={lineEndpoints.y2}
            />
          </>
        ) : (
          <rect
            height="96"
            rx={kind === "rounded" ? Math.max(8, element.radius) : element.radius}
            width="96"
            x="2"
            y="2"
            {...shared}
          />
        )}
      </svg>
    </span>
  )
}
