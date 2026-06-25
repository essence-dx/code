import type { CustomDeckTemplate } from "./custom-deck-templates"
import type { DeckLayoutPreset } from "./types"

export type ReusableAssetAuditAssetType = "master-layout" | "template"
export type ReusableAssetAuditSeverity = "info" | "warning"

export type ReusableAssetAuditIssue = {
  assetId: string
  assetType: ReusableAssetAuditAssetType
  detail: string
  id: string
  label: string
  severity: ReusableAssetAuditSeverity
}

export type ReusableAssetAuditSummary = {
  issueCount: number
  issues: ReusableAssetAuditIssue[]
  staleCount: number
  totalAssets: number
  unpairedTemplateCount: number
  unusedCount: number
}

export type ReusableAssetAuditInput = {
  layoutPresets: DeckLayoutPreset[]
  limit?: number
  now?: Date
  staleAfterDays?: number
  templates: CustomDeckTemplate[]
}

function readTimestamp(value: string | undefined) {
  if (!value) return 0

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function assetFreshnessTimestamp(input: {
  createdAt: string
  lastUsedAt?: string
}) {
  return readTimestamp(input.lastUsedAt) || readTimestamp(input.createdAt)
}

function isStale(input: {
  createdAt: string
  lastUsedAt?: string
  nowMs: number
  staleAfterMs: number
}) {
  const freshnessMs = assetFreshnessTimestamp(input)

  return Boolean(freshnessMs && input.nowMs - freshnessMs > input.staleAfterMs)
}

function issueWeight(issue: ReusableAssetAuditIssue) {
  if (issue.severity === "warning") return 2
  return 1
}

export function reusableAssetAudit(
  input: ReusableAssetAuditInput,
): ReusableAssetAuditSummary {
  const nowMs = (input.now ?? new Date()).getTime()
  const staleAfterMs =
    Math.max(1, input.staleAfterDays ?? 30) * 24 * 60 * 60 * 1000
  const limit = Math.max(0, Math.floor(input.limit ?? 6))
  const issues: ReusableAssetAuditIssue[] = []
  let staleCount = 0
  let unpairedTemplateCount = 0
  let unusedCount = 0

  for (const template of input.templates) {
    const unused = (template.useCount ?? 0) === 0
    const stale = isStale({
      createdAt: template.createdAt,
      lastUsedAt: template.lastUsedAt,
      nowMs,
      staleAfterMs,
    })

    if (unused) {
      unusedCount += 1
      issues.push({
        assetId: template.id,
        assetType: "template",
        detail: `${template.deck.slides.length} slides`,
        id: `unused-template:${template.id}`,
        label: `${template.name} has not been used`,
        severity: "info",
      })
    }

    if (stale) {
      staleCount += 1
      issues.push({
        assetId: template.id,
        assetType: "template",
        detail: "Template has not been refreshed recently",
        id: `stale-template:${template.id}`,
        label: template.name,
        severity: "warning",
      })
    }

    if (!template.themeBundle) {
      unpairedTemplateCount += 1
      issues.push({
        assetId: template.id,
        assetType: "template",
        detail: "No paired theme bundle",
        id: `unpaired-template:${template.id}`,
        label: template.name,
        severity: "info",
      })
    }
  }

  for (const preset of input.layoutPresets) {
    const unused = (preset.useCount ?? 0) === 0
    const stale = isStale({
      createdAt: preset.createdAt,
      lastUsedAt: preset.lastUsedAt,
      nowMs,
      staleAfterMs,
    })

    if (unused) {
      unusedCount += 1
      issues.push({
        assetId: preset.id,
        assetType: "master-layout",
        detail: preset.description,
        id: `unused-master-layout:${preset.id}`,
        label: `${preset.label} has not been used`,
        severity: "info",
      })
    }

    if (stale) {
      staleCount += 1
      issues.push({
        assetId: preset.id,
        assetType: "master-layout",
        detail: "Master layout has not been used recently",
        id: `stale-master-layout:${preset.id}`,
        label: preset.label,
        severity: "warning",
      })
    }
  }

  const visibleIssues = issues
    .sort((left, right) => issueWeight(right) - issueWeight(left))
    .slice(0, limit)

  return {
    issueCount: issues.length,
    issues: visibleIssues,
    staleCount,
    totalAssets: input.templates.length + input.layoutPresets.length,
    unpairedTemplateCount,
    unusedCount,
  }
}
