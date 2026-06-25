import { masterHasVisibleContent } from "./slide-master"
import type {
  Deck,
  DeckLayoutPreset,
  DeckLayoutPresetSlot,
  PlaceholderRole,
  SlideElementType,
} from "./types"

export type NativePptxMasterLayoutPlanStatus = "ready" | "partial" | "blocked"

export type NativePptxMasterPlaceholderKind = "date" | "footer" | "slide-number"

export type NativePptxLayoutPlaceholderKind =
  | "body"
  | "caption"
  | "content"
  | "media"
  | "title"

export type NativePptxMasterLayoutPlanIssueId =
  | "master-overlay-flattening"
  | "missing-master-layout-metadata"
  | "missing-theme-colors"
  | "missing-theme-fonts"
  | "unsupported-layout-slots"

export type NativePptxMasterLayoutPlanIssue = {
  detail: string
  id: NativePptxMasterLayoutPlanIssueId
  label: string
}

export type NativePptxLayoutCandidate = {
  candidateSlotCount: number
  id: DeckLayoutPreset["id"]
  label: string
  placeholderKinds: NativePptxLayoutPlaceholderKind[]
  roleCoverage: PlaceholderRole[]
  slotCount: number
  unsupportedSlotCount: number
}

export type NativePptxMasterLayoutPlan = {
  candidateLayoutSlotCount: number
  coveredPlaceholderKinds: NativePptxLayoutPlaceholderKind[]
  coveredRoles: PlaceholderRole[]
  issues: NativePptxMasterLayoutPlanIssue[]
  layoutCandidates: NativePptxLayoutCandidate[]
  layoutPresetCount: number
  layoutSlotCount: number
  nativeLayoutCandidateCount: number
  nativeMasterPlaceholderCount: number
  nativeMasterPlaceholders: NativePptxMasterPlaceholderKind[]
  officeThemeColorCount: number
  status: NativePptxMasterLayoutPlanStatus
  summary: string
  themeColorReady: boolean
  themeFontDetail: string
  themeFontReady: boolean
  unsupportedSlotCount: number
  unsupportedSlotTypes: SlideElementType[]
}

const nativeTextSlotTypes = new Set<SlideElementType>(["text", "title"])
const nativeMediaSlotTypes = new Set<SlideElementType>([
  "audio",
  "chart",
  "image",
  "table",
  "video",
])

function uniqueSorted<T extends string>(values: Iterable<T>) {
  return Array.from(new Set(values)).sort((first, second) =>
    first.localeCompare(second),
  )
}

function hasUsableGeometry(slot: DeckLayoutPresetSlot) {
  return (
    Number.isFinite(slot.x) &&
    Number.isFinite(slot.y) &&
    Number.isFinite(slot.width) &&
    Number.isFinite(slot.height) &&
    slot.width > 0 &&
    slot.height > 0
  )
}

export function nativePptxLayoutPlaceholderKindForSlot(
  slot: DeckLayoutPresetSlot,
): NativePptxLayoutPlaceholderKind | null {
  if (!hasUsableGeometry(slot)) return null

  if (slot.placeholderRole === "title" && nativeTextSlotTypes.has(slot.type)) {
    return "title"
  }

  if (slot.placeholderRole === "caption" && nativeTextSlotTypes.has(slot.type)) {
    return "caption"
  }

  if (slot.placeholderRole === "body") {
    if (nativeTextSlotTypes.has(slot.type)) return "body"
    if (nativeMediaSlotTypes.has(slot.type)) return "content"
  }

  if (slot.placeholderRole === "media" && nativeMediaSlotTypes.has(slot.type)) {
    return "media"
  }

  return null
}

function masterPlaceholderKinds(deck: Deck): NativePptxMasterPlaceholderKind[] {
  return [
    deck.master.showDate ? "date" : null,
    deck.master.showFooter && deck.master.footerText.trim() ? "footer" : null,
    deck.master.showSlideNumbers ? "slide-number" : null,
  ].filter((kind): kind is NativePptxMasterPlaceholderKind => Boolean(kind))
}

function layoutCandidate(preset: DeckLayoutPreset): NativePptxLayoutCandidate {
  const candidateKinds = preset.slots
    .map(nativePptxLayoutPlaceholderKindForSlot)
    .filter((kind): kind is NativePptxLayoutPlaceholderKind => Boolean(kind))
  const unsupportedSlotCount = preset.slots.length - candidateKinds.length
  const candidateSlots = preset.slots.filter((slot) =>
    nativePptxLayoutPlaceholderKindForSlot(slot),
  )

  return {
    candidateSlotCount: candidateKinds.length,
    id: preset.id,
    label: preset.label,
    placeholderKinds: uniqueSorted(candidateKinds),
    roleCoverage: uniqueSorted(
      candidateSlots.map((slot) => slot.placeholderRole),
    ),
    slotCount: preset.slots.length,
    unsupportedSlotCount,
  }
}

function planIssues(
  deck: Deck,
  input: {
    layoutPresetCount: number
    nativeLayoutCandidateCount: number
    unsupportedSlotCount: number
  },
): NativePptxMasterLayoutPlanIssue[] {
  const officeTheme = deck.master.officeTheme
  const issues: NativePptxMasterLayoutPlanIssue[] = []

  if (!input.layoutPresetCount && !masterHasVisibleContent(deck.master)) {
    issues.push({
      id: "missing-master-layout-metadata",
      label: "No reusable master/layout metadata",
      detail:
        "The deck has no saved master layout presets or footer/date/number defaults to promote into Office master parts.",
    })
  }

  if (input.layoutPresetCount && input.unsupportedSlotCount) {
    issues.push({
      id: "unsupported-layout-slots",
      label: "Some layout slots need handoff",
      detail:
        "Shape and icon layout slots are kept as Essence metadata until a safe native Office placeholder mapping exists.",
    })
  }

  if (masterHasVisibleContent(deck.master)) {
    issues.push({
      id: "master-overlay-flattening",
      label: "Current PPTX export still flattens master overlays",
      detail:
        "Footer, date, and slide-number defaults are identifiable for native master XML, but the current exporter still writes them per slide.",
    })
  }

  if (!officeTheme || !officeTheme.colors.length) {
    issues.push({
      id: "missing-theme-colors",
      label: "Office theme colors need metadata",
      detail:
        "Native master/layout parts can inherit stronger Office theme colors once a PPTX theme or Essence theme bundle supplies them.",
    })
  }

  if (
    !officeTheme?.majorFont.trim() ||
    !officeTheme?.minorFont.trim()
  ) {
    issues.push({
      id: "missing-theme-fonts",
      label: "Office theme fonts need metadata",
      detail:
        "Native layout placeholders can use imported major/minor Office fonts when both font faces are present.",
    })
  }

  if (input.layoutPresetCount && !input.nativeLayoutCandidateCount) {
    issues.push({
      id: "unsupported-layout-slots",
      label: "No native layout candidates yet",
      detail:
        "Saved master layouts exist, but none can be represented entirely as native Office placeholders yet.",
    })
  }

  return issues.filter(
    (issue, index, list) =>
      list.findIndex((candidate) => candidate.id === issue.id) === index,
  )
}

function planStatus(input: {
  issues: NativePptxMasterLayoutPlanIssue[]
  nativeLayoutCandidateCount: number
  nativeMasterPlaceholderCount: number
}) {
  const hasNativeCandidates =
    input.nativeLayoutCandidateCount > 0 ||
    input.nativeMasterPlaceholderCount > 0

  if (!hasNativeCandidates) return "blocked"

  return input.issues.length ? "partial" : "ready"
}

function planSummary(plan: {
  layoutPresetCount: number
  nativeLayoutCandidateCount: number
  nativeMasterPlaceholderCount: number
  status: NativePptxMasterLayoutPlanStatus
  unsupportedSlotCount: number
}) {
  if (plan.status === "blocked") {
    return "No native PPTX master/layout candidates are available yet."
  }

  const masterPart = `${plan.nativeMasterPlaceholderCount} master placeholder${
    plan.nativeMasterPlaceholderCount === 1 ? "" : "s"
  }`
  const layoutPart = `${plan.nativeLayoutCandidateCount}/${plan.layoutPresetCount} reusable layout${
    plan.layoutPresetCount === 1 ? "" : "s"
  }`

  if (plan.status === "ready") {
    return `${masterPart} and ${layoutPart} are ready for native Office master/layout XML.`
  }

  return `${masterPart} and ${layoutPart} have native coverage; ${plan.unsupportedSlotCount} layout slot${
    plan.unsupportedSlotCount === 1 ? "" : "s"
  } still need compatibility handoff.`
}

export function nativePptxMasterLayoutPlan(
  deck: Deck,
): NativePptxMasterLayoutPlan {
  const nativeMasterPlaceholders = masterPlaceholderKinds(deck)
  const layoutCandidates = deck.master.layoutPresets.map(layoutCandidate)
  const layoutPresetCount = deck.master.layoutPresets.length
  const layoutSlotCount = layoutCandidates.reduce(
    (total, candidate) => total + candidate.slotCount,
    0,
  )
  const candidateLayoutSlotCount = layoutCandidates.reduce(
    (total, candidate) => total + candidate.candidateSlotCount,
    0,
  )
  const unsupportedSlotCount = layoutCandidates.reduce(
    (total, candidate) => total + candidate.unsupportedSlotCount,
    0,
  )
  const nativeLayoutCandidateCount = layoutCandidates.filter(
    (candidate) => candidate.slotCount > 0 && candidate.unsupportedSlotCount === 0,
  ).length
  const officeTheme = deck.master.officeTheme
  const themeFontReady = Boolean(
    officeTheme?.majorFont.trim() && officeTheme?.minorFont.trim(),
  )
  const themeColorReady = Boolean(officeTheme?.colors.length)
  const issues = planIssues(deck, {
    layoutPresetCount,
    nativeLayoutCandidateCount,
    unsupportedSlotCount,
  })
  const status = planStatus({
    issues,
    nativeLayoutCandidateCount,
    nativeMasterPlaceholderCount: nativeMasterPlaceholders.length,
  })

  return {
    candidateLayoutSlotCount,
    coveredPlaceholderKinds: uniqueSorted(
      layoutCandidates.flatMap((candidate) => candidate.placeholderKinds),
    ),
    coveredRoles: uniqueSorted(
      layoutCandidates.flatMap((candidate) => candidate.roleCoverage),
    ),
    issues,
    layoutCandidates,
    layoutPresetCount,
    layoutSlotCount,
    nativeLayoutCandidateCount,
    nativeMasterPlaceholderCount: nativeMasterPlaceholders.length,
    nativeMasterPlaceholders,
    officeThemeColorCount: officeTheme?.colors.length ?? 0,
    status,
    summary: planSummary({
      layoutPresetCount,
      nativeLayoutCandidateCount,
      nativeMasterPlaceholderCount: nativeMasterPlaceholders.length,
      status,
      unsupportedSlotCount,
    }),
    themeColorReady,
    themeFontDetail: themeFontReady
      ? `${officeTheme?.majorFont} / ${officeTheme?.minorFont}`
      : "Using deck font fallback",
    themeFontReady,
    unsupportedSlotCount,
    unsupportedSlotTypes: uniqueSorted(
      deck.master.layoutPresets.flatMap((preset) =>
        preset.slots
          .filter((slot) => !nativePptxLayoutPlaceholderKindForSlot(slot))
          .map((slot) => slot.type),
      ),
    ),
  }
}
