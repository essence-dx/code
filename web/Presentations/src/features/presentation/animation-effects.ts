import type {
  ElementAnimation,
  ElementAnimationTrigger,
  PresentationElement,
} from "./types"

export const elementAnimationOptions = [
  "none",
  "fade",
  "rise",
  "zoom",
  "wipe",
  "flyLeft",
  "flyRight",
  "pulse",
  "spin",
  "growShrink",
  "teeter",
  "fadeOut",
  "fadeOutDown",
  "motionLeft",
  "motionRight",
  "motionCustom",
] as const satisfies readonly ElementAnimation[]

export const elementAnimationTriggerOptions = [
  "onClick",
  "withPrevious",
  "afterPrevious",
] as const satisfies readonly ElementAnimationTrigger[]

export const elementAnimationLabels: Record<ElementAnimation, string> = {
  none: "None",
  fade: "Fade",
  rise: "Rise",
  zoom: "Zoom",
  wipe: "Wipe",
  flyLeft: "Fly in left",
  flyRight: "Fly in right",
  pulse: "Pulse",
  spin: "Spin",
  growShrink: "Grow/shrink",
  teeter: "Teeter",
  fadeOut: "Fade out",
  fadeOutDown: "Fade out down",
  motionLeft: "Motion left",
  motionRight: "Motion right",
  motionCustom: "Custom motion",
}

export const elementAnimationTriggerLabels: Record<
  ElementAnimationTrigger,
  string
> = {
  afterPrevious: "After previous",
  onClick: "On click",
  withPrevious: "With previous",
}

export type ElementAnimationKind = "none" | "entrance" | "emphasis" | "exit" | "motion"

export const elementAnimationKindLabels: Record<ElementAnimationKind, string> = {
  none: "None",
  entrance: "Entrance",
  emphasis: "Emphasis",
  exit: "Exit",
  motion: "Motion path",
}

export function elementAnimationKind(
  animation: ElementAnimation | undefined,
): ElementAnimationKind {
  if (!animation || animation === "none") return "none"
  if (
    animation === "pulse" ||
    animation === "spin" ||
    animation === "growShrink" ||
    animation === "teeter"
  ) {
    return "emphasis"
  }
  if (animation === "fadeOut" || animation === "fadeOutDown") return "exit"
  if (
    animation === "motionLeft" ||
    animation === "motionRight" ||
    animation === "motionCustom"
  ) {
    return "motion"
  }

  return "entrance"
}

export function clampAnimationDuration(value: number) {
  return Math.max(50, Math.min(5000, Math.round(value)))
}

export function clampAnimationDelay(value: number) {
  return Math.max(0, Math.min(10000, Math.round(value)))
}

export function clampAnimationMotionOffset(value: number) {
  const numeric = Number.isFinite(value) ? value : 0

  return Math.max(-100, Math.min(100, Math.round(numeric * 10) / 10))
}

export function normalizeElementAnimationTrigger(
  value: unknown,
): ElementAnimationTrigger {
  return elementAnimationTriggerOptions.includes(value as ElementAnimationTrigger)
    ? (value as ElementAnimationTrigger)
    : "onClick"
}

export function elementAnimationClass(animation: ElementAnimation | undefined) {
  return {
    none: "",
    fade: "object-animation-fade",
    rise: "object-animation-rise",
    zoom: "object-animation-zoom",
    wipe: "object-animation-wipe",
    flyLeft: "object-animation-fly-left",
    flyRight: "object-animation-fly-right",
    pulse: "object-animation-pulse",
    spin: "object-animation-spin",
    growShrink: "object-animation-grow-shrink",
    teeter: "object-animation-teeter",
    fadeOut: "object-animation-fade-out",
    fadeOutDown: "object-animation-fade-out-down",
    motionLeft: "object-animation-motion-left",
    motionRight: "object-animation-motion-right",
    motionCustom: "object-animation-motion-custom",
  }[animation ?? "none"]
}

export function elementAnimationDuration(element: PresentationElement) {
  return clampAnimationDuration(element.animationDurationMs ?? 500)
}

export function elementAnimationDelay(element: PresentationElement) {
  return clampAnimationDelay(element.animationDelayMs ?? 0)
}

export function elementAnimationMotionX(element: PresentationElement) {
  return clampAnimationMotionOffset(element.animationMotionX ?? 16)
}

export function elementAnimationMotionY(element: PresentationElement) {
  return clampAnimationMotionOffset(element.animationMotionY ?? 0)
}

export function elementAnimationTrigger(element: PresentationElement) {
  return normalizeElementAnimationTrigger(element.animationTrigger)
}
