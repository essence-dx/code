import {
  customDeckTemplateStats,
  type CustomDeckTemplate,
} from "./custom-deck-templates"
import {
  reusableAssetAudit,
  type ReusableAssetAuditIssue,
} from "./reusable-asset-audit"
import { pptxThemeSafeFileStem } from "./pptx-theme-package-plan"
import type { DeckLayoutPreset } from "./types"

export type TemplatePackageManifestStatus = "ready" | "warning"

export type TemplatePackageManifestTemplate = {
  createdAt: string
  id: string
  lastUsedAt?: string
  name: string
  slideCount: number
  source: "imported" | "local"
  themeBundleId?: string
  themeMismatched: boolean
  useCount: number
}

export type TemplatePackageManifestLayout = {
  createdAt: string
  id: string
  label: string
  lastUsedAt?: string
  slotCount: number
  useCount: number
}

export type TemplatePackageManifest = {
  generatedAt: string
  importedTemplateCount: number
  issueCount: number
  issues: ReusableAssetAuditIssue[]
  kind: "essence-template-package-manifest"
  layoutPresetCount: number
  layouts: TemplatePackageManifestLayout[]
  mismatchedThemeCount: number
  packageFileName: string
  pairedThemeCount: number
  staleCount: number
  status: TemplatePackageManifestStatus
  summary: string
  templates: TemplatePackageManifestTemplate[]
  totalTemplateSlides: number
  unpairedTemplateCount: number
  unusedCount: number
  version: 1
}

export type TemplatePackageManifestInput = {
  layoutPresets: DeckLayoutPreset[]
  now?: Date
  packageName?: string
  staleAfterDays?: number
  templates: CustomDeckTemplate[]
}

function masterThemeKey(template: CustomDeckTemplate) {
  const master = template.deck.master

  return JSON.stringify({
    color: master.color,
    fontFamily: master.fontFamily,
    fontSize: master.fontSize,
    showDate: master.showDate,
    showFooter: master.showFooter,
    showSlideNumbers: master.showSlideNumbers,
  })
}

function bundleThemeKey(template: CustomDeckTemplate) {
  const master = template.themeBundle?.master
  if (!master) return ""

  return JSON.stringify({
    color: master.color,
    fontFamily: master.fontFamily,
    fontSize: master.fontSize,
    showDate: master.showDate,
    showFooter: master.showFooter,
    showSlideNumbers: master.showSlideNumbers,
  })
}

function templateThemeMismatched(template: CustomDeckTemplate) {
  if (!template.themeBundle) return false

  return masterThemeKey(template) !== bundleThemeKey(template)
}

function manifestSummary(input: {
  issueCount: number
  mismatchedThemeCount: number
  templateCount: number
  unpairedTemplateCount: number
}) {
  if (!input.templateCount) {
    return "No custom templates are packaged yet."
  }

  if (!input.issueCount && !input.mismatchedThemeCount) {
    return `${input.templateCount} custom template${
      input.templateCount === 1 ? "" : "s"
    } are package-ready with paired theme metadata.`
  }

  return `${input.templateCount} custom template${
    input.templateCount === 1 ? "" : "s"
  } packaged; ${input.unpairedTemplateCount} unpaired and ${
    input.mismatchedThemeCount
  } theme mismatch item${input.mismatchedThemeCount === 1 ? "" : "s"} need review.`
}

export function templatePackageManifest(
  input: TemplatePackageManifestInput,
): TemplatePackageManifest {
  const now = input.now ?? new Date()
  const stats = customDeckTemplateStats(
    input.templates,
    now,
    input.staleAfterDays,
  )
  const audit = reusableAssetAudit({
    layoutPresets: input.layoutPresets,
    now,
    staleAfterDays: input.staleAfterDays,
    templates: input.templates,
  })
  const templates = input.templates.map((template) => ({
    createdAt: template.createdAt,
    id: template.id,
    lastUsedAt: template.lastUsedAt,
    name: template.name,
    slideCount: template.deck.slides.length,
    source: template.source ?? "local",
    themeBundleId: template.themeBundle?.id,
    themeMismatched: templateThemeMismatched(template),
    useCount: template.useCount ?? 0,
  }))
  const mismatchedThemeCount = templates.filter(
    (template) => template.themeMismatched,
  ).length
  const issueCount = audit.issueCount + mismatchedThemeCount
  const packageName = input.packageName?.trim() || "essence-template-package"

  return {
    generatedAt: now.toISOString(),
    importedTemplateCount: stats.importedCount,
    issueCount,
    issues: audit.issues,
    kind: "essence-template-package-manifest",
    layoutPresetCount: input.layoutPresets.length,
    layouts: input.layoutPresets.map((preset) => ({
      createdAt: preset.createdAt,
      id: preset.id,
      label: preset.label,
      lastUsedAt: preset.lastUsedAt,
      slotCount: preset.slots.length,
      useCount: preset.useCount ?? 0,
    })),
    mismatchedThemeCount,
    packageFileName: `${pptxThemeSafeFileStem(packageName)}.manifest.json`,
    pairedThemeCount: stats.pairedThemeCount,
    staleCount: audit.staleCount,
    status: issueCount ? "warning" : "ready",
    summary: manifestSummary({
      issueCount: audit.issueCount,
      mismatchedThemeCount,
      templateCount: input.templates.length,
      unpairedTemplateCount: audit.unpairedTemplateCount,
    }),
    templates,
    totalTemplateSlides: input.templates.reduce(
      (total, template) => total + template.deck.slides.length,
      0,
    ),
    unpairedTemplateCount: audit.unpairedTemplateCount,
    unusedCount: audit.unusedCount,
    version: 1,
  }
}

export function serializeTemplatePackageManifest(
  manifest: TemplatePackageManifest,
) {
  return JSON.stringify(manifest, null, 2)
}
