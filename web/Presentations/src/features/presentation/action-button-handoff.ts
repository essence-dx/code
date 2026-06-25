import { pptxActionSettingPlan } from "./pptx-action-settings"
import type { Deck, Slide } from "./types"

export type ActionButtonHandoffStatus = "ready" | "warning"

export type ActionButtonHandoffMode =
  | "blocked"
  | "external-hyperlink"
  | "internal-slide-action"

export type ActionButtonHandoffCue = {
  detail: string
  elementId: string
  groupId: string
  label: string
  mode: ActionButtonHandoffMode
  nativeExport: boolean
  officeAction: "a:hlinkClick" | "none"
  relationshipKind: "external-hyperlink" | "internal-slide" | "none"
  relationshipTarget: string
  slideId: string
  slideNumber: number
  slideTitle: string
  sourceElementIds: string[]
  status: ActionButtonHandoffStatus
  targetKind: string
  targetLabel: string
  targetSlideNumber: number | null
  tooltip: string
}

export type ActionButtonHandoffReport = {
  blockedActionCount: number
  externalLinkCount: number
  groupedActionCount: number
  invalidUrlCount: number
  internalSlideCount: number
  nativeActionSettingCount: number
  readyCount: number
  selfTargetCount: number
  telephoneOrEmailCount: number
  totalCount: number
  warningCount: number
}

export function actionButtonHandoffCues(deck: Deck): ActionButtonHandoffCue[] {
  return pptxActionSettingPlan(deck).items.map((item) => ({
    detail: item.detail,
    elementId: item.elementId,
    groupId: item.groupId,
    label: item.label,
    mode: item.mode,
    nativeExport: item.nativeExport,
    officeAction: item.officeAction,
    relationshipKind: item.relationshipKind,
    relationshipTarget: item.relationshipTarget,
    slideId: item.slideId,
    slideNumber: item.slideNumber,
    slideTitle: item.slideTitle,
    sourceElementIds: item.sourceElementIds,
    status: item.status,
    targetKind: item.targetKind,
    targetLabel: item.targetLabel,
    targetSlideNumber: item.targetSlideNumber,
    tooltip: item.tooltip,
  }))
}

export function deckActionButtonHandoffReport(deck: Deck): ActionButtonHandoffReport {
  const plan = pptxActionSettingPlan(deck)

  return {
    blockedActionCount: plan.blockedCount,
    externalLinkCount: plan.externalLinkCount,
    groupedActionCount: plan.groupedActionCount,
    invalidUrlCount: plan.invalidUrlCount,
    internalSlideCount: plan.internalSlideCount,
    nativeActionSettingCount: plan.nativeActionSettingCount,
    readyCount: plan.readyCount,
    selfTargetCount: plan.selfTargetCount,
    telephoneOrEmailCount: plan.emailCount + plan.telephoneCount,
    totalCount: plan.totalCount,
    warningCount: plan.warningCount,
  }
}

export function serializeSlideActionSettingNotes(deck: Deck, slide: Slide) {
  const cues = actionButtonHandoffCues(deck).filter(
    (cue) => cue.slideId === slide.id,
  )

  if (!cues.length) return ""

  return [
    "Essence action-setting handoff:",
    "Native PPTX hyperlinks are included for ready slide jumps and URL actions; review any blocked or self-targeted actions before presenting in PowerPoint.",
    ...cues.map((cue, index) => {
      const nativeStatus = cue.nativeExport ? "native" : "review"
      const relationship = cue.relationshipTarget
        ? `${cue.relationshipKind}:${cue.relationshipTarget}`
        : cue.relationshipKind

      return `${index + 1}. ${cue.label} - ${cue.mode}; target: ${cue.targetLabel}; office: ${cue.officeAction}; relationship: ${relationship}; ${nativeStatus}. ${cue.detail}`
    }),
  ].join("\n")
}

export function serializeActionButtonHandoffReport(deck: Deck) {
  const cues = actionButtonHandoffCues(deck)
  const report = deckActionButtonHandoffReport(deck)
  const lines = [
    "Action button handoff report",
    `Deck: ${deck.title}`,
    `Actions: ${report.totalCount}`,
    `Internal slide actions: ${report.internalSlideCount}`,
    `External hyperlinks: ${report.externalLinkCount}`,
    `Grouped buttons: ${report.groupedActionCount}`,
    `Warnings: ${report.warningCount}`,
  ]

  if (!cues.length) {
    return [...lines, "", "No slide actions or hyperlinks found."].join("\n")
  }

  return [
    ...lines,
    "",
    "PowerPoint action-setting plan:",
    ...cues.map((cue, index) => {
      const status = cue.status === "ready" ? "Ready" : "Review"
      const nativeStatus = cue.nativeExport ? "native" : "review"
      const relationship = cue.relationshipTarget
        ? `${cue.relationshipKind}:${cue.relationshipTarget}`
        : cue.relationshipKind

      return `${index + 1}. Slide ${cue.slideNumber} (${cue.slideTitle}) - ${cue.label}; ${cue.mode}; target: ${cue.targetLabel}; office: ${cue.officeAction}; relationship: ${relationship}; ${nativeStatus}; ${status}. ${cue.detail}`
    }),
  ].join("\n")
}
