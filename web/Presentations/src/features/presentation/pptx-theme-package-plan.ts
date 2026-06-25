import type { Deck, OfficeThemeMetadata } from "./types"

export type PptxThemePackagePartKind =
  | "content-types"
  | "root-relationship"
  | "theme"
  | "theme-relationships"

export type PptxThemePackagePartStatus = "blocked" | "partial" | "ready"

export type PptxThemePackagePart = {
  contentType?: string
  detail: string
  id: string
  kind: PptxThemePackagePartKind
  name: string
  path: string
  relationshipType?: string
  status: PptxThemePackagePartStatus
}

export type PptxThemePackagePlan = {
  colorCount: number
  exportThemePath: string
  fontPair: string
  importReviewFileName: string
  packageFileName: string
  packageParts: PptxThemePackagePart[]
  readyPartCount: number
  source: OfficeThemeMetadata["source"] | "none"
  sourceThemeAvailable: boolean
  status: PptxThemePackagePartStatus
  summary: string
  themeName: string
  totalPartCount: number
}

const themeContentType =
  "application/vnd.openxmlformats-officedocument.theme+xml"
const themeRelationshipType =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme"

export function pptxThemeSafeFileStem(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "office-theme"
  )
}

function themeReady(theme: OfficeThemeMetadata | null | undefined) {
  return Boolean(
    theme?.colors.length &&
      theme.majorFont.trim() &&
      theme.minorFont.trim(),
  )
}

function partStatus(theme: OfficeThemeMetadata | null | undefined) {
  if (!theme) return "blocked"
  return themeReady(theme) ? "ready" : "partial"
}

function combinedStatus(
  statuses: readonly PptxThemePackagePartStatus[],
): PptxThemePackagePartStatus {
  if (!statuses.length || statuses.every((status) => status === "blocked")) {
    return "blocked"
  }

  if (statuses.every((status) => status === "ready")) {
    return "ready"
  }

  return "partial"
}

function themePackageParts(
  theme: OfficeThemeMetadata | null | undefined,
): PptxThemePackagePart[] {
  const sharedStatus = theme ? "ready" : "blocked"
  const metadataStatus = partStatus(theme)

  return [
    {
      contentType: "application/xml",
      detail: theme
        ? "Registers the Office theme XML content type for a reusable theme package."
        : "Theme package content types need Office theme metadata first.",
      id: "theme-package:content-types",
      kind: "content-types",
      name: "Content types",
      path: "[Content_Types].xml",
      status: sharedStatus,
    },
    {
      detail: theme
        ? "Connects the package root to the reusable theme XML part."
        : "Root package relationships need a theme XML target first.",
      id: "theme-package:root-relationship",
      kind: "root-relationship",
      name: "Root relationship",
      path: "_rels/.rels",
      relationshipType: themeRelationshipType,
      status: sharedStatus,
    },
    {
      contentType: themeContentType,
      detail:
        metadataStatus === "ready"
          ? "Theme name, colors, and major/minor fonts are ready for theme1.xml."
          : metadataStatus === "partial"
            ? "Theme XML can be emitted, but colors or major/minor fonts need review."
            : "No Office theme metadata is available for theme1.xml.",
      id: "theme-package:theme1",
      kind: "theme",
      name: "Theme XML",
      path: "ppt/theme/theme1.xml",
      status: metadataStatus,
    },
    {
      detail: theme
        ? "Provides a stable relationships manifest for future theme asset links."
        : "Theme relationships are blocked until theme1.xml exists.",
      id: "theme-package:theme1-rels",
      kind: "theme-relationships",
      name: "Theme relationships",
      path: "ppt/theme/_rels/theme1.xml.rels",
      status: sharedStatus,
    },
  ]
}

function packageSummary(input: {
  readyPartCount: number
  status: PptxThemePackagePartStatus
  theme: OfficeThemeMetadata | null | undefined
  totalPartCount: number
}) {
  if (input.status === "blocked") {
    return "No reusable Office theme package is ready; preserve or import theme metadata first."
  }

  const partSummary = `${input.readyPartCount}/${input.totalPartCount} theme package part${
    input.totalPartCount === 1 ? "" : "s"
  } ready`

  if (input.status === "ready") {
    return `${partSummary}; .thmx handoff can preserve theme colors and major/minor fonts.`
  }

  const missing = [
    input.theme?.colors.length ? "" : "colors",
    input.theme?.majorFont.trim() ? "" : "major font",
    input.theme?.minorFont.trim() ? "" : "minor font",
  ].filter(Boolean)

  return `${partSummary}; review ${missing.join(", ")} before a clean .thmx handoff.`
}

export function pptxThemePackagePlan(deck: Deck): PptxThemePackagePlan {
  const theme = deck.master.officeTheme
  const themeName = theme?.name.trim() || `${deck.title || "Essence"} theme`
  const stem = pptxThemeSafeFileStem(themeName)
  const packageParts = themePackageParts(theme)
  const readyPartCount = packageParts.filter(
    (part) => part.status === "ready",
  ).length
  const totalPartCount = packageParts.length
  const status = combinedStatus(packageParts.map((part) => part.status))

  return {
    colorCount: theme?.colors.length ?? 0,
    exportThemePath: "ppt/theme/theme1.xml",
    fontPair: theme
      ? `${theme.majorFont.trim() || "missing"} / ${
          theme.minorFont.trim() || "missing"
        }`
      : "missing",
    importReviewFileName: theme?.source === "pptx" ? `${stem}-source-theme.xml` : "",
    packageFileName: `${stem}.thmx`,
    packageParts,
    readyPartCount,
    source: theme?.source ?? "none",
    sourceThemeAvailable: theme?.source === "pptx",
    status,
    summary: packageSummary({
      readyPartCount,
      status,
      theme,
      totalPartCount,
    }),
    themeName,
    totalPartCount,
  }
}

export function serializePptxThemePackagePlan(deck: Deck) {
  const plan = pptxThemePackagePlan(deck)
  const lines = [
    "Office theme package plan",
    `Theme: ${plan.themeName}`,
    `Status: ${plan.status}`,
    `Package: ${plan.packageFileName}`,
    `Theme XML: ${plan.exportThemePath}`,
    `Source review: ${plan.importReviewFileName || "none"}`,
    `Parts: ${plan.readyPartCount}/${plan.totalPartCount}`,
    `Summary: ${plan.summary}`,
    "",
    "Package parts:",
    ...plan.packageParts.map(
      (part, index) =>
        `${index + 1}. ${part.path} - ${part.name}; ${part.status}; ${part.detail}`,
    ),
  ]

  return `${lines.join("\n")}\n`
}
