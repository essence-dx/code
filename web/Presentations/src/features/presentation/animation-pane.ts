import {
  elementAnimationDelay,
  elementAnimationDuration,
  elementAnimationKind,
  elementAnimationKindLabels,
  elementAnimationLabels,
  elementAnimationMotionX,
  elementAnimationMotionY,
  elementAnimationTrigger,
  elementAnimationTriggerLabels,
} from "./animation-effects"
import { visibleElements } from "./element-visibility"
import { presentationElementLabel } from "./element-labels"
import type { ElementAnimation, Slide } from "./types"

export type AnimationPaneEffect = Exclude<ElementAnimation, "none">

export type AnimationPaneItem = {
  delayMs: number
  durationMs: number
  effect: AnimationPaneEffect
  effectKindLabel: string
  effectLabel: string
  elementId: string
  label: string
  motionX: number
  motionY: number
  order: number
  selected: boolean
  trigger: ReturnType<typeof elementAnimationTrigger>
  triggerLabel: string
}

export type AnimationPaneSummary = {
  afterPreviousCount: number
  effectCount: number
  maxEffectMs: number
  onClickCount: number
  totalTimelineMs: number
  withPreviousCount: number
}

export function animationPaneItemsForSlide(
  slide: Slide,
  selectedElementIds: readonly string[] = [],
): AnimationPaneItem[] {
  const selected = new Set(selectedElementIds)

  return visibleElements(slide)
    .filter((element) => element.animation !== "none")
    .map((element, index) => {
      const kind = elementAnimationKind(element.animation)

      return {
        delayMs: elementAnimationDelay(element),
        durationMs: elementAnimationDuration(element),
        effect: element.animation as AnimationPaneEffect,
        effectKindLabel: elementAnimationKindLabels[kind],
        effectLabel: elementAnimationLabels[element.animation],
        elementId: element.id,
        label: presentationElementLabel(element),
        motionX: elementAnimationMotionX(element),
        motionY: elementAnimationMotionY(element),
        order: index + 1,
        selected: selected.has(element.id),
        trigger: elementAnimationTrigger(element),
        triggerLabel: elementAnimationTriggerLabels[elementAnimationTrigger(element)],
      }
    })
}

export function animationPaneSummary(slide: Slide): AnimationPaneSummary {
  const items = animationPaneItemsForSlide(slide)

  return {
    afterPreviousCount: items.filter((item) => item.trigger === "afterPrevious")
      .length,
    effectCount: items.length,
    maxEffectMs: items.reduce(
      (max, item) => Math.max(max, item.delayMs + item.durationMs),
      0,
    ),
    onClickCount: items.filter((item) => item.trigger === "onClick").length,
    totalTimelineMs: items.reduce(
      (total, item) => total + item.delayMs + item.durationMs,
      0,
    ),
    withPreviousCount: items.filter((item) => item.trigger === "withPrevious")
      .length,
  }
}

export function moveAnimatedElementInOrder(
  slide: Slide,
  elementId: string,
  direction: -1 | 1,
) {
  const animatedIds = visibleElements(slide)
    .filter((element) => element.animation !== "none")
    .map((element) => element.id)
  const currentOrderIndex = animatedIds.indexOf(elementId)
  const targetId = animatedIds[currentOrderIndex + direction]

  if (currentOrderIndex < 0 || !targetId) {
    return {
      moved: false,
      slide,
    }
  }

  const elements = [...slide.elements]
  const sourceIndex = elements.findIndex((element) => element.id === elementId)

  if (sourceIndex < 0) {
    return {
      moved: false,
      slide,
    }
  }

  const [movingElement] = elements.splice(sourceIndex, 1)
  const targetIndex = elements.findIndex((element) => element.id === targetId)

  if (!movingElement || targetIndex < 0) {
    return {
      moved: false,
      slide,
    }
  }

  elements.splice(direction > 0 ? targetIndex + 1 : targetIndex, 0, movingElement)

  return {
    moved: true,
    slide: {
      ...slide,
      elements,
    },
  }
}
