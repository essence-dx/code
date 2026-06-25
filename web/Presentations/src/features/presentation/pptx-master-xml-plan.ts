import { masterThemeSafeguardReport } from "./master-theme-safeguards"
import {
  nativePptxMasterLayoutPlan,
  type NativePptxLayoutCandidate,
} from "./pptx-master-layout-export"
import {
  pptxMasterXmlAuthoringPlan,
  type PptxMasterXmlAuthoringPlan,
} from "./pptx-master-xml-authoring"
import {
  pptxMasterLayoutXmlAuthoring,
  type PptxMasterLayoutXmlAuthoring,
} from "./pptx-master-layout-xml-authoring"
import {
  pptxThemePackagePlan,
  pptxThemeSafeFileStem,
  type PptxThemePackagePlan,
} from "./pptx-theme-package-plan"
import {
  pptxThemePackageXmlAuthoring,
  type PptxThemePackageXmlAuthoring,
} from "./pptx-theme-package-xml-authoring"
import type { Deck, OfficeThemeMetadata, PlaceholderRole } from "./types"

export type NativePptxMasterXmlPartKind =
  | "slide-layout"
  | "slide-master"
  | "theme"

export type NativePptxMasterXmlPartStatus = "blocked" | "partial" | "ready"

export type NativePptxMasterXmlPart = {
  detail: string
  id: string
  kind: NativePptxMasterXmlPartKind
  name: string
  path: string
  placeholderKinds: string[]
  relationshipType: string
  roleCoverage: PlaceholderRole[]
  slotCount: number
  status: NativePptxMasterXmlPartStatus
}

export type NativePptxThemeFileHandoffStatus =
  | "manual-theme"
  | "needs-metadata"
  | "ready"

export type NativePptxThemeFileHandoff = {
  colorCount: number
  detail: string
  exportFileName: string
  fontPair: string
  importFileName: string
  source: OfficeThemeMetadata["source"] | "none"
  status: NativePptxThemeFileHandoffStatus
  themeName: string
}

export type NativePptxPlaceholderInheritanceStatus =
  | "attention"
  | "ready"
  | "warning"

export type NativePptxPlaceholderInheritanceDiagnostic = {
  count: number
  detail: string
  id:
    | "bulk-reapply-risk"
    | "locked-placeholders"
    | "manual-overrides"
    | "role-coverage"
  label: string
  slideTitles: string[]
  status: NativePptxPlaceholderInheritanceStatus
}

export type NativePptxMasterXmlPlan = {
  authoringPlan: PptxMasterXmlAuthoringPlan
  layoutPartCount: number
  masterLayoutXmlAuthoring: PptxMasterLayoutXmlAuthoring
  masterPartCount: number
  placeholderInheritance: NativePptxPlaceholderInheritanceDiagnostic[]
  placeholderInheritanceIssueCount: number
  placeholderInheritanceReadyCount: number
  readyPartCount: number
  status: NativePptxMasterXmlPartStatus
  summary: string
  themeFileHandoff: NativePptxThemeFileHandoff
  themePackagePlan: PptxThemePackagePlan
  themePackageXmlAuthoring: PptxThemePackageXmlAuthoring
  themePartCount: number
  totalPartCount: number
  xmlParts: NativePptxMasterXmlPart[]
}

const relationshipTypes: Record<NativePptxMasterXmlPartKind, string> = {
  "slide-layout":
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout",
  "slide-master":
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster",
  theme: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",
}

function safeFileStem(value: string) {
  return pptxThemeSafeFileStem(value)
}

function combinedStatus(
  statuses: NativePptxMasterXmlPartStatus[],
): NativePptxMasterXmlPartStatus {
  if (!statuses.length || statuses.every((status) => status === "blocked")) {
    return "blocked"
  }

  if (statuses.every((status) => status === "ready")) {
    return "ready"
  }

  return "partial"
}

function themeFileHandoff(
  deck: Deck,
  themeReady: boolean,
): NativePptxThemeFileHandoff {
  const theme = deck.master.officeTheme
  const themeName = theme?.name.trim() || `${deck.title || "Essence"} theme`
  const fontPair = theme
    ? `${theme.majorFont.trim() || "missing"} / ${
        theme.minorFont.trim() || "missing"
      }`
    : "missing"

  if (!theme) {
    return {
      colorCount: 0,
      detail:
        "No imported Office theme metadata is available; export uses Essence theme defaults.",
      exportFileName: `${safeFileStem(themeName)}.xml`,
      fontPair,
      importFileName: "",
      source: "none",
      status: "manual-theme",
      themeName,
    }
  }

  return {
    colorCount: theme.colors.length,
    detail: themeReady
      ? "Office theme metadata is ready for reusable theme-file export and re-import review."
      : "Theme metadata exists, but colors or major/minor fonts still need cleanup before a reusable theme-file handoff.",
    exportFileName: `${safeFileStem(theme.name)}-theme.xml`,
    fontPair,
    importFileName:
      theme.source === "pptx" ? `${safeFileStem(theme.name)}-source-theme.xml` : "",
    source: theme.source,
    status: themeReady ? "ready" : "needs-metadata",
    themeName,
  }
}

function themePart(
  deck: Deck,
  themeReady: boolean,
): NativePptxMasterXmlPart {
  const handoff = themeFileHandoff(deck, themeReady)

  return {
    detail: handoff.detail,
    id: "theme:theme1",
    kind: "theme",
    name: handoff.themeName,
    path: "ppt/theme/theme1.xml",
    placeholderKinds: [],
    relationshipType: relationshipTypes.theme,
    roleCoverage: [],
    slotCount: 0,
    status: themeReady ? "ready" : deck.master.officeTheme ? "partial" : "blocked",
  }
}

function masterPart(
  deck: Deck,
  placeholderCount: number,
): NativePptxMasterXmlPart {
  return {
    detail: placeholderCount
      ? "Footer, date, and slide-number defaults are identified; current export still needs true slide-master XML authoring."
      : "No footer, date, or slide-number defaults are available for native slide-master XML.",
    id: "master:slideMaster1",
    kind: "slide-master",
    name: "Slide Master 1",
    path: "ppt/slideMasters/slideMaster1.xml",
    placeholderKinds: [],
    relationshipType: relationshipTypes["slide-master"],
    roleCoverage: [],
    slotCount: placeholderCount,
    status: placeholderCount ? "partial" : "blocked",
  }
}

function layoutPart(
  candidate: NativePptxLayoutCandidate,
  index: number,
): NativePptxMasterXmlPart {
  const ready = candidate.slotCount > 0 && candidate.unsupportedSlotCount === 0
  const hasPartialCoverage = candidate.candidateSlotCount > 0

  return {
    detail: ready
      ? "All saved slots map to native Office placeholder kinds."
      : hasPartialCoverage
        ? `${candidate.unsupportedSlotCount} saved slot(s) need Essence metadata handoff.`
        : "Saved layout has no safe native Office placeholder slots yet.",
    id: `layout:${candidate.id}`,
    kind: "slide-layout",
    name: candidate.label,
    path: `ppt/slideLayouts/slideLayout${index + 1}.xml`,
    placeholderKinds: candidate.placeholderKinds,
    relationshipType: relationshipTypes["slide-layout"],
    roleCoverage: candidate.roleCoverage,
    slotCount: candidate.slotCount,
    status: ready ? "ready" : hasPartialCoverage ? "partial" : "blocked",
  }
}

function diagnosticStatus(
  count: number,
  warningStatus: NativePptxPlaceholderInheritanceStatus,
): NativePptxPlaceholderInheritanceStatus {
  return count ? warningStatus : "ready"
}

function placeholderInheritanceDiagnostics(
  deck: Deck,
): NativePptxPlaceholderInheritanceDiagnostic[] {
  const report = masterThemeSafeguardReport(deck)
  const metrics = report.metrics
  const issueById = new Map(report.issues.map((issue) => [issue.id, issue]))
  const usedRoles = new Set(
    deck.slides.flatMap((slide) =>
      slide.elements
        .map((element) => element.placeholderRole)
        .filter((role) => role !== "none"),
    ),
  )
  const coveredRoles = new Set(
    deck.master.layoutPresets.flatMap((preset) =>
      preset.slots.map((slot) => slot.placeholderRole),
    ),
  )
  const roleCoverageMissing = Array.from(usedRoles).filter(
    (role) => !coveredRoles.has(role),
  ).length

  return [
    {
      count: roleCoverageMissing,
      detail: roleCoverageMissing
        ? "Some placeholder roles used on slides are not covered by saved master layouts."
        : "Saved master layouts cover all placeholder roles currently used on slides.",
      id: "role-coverage",
      label: "Role coverage",
      slideTitles:
        issueById.get("unmapped-placeholder-roles")?.slideTitles ?? [],
      status: diagnosticStatus(roleCoverageMissing, "warning"),
    },
    {
      count: metrics.manualOverrideCount,
      detail: metrics.manualOverrideCount
        ? "Some slide placeholders differ from the nearest saved master slot."
        : "Slide placeholders match the nearest saved master slot closely enough for reapply.",
      id: "manual-overrides",
      label: "Manual overrides",
      slideTitles:
        issueById.get("manual-placeholder-overrides")?.slideTitles ?? [],
      status: diagnosticStatus(metrics.manualOverrideCount, "warning"),
    },
    {
      count: metrics.lockedPlaceholderCount,
      detail: metrics.lockedPlaceholderCount
        ? "Locked placeholders can preserve local edits and skip inherited master updates."
        : "No locked placeholders block inheritance updates.",
      id: "locked-placeholders",
      label: "Locked placeholders",
      slideTitles: issueById.get("locked-placeholders")?.slideTitles ?? [],
      status: diagnosticStatus(metrics.lockedPlaceholderCount, "warning"),
    },
    {
      count: metrics.bulkReapplyRiskSlideCount,
      detail: metrics.bulkReapplyRiskSlideCount
        ? "Review affected slides before bulk reapplying master layouts."
        : "Bulk reapply has no placeholder inheritance risk slides.",
      id: "bulk-reapply-risk",
      label: "Bulk reapply risk",
      slideTitles: issueById.get("bulk-reapply-risk")?.slideTitles ?? [],
      status: diagnosticStatus(
        metrics.bulkReapplyRiskSlideCount,
        "attention",
      ),
    },
  ]
}

function planSummary(input: {
  issueCount: number
  readyPartCount: number
  status: NativePptxMasterXmlPartStatus
  totalPartCount: number
}) {
  if (input.status === "blocked") {
    return "No reusable native PPTX master XML package plan is ready yet."
  }

  const partSummary = `${input.readyPartCount}/${input.totalPartCount} native master XML part${
    input.totalPartCount === 1 ? "" : "s"
  } ready`

  if (input.status === "ready") {
    return `${partSummary}; theme file handoff and placeholder inheritance diagnostics are clear.`
  }

  return `${partSummary}; ${input.issueCount} placeholder inheritance diagnostic${
    input.issueCount === 1 ? "" : "s"
  } need review before full native master XML export.`
}

export function nativePptxMasterXmlPlan(deck: Deck): NativePptxMasterXmlPlan {
  const layoutPlan = nativePptxMasterLayoutPlan(deck)
  const themeReady = layoutPlan.themeColorReady && layoutPlan.themeFontReady
  const themePackagePlan = pptxThemePackagePlan(deck)
  const themePackageXmlAuthoring = pptxThemePackageXmlAuthoring(deck)
  const authoringPlan = pptxMasterXmlAuthoringPlan(deck)
  const masterLayoutXmlAuthoring = pptxMasterLayoutXmlAuthoring(deck)
  const xmlParts = [
    themePart(deck, themeReady),
    masterPart(deck, layoutPlan.nativeMasterPlaceholderCount),
    ...layoutPlan.layoutCandidates.map(layoutPart),
  ]
  const diagnostics = placeholderInheritanceDiagnostics(deck)
  const placeholderInheritanceReadyCount = diagnostics.filter(
    (diagnostic) => diagnostic.status === "ready",
  ).length
  const placeholderInheritanceIssueCount =
    diagnostics.length - placeholderInheritanceReadyCount
  const readyPartCount = xmlParts.filter((part) => part.status === "ready").length
  const totalPartCount = xmlParts.length
  const status = combinedStatus([
    ...xmlParts.map((part) => part.status),
    placeholderInheritanceIssueCount ? "partial" : "ready",
  ])

  return {
    authoringPlan,
    layoutPartCount: xmlParts.filter((part) => part.kind === "slide-layout")
      .length,
    masterLayoutXmlAuthoring,
    masterPartCount: xmlParts.filter((part) => part.kind === "slide-master")
      .length,
    placeholderInheritance: diagnostics,
    placeholderInheritanceIssueCount,
    placeholderInheritanceReadyCount,
    readyPartCount,
    status,
    summary: planSummary({
      issueCount: placeholderInheritanceIssueCount,
      readyPartCount,
      status,
      totalPartCount,
    }),
    themeFileHandoff: themeFileHandoff(deck, themeReady),
    themePackagePlan,
    themePackageXmlAuthoring,
    themePartCount: xmlParts.filter((part) => part.kind === "theme").length,
    totalPartCount,
    xmlParts,
  }
}

export function serializeNativePptxMasterXmlPlan(deck: Deck) {
  const plan = nativePptxMasterXmlPlan(deck)
  const lines = [
    "Native PPTX master XML plan",
    `Deck: ${deck.title}`,
    `Status: ${plan.status}`,
    `Summary: ${plan.summary}`,
    `Theme handoff: ${plan.themeFileHandoff.status}`,
    `Theme export: ${plan.themeFileHandoff.exportFileName}`,
    `Theme package: ${plan.themePackagePlan.packageFileName}`,
    `Theme package parts: ${plan.themePackagePlan.readyPartCount}/${plan.themePackagePlan.totalPartCount}`,
    `Theme XML authoring: ${plan.themePackageXmlAuthoring.readyPartCount}/${plan.themePackageXmlAuthoring.totalPartCount}`,
    `Theme XML characters: ${plan.themePackageXmlAuthoring.themeXmlLength}`,
    `Master/layout XML authoring: ${plan.masterLayoutXmlAuthoring.readyPartCount}/${plan.masterLayoutXmlAuthoring.totalPartCount}`,
    `Master/layout XML characters: ${plan.masterLayoutXmlAuthoring.xmlLength}`,
    `Authoring tasks: ${plan.authoringPlan.readyTaskCount}/${plan.authoringPlan.totalTaskCount}`,
    `Authoring handoffs: ${plan.authoringPlan.handoffTaskCount}`,
    `XML parts: ${plan.readyPartCount}/${plan.totalPartCount}`,
    `Placeholder inheritance: ${plan.placeholderInheritanceReadyCount}/${plan.placeholderInheritance.length}`,
    "",
    "Package parts:",
    ...plan.xmlParts.map(
      (part, index) =>
        `${index + 1}. ${part.path} - ${part.name}; ${part.status}; ${part.detail}`,
    ),
    "",
    "Inheritance diagnostics:",
    ...plan.placeholderInheritance.map(
      (diagnostic, index) =>
        `${index + 1}. ${diagnostic.label}: ${diagnostic.status}; ${diagnostic.count}. ${diagnostic.detail}`,
    ),
  ]

  return `${lines.join("\n")}\n`
}
