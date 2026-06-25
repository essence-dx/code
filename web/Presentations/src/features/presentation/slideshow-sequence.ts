import { elementAnimationKind, elementAnimationTrigger } from "./animation-effects"
import { visibleElements } from "./element-visibility"
import type { PresentationElement, Slide } from "./types"

export function sequencedSlideElements(slide: Slide): PresentationElement[] {
  return visibleElements(slide).filter(
    (element) =>
      element.animation !== "none" && elementAnimationTrigger(element) === "onClick",
  )
}

export function shouldShowSequencedElement(input: {
  animationStep: number | null
  element: PresentationElement
  sequenceIndex: number
}) {
  if (input.animationStep === null || input.element.animation === "none") {
    return true
  }

  const kind = elementAnimationKind(input.element.animation)
  const trigger = elementAnimationTrigger(input.element)

  if (trigger !== "onClick") {
    return kind === "exit" ? input.animationStep === 0 : true
  }

  if (kind === "emphasis" || kind === "motion") {
    return true
  }

  if (kind === "exit") {
    return (
      input.sequenceIndex < 0 ||
      input.animationStep <= input.sequenceIndex + 1
    )
  }

  return input.sequenceIndex >= 0 && input.sequenceIndex < input.animationStep
}

export function shouldPlaySequencedElementAnimation(input: {
  animationStep: number | null
  element: PresentationElement
  sequenceIndex: number
}) {
  if (input.element.animation === "none") return false

  if (input.animationStep === null) {
    return elementAnimationKind(input.element.animation) !== "exit"
  }

  if (elementAnimationTrigger(input.element) !== "onClick") {
    return input.animationStep === 0
  }

  return input.sequenceIndex >= 0 && input.animationStep === input.sequenceIndex + 1
}
