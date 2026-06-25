"use client"

import { ArrowDown, ArrowUp, Eye, EyeOff, Lock, Unlock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { chartText } from "../chart-formatting"
import { isElementHidden, isElementLocked } from "../element-visibility"
import { iconDefinition } from "../icon-library"
import { shapeKindLabels, shapeKind } from "../shape-formatting"
import { tableText } from "../table-formatting"
import type { PresentationElement, Slide } from "../types"
import { usePresentationStore } from "../use-presentation-store"

function elementName(element: PresentationElement, index: number) {
  const content =
    element.type === "image"
      ? element.alt
      : element.type === "video"
        ? element.alt || "Video"
        : element.type === "audio"
          ? element.alt || "Audio"
          : element.type === "icon"
            ? element.alt || iconDefinition(element.iconName).label
          : element.type === "shape"
        ? shapeKindLabels[shapeKind(element)]
        : element.type === "table"
          ? tableText(element) || "Table"
          : element.type === "chart"
            ? chartText(element) || "Chart"
            : element.content

  return content.trim().split(/\r?\n/)[0] || `${element.type} ${index + 1}`
}

export function LayerList({ slide }: { slide: Slide }) {
  const selectedElementId = usePresentationStore(
    (state) => state.selectedElementId,
  )
  const selectedElementIds = usePresentationStore(
    (state) => state.selectedElementIds,
  )
  const selectElement = usePresentationStore((state) => state.selectElement)
  const updateElement = usePresentationStore((state) => state.updateElement)
  const moveSelectedElementLayer = usePresentationStore(
    (state) => state.moveSelectedElementLayer,
  )
  const layers = slide.elements
    .map((element, index) => ({ element, index }))
    .reverse()

  function moveLayer(elementId: string, direction: -1 | 1) {
    selectElement(elementId)
    moveSelectedElementLayer(direction, "step")
  }

  return (
    <section className="grid gap-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Layers</div>
        <span className="text-xs text-muted-foreground">
          {slide.elements.length} objects
        </span>
      </div>
      {layers.length ? (
        <div
          role="list"
          aria-label="Slide layers"
          className="max-h-44 space-y-1 overflow-auto rounded-md border bg-muted/20 p-1"
        >
          {layers.map(({ element, index }) => {
            const hidden = isElementHidden(element)
            const locked = isElementLocked(element)
            const selected =
              selectedElementId === element.id ||
              selectedElementIds.includes(element.id)
            const canMoveForward = !locked && index < slide.elements.length - 1
            const canMoveBackward = !locked && index > 0

            return (
              <div
                key={element.id}
                role="listitem"
                className={cn(
                  "flex items-center gap-1 rounded-sm",
                  selected && "bg-primary/10",
                  hidden && "opacity-60",
                )}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-w-0 flex-1 justify-start px-2 text-left"
                  aria-label={`Select layer ${elementName(element, index)}`}
                  aria-pressed={selected}
                  onClick={(event) =>
                    selectElement(element.id, {
                      additive:
                        event.ctrlKey || event.metaKey || event.shiftKey,
                    })
                  }
                >
                  <span className="min-w-0 flex-1 truncate">
                    {elementName(element, index)}
                  </span>
                  <span className="ml-2 shrink-0 text-[10px] uppercase text-muted-foreground">
                    {element.groupId ? "group" : element.type}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label="Move layer forward"
                  disabled={!canMoveForward}
                  onClick={() => moveLayer(element.id, 1)}
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label="Move layer backward"
                  disabled={!canMoveBackward}
                  onClick={() => moveLayer(element.id, -1)}
                >
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label={hidden ? "Show layer" : "Hide layer"}
                  onClick={() => updateElement(element.id, { hidden: !hidden })}
                >
                  {hidden ? (
                    <EyeOff className="size-3.5" />
                  ) : (
                    <Eye className="size-3.5" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label={locked ? "Unlock layer" : "Lock layer"}
                  onClick={() => updateElement(element.id, { locked: !locked })}
                >
                  {locked ? (
                    <Lock className="size-3.5" />
                  ) : (
                    <Unlock className="size-3.5" />
                  )}
                </Button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          Add text, shapes, charts, tables, or images to create editable layers.
        </div>
      )}
    </section>
  )
}
