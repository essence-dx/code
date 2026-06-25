import { pptxActionSettingPlan } from "./pptx-action-settings"
import {
  slideAnimationHandoffCues,
  type PptxAnimationHandoffCue,
} from "./pptx-animation-handoff"
import type {
  PptxActionSettingPlanItem,
  PptxActionTargetKind,
} from "./pptx-action-settings"
import type { Deck } from "./types"

export type OfficeActionAnimationStatus = "ready" | "warning"

export type OfficeActionCatalogKind =
  | "email-hyperlink"
  | "external-hyperlink"
  | "invalid-url"
  | "missing-slide-target"
  | "self-slide-review"
  | "slide-jump"
  | "telephone-hyperlink"

export type OfficeAnimationCatalogKind =
  | "emphasis-handoff"
  | "entrance-handoff"
  | "exit-handoff"
  | "motion-path-handoff"
  | "native-emphasis"
  | "native-entrance"
  | "native-exit"
  | "native-motion-path"
  | "native-target-review"

export type OfficeActionReviewItem = {
  catalogKind: OfficeActionCatalogKind
  catalogLabel: string
  detail: string
  elementId: string
  id: string
  objectLabel: string
  objectRef: string
  officeMarkup: string
  ownerAction: string
  relationshipTarget: string
  slideNumber: number
  slideTitle: string
  status: OfficeActionAnimationStatus
  targetLabel: string
}

export type OfficeAnimationReviewItem = {
  catalogKind: OfficeAnimationCatalogKind
  catalogLabel: string
  delayMs: number
  detail: string
  durationMs: number
  effect: string
  elementId: string
  id: string
  motionX: number
  motionY: number
  nativeSupport: PptxAnimationHandoffCue["nativeSupport"]
  objectLabel: string
  objectRef: string
  officeMarkup: string
  ownerAction: string
  slideNumber: number
  slideTitle: string
  status: OfficeActionAnimationStatus
  trigger: PptxAnimationHandoffCue["trigger"]
  triggerLabel: string
}

export type OfficeActionAnimationReviewPlan = {
  actionItems: OfficeActionReviewItem[]
  animationAfterPreviousTriggerCount: number
  animationItems: OfficeAnimationReviewItem[]
  animationOnClickTriggerCount: number
  animationWithPreviousTriggerCount: number
  blockedActionCount: number
  customMotionPathCount: number
  emailActionCount: number
  emphasisHandoffCount: number
  exactObjectWarningCount: number
  exitHandoffCount: number
  externalActionCount: number
  invalidUrlActionCount: number
  items: Array<OfficeActionReviewItem | OfficeAnimationReviewItem>
  missingSlideActionCount: number
  motionPathHandoffCount: number
  nativeActionCatalogCount: number
  nativeAnimationXmlCount: number
  nativeTargetReviewAnimationCount: number
  readyCount: number
  selfTargetActionCount: number
  status: OfficeActionAnimationStatus
  summary: string
  telephoneActionCount: number
  totalCount: number
  warningCount: number
}

function actionCatalogKind(
  targetKind: PptxActionTargetKind,
): OfficeActionCatalogKind {
  if (targetKind === "slide") return "slide-jump"
  if (targetKind === "mailto") return "email-hyperlink"
  if (targetKind === "tel") return "telephone-hyperlink"
  if (targetKind === "self-slide") return "self-slide-review"
  if (targetKind === "missing-slide") return "missing-slide-target"
  if (targetKind === "invalid-url") return "invalid-url"

  return "external-hyperlink"
}

const actionCatalogLabels: Record<OfficeActionCatalogKind, string> = {
  "email-hyperlink": "Office mail hyperlink",
  "external-hyperlink": "Office external hyperlink",
  "invalid-url": "Invalid URL handoff",
  "missing-slide-target": "Missing slide target",
  "self-slide-review": "Self-targeted slide action",
  "slide-jump": "Office slide jump",
  "telephone-hyperlink": "Office telephone hyperlink",
}

function actionOwnerAction(item: PptxActionSettingPlanItem) {
  if (item.targetKind === "missing-slide") {
    return `Relink ${item.label} to an existing slide before export.`
  }

  if (item.targetKind === "invalid-url") {
    return `Replace ${item.label} with an https, mailto, tel, or valid slide action.`
  }

  if (item.targetKind === "self-slide") {
    return `Move ${item.label} to another target slide or remove the self jump.`
  }

  return `No action needed for ${item.label}; PowerPoint can use ${item.officeAction}.`
}

function actionOfficeMarkup(item: PptxActionSettingPlanItem) {
  if (!item.nativeExport) return "none"
  if (item.relationshipKind === "internal-slide") {
    return `a:hlinkClick + slide relationship ${item.relationshipTarget}`
  }

  return `a:hlinkClick + external hyperlink ${item.relationshipTarget}`
}

function actionItem(item: PptxActionSettingPlanItem): OfficeActionReviewItem {
  const catalogKind = actionCatalogKind(item.targetKind)
  const objectRef = `Slide ${item.slideNumber} (${item.slideTitle}) - ${item.label} [${item.elementId}]`

  return {
    catalogKind,
    catalogLabel: actionCatalogLabels[catalogKind],
    detail: item.detail,
    elementId: item.elementId,
    id: `action:${item.slideId}:${item.elementId}`,
    objectLabel: item.label,
    objectRef,
    officeMarkup: actionOfficeMarkup(item),
    ownerAction: actionOwnerAction(item),
    relationshipTarget: item.relationshipTarget,
    slideNumber: item.slideNumber,
    slideTitle: item.slideTitle,
    status: item.status,
    targetLabel: item.targetLabel,
  }
}

function animationCatalogKind(
  cue: PptxAnimationHandoffCue,
): OfficeAnimationCatalogKind {
  if (cue.nativeSupport === "native-target-review") return "native-target-review"
  if (cue.nativeSupport === "native-pptx-xml") {
    if (cue.effectKind === "emphasis") return "native-emphasis"
    if (cue.effectKind === "exit") return "native-exit"
    if (cue.effectKind === "motion") return "native-motion-path"

    return "native-entrance"
  }
  if (cue.effectKind === "emphasis") return "emphasis-handoff"
  if (cue.effectKind === "exit") return "exit-handoff"
  if (cue.effectKind === "motion") return "motion-path-handoff"

  return "entrance-handoff"
}

const animationCatalogLabels: Record<OfficeAnimationCatalogKind, string> = {
  "emphasis-handoff": "Emphasis handoff",
  "entrance-handoff": "Entrance handoff",
  "exit-handoff": "Exit handoff",
  "motion-path-handoff": "Motion-path handoff",
  "native-emphasis": "Native emphasis timing",
  "native-entrance": "Native entrance timing",
  "native-exit": "Native exit timing",
  "native-motion-path": "Native motion-path timing",
  "native-target-review": "Native timing target review",
}

function animationOwnerAction(cue: PptxAnimationHandoffCue) {
  if (cue.nativeSupport === "native-target-review") {
    return `Keep ${cue.label} as a single editable Office object or simplify the exported object before relying on native timing.`
  }

  if (cue.nativeSupport === "native-pptx-xml") {
    return `No action needed for ${cue.label}; native PPTX timing XML is authored.`
  }

  if (cue.effectKind === "emphasis") {
    return `Rebuild ${cue.label} as a PowerPoint emphasis effect or switch to a native entrance/exit effect before export.`
  }

  if (cue.effectKind === "exit") {
    return `Use Fade out for ${cue.label} when native exit timing is required, or keep the handoff note.`
  }

  if (cue.effectKind === "motion") {
    return `Recreate ${cue.label} with PowerPoint motion-path tooling after export.`
  }

  return `Switch ${cue.label} to Fade, Rise, Zoom, or Wipe when native entrance timing is required.`
}

function animationOfficeMarkup(cue: PptxAnimationHandoffCue) {
  if (cue.nativeSupport === "native-pptx-xml") {
    return "p:timing native animation timeline"
  }

  if (cue.nativeSupport === "native-target-review") {
    return "p:timing blocked until the exported object has one stable Office target"
  }

  return "speaker-note handoff metadata"
}

function animationItem(input: {
  cue: PptxAnimationHandoffCue
  slideNumber: number
  slideTitle: string
}): OfficeAnimationReviewItem {
  const catalogKind = animationCatalogKind(input.cue)
  const objectRef = `Slide ${input.slideNumber} (${input.slideTitle}) - ${input.cue.label} [${input.cue.elementId}]`

  return {
    catalogKind,
    catalogLabel: animationCatalogLabels[catalogKind],
    delayMs: input.cue.delayMs,
    detail: input.cue.handoffReason,
    durationMs: input.cue.durationMs,
    effect: input.cue.effect,
    elementId: input.cue.elementId,
    id: `animation:${input.slideNumber}:${input.cue.elementId}`,
    motionX: input.cue.motionX,
    motionY: input.cue.motionY,
    nativeSupport: input.cue.nativeSupport,
    objectLabel: input.cue.label,
    objectRef,
    officeMarkup: animationOfficeMarkup(input.cue),
    ownerAction: animationOwnerAction(input.cue),
    slideNumber: input.slideNumber,
    slideTitle: input.slideTitle,
    status:
      input.cue.nativeSupport === "native-pptx-xml" ? "ready" : "warning",
    trigger: input.cue.trigger,
    triggerLabel: input.cue.triggerLabel,
  }
}

function slideTitle(deck: Deck, index: number) {
  return deck.slides[index]?.title.trim() || `Slide ${index + 1}`
}

function animationItems(deck: Deck) {
  return deck.slides.flatMap((slide, slideIndex) =>
    slideAnimationHandoffCues(slide, deck).map((cue) =>
      animationItem({
        cue,
        slideNumber: slideIndex + 1,
        slideTitle: slideTitle(deck, slideIndex),
      }),
    ),
  )
}

function reviewSummary(input: {
  blockedActionCount: number
  exactObjectWarningCount: number
  nativeActionCatalogCount: number
  nativeAnimationXmlCount: number
  totalCount: number
}) {
  if (!input.totalCount) {
    return "No Office action or animation metadata needs review."
  }

  if (!input.exactObjectWarningCount) {
    return `${input.totalCount} Office action/animation object(s) are ready for native metadata handoff.`
  }

  return `${input.exactObjectWarningCount} exact Office action/animation object(s) need review; ${input.blockedActionCount} action blocker(s), ${input.nativeActionCatalogCount} action catalog item(s), and ${input.nativeAnimationXmlCount} animation target(s) are native-ready.`
}

export function officeActionAnimationReviewPlan(
  deck: Deck,
): OfficeActionAnimationReviewPlan {
  const actionItems = pptxActionSettingPlan(deck).items.map(actionItem)
  const animations = animationItems(deck)
  const items = [...actionItems, ...animations]
  const warningCount = items.filter((item) => item.status === "warning").length
  const readyCount = items.length - warningCount
  const nativeActionCatalogCount = actionItems.filter(
    (item) => item.status === "ready",
  ).length
  const nativeAnimationXmlCount = animations.filter(
    (item) => item.nativeSupport === "native-pptx-xml",
  ).length
  const blockedActionCount = actionItems.filter(
    (item) => item.status === "warning",
  ).length

  return {
    actionItems,
    animationAfterPreviousTriggerCount: animations.filter(
      (item) => item.trigger === "afterPrevious",
    ).length,
    animationItems: animations,
    animationOnClickTriggerCount: animations.filter(
      (item) => item.trigger === "onClick",
    ).length,
    animationWithPreviousTriggerCount: animations.filter(
      (item) => item.trigger === "withPrevious",
    ).length,
    blockedActionCount,
    customMotionPathCount: animations.filter(
      (item) => item.effect === "Custom motion",
    ).length,
    emailActionCount: actionItems.filter(
      (item) => item.catalogKind === "email-hyperlink",
    ).length,
    emphasisHandoffCount: animations.filter(
      (item) => item.catalogKind === "emphasis-handoff",
    ).length,
    exactObjectWarningCount: warningCount,
    exitHandoffCount: animations.filter(
      (item) => item.catalogKind === "exit-handoff",
    ).length,
    externalActionCount: actionItems.filter(
      (item) => item.catalogKind === "external-hyperlink",
    ).length,
    invalidUrlActionCount: actionItems.filter(
      (item) => item.catalogKind === "invalid-url",
    ).length,
    items,
    missingSlideActionCount: actionItems.filter(
      (item) => item.catalogKind === "missing-slide-target",
    ).length,
    motionPathHandoffCount: animations.filter(
      (item) => item.catalogKind === "motion-path-handoff",
    ).length,
    nativeActionCatalogCount,
    nativeAnimationXmlCount,
    nativeTargetReviewAnimationCount: animations.filter(
      (item) => item.catalogKind === "native-target-review",
    ).length,
    readyCount,
    selfTargetActionCount: actionItems.filter(
      (item) => item.catalogKind === "self-slide-review",
    ).length,
    status: warningCount ? "warning" : "ready",
    summary: reviewSummary({
      blockedActionCount,
      exactObjectWarningCount: warningCount,
      nativeActionCatalogCount,
      nativeAnimationXmlCount,
      totalCount: items.length,
    }),
    telephoneActionCount: actionItems.filter(
      (item) => item.catalogKind === "telephone-hyperlink",
    ).length,
    totalCount: items.length,
    warningCount,
  }
}

function isOfficeActionAnimationReviewPlan(
  value: Deck | OfficeActionAnimationReviewPlan,
): value is OfficeActionAnimationReviewPlan {
  return "actionItems" in value && "animationItems" in value
}

export function serializeOfficeActionAnimationReviewPlan(
  input: Deck | OfficeActionAnimationReviewPlan,
) {
  const plan = isOfficeActionAnimationReviewPlan(input)
    ? input
    : officeActionAnimationReviewPlan(input)
  const lines = [
    "Office action and animation review plan",
    `Status: ${plan.status}`,
    `Summary: ${plan.summary}`,
    `Ready objects: ${plan.readyCount}/${plan.totalCount}`,
    `Action catalog entries: ${plan.nativeActionCatalogCount}`,
    `Animation native XML targets: ${plan.nativeAnimationXmlCount}`,
    `Exact object warnings: ${plan.exactObjectWarningCount}`,
    "",
    "Actions",
    ...(plan.items.length
      ? plan.items.map((item) => {
          const timing =
            "durationMs" in item
              ? ` Timing: ${item.durationMs}ms duration, ${item.delayMs}ms delay, ${item.triggerLabel.toLowerCase()} trigger.`
              : ""
          const motion =
            "motionX" in item &&
            (item.catalogKind.includes("motion") || item.effect === "Custom motion")
              ? ` Motion: ${item.motionX}%,${item.motionY}%.`
              : ""

          return `- [${item.status}] ${item.catalogLabel}: ${item.objectRef}. Markup: ${item.officeMarkup}.${timing}${motion} Owner action: ${item.ownerAction} Detail: ${item.detail}`
        })
      : ["- None"]),
  ]

  return `${lines.join("\n")}\n`
}
