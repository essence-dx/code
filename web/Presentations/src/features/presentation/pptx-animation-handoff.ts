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
import {
  isNativePptxAnimationEffect,
  nativePptxAnimationExportPlanForSlide,
  type NativePptxAnimationExportSupport,
} from "./pptx-animation-xml"
import type { Deck, ElementAnimation, Slide } from "./types"

type AnimationHandoffSupport = NativePptxAnimationExportSupport

export type PptxAnimationHandoffCue = {
  delayMs: number
  durationMs: number
  effect: string
  effectKind: ReturnType<typeof elementAnimationKind>
  effectKindLabel: string
  elementId: string
  handoffReason: string
  label: string
  motionX: number
  motionY: number
  nativeSupport: AnimationHandoffSupport
  order: number
  trigger: ReturnType<typeof elementAnimationTrigger>
  triggerLabel: string
}

export type AnimationHandoffReport = {
  entranceCount: number
  emphasisCount: number
  exitCount: number
  handoffOnlyCount: number
  handoffReasons: string[]
  motionCount: number
  nativeEmphasisXmlCount: number
  nativeExitXmlCount: number
  nativeMotionXmlCount: number
  nativeTargetReviewCount: number
  nativeXmlCount: number
  totalCount: number
}

function animationHandoffSupport(
  effect: ElementAnimation,
): AnimationHandoffSupport {
  return isNativePptxAnimationEffect(effect)
    ? "native-pptx-xml"
    : "speaker-note-handoff"
}

function animationHandoffReason(effect: ElementAnimation) {
  const kind = elementAnimationKind(effect)

  if (isNativePptxAnimationEffect(effect)) {
    const kindLabel = elementAnimationKindLabels[kind].toLowerCase()

    return `Native PPTX timing XML is generated for this ${kindLabel} effect.`
  }

  if (kind === "emphasis") {
    return "Emphasis effects remain speaker-note handoff metadata for PowerPoint review."
  }

  if (kind === "exit") {
    return "Exit effects remain speaker-note handoff metadata for PowerPoint review."
  }

  if (kind === "motion") {
    return "Motion-path effects remain speaker-note handoff metadata for PowerPoint review."
  }

  return "Animation remains speaker-note handoff metadata for PowerPoint review."
}

export function slideAnimationHandoffCues(slide: Slide, deck?: Deck) {
  const exportPlans = deck
    ? new Map(
        nativePptxAnimationExportPlanForSlide(deck, slide).map((item) => [
          item.elementId,
          item,
        ]),
      )
    : null

  return visibleElements(slide)
    .filter((element) => element.animation !== "none")
    .map(
      (element, index): PptxAnimationHandoffCue => {
        const effectKind = elementAnimationKind(element.animation)
        const exportPlan = exportPlans?.get(element.id)
        const nativeSupport =
          exportPlan?.status ?? animationHandoffSupport(element.animation)

        return {
          delayMs: elementAnimationDelay(element),
          durationMs: elementAnimationDuration(element),
          effect: elementAnimationLabels[element.animation],
          effectKind,
          effectKindLabel: elementAnimationKindLabels[effectKind],
          elementId: element.id,
          handoffReason:
            exportPlan?.detail ?? animationHandoffReason(element.animation),
          label: presentationElementLabel(element),
          motionX: elementAnimationMotionX(element),
          motionY: elementAnimationMotionY(element),
          nativeSupport,
          order: index + 1,
          trigger: elementAnimationTrigger(element),
          triggerLabel:
            elementAnimationTriggerLabels[elementAnimationTrigger(element)],
        }
      },
    )
}

export function animationHandoffReportFromCues(
  cues: PptxAnimationHandoffCue[],
): AnimationHandoffReport {
  const handoffReasons = Array.from(
    new Set(
      cues
        .filter((cue) => cue.nativeSupport !== "native-pptx-xml")
        .map((cue) => cue.handoffReason),
    ),
  )

  return {
    entranceCount: cues.filter((cue) => cue.effectKind === "entrance").length,
    emphasisCount: cues.filter((cue) => cue.effectKind === "emphasis").length,
    exitCount: cues.filter((cue) => cue.effectKind === "exit").length,
    handoffOnlyCount: cues.filter(
      (cue) => cue.nativeSupport !== "native-pptx-xml",
    ).length,
    handoffReasons,
    motionCount: cues.filter((cue) => cue.effectKind === "motion").length,
    nativeEmphasisXmlCount: cues.filter(
      (cue) =>
        cue.nativeSupport === "native-pptx-xml" && cue.effectKind === "emphasis",
    ).length,
    nativeExitXmlCount: cues.filter(
      (cue) =>
        cue.nativeSupport === "native-pptx-xml" && cue.effectKind === "exit",
    ).length,
    nativeMotionXmlCount: cues.filter(
      (cue) =>
        cue.nativeSupport === "native-pptx-xml" && cue.effectKind === "motion",
    ).length,
    nativeTargetReviewCount: cues.filter(
      (cue) => cue.nativeSupport === "native-target-review",
    ).length,
    nativeXmlCount: cues.filter((cue) => cue.nativeSupport === "native-pptx-xml")
      .length,
    totalCount: cues.length,
  }
}

export function deckAnimationHandoffReport(deck: Deck) {
  return animationHandoffReportFromCues(
    deck.slides.flatMap((slide) => slideAnimationHandoffCues(slide, deck)),
  )
}

export function serializePptxAnimationHandoffNotes(slide: Slide, deck?: Deck) {
  const cues = slideAnimationHandoffCues(slide, deck)
  if (!cues.length) return ""

  return [
    "Essence animation handoff:",
    "Native PPTX animation timelines are included for supported effects with stable Office targets; keep these notes for timing review and unsupported PowerPoint variants.",
    ...cues.map(
      (cue) => {
        const motion =
          cue.effectKind === "motion"
            ? ` motion ${cue.motionX}%,${cue.motionY}%.`
            : ""

        return `${cue.order}. ${cue.label} - ${cue.effect} (${cue.effectKindLabel}, ${cue.nativeSupport}); duration ${cue.durationMs}ms; delay ${cue.delayMs}ms; trigger ${cue.triggerLabel.toLowerCase()}.${motion} ${cue.handoffReason}`
      },
    ),
  ].join("\n")
}
