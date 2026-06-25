"use client"

import { useMemo } from "react"
import {
  ArrowDown,
  ArrowUp,
  Clock3,
  ListVideo,
  Play,
  Plus,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

import {
  clampAnimationDelay,
  clampAnimationDuration,
  clampAnimationMotionOffset,
  elementAnimationLabels,
  elementAnimationTriggerLabels,
} from "../animation-effects"
import {
  animationPaneItemsForSlide,
  animationPaneSummary,
} from "../animation-pane"
import { isElementEditable } from "../element-visibility"
import type {
  ElementAnimation,
  ElementAnimationTrigger,
  PresentationElement,
} from "../types"
import { usePresentationStore } from "../use-presentation-store"

function formatTiming(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}s`
  }

  return `${value}ms`
}

function numericInputValue(value: string, fallback: number) {
  const nextValue = Number(value)
  return Number.isFinite(nextValue) ? nextValue : fallback
}

function selectedObjectLabel(element: PresentationElement | undefined) {
  if (!element) return "Add selected"
  return element.type === "title" || element.type === "text"
    ? "Add selected text"
    : "Add selected object"
}

export function AnimationPane() {
  const deck = usePresentationStore((state) => state.deck)
  const selectedSlideId = usePresentationStore((state) => state.selectedSlideId)
  const selectedElementId = usePresentationStore((state) => state.selectedElementId)
  const selectedElementIds = usePresentationStore(
    (state) => state.selectedElementIds,
  )
  const selectElement = usePresentationStore((state) => state.selectElement)
  const updateElement = usePresentationStore((state) => state.updateElement)
  const previewElementAnimation = usePresentationStore(
    (state) => state.previewElementAnimation,
  )
  const moveElementAnimationOrder = usePresentationStore(
    (state) => state.moveElementAnimationOrder,
  )

  const activeSlide = deck.slides.find((slide) => slide.id === selectedSlideId)
  const activeSelectedElementIds = useMemo(
    () =>
      selectedElementIds.length
        ? selectedElementIds
        : selectedElementId
          ? [selectedElementId]
          : [],
    [selectedElementId, selectedElementIds],
  )
  const primarySelectedElementId =
    activeSelectedElementIds.length === 1 ? activeSelectedElementIds[0] : null
  const primarySelectedElement = activeSlide?.elements.find(
    (element) => element.id === primarySelectedElementId,
  )
  const items = useMemo(
    () =>
      activeSlide
        ? animationPaneItemsForSlide(activeSlide, activeSelectedElementIds)
        : [],
    [activeSelectedElementIds, activeSlide],
  )
  const summary = useMemo(
    () =>
      activeSlide
        ? animationPaneSummary(activeSlide)
        : {
            afterPreviousCount: 0,
            effectCount: 0,
            maxEffectMs: 0,
            onClickCount: 0,
            totalTimelineMs: 0,
            withPreviousCount: 0,
          },
    [activeSlide],
  )
  const canAddSelected =
    primarySelectedElement &&
    isElementEditable(primarySelectedElement) &&
    primarySelectedElement.animation === "none"

  function updateAnimation(
    elementId: string,
    patch: Partial<
      Pick<
        PresentationElement,
        | "animation"
        | "animationDelayMs"
        | "animationDurationMs"
        | "animationMotionX"
        | "animationMotionY"
        | "animationTrigger"
      >
    >,
  ) {
    updateElement(elementId, patch)
  }

  function addSelectedAnimation() {
    if (!primarySelectedElement) return

    updateElement(primarySelectedElement.id, {
      animation: "fade",
      animationDelayMs: primarySelectedElement.animationDelayMs ?? 0,
      animationDurationMs: primarySelectedElement.animationDurationMs ?? 500,
      animationTrigger: primarySelectedElement.animationTrigger ?? "onClick",
    })
    previewElementAnimation(primarySelectedElement.id)
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" variant="ghost" size="sm" />}>
        <ListVideo className="size-4" />
        Animations
        {items.length ? (
          <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[0.68rem]">
            {items.length}
          </Badge>
        ) : null}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Animation pane</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{summary.effectCount} effects</Badge>
          <Badge variant="outline">
            <Clock3 className="size-3" />
            {formatTiming(summary.totalTimelineMs)}
          </Badge>
          <Badge variant="outline">{summary.onClickCount} click</Badge>
          {summary.withPreviousCount ? (
            <Badge variant="outline">{summary.withPreviousCount} with previous</Badge>
          ) : null}
          {summary.afterPreviousCount ? (
            <Badge variant="outline">
              {summary.afterPreviousCount} after previous
            </Badge>
          ) : null}
          <Badge variant="outline">Longest {formatTiming(summary.maxEffectMs)}</Badge>
          {canAddSelected ? (
            <Button type="button" size="sm" onClick={addSelectedAnimation}>
              <Plus className="size-4" />
              {selectedObjectLabel(primarySelectedElement)}
            </Button>
          ) : null}
        </div>

        <Separator />

        {items.length ? (
          <ScrollArea className="max-h-[62vh] pr-3">
            <div className="grid gap-2">
              {items.map((item, index) => (
                <div
                  key={item.elementId}
                  className={cn(
                    "grid gap-3 rounded-lg border bg-background p-3",
                    item.selected && "border-primary bg-primary/5",
                  )}
                  onClick={() => selectElement(item.elementId)}
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={item.selected ? "default" : "outline"}
                      className="h-7 min-w-7 justify-center rounded-md px-2"
                    >
                      {item.order}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {item.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.effectKindLabel} - {item.effectLabel} -{" "}
                        {formatTiming(item.durationMs)}
                        {item.delayMs
                          ? ` - ${formatTiming(item.delayMs)} delay`
                          : ""}
                        {` - ${item.triggerLabel}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title="Move earlier"
                        aria-label="Move animation earlier"
                        disabled={index === 0}
                        onClick={(event) => {
                          event.stopPropagation()
                          moveElementAnimationOrder(item.elementId, -1)
                        }}
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title="Move later"
                        aria-label="Move animation later"
                        disabled={index === items.length - 1}
                        onClick={(event) => {
                          event.stopPropagation()
                          moveElementAnimationOrder(item.elementId, 1)
                        }}
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title="Preview"
                        aria-label="Preview animation"
                        onClick={(event) => {
                          event.stopPropagation()
                          previewElementAnimation(item.elementId)
                        }}
                      >
                        <Play className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon-sm"
                        title="Remove animation"
                        aria-label="Remove animation"
                        onClick={(event) => {
                          event.stopPropagation()
                          updateAnimation(item.elementId, { animation: "none" })
                        }}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <div
                    className="grid gap-2 sm:grid-cols-[1.1fr_0.8fr_0.8fr_0.8fr]"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                      Effect
                      <select
                        className="h-8 rounded-md border bg-background px-2 text-sm text-foreground"
                        value={item.effect}
                        onChange={(event) =>
                          updateAnimation(item.elementId, {
                            animation: event.currentTarget
                              .value as ElementAnimation,
                          })
                        }
                      >
                        {Object.entries(elementAnimationLabels).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                      Start
                      <select
                        className="h-8 rounded-md border bg-background px-2 text-sm text-foreground"
                        value={item.trigger}
                        onChange={(event) =>
                          updateAnimation(item.elementId, {
                            animationTrigger: event.currentTarget
                              .value as ElementAnimationTrigger,
                          })
                        }
                      >
                        {Object.entries(elementAnimationTriggerLabels).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                      Duration ms
                      <Input
                        type="number"
                        min={50}
                        max={5000}
                        step={50}
                        value={item.durationMs}
                        onChange={(event) =>
                          updateAnimation(item.elementId, {
                            animationDurationMs: clampAnimationDuration(
                              numericInputValue(
                                event.currentTarget.value,
                                item.durationMs,
                              ),
                            ),
                          })
                        }
                      />
                    </label>
                    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                      Delay ms
                      <Input
                        type="number"
                        min={0}
                        max={10000}
                        step={50}
                        value={item.delayMs}
                        onChange={(event) =>
                          updateAnimation(item.elementId, {
                            animationDelayMs: clampAnimationDelay(
                              numericInputValue(
                                event.currentTarget.value,
                                item.delayMs,
                              ),
                            ),
                          })
                        }
                      />
                    </label>
                  </div>
                  {item.effect === "motionCustom" ? (
                    <div
                      className="grid gap-2 sm:grid-cols-2"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                        Motion X %
                        <Input
                          type="number"
                          min={-100}
                          max={100}
                          step={1}
                          value={item.motionX}
                          onChange={(event) =>
                            updateAnimation(item.elementId, {
                              animationMotionX: clampAnimationMotionOffset(
                                numericInputValue(
                                  event.currentTarget.value,
                                  item.motionX,
                                ),
                              ),
                            })
                          }
                        />
                      </label>
                      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                        Motion Y %
                        <Input
                          type="number"
                          min={-100}
                          max={100}
                          step={1}
                          value={item.motionY}
                          onChange={(event) =>
                            updateAnimation(item.elementId, {
                              animationMotionY: clampAnimationMotionOffset(
                                numericInputValue(
                                  event.currentTarget.value,
                                  item.motionY,
                                ),
                              ),
                            })
                          }
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            No animations on this slide.
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
