import { visibleElements } from "./element-visibility"
import { shapeConnectorGeometry } from "./shape-geometry"
import {
  shapeArrowheadLabels,
  shapeEndArrowhead,
  shapeKind,
  shapeKindLabels,
  shapeStartArrowhead,
  shapeStrokeDash,
  shapeStrokeDashLabels,
} from "./shape-formatting"
import type { PresentationElement, ShapeKind, Slide } from "./types"

type ConnectorKind = Extract<ShapeKind, "curvedConnector" | "elbowConnector">

export type PptxConnectorHandoffCue = {
  controlX: number
  controlY: number
  dash: string
  elementId: string
  endArrowhead: string
  endX: number
  endY: number
  kind: ConnectorKind
  label: string
  order: number
  startArrowhead: string
  startX: number
  startY: number
}

function isConnectorKind(kind: ShapeKind): kind is ConnectorKind {
  return kind === "elbowConnector" || kind === "curvedConnector"
}

function connectorElementKind(element: PresentationElement) {
  if (element.type !== "shape") return null

  const kind = shapeKind(element)
  return isConnectorKind(kind) ? kind : null
}

function percent(value: number) {
  const rounded = Math.round(value * 10) / 10
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`
}

function point(x: number, y: number) {
  return `${percent(x)},${percent(y)}`
}

export function slideConnectorHandoffCues(slide: Slide) {
  return visibleElements(slide)
    .map((element) => ({ element, kind: connectorElementKind(element) }))
    .filter(
      (item): item is { element: PresentationElement; kind: ConnectorKind } =>
        Boolean(item.kind),
    )
    .map(({ element, kind }, index): PptxConnectorHandoffCue => {
      const geometry = shapeConnectorGeometry(element)

      return {
        controlX: geometry.controlX,
        controlY: geometry.controlY,
        dash: shapeStrokeDashLabels[shapeStrokeDash(element)],
        elementId: element.id,
        endArrowhead: shapeArrowheadLabels[shapeEndArrowhead(element)],
        endX: geometry.endX,
        endY: geometry.endY,
        kind,
        label: shapeKindLabels[kind],
        order: index + 1,
        startArrowhead: shapeArrowheadLabels[shapeStartArrowhead(element)],
        startX: geometry.startX,
        startY: geometry.startY,
      }
    })
}

export function serializePptxConnectorHandoffNotes(slide: Slide) {
  const cues = slideConnectorHandoffCues(slide)
  if (!cues.length) return ""

  return [
    "Essence connector handoff:",
    "Routed connectors export as editable custom Office geometry with route notes for live-connector rebuilds.",
    ...cues.map(
      (cue) =>
        `${cue.order}. ${cue.label} - start ${point(
          cue.startX,
          cue.startY,
        )}; control ${point(cue.controlX, cue.controlY)}; end ${point(
          cue.endX,
          cue.endY,
        )}; start arrow ${cue.startArrowhead}; end arrow ${cue.endArrowhead}; dash ${cue.dash}.`,
    ),
  ].join("\n")
}
