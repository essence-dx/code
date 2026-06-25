import { nanoid } from "nanoid"

import { migrateDeckAssets } from "./deck-assets"
import {
  applyThemeBundleToDeck,
  normalizeCustomThemeBundle,
  themeBundleFromDeck,
  type CustomThemeBundle,
} from "./theme-bundles"
import type { Deck } from "./types"

const CUSTOM_TEMPLATE_STORAGE_KEY = "essence-powerpoint-custom-templates"
const CUSTOM_TEMPLATE_LIMIT = 12
export const customDeckTemplatesFileName = "essence-deck-templates.json"

export type CustomDeckTemplate = {
  id: string
  name: string
  description: string
  createdAt: string
  deck: Deck
  importedAt?: string
  lastUsedAt?: string
  source?: "imported" | "local"
  themeBundle?: CustomThemeBundle
  useCount?: number
}

export type CustomDeckTemplateFile = {
  version: 1
  templates: CustomDeckTemplate[]
}

export type CustomDeckTemplateImportResult = {
  templates: CustomDeckTemplate[]
  added: number
  skipped: number
}

export type CustomDeckTemplateStats = {
  importedCount: number
  neverUsedCount: number
  pairedThemeCount: number
  staleCount: number
  total: number
}

export type RecommendedCustomDeckTemplateOptions = {
  freshAfterDays?: number
  limit?: number
  now?: Date
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function cloneDeck(deck: Deck) {
  return JSON.parse(JSON.stringify(deck)) as Deck
}

function writeCustomDeckTemplates(templates: CustomDeckTemplate[]) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(
    CUSTOM_TEMPLATE_STORAGE_KEY,
    JSON.stringify(templates),
  )
}

function parseTemplate(value: unknown): CustomDeckTemplate | null {
  if (!isRecord(value) || !isRecord(value.deck)) return null
  const deck = value.deck as Deck
  if (!Array.isArray(deck.slides)) return null

  return {
    id: typeof value.id === "string" ? value.id : nanoid(),
    name:
      typeof value.name === "string" && value.name.trim()
        ? value.name.trim()
        : deck.title || "Custom template",
    description:
      typeof value.description === "string" ? value.description : "",
    createdAt:
      typeof value.createdAt === "string"
        ? value.createdAt
        : new Date().toISOString(),
    deck: migrateDeckAssets(deck),
    importedAt: typeof value.importedAt === "string" ? value.importedAt : undefined,
    lastUsedAt: typeof value.lastUsedAt === "string" ? value.lastUsedAt : undefined,
    source: value.source === "imported" ? "imported" : "local",
    themeBundle: normalizeCustomThemeBundle(value.themeBundle) ?? undefined,
    useCount:
      typeof value.useCount === "number" && Number.isFinite(value.useCount)
        ? Math.max(0, Math.round(value.useCount))
        : 0,
  }
}

function parseTemplateList(value: unknown) {
  const records = Array.isArray(value)
    ? value
    : value &&
        typeof value === "object" &&
        (value as Partial<CustomDeckTemplateFile>).version === 1 &&
        Array.isArray((value as Partial<CustomDeckTemplateFile>).templates)
      ? (value as Partial<CustomDeckTemplateFile>).templates
      : null

  if (!records) return []

  return records
    .map(parseTemplate)
    .filter((template): template is CustomDeckTemplate => Boolean(template))
}

function readTimestamp(value: string | undefined) {
  if (!value) return 0

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function templateFreshnessTimestamp(template: CustomDeckTemplate) {
  return readTimestamp(template.lastUsedAt) || readTimestamp(template.createdAt)
}

export function serializeCustomDeckTemplates(
  templates: CustomDeckTemplate[],
) {
  return JSON.stringify(
    {
      version: 1,
      templates,
    } satisfies CustomDeckTemplateFile,
    null,
    2,
  )
}

export function parseCustomDeckTemplatesText(value: string) {
  try {
    return parseTemplateList(JSON.parse(value))
  } catch {
    return []
  }
}

export function readCustomDeckTemplates() {
  if (typeof window === "undefined") return []

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(CUSTOM_TEMPLATE_STORAGE_KEY) ?? "[]",
    ) as unknown

    return parseTemplateList(parsed).slice(0, CUSTOM_TEMPLATE_LIMIT)
  } catch {
    return []
  }
}

export function customDeckTemplateFromDeck(
  deck: Deck,
  name: string,
  selectedSlideId?: string | null,
  now = new Date(),
): CustomDeckTemplate {
  const templateName = name.trim() || deck.title || "Custom template"
  const slideId = selectedSlideId ?? deck.slides[0]?.id ?? ""

  return {
    id: nanoid(),
    name: templateName,
    description: `${deck.slides.length} slides`,
    createdAt: now.toISOString(),
    deck: migrateDeckAssets({
      ...cloneDeck(deck),
      title: templateName,
      updatedAt: now.toISOString(),
    }),
    source: "local",
    themeBundle: themeBundleFromDeck(deck, slideId, `${templateName} theme`, now),
    useCount: 0,
  }
}

export function saveCustomDeckTemplate(
  deck: Deck,
  name: string,
  selectedSlideId?: string | null,
) {
  const template = customDeckTemplateFromDeck(deck, name, selectedSlideId)
  const templates = [template, ...readCustomDeckTemplates()].slice(
    0,
    CUSTOM_TEMPLATE_LIMIT,
  )

  writeCustomDeckTemplates(templates)

  return templates
}

export function markCustomDeckTemplateUsedInList(
  templates: CustomDeckTemplate[],
  templateId: string,
  now = new Date(),
) {
  return templates.map((template) =>
    template.id === templateId
      ? {
          ...template,
          lastUsedAt: now.toISOString(),
          useCount: (template.useCount ?? 0) + 1,
        }
      : template,
  )
}

export function markCustomDeckTemplateUsed(templateId: string) {
  const templates = markCustomDeckTemplateUsedInList(
    readCustomDeckTemplates(),
    templateId,
  )

  writeCustomDeckTemplates(templates)
  return templates
}

export function deleteCustomDeckTemplate(templateId: string) {
  const templates = readCustomDeckTemplates().filter(
    (template) => template.id !== templateId,
  )

  writeCustomDeckTemplates(templates)

  return templates
}

export function importCustomDeckTemplatesFromText(
  value: string,
): CustomDeckTemplateImportResult {
  const imported = parseCustomDeckTemplatesText(value)
  const existing = readCustomDeckTemplates()
  const existingIds = new Set(existing.map((template) => template.id))
  const fresh = imported.filter((template) => !existingIds.has(template.id))
  const availableSlots = Math.max(0, CUSTOM_TEMPLATE_LIMIT - existing.length)
  const now = new Date().toISOString()
  const accepted = fresh.slice(0, availableSlots).map((template) => ({
    ...template,
    importedAt: template.importedAt ?? now,
    source: "imported" as const,
  }))
  const templates = [...accepted, ...existing].slice(0, CUSTOM_TEMPLATE_LIMIT)

  writeCustomDeckTemplates(templates)

  return {
    templates,
    added: accepted.length,
    skipped: imported.length - accepted.length,
  }
}

export function customDeckTemplateStats(
  templates: CustomDeckTemplate[],
  now = new Date(),
  staleAfterDays = 30,
): CustomDeckTemplateStats {
  const staleAfterMs = staleAfterDays * 24 * 60 * 60 * 1000
  const nowMs = now.getTime()

  return templates.reduce<CustomDeckTemplateStats>(
    (stats, template) => {
      const freshnessDate = template.lastUsedAt ?? template.createdAt
      const freshnessMs = Date.parse(freshnessDate)

      return {
        importedCount:
          stats.importedCount + (template.source === "imported" ? 1 : 0),
        neverUsedCount:
          stats.neverUsedCount + ((template.useCount ?? 0) === 0 ? 1 : 0),
        pairedThemeCount: stats.pairedThemeCount + (template.themeBundle ? 1 : 0),
        staleCount:
          stats.staleCount +
          (Number.isFinite(freshnessMs) && nowMs - freshnessMs > staleAfterMs
            ? 1
            : 0),
        total: stats.total + 1,
      }
    },
    {
      importedCount: 0,
      neverUsedCount: 0,
      pairedThemeCount: 0,
      staleCount: 0,
      total: 0,
    },
  )
}

export function recommendedCustomDeckTemplates(
  templates: CustomDeckTemplate[],
  options: RecommendedCustomDeckTemplateOptions = {},
) {
  const limit = Math.max(0, Math.floor(options.limit ?? 3))

  if (!limit) return []

  const nowMs = (options.now ?? new Date()).getTime()
  const freshWindowMs =
    Math.max(1, options.freshAfterDays ?? 45) * 24 * 60 * 60 * 1000

  return [...templates]
    .sort((left, right) => {
      const score = (template: CustomDeckTemplate) => {
        const freshnessMs = templateFreshnessTimestamp(template)
        const ageMs = freshnessMs ? Math.max(0, nowMs - freshnessMs) : freshWindowMs
        const freshnessScore = Math.max(0, freshWindowMs - ageMs) / freshWindowMs

        return (
          (template.themeBundle ? 500 : 0) +
          Math.min(template.useCount ?? 0, 20) * 50 +
          freshnessScore * 200 +
          Math.min(template.deck.slides.length, 20)
        )
      }
      const rightScore = score(right)
      const leftScore = score(left)

      if (rightScore !== leftScore) return rightScore - leftScore

      const rightFreshness = templateFreshnessTimestamp(right)
      const leftFreshness = templateFreshnessTimestamp(left)

      if (rightFreshness !== leftFreshness) return rightFreshness - leftFreshness

      return left.name.localeCompare(right.name)
    })
    .slice(0, limit)
}

export function createDeckFromCustomTemplate(template: CustomDeckTemplate) {
  const sourceDeck = migrateDeckAssets(cloneDeck(template.deck))
  const deck = template.themeBundle
    ? applyThemeBundleToDeck(
        sourceDeck,
        template.themeBundle,
        sourceDeck.slides[0]?.id ?? "",
      )
    : sourceDeck

  return {
    ...deck,
    id: nanoid(),
    title: template.name,
    updatedAt: new Date().toISOString(),
    slides: deck.slides.map((slide) => {
      const groupIds = new Map<string, string>()

      return {
        ...slide,
        id: nanoid(),
        comments: [],
        elements: slide.elements.map((element) => {
          const groupId = element.groupId
            ? (groupIds.get(element.groupId) ??
              (() => {
                const nextGroupId = nanoid()
                groupIds.set(element.groupId, nextGroupId)
                return nextGroupId
              })())
            : ""

          return {
            ...element,
            id: nanoid(),
            groupId,
          }
        }),
      }
    }),
  }
}
