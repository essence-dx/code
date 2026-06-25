import { isElementLocked } from "./element-visibility"
import type {
  Deck,
  DeckLayoutPreset,
  DeckLayoutPresetSlot,
  PlaceholderRole,
  PresentationElement,
  Slide,
} from "./types"

export type MasterThemeSafeguardSeverity = "attention" | "warning" | "ready"

export type MasterThemeSafeguardIssueId =
  | "bulk-reapply-risk"
  | "duplicate-master-layout-names"
  | "locked-placeholders"
  | "manual-placeholder-overrides"
  | "master-metadata-gaps"
  | "missing-master-presets"
  | "stale-master-presets"
  | "unmapped-placeholder-roles"

export type MasterThemeSafeguardIssue = {
  id: MasterThemeSafeguardIssueId
  label: string
  detail: string
  severity: MasterThemeSafeguardSeverity
  count: number
  slideIds: string[]
  slideTitles: string[]
}

export type MasterThemeSafeguardMetrics = {
  bulkReapplyRiskSlideCount: number
  duplicateMasterPresetNameCount: number
  lockedPlaceholderCount: number
  manualOverrideCount: number
  masterPresetCount: number
  metadataGapCount: number
  officeThemeColorCount: number
  officeThemeMetadataReady: boolean
  officeThemePlaceholderDefaultCount: number
  officeThemeSlideLayoutCount: number
  officeThemeSlideMasterCount: number
  placeholderCount: number
  roleCoverageCount: number
  slideCount: number
  staleMasterPresetCount: number
  unmatchedPlaceholderCount: number
}

export type MasterThemeSafeguardReport = {
  status: MasterThemeSafeguardSeverity
  summary: string
  attentionCount: number
  warningCount: number
  readyCount: number
  metrics: MasterThemeSafeguardMetrics
  issues: MasterThemeSafeguardIssue[]
}

type PlaceholderEntry = {
  element: PresentationElement
  slide: Slide
  slideIndex: number
}

const roles: Exclude<PlaceholderRole, "none">[] = [
  "title",
  "body",
  "media",
  "caption",
]

const staleAfterMs = 60 * 24 * 60 * 60 * 1000

function isPlaceholder(element: PresentationElement) {
  return element.placeholderRole !== "none"
}

function slideTitle(entry: Pick<PlaceholderEntry, "slide" | "slideIndex">) {
  return entry.slide.title.trim() || `Slide ${entry.slideIndex + 1}`
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function limitedSlideTitles(entries: PlaceholderEntry[]) {
  return unique(entries.map(slideTitle)).slice(0, 4)
}

function limitedSlideIds(entries: PlaceholderEntry[]) {
  return unique(entries.map((entry) => entry.slide.id)).slice(0, 12)
}

function roleLabel(role: PlaceholderRole) {
  if (role === "title") return "title"
  if (role === "body") return "body"
  if (role === "media") return "media"
  if (role === "caption") return "caption"
  return "placeholder"
}

function colorValue(value: string) {
  return value.trim().toLowerCase()
}

function colorChanged(current: string, expected: string) {
  const currentColor = colorValue(current)
  const expectedColor = colorValue(expected)

  if (!currentColor || !expectedColor) return false
  if (currentColor === "transparent" || expectedColor === "transparent") {
    return currentColor !== expectedColor
  }

  return currentColor !== expectedColor
}

function geometryDistance(
  element: PresentationElement,
  slot: DeckLayoutPresetSlot,
) {
  return (
    Math.abs(element.x - slot.x) +
    Math.abs(element.y - slot.y) +
    Math.abs(element.width - slot.width) +
    Math.abs(element.height - slot.height)
  )
}

function slotForElement(
  element: PresentationElement,
  slots: DeckLayoutPresetSlot[],
) {
  const roleSlots = slots.filter(
    (slot) => slot.placeholderRole === element.placeholderRole,
  )
  const matchingTypeSlots = roleSlots.filter((slot) => slot.type === element.type)
  const candidates = matchingTypeSlots.length ? matchingTypeSlots : roleSlots

  return candidates
    .sort((left, right) => geometryDistance(element, left) - geometryDistance(element, right))[0]
}

function hasManualOverride(
  element: PresentationElement,
  slot: DeckLayoutPresetSlot | undefined,
) {
  if (!slot) return false

  const styleChanged =
    element.fontFamily !== slot.fontFamily ||
    Math.abs(element.fontSize - slot.fontSize) > 2 ||
    element.fontWeight !== slot.fontWeight ||
    element.textAlign !== slot.textAlign ||
    Math.abs(element.lineHeight - slot.lineHeight) > 0.08 ||
    element.listStyle !== slot.listStyle ||
    element.textFit !== slot.textFit ||
    element.textColumns !== slot.textColumns ||
    colorChanged(element.color, slot.color) ||
    colorChanged(element.background, slot.background) ||
    element.fit !== slot.fit

  return styleChanged || geometryDistance(element, slot) > 8
}

function presetIsStale(preset: DeckLayoutPreset, nowMs: number) {
  const usedAt = preset.lastUsedAt ? Date.parse(preset.lastUsedAt) : NaN
  const createdAt = Date.parse(preset.createdAt)
  const freshness = Number.isFinite(usedAt) ? usedAt : createdAt

  return (
    Number.isFinite(freshness) &&
    nowMs - freshness > staleAfterMs &&
    (preset.useCount ?? 0) === 0
  )
}

function hasMetadataGap(preset: DeckLayoutPreset) {
  return (
    !preset.description.trim() ||
    !Number.isFinite(Date.parse(preset.createdAt)) ||
    (preset.lastUsedAt !== undefined &&
      !Number.isFinite(Date.parse(preset.lastUsedAt))) ||
    (preset.useCount !== undefined && preset.useCount < 0)
  )
}

function duplicatePresetNameCount(presets: DeckLayoutPreset[]) {
  const seen = new Set<string>()
  let duplicates = 0

  for (const preset of presets) {
    const key = preset.label.trim().toLowerCase()
    if (!key) continue
    if (seen.has(key)) {
      duplicates += 1
    } else {
      seen.add(key)
    }
  }

  return duplicates
}

function issue(
  input: Omit<MasterThemeSafeguardIssue, "slideIds" | "slideTitles"> & {
    entries?: PlaceholderEntry[]
  },
): MasterThemeSafeguardIssue {
  const entries = input.entries ?? []

  return {
    id: input.id,
    label: input.label,
    detail: input.detail,
    severity: input.severity,
    count: input.count,
    slideIds: limitedSlideIds(entries),
    slideTitles: limitedSlideTitles(entries),
  }
}

function issueWeight(severity: MasterThemeSafeguardSeverity) {
  if (severity === "attention") return 3
  if (severity === "warning") return 2
  return 1
}

export function masterThemeSafeguardReport(
  deck: Deck,
  now = new Date(),
): MasterThemeSafeguardReport {
  const placeholders: PlaceholderEntry[] = deck.slides.flatMap((slide, slideIndex) =>
    slide.elements
      .filter(isPlaceholder)
      .map((element) => ({ element, slide, slideIndex })),
  )
  const presetSlots = deck.master.layoutPresets.flatMap((preset) => preset.slots)
  const roleCoverage = new Set(presetSlots.map((slot) => slot.placeholderRole))
  const lockedPlaceholders = placeholders.filter((entry) =>
    isElementLocked(entry.element),
  )
  const unmappedPlaceholders = placeholders.filter(
    (entry) => !roleCoverage.has(entry.element.placeholderRole),
  )
  const manualOverrides = placeholders.filter((entry) =>
    hasManualOverride(entry.element, slotForElement(entry.element, presetSlots)),
  )
  const riskEntries = [
    ...lockedPlaceholders,
    ...unmappedPlaceholders,
    ...manualOverrides,
  ]
  const riskSlideIds = new Set(riskEntries.map((entry) => entry.slide.id))
  const nowMs = now.getTime()
  const stalePresets = deck.master.layoutPresets.filter((preset) =>
    presetIsStale(preset, nowMs),
  )
  const metadataGapPresets = deck.master.layoutPresets.filter(hasMetadataGap)
  const officeTheme = deck.master.officeTheme
  const officeThemeMetadataGap = Boolean(
    officeTheme &&
      (!officeTheme.colors.length ||
        !officeTheme.majorFont.trim() ||
        !officeTheme.minorFont.trim() ||
        !Number.isFinite(Date.parse(officeTheme.importedAt))),
  )
  const metadataGapCount =
    metadataGapPresets.length + (officeThemeMetadataGap ? 1 : 0)
  const duplicateNameCount = duplicatePresetNameCount(deck.master.layoutPresets)
  const issues: MasterThemeSafeguardIssue[] = []

  if (placeholders.length && !deck.master.layoutPresets.length) {
    issues.push(
      issue({
        id: "missing-master-presets",
        label: "No master layout presets",
        detail: "Tagged placeholders cannot inherit from a reusable master layout.",
        severity: "attention",
        count: placeholders.length,
        entries: placeholders,
      }),
    )
  }

  if (unmappedPlaceholders.length) {
    const missingRoles = unique(
      unmappedPlaceholders.map((entry) => roleLabel(entry.element.placeholderRole)),
    ).join(", ")

    issues.push(
      issue({
        id: "unmapped-placeholder-roles",
        label: "Placeholder roles are not covered",
        detail: `Master layouts do not include ${missingRoles} slots used on slides.`,
        severity: "warning",
        count: unmappedPlaceholders.length,
        entries: unmappedPlaceholders,
      }),
    )
  }

  if (manualOverrides.length) {
    issues.push(
      issue({
        id: "manual-placeholder-overrides",
        label: "Manual placeholder overrides",
        detail:
          "Some placeholders differ from the nearest saved master slot in geometry or theme styling.",
        severity: "warning",
        count: manualOverrides.length,
        entries: manualOverrides,
      }),
    )
  }

  if (lockedPlaceholders.length) {
    issues.push(
      issue({
        id: "locked-placeholders",
        label: "Locked placeholders",
        detail:
          "Locked placeholders will be preserved during reapply and can leave master changes partially applied.",
        severity: "warning",
        count: lockedPlaceholders.length,
        entries: lockedPlaceholders,
      }),
    )
  }

  if (riskSlideIds.size) {
    issues.push(
      issue({
        id: "bulk-reapply-risk",
        label: "Bulk reapply review needed",
        detail:
          "Review these slides before applying a master layout across the selected slide set.",
        severity: "attention",
        count: riskSlideIds.size,
        entries: riskEntries,
      }),
    )
  }

  if (metadataGapCount) {
    issues.push(
      issue({
        id: "master-metadata-gaps",
        label: "Master metadata needs cleanup",
        detail:
          "Some saved master layouts or imported Office theme records have incomplete metadata.",
        severity: "warning",
        count: metadataGapCount,
      }),
    )
  }

  if (duplicateNameCount) {
    issues.push(
      issue({
        id: "duplicate-master-layout-names",
        label: "Duplicate master layout names",
        detail:
          "Duplicate names make imported theme files and bulk reapply choices harder to audit.",
        severity: "warning",
        count: duplicateNameCount,
      }),
    )
  }

  if (stalePresets.length) {
    issues.push(
      issue({
        id: "stale-master-presets",
        label: "Unused stale master layouts",
        detail:
          "Some saved master layouts have not been used recently and may be old theme-file baggage.",
        severity: "ready",
        count: stalePresets.length,
      }),
    )
  }

  const sortedIssues = issues.sort(
    (left, right) => issueWeight(right.severity) - issueWeight(left.severity),
  )
  const attentionCount = sortedIssues.filter(
    (item) => item.severity === "attention",
  ).length
  const warningCount = sortedIssues.filter(
    (item) => item.severity === "warning",
  ).length
  const readyCount = sortedIssues.filter((item) => item.severity === "ready")
    .length
  const status: MasterThemeSafeguardSeverity = attentionCount
    ? "attention"
    : warningCount
      ? "warning"
      : "ready"

  return {
    status,
    summary:
      status === "attention"
        ? `${attentionCount} master workflow check${attentionCount === 1 ? "" : "s"} need review before bulk reapply.`
        : status === "warning"
          ? `${warningCount} master/theme warning${warningCount === 1 ? "" : "s"} found.`
          : "Master layouts, placeholders, and theme metadata are ready.",
    attentionCount,
    warningCount,
    readyCount,
    metrics: {
      bulkReapplyRiskSlideCount: riskSlideIds.size,
      duplicateMasterPresetNameCount: duplicateNameCount,
      lockedPlaceholderCount: lockedPlaceholders.length,
      manualOverrideCount: manualOverrides.length,
      masterPresetCount: deck.master.layoutPresets.length,
      metadataGapCount,
      officeThemeColorCount: officeTheme?.colors.length ?? 0,
      officeThemeMetadataReady: Boolean(officeTheme && !officeThemeMetadataGap),
      officeThemePlaceholderDefaultCount:
        officeTheme?.placeholderDefaultCount ?? 0,
      officeThemeSlideLayoutCount: officeTheme?.slideLayoutCount ?? 0,
      officeThemeSlideMasterCount: officeTheme?.slideMasterCount ?? 0,
      placeholderCount: placeholders.length,
      roleCoverageCount: roles.filter((role) => roleCoverage.has(role)).length,
      slideCount: deck.slides.length,
      staleMasterPresetCount: stalePresets.length,
      unmatchedPlaceholderCount: unmappedPlaceholders.length,
    },
    issues: sortedIssues,
  }
}
