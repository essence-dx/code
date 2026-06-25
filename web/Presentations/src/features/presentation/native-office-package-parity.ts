import {
  deckDiagramAuthoringReport,
  type DiagramAuthoringReport,
} from "./diagram-authoring-report"
import {
  nativePptxMasterXmlPlan,
  type NativePptxMasterXmlPlan,
} from "./pptx-master-xml-plan"
import {
  pptxNativePackageAuthoring,
  type NativePptxPackageAuthoring,
  type NativePptxPackagePartStatus,
} from "./pptx-native-package-authoring"
import {
  pptxThemePackagePlan,
  type PptxThemePackagePlan,
} from "./pptx-theme-package-plan"
import {
  pptxThemePackageXmlAuthoring,
  type PptxThemePackageXmlAuthoring,
} from "./pptx-theme-package-xml-authoring"
import type { Deck } from "./types"

type ZipEntries = Record<string, Uint8Array>

export type NativeOfficePackageParityStatus = "blocked" | "partial" | "ready"

export type NativeOfficePackageParitySectionId =
  | "master-layout-relationships"
  | "package-authoring"
  | "smartart-diagrams"
  | "theme-package-application"

export type NativeOfficePackageParityActionId =
  | "author-native-package"
  | "complete-smartart-conversion-plan"
  | "verify-master-layout-relationships"
  | "verify-theme-application-path"

export type NativeOfficePackageRelationshipCheckId =
  | "layout-placeholder-inheritance"
  | "package-root-theme-relationship"
  | "presentation-slide-master-relationship"
  | "slide-master-layout-relationships"
  | "theme-part-relationships"

export type NativeOfficePackageParitySection = {
  detail: string
  id: NativeOfficePackageParitySectionId
  label: string
  readyCount: number
  status: NativeOfficePackageParityStatus
  totalCount: number
}

export type NativeOfficePackageParityAction = {
  detail: string
  id: NativeOfficePackageParityActionId
  label: string
  ownerAction: string
  status: NativeOfficePackageParityStatus
}

export type NativeOfficePackageRelationshipCheck = {
  detail: string
  id: NativeOfficePackageRelationshipCheckId
  label: string
  path: string
  status: NativeOfficePackageParityStatus
}

export type NativeOfficePackageParityReport = {
  actionCount: number
  actions: NativeOfficePackageParityAction[]
  diagramReport: DiagramAuthoringReport
  masterXmlPlan: NativePptxMasterXmlPlan
  packageAuthoring: NativePptxPackageAuthoring
  readyActionCount: number
  readyRelationshipCount: number
  readySectionCount: number
  relationshipChecks: NativeOfficePackageRelationshipCheck[]
  sections: NativeOfficePackageParitySection[]
  status: NativeOfficePackageParityStatus
  summary: string
  themePackagePlan: PptxThemePackagePlan
  themePackageXmlAuthoring: PptxThemePackageXmlAuthoring
  totalRelationshipCount: number
  totalSectionCount: number
}

function statusFromRatio(
  readyCount: number,
  totalCount: number,
): NativeOfficePackageParityStatus {
  if (!totalCount || readyCount <= 0) return "blocked"
  if (readyCount >= totalCount) return "ready"

  return "partial"
}

function normalizeStatus(
  status: NativeOfficePackageParityStatus | NativePptxPackagePartStatus,
): NativeOfficePackageParityStatus {
  return status === "merge-required" ? "partial" : status
}

function combineStatuses(
  statuses: readonly NativeOfficePackageParityStatus[],
): NativeOfficePackageParityStatus {
  if (!statuses.length || statuses.every((status) => status === "blocked")) {
    return "blocked"
  }

  if (statuses.every((status) => status === "ready")) return "ready"

  return "partial"
}

function firstNonReadyDetail(
  items: readonly { detail: string; status: NativeOfficePackageParityStatus }[],
  fallback: string,
) {
  return items.find((item) => item.status !== "ready")?.detail ?? fallback
}

function smartArtSection(
  report: DiagramAuthoringReport,
): NativeOfficePackageParitySection {
  if (!report.totalDiagramCount) {
    return {
      detail: `${report.catalogTemplateCount} editable diagram template(s) are available for future SmartArt rebuilds, but this deck has no authored diagram groups yet.`,
      id: "smartart-diagrams",
      label: "SmartArt conversion plan",
      readyCount: 0,
      status: "partial",
      totalCount: report.catalogTemplateCount,
    }
  }

  return {
    detail: report.summary,
    id: "smartart-diagrams",
    label: "SmartArt conversion plan",
    readyCount: report.editableGroupCount,
    status: statusFromRatio(report.editableGroupCount, report.totalDiagramCount),
    totalCount: report.totalDiagramCount,
  }
}

function themeApplicationSection(input: {
  plan: PptxThemePackagePlan
  xmlAuthoring: PptxThemePackageXmlAuthoring
}): NativeOfficePackageParitySection {
  const readyCount = input.plan.readyPartCount + input.xmlAuthoring.readyPartCount
  const totalCount = input.plan.totalPartCount + input.xmlAuthoring.totalPartCount

  return {
    detail:
      input.plan.status === "ready" && input.xmlAuthoring.status === "ready"
        ? `${input.plan.packageFileName} can be applied through reusable .thmx package XML and theme1.xml.`
        : `${input.plan.summary} ${input.xmlAuthoring.summary}`,
    id: "theme-package-application",
    label: ".thmx application path",
    readyCount,
    status: combineStatuses([
      normalizeStatus(input.plan.status),
      normalizeStatus(input.xmlAuthoring.status),
    ]),
    totalCount,
  }
}

function packageAuthoringSection(
  authoring: NativePptxPackageAuthoring,
): NativeOfficePackageParitySection {
  return {
    detail: authoring.summary,
    id: "package-authoring",
    label: "Native package writer",
    readyCount: authoring.readyPartCount,
    status: normalizeStatus(authoring.status),
    totalCount: authoring.totalPartCount,
  }
}

function relationshipStatus(ready: boolean, partial: boolean) {
  if (ready) return "ready"
  if (partial) return "partial"

  return "blocked"
}

function relationshipChecks(input: {
  masterXmlPlan: NativePptxMasterXmlPlan
  themePackagePlan: PptxThemePackagePlan
}): NativeOfficePackageRelationshipCheck[] {
  const rootThemeRelationship = input.themePackagePlan.packageParts.find(
    (part) => part.kind === "root-relationship",
  )
  const themePartRelationships = input.themePackagePlan.packageParts.find(
    (part) => part.kind === "theme-relationships",
  )
  const layoutReady =
    input.masterXmlPlan.layoutPartCount > 0 &&
    input.masterXmlPlan.masterLayoutXmlAuthoring.layoutPartCount ===
      input.masterXmlPlan.layoutPartCount
  const masterReady =
    input.masterXmlPlan.masterPartCount > 0 &&
    input.masterXmlPlan.masterLayoutXmlAuthoring.masterPartCount > 0

  return [
    {
      detail: rootThemeRelationship?.detail ?? "No package root theme relationship has been planned yet.",
      id: "package-root-theme-relationship",
      label: "Package root theme relationship",
      path: rootThemeRelationship?.path ?? "_rels/.rels",
      status: normalizeStatus(rootThemeRelationship?.status ?? "blocked"),
    },
    {
      detail: themePartRelationships?.detail ?? "No theme relationship manifest has been planned yet.",
      id: "theme-part-relationships",
      label: "Theme part relationship manifest",
      path: themePartRelationships?.path ?? "ppt/theme/_rels/theme1.xml.rels",
      status: normalizeStatus(themePartRelationships?.status ?? "blocked"),
    },
    {
      detail: masterReady
        ? "Slide master XML is authored and ready for the presentation relationship handoff."
        : "Slide master XML needs a ready authored master part before presentation relationships can be completed.",
      id: "presentation-slide-master-relationship",
      label: "Presentation to slide-master relationship",
      path: "ppt/_rels/presentation.xml.rels",
      status: relationshipStatus(masterReady, input.masterXmlPlan.masterPartCount > 0),
    },
    {
      detail: layoutReady
        ? `${input.masterXmlPlan.layoutPartCount} slide layout part(s) can be linked from the slide master.`
        : "Saved slide layouts need authored XML parts before slide-master layout relationships are complete.",
      id: "slide-master-layout-relationships",
      label: "Slide-master to layout relationships",
      path: "ppt/slideMasters/_rels/slideMaster1.xml.rels",
      status: relationshipStatus(layoutReady, input.masterXmlPlan.layoutPartCount > 0),
    },
    {
      detail: input.masterXmlPlan.placeholderInheritanceIssueCount
        ? `${input.masterXmlPlan.placeholderInheritanceIssueCount} placeholder inheritance diagnostic(s) need review before applying master/layout relationships broadly.`
        : "Placeholder inheritance diagnostics are clear for native master/layout application.",
      id: "layout-placeholder-inheritance",
      label: "Layout placeholder inheritance",
      path: "ppt/slideLayouts/*",
      status: input.masterXmlPlan.placeholderInheritanceIssueCount ? "partial" : "ready",
    },
  ]
}

function masterRelationshipSection(
  checks: readonly NativeOfficePackageRelationshipCheck[],
): NativeOfficePackageParitySection {
  const readyCount = checks.filter((check) => check.status === "ready").length

  return {
    detail: firstNonReadyDetail(
      checks,
      "Theme, master, layout, and placeholder inheritance relationship checks are ready.",
    ),
    id: "master-layout-relationships",
    label: "Master/layout relationships",
    readyCount,
    status: combineStatuses(checks.map((check) => check.status)),
    totalCount: checks.length,
  }
}

function parityActions(input: {
  diagramReport: DiagramAuthoringReport
  packageAuthoring: NativePptxPackageAuthoring
  relationshipSection: NativeOfficePackageParitySection
  themeSection: NativeOfficePackageParitySection
}): NativeOfficePackageParityAction[] {
  const diagramReady =
    input.diagramReport.totalDiagramCount > 0 &&
    input.diagramReport.editableGroupCount === input.diagramReport.totalDiagramCount

  return [
    {
      detail: input.diagramReport.summary,
      id: "complete-smartart-conversion-plan",
      label: "SmartArt conversion plan",
      ownerAction: diagramReady
        ? "Use the preserved Office layout names when adding the next SmartArt XML conversion pass."
        : "Insert or convert grouped diagram templates so PowerPoint layout metadata has real deck candidates.",
      status: diagramReady ? "ready" : "partial",
    },
    {
      detail: input.themeSection.detail,
      id: "verify-theme-application-path",
      label: ".thmx theme application",
      ownerAction:
        input.themeSection.status === "ready"
          ? "Apply the authored theme package parts during native PPTX package writing."
          : "Complete Office theme metadata before applying the reusable .thmx package path.",
      status: input.themeSection.status,
    },
    {
      detail: input.relationshipSection.detail,
      id: "verify-master-layout-relationships",
      label: "Master/layout relationship checks",
      ownerAction:
        input.relationshipSection.status === "ready"
          ? "Merge presentation, slide-master, and slide-layout relationship manifests in the next writer pass."
          : "Review the first non-ready master/layout relationship check before package-wide application.",
      status: input.relationshipSection.status,
    },
    {
      detail: input.packageAuthoring.summary,
      id: "author-native-package",
      label: "Native package authoring",
      ownerAction:
        input.packageAuthoring.status === "ready"
          ? "Run the native package writer against a resolved PPTX zip entry map."
          : "Provide package entries for merge-sensitive slide timing, relationships, and action overlay writes.",
      status: normalizeStatus(input.packageAuthoring.status),
    },
  ]
}

function reportSummary(input: {
  readySectionCount: number
  status: NativeOfficePackageParityStatus
  totalSectionCount: number
}) {
  if (input.status === "ready") {
    return "Native Office package parity checks are ready for package-wide application."
  }

  if (input.status === "blocked") {
    return "Native Office package parity is blocked until theme, diagram, or master/layout package metadata exists."
  }

  return `${input.readySectionCount}/${input.totalSectionCount} native Office package parity section(s) are ready; continue the first non-ready action before package-wide application.`
}

export function nativeOfficePackageParityReport(
  deck: Deck,
  entries?: ZipEntries,
): NativeOfficePackageParityReport {
  const diagramReport = deckDiagramAuthoringReport(deck)
  const themePackagePlan = pptxThemePackagePlan(deck)
  const themePackageXmlAuthoring = pptxThemePackageXmlAuthoring(deck)
  const masterXmlPlan = nativePptxMasterXmlPlan(deck)
  const packageAuthoring = pptxNativePackageAuthoring(deck, entries)
  const checks = relationshipChecks({ masterXmlPlan, themePackagePlan })
  const themeSection = themeApplicationSection({
    plan: themePackagePlan,
    xmlAuthoring: themePackageXmlAuthoring,
  })
  const relationshipSection = masterRelationshipSection(checks)
  const sections = [
    smartArtSection(diagramReport),
    themeSection,
    relationshipSection,
    packageAuthoringSection(packageAuthoring),
  ]
  const readySectionCount = sections.filter(
    (section) => section.status === "ready",
  ).length
  const status = combineStatuses(sections.map((section) => section.status))
  const actions = parityActions({
    diagramReport,
    packageAuthoring,
    relationshipSection,
    themeSection,
  })

  return {
    actionCount: actions.length,
    actions,
    diagramReport,
    masterXmlPlan,
    packageAuthoring,
    readyActionCount: actions.filter((action) => action.status === "ready").length,
    readyRelationshipCount: checks.filter((check) => check.status === "ready")
      .length,
    readySectionCount,
    relationshipChecks: checks,
    sections,
    status,
    summary: reportSummary({
      readySectionCount,
      status,
      totalSectionCount: sections.length,
    }),
    themePackagePlan,
    themePackageXmlAuthoring,
    totalRelationshipCount: checks.length,
    totalSectionCount: sections.length,
  }
}

export function serializeNativeOfficePackageParityReport(
  report: NativeOfficePackageParityReport,
) {
  const lines = [
    "Native Office package parity report",
    `Status: ${report.status}`,
    `Summary: ${report.summary}`,
    `Sections: ${report.readySectionCount}/${report.totalSectionCount}`,
    `Actions: ${report.readyActionCount}/${report.actionCount}`,
    `Relationship checks: ${report.readyRelationshipCount}/${report.totalRelationshipCount}`,
    "",
    "Sections:",
    ...report.sections.map(
      (section, index) =>
        `${index + 1}. ${section.label}: ${section.status}; ${section.readyCount}/${section.totalCount}. ${section.detail}`,
    ),
    "",
    "Relationship checks:",
    ...report.relationshipChecks.map(
      (check, index) =>
        `${index + 1}. ${check.label}: ${check.status}; ${check.path}. ${check.detail}`,
    ),
    "",
    "Actions:",
    ...report.actions.map(
      (action, index) =>
        `${index + 1}. ${action.label}: ${action.status}; ${action.ownerAction} ${action.detail}`,
    ),
  ]

  return `${lines.join("\n")}\n`
}
