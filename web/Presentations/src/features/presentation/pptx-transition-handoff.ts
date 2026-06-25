import type { Slide, SlideTransition } from "./types"

const transitionLabels: Record<SlideTransition, string> = {
  fade: "Fade",
  none: "None",
  push: "Push",
  zoom: "Zoom",
}

export type PptxTransitionHandoffCue = {
  autoAdvanceMs: number
  durationMs: number
  transition: string
}

function duration(value: number) {
  return `${value}ms`
}

export function slideTransitionHandoffCue(
  slide: Slide,
): PptxTransitionHandoffCue | null {
  const transition = slide.transition ?? "none"
  const autoAdvanceMs = Math.max(0, slide.autoAdvanceAfterMs ?? 0)

  if (transition === "none" && !autoAdvanceMs) return null

  return {
    autoAdvanceMs,
    durationMs: Math.max(0, slide.transitionDurationMs ?? 350),
    transition: transitionLabels[transition],
  }
}

export function serializePptxTransitionHandoffNotes(slide: Slide) {
  const cue = slideTransitionHandoffCue(slide)
  if (!cue) return ""

  const autoAdvance = cue.autoAdvanceMs
    ? `auto-advance ${duration(cue.autoAdvanceMs)}`
    : "manual advance"

  return [
    "Essence transition handoff:",
    "Native PPTX transition XML is included for supported transition/timing settings; review in PowerPoint if the delivery needs sounds, morph, or advanced variants.",
    `Transition ${cue.transition}; duration ${duration(cue.durationMs)}; ${autoAdvance}.`,
  ].join("\n")
}
