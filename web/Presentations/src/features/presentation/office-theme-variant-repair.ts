import { masterLayoutVariantsForPreset } from "./master-layout-variants"
import { masterThemeSafeguardReport } from "./master-theme-safeguards"
import { pptxThemePackagePlan } from "./pptx-theme-package-plan"
import { pptxThemePackageXmlAuthoring } from "./pptx-theme-package-xml-authoring"
import { standaloneThemeFileName } from "./theme-file-portability"
import type { Deck, OfficeThemeMetadata } from "./types"

export type OfficeThemeVariantRepairStatus =
  | "attention"
  | "ready"
  | "warning"

export type OfficeThemeVariantRepairActionId =
  | "complete-theme-metadata"
  | "export-theme-package"
  | "import-source-theme"
  | "review-placeholder-inheritance"
  | "save-master-variants"

export type OfficeThemeVariantRepairAction = {
  count: number
  detail: string
  id: OfficeThemeVariantRepairActionId
  label: string
  ownerAction: string
  status: OfficeThemeVariantRepairStatus
  target: string
}

export type OfficeThemeVariantReview = {
  colorCount: number
  fontPair: string
  source: OfficeThemeMetadata["source"] | "none"
  sourceReviewFileName: string
  themeFileName: string
  themeName: string
  themePackageFileName: string
  themeXmlPath: string
  variantCount: number
}

export type OfficeThemeVariantRepairMetrics = {
  actionCount: number
  colorCount: number
  layoutPresetCount: number
  placeholderInheritanceIssueCount: number
  readyActionCount: number
  sourceThemeAvailable: boolean
  themeMetadataReady: boolean
  themePackageReadyPartCount: number
  themePackageTotalPartCount: number
  themePackageXmlReadyPartCount: number
  themePackageXmlTotalPartCount: number
  variantCount: number
}

export type OfficeThemeVariantRepairReport = {
  actions: OfficeThemeVariantRepairAction[]
  attentionCount: number
  metrics: OfficeThemeVariantRepairMetrics
  readyCount: number
  review: OfficeThemeVariantReview
  status: OfficeThemeVariantRepairStatus
  summary: string
  warningCount: number
}

function isMetadataReady(theme: OfficeThemeMetadata | null | undefined) {
  return Boolean(
    theme &&
      theme.colors.length &&
      theme.majorFont.trim() &&
      theme.minorFont.trim() &&
      Number.isFinite(Date.parse(theme.importedAt)),
  )
}

function combineStatus(
  statuses: OfficeThemeVariantRepairStatus[],
): OfficeThemeVariantRepairStatus {
  if (statuses.includes("attention")) return "attention"
  if (statuses.includes("warning")) return "warning"
  return "ready"
}

function fontPair(theme: OfficeThemeMetadata | null | undefined) {
  if (!theme) return "missing"

  return `${theme.majorFont.trim() || "missing"} / ${
    theme.minorFont.trim() || "missing"
  }`
}

function missingMetadata(theme: OfficeThemeMetadata | null | undefined) {
  if (!theme) return ["Office theme metadata"]

  return [
    theme.colors.length ? "" : "color scheme",
    theme.majorFont.trim() ? "" : "major font",
    theme.minorFont.trim() ? "" : "minor font",
    Number.isFinite(Date.parse(theme.importedAt)) ? "" : "import timestamp",
  ].filter(Boolean)
}

function action(input: OfficeThemeVariantRepairAction) {
  return input
}

function reportSummary(input: {
  actionCount: number
  attentionCount: number
  themeName: string
  variantCount: number
}) {
  if (!input.actionCount) {
    return `${input.themeName} is ready for theme-file export, source review, and ${input.variantCount} master variant option(s).`
  }

  if (input.attentionCount) {
    return `${input.themeName} has ${input.actionCount} theme repair action(s), including ${input.attentionCount} attention item(s).`
  }

  return `${input.themeName} has ${input.actionCount} theme repair action(s) available before a clean .thmx handoff.`
}

export function officeThemeVariantRepairReport(
  deck: Deck,
): OfficeThemeVariantRepairReport {
  const theme = deck.master.officeTheme
  const themeName = theme?.name.trim() || `${deck.title || "Essence"} theme`
  const packagePlan = pptxThemePackagePlan(deck)
  const packageXml = pptxThemePackageXmlAuthoring(deck)
  const safeguards = masterThemeSafeguardReport(deck)
  const variants = deck.master.layoutPresets.flatMap(masterLayoutVariantsForPreset)
  const metadataReady = isMetadataReady(theme)
  const actions: OfficeThemeVariantRepairAction[] = []

  if (!theme || !metadataReady) {
    const missing = missingMetadata(theme)

    actions.push(
      action({
        count: missing.length,
        detail: `Missing ${missing.join(", ")} for reusable Office theme-file round trips.`,
        id: "complete-theme-metadata",
        label: "Complete theme metadata",
        ownerAction:
          "Import an Office source theme or fill color/font metadata before exporting a reusable theme file.",
        status: theme ? "warning" : "attention",
        target: packagePlan.exportThemePath,
      }),
    )
  }

  if (theme?.source === "pptx") {
    actions.push(
      action({
        count: 0,
        detail: `${packagePlan.importReviewFileName} preserves the imported source theme XML review target.`,
        id: "import-source-theme",
        label: "Source theme review",
        ownerAction:
          "Keep the imported source theme review alongside the edited theme before handing off to PowerPoint.",
        status: "ready",
        target: packagePlan.importReviewFileName || packagePlan.exportThemePath,
      }),
    )
  } else {
    actions.push(
      action({
        count: 1,
        detail:
          "No imported PowerPoint theme source is attached to the current deck.",
        id: "import-source-theme",
        label: "Source theme review",
        ownerAction:
          "Import a PPTX theme source when exact PowerPoint theme parity matters.",
        status: theme ? "warning" : "attention",
        target: packagePlan.exportThemePath,
      }),
    )
  }

  if (packagePlan.status !== "ready" || packageXml.status !== "ready") {
    actions.push(
      action({
        count:
          packagePlan.totalPartCount -
          packagePlan.readyPartCount +
          packageXml.totalPartCount -
          packageXml.readyPartCount,
        detail: `${packagePlan.readyPartCount}/${packagePlan.totalPartCount} package part(s) and ${packageXml.readyPartCount}/${packageXml.totalPartCount} XML part(s) are ready.`,
        id: "export-theme-package",
        label: "Theme package export",
        ownerAction:
          "Repair metadata gaps before relying on a reusable .thmx package handoff.",
        status: "warning",
        target: packagePlan.packageFileName,
      }),
    )
  } else {
    actions.push(
      action({
        count: 0,
        detail: `${packageXml.xmlLength} XML character(s) are ready across ${packageXml.totalPartCount} theme package part(s).`,
        id: "export-theme-package",
        label: "Theme package export",
        ownerAction:
          "Export the standalone theme file when the deck theme should be reused in another presentation.",
        status: "ready",
        target: packagePlan.packageFileName,
      }),
    )
  }

  if (!deck.master.layoutPresets.length || variants.length <= deck.master.layoutPresets.length) {
    actions.push(
      action({
        count: Math.max(1, deck.master.layoutPresets.length),
        detail: deck.master.layoutPresets.length
          ? "Saved master layouts do not produce meaningful Mirror or Stack variants yet."
          : "No saved master layouts are available for theme variant reuse.",
        id: "save-master-variants",
        label: "Master theme variants",
        ownerAction:
          "Save reusable master layouts with title/body/media slots before exporting theme variants.",
        status: "warning",
        target: "deck master",
      }),
    )
  } else {
    actions.push(
      action({
        count: variants.length,
        detail: `${variants.length} master layout variant option(s) are ready from ${deck.master.layoutPresets.length} saved layout preset(s).`,
        id: "save-master-variants",
        label: "Master theme variants",
        ownerAction:
          "Review generated Mirror and Stack variants before applying them across a deck.",
        status: "ready",
        target: "deck master",
      }),
    )
  }

  if (safeguards.status !== "ready") {
    actions.push(
      action({
        count: safeguards.attentionCount + safeguards.warningCount,
        detail: safeguards.summary,
        id: "review-placeholder-inheritance",
        label: "Placeholder inheritance",
        ownerAction:
          "Resolve master safeguard warnings before bulk reapplying imported theme variants.",
        status: safeguards.status === "attention" ? "attention" : "warning",
        target: "master safeguards",
      }),
    )
  } else {
    actions.push(
      action({
        count: 0,
        detail: safeguards.summary,
        id: "review-placeholder-inheritance",
        label: "Placeholder inheritance",
        ownerAction:
          "Bulk theme variant reapply is clear for the current placeholder set.",
        status: "ready",
        target: "master safeguards",
      }),
    )
  }

  const attentionCount = actions.filter(
    (item) => item.status === "attention",
  ).length
  const warningCount = actions.filter((item) => item.status === "warning").length
  const readyCount = actions.filter((item) => item.status === "ready").length
  const actionCount = actions.length - readyCount
  const status = combineStatus(actions.map((item) => item.status))

  return {
    actions,
    attentionCount,
    metrics: {
      actionCount,
      colorCount: packagePlan.colorCount,
      layoutPresetCount: deck.master.layoutPresets.length,
      placeholderInheritanceIssueCount:
        safeguards.attentionCount + safeguards.warningCount,
      readyActionCount: readyCount,
      sourceThemeAvailable: packagePlan.sourceThemeAvailable,
      themeMetadataReady: metadataReady,
      themePackageReadyPartCount: packagePlan.readyPartCount,
      themePackageTotalPartCount: packagePlan.totalPartCount,
      themePackageXmlReadyPartCount: packageXml.readyPartCount,
      themePackageXmlTotalPartCount: packageXml.totalPartCount,
      variantCount: variants.length,
    },
    readyCount,
    review: {
      colorCount: packagePlan.colorCount,
      fontPair: packagePlan.fontPair || fontPair(theme),
      source: packagePlan.source,
      sourceReviewFileName: packagePlan.importReviewFileName,
      themeFileName: standaloneThemeFileName(deck),
      themeName,
      themePackageFileName: packagePlan.packageFileName,
      themeXmlPath: packagePlan.exportThemePath,
      variantCount: variants.length,
    },
    status,
    summary: reportSummary({
      actionCount,
      attentionCount,
      themeName,
      variantCount: variants.length,
    }),
    warningCount,
  }
}

export function serializeOfficeThemeVariantRepairReport(
  report: OfficeThemeVariantRepairReport,
) {
  return [
    "Office theme variant repair report",
    `Theme: ${report.review.themeName}`,
    `Status: ${report.status}`,
    `Summary: ${report.summary}`,
    `Theme file: ${report.review.themeFileName}`,
    `Theme package: ${report.review.themePackageFileName}`,
    `Theme XML: ${report.review.themeXmlPath}`,
    `Source review: ${report.review.sourceReviewFileName || "none"}`,
    `Variants: ${report.review.variantCount}`,
    `Package parts: ${report.metrics.themePackageReadyPartCount}/${report.metrics.themePackageTotalPartCount}`,
    `Package XML parts: ${report.metrics.themePackageXmlReadyPartCount}/${report.metrics.themePackageXmlTotalPartCount}`,
    "",
    "Repair actions:",
    ...report.actions.map(
      (item, index) =>
        `${index + 1}. ${item.label}: ${item.status}; ${item.target}; ${item.detail} ${item.ownerAction}`,
    ),
  ].join("\n")
}
