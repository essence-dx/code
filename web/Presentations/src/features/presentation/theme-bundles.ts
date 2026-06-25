import {
  applyFontPairToDeck,
  fontPairPresets,
  normalizeFontFamily,
  type FontPairPreset,
} from "./font-pairs"
import {
  designPaletteFromDeck,
  type CustomDesignPalette,
} from "./custom-design-palettes"
import { defaultDeckMaster, normalizeDeckMaster } from "./slide-master"
import {
  applyDesignPaletteToDeck,
  designPalettes,
  type DesignPalette,
} from "./theme-palettes"
import { templateThemeVariants } from "./template-theme-variants"
import type { Deck, DeckMaster, FontFamily, PresentationElement } from "./types"

export type ThemeBundleId =
  | `built-in-theme:${string}`
  | `custom-theme:${string}`

export type ThemeBundlePreset = {
  id: ThemeBundleId
  label: string
  description: string
  palette: DesignPalette
  fontPair: FontPairPreset
  master: DeckMaster
  createdAt?: string
}

export type CustomThemeBundle = ThemeBundlePreset & {
  id: `custom-theme:${string}`
  createdAt: string
  lastUsedAt?: string
  useCount?: number
}

export type ThemeBundleFile = {
  version: 1
  bundles: CustomThemeBundle[]
}

export type ThemeBundleImportResult = {
  bundles: CustomThemeBundle[]
  added: number
  skipped: number
}

export type ThemeBundleCleanupIssue = {
  bundleId: CustomThemeBundle["id"]
  detail: string
  id: string
  label: string
  reason: "duplicate" | "stale" | "unused"
  severity: "info" | "warning"
}

export type ThemeBundleCleanupSummary = {
  duplicateCount: number
  issueCount: number
  issues: ThemeBundleCleanupIssue[]
  staleCount: number
  totalBundles: number
  unusedCount: number
}

export type ThemeBundleCleanupOptions = {
  limit?: number
  now?: Date
  staleAfterDays?: number
}

const CUSTOM_THEME_BUNDLES_STORAGE_KEY = "essence-powerpoint-theme-bundles"
const MAX_CUSTOM_THEME_BUNDLES = 16
const fallbackPalette = designPalettes[0]!
const fallbackFontPair = fontPairPresets[0]!
export const themeBundlesFileName = "essence-theme-bundles.json"

function customThemeBundleId(): `custom-theme:${string}` {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `custom-theme:${crypto.randomUUID()}`
  }

  return `custom-theme:${Date.now()}`
}

function customFontPairId(): `custom-font:${string}` {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `custom-font:${crypto.randomUUID()}`
  }

  return `custom-font:${Date.now()}`
}

function customThemeBundleStorage() {
  return typeof window === "undefined" ? null : window.localStorage
}

function safeColor(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function readTimestamp(value: string | undefined) {
  if (!value) return 0

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function firstFontFamily(
  elements: PresentationElement[],
  predicate: (element: PresentationElement) => boolean,
  fallback: FontFamily,
) {
  return (
    elements.find(predicate)?.fontFamily ??
    elements.find((element) => element.type === "text")?.fontFamily ??
    fallback
  )
}

function fontPairFromDeck(
  deck: Deck,
  selectedSlideId: string,
  name: string,
): FontPairPreset {
  const slide =
    deck.slides.find((item) => item.id === selectedSlideId) ?? deck.slides[0]
  const elements = slide?.elements ?? []
  const titleFontFamily = firstFontFamily(
    elements,
    (element) => element.type === "title",
    "geist",
  )
  const bodyFontFamily = firstFontFamily(
    elements,
    (element) =>
      element.type === "text" ||
      element.type === "table" ||
      element.type === "chart",
    "system",
  )
  const masterFontFamily = deck.master.fontFamily
  const matchingPreset = fontPairPresets.find(
    (preset) =>
      preset.titleFontFamily === titleFontFamily &&
      preset.bodyFontFamily === bodyFontFamily &&
      preset.masterFontFamily === masterFontFamily,
  )

  if (matchingPreset) return matchingPreset

  return {
    id: customFontPairId(),
    label: `${name.trim().slice(0, 48) || "Custom"} fonts`,
    description: "Captured from the current deck",
    titleFontFamily,
    bodyFontFamily,
    masterFontFamily,
  }
}

function paletteId(value: unknown): DesignPalette["id"] {
  const builtIn = designPalettes.find((palette) => palette.id === value)

  if (builtIn) return builtIn.id

  return typeof value === "string" && value.startsWith("custom:")
    ? (value as CustomDesignPalette["id"])
    : fallbackPalette.id
}

function parsePalette(value: unknown): DesignPalette {
  const palette =
    value && typeof value === "object" ? (value as Partial<DesignPalette>) : {}
  const chartColors = Array.isArray(palette.chartColors)
    ? palette.chartColors.filter((color): color is string => typeof color === "string")
    : []

  return {
    id: paletteId(palette.id),
    label: readString(palette.label, fallbackPalette.label),
    description: readString(palette.description, "Imported theme colors"),
    background: safeColor(palette.background, fallbackPalette.background),
    surface: safeColor(palette.surface, fallbackPalette.surface),
    text: safeColor(palette.text, fallbackPalette.text),
    mutedText: safeColor(palette.mutedText, fallbackPalette.mutedText),
    accent: safeColor(palette.accent, fallbackPalette.accent),
    secondary: safeColor(palette.secondary, fallbackPalette.secondary),
    border: safeColor(palette.border, fallbackPalette.border),
    chartColors: [...chartColors, ...fallbackPalette.chartColors].slice(0, 4),
  }
}

function parseFontPair(value: unknown): FontPairPreset {
  const fontPair =
    value && typeof value === "object" ? (value as Partial<FontPairPreset>) : {}
  const builtIn = fontPairPresets.find((preset) => preset.id === fontPair.id)

  if (builtIn) return builtIn

  return {
    id:
      typeof fontPair.id === "string" && fontPair.id.startsWith("custom-font:")
        ? (fontPair.id as FontPairPreset["id"])
        : customFontPairId(),
    label: readString(fontPair.label, fallbackFontPair.label),
    description: readString(fontPair.description, "Imported theme fonts"),
    titleFontFamily: normalizeFontFamily(
      fontPair.titleFontFamily,
      fallbackFontPair.titleFontFamily,
    ),
    bodyFontFamily: normalizeFontFamily(
      fontPair.bodyFontFamily,
      fallbackFontPair.bodyFontFamily,
    ),
    masterFontFamily: normalizeFontFamily(
      fontPair.masterFontFamily,
      fallbackFontPair.masterFontFamily,
    ),
  }
}

function parseCustomThemeBundle(value: unknown): CustomThemeBundle | null {
  if (!value || typeof value !== "object") return null

  const bundle = value as Partial<CustomThemeBundle>

  if (
    !bundle.id?.startsWith("custom-theme:") ||
    typeof bundle.label !== "string" ||
    typeof bundle.createdAt !== "string"
  ) {
    return null
  }

  return {
    id: bundle.id,
    label: bundle.label.trim().slice(0, 60) || "Custom theme",
    description:
      typeof bundle.description === "string"
        ? bundle.description
        : "Imported theme bundle",
    palette: parsePalette(bundle.palette),
    fontPair: parseFontPair(bundle.fontPair),
    master: normalizeDeckMaster(bundle.master),
    createdAt: bundle.createdAt,
    lastUsedAt:
      typeof bundle.lastUsedAt === "string" ? bundle.lastUsedAt : undefined,
    useCount: Math.max(0, Math.floor(readNumber(bundle.useCount))),
  }
}

export function normalizeCustomThemeBundle(value: unknown) {
  return parseCustomThemeBundle(value)
}

function parseThemeBundleList(value: unknown) {
  const records = Array.isArray(value)
    ? value
    : value &&
        typeof value === "object" &&
        (value as Partial<ThemeBundleFile>).version === 1 &&
        Array.isArray((value as Partial<ThemeBundleFile>).bundles)
      ? (value as Partial<ThemeBundleFile>).bundles
      : null

  if (!records) return []

  return records
    .map(parseCustomThemeBundle)
    .filter((bundle): bundle is CustomThemeBundle => Boolean(bundle))
}

function paletteForVariant(variantId: string) {
  return designPalettes.find((palette) => palette.id === variantId)
}

function fontPairById(fontPairId: FontPairPreset["id"]) {
  return fontPairPresets.find((preset) => preset.id === fontPairId) ?? fallbackFontPair
}

export const builtInThemeBundles: ThemeBundlePreset[] = templateThemeVariants
  .filter((variant) => variant.id !== "original")
  .map((variant) => {
    const palette = paletteForVariant(variant.id) ?? fallbackPalette
    const fontPair = fontPairById(variant.fontPairId)

    return {
      id: `built-in-theme:${variant.id}`,
      label: variant.label,
      description: variant.description,
      palette,
      fontPair,
      master: {
        ...defaultDeckMaster,
        color: palette.mutedText,
        fontFamily: fontPair.masterFontFamily,
        fontSize: variant.masterFontSize,
      },
    }
  })

export function serializeThemeBundles(bundles: CustomThemeBundle[]) {
  return JSON.stringify(
    {
      version: 1,
      bundles,
    } satisfies ThemeBundleFile,
    null,
    2,
  )
}

export function parseThemeBundlesText(value: string) {
  try {
    return parseThemeBundleList(JSON.parse(value))
  } catch {
    return []
  }
}

export function themeBundleFromDeck(
  deck: Deck,
  selectedSlideId: string,
  name: string,
  now = new Date(),
): CustomThemeBundle {
  const label = name.trim().slice(0, 60) || `${deck.title || "Deck"} theme`

  return {
    id: customThemeBundleId(),
    label,
    description: "Saved from the current deck",
    palette: designPaletteFromDeck(deck, selectedSlideId, label, now),
    fontPair: fontPairFromDeck(deck, selectedSlideId, label),
    master: normalizeDeckMaster(deck.master),
    createdAt: now.toISOString(),
    useCount: 0,
  }
}

export function readCustomThemeBundles() {
  const storage = customThemeBundleStorage()
  if (!storage) return []

  try {
    return parseThemeBundleList(
      JSON.parse(storage.getItem(CUSTOM_THEME_BUNDLES_STORAGE_KEY) ?? "[]"),
    )
  } catch {
    return []
  }
}

export function saveThemeBundle(
  deck: Deck,
  selectedSlideId: string,
  name: string,
) {
  const bundle = themeBundleFromDeck(deck, selectedSlideId, name)
  const bundles = [bundle, ...readCustomThemeBundles()].slice(
    0,
    MAX_CUSTOM_THEME_BUNDLES,
  )

  customThemeBundleStorage()?.setItem(
    CUSTOM_THEME_BUNDLES_STORAGE_KEY,
    JSON.stringify(bundles),
  )

  return bundles
}

export function deleteThemeBundle(bundleId: string) {
  return deleteThemeBundles([bundleId])
}

export function deleteThemeBundles(bundleIds: Iterable<string>) {
  const ids = new Set(bundleIds)
  const bundles = deleteThemeBundlesFromList(readCustomThemeBundles(), ids)

  customThemeBundleStorage()?.setItem(
    CUSTOM_THEME_BUNDLES_STORAGE_KEY,
    JSON.stringify(bundles),
  )

  return bundles
}

export function deleteThemeBundlesFromList(
  bundles: CustomThemeBundle[],
  bundleIds: Iterable<string>,
) {
  const ids = new Set(bundleIds)

  return bundles.filter((bundle) => !ids.has(bundle.id))
}

export function markThemeBundleUsed(bundleId: string, now = new Date()) {
  const bundles = markThemeBundleUsedInList(
    readCustomThemeBundles(),
    bundleId,
    now,
  )

  customThemeBundleStorage()?.setItem(
    CUSTOM_THEME_BUNDLES_STORAGE_KEY,
    JSON.stringify(bundles),
  )

  return bundles
}

export function markThemeBundleUsedInList(
  bundles: CustomThemeBundle[],
  bundleId: string,
  now = new Date(),
) {
  const usedAt = now.toISOString()

  return bundles.map((bundle) =>
    bundle.id === bundleId
      ? {
          ...bundle,
          lastUsedAt: usedAt,
          useCount: (bundle.useCount ?? 0) + 1,
        }
      : bundle,
  )
}

export function importThemeBundlesFromText(
  value: string,
): ThemeBundleImportResult {
  const imported = parseThemeBundlesText(value)
  const existing = readCustomThemeBundles()
  const existingIds = new Set(existing.map((bundle) => bundle.id))
  const fresh = imported.filter((bundle) => !existingIds.has(bundle.id))
  const availableSlots = Math.max(0, MAX_CUSTOM_THEME_BUNDLES - existing.length)
  const accepted = fresh.slice(0, availableSlots)
  const bundles = [...accepted, ...existing].slice(0, MAX_CUSTOM_THEME_BUNDLES)

  customThemeBundleStorage()?.setItem(
    CUSTOM_THEME_BUNDLES_STORAGE_KEY,
    JSON.stringify(bundles),
  )

  return {
    bundles,
    added: accepted.length,
    skipped: imported.length - accepted.length,
  }
}

function themeBundleFreshnessTimestamp(bundle: CustomThemeBundle) {
  return readTimestamp(bundle.lastUsedAt) || readTimestamp(bundle.createdAt)
}

function themeBundleFingerprint(bundle: CustomThemeBundle) {
  return JSON.stringify({
    bodyFontFamily: bundle.fontPair.bodyFontFamily,
    fontSize: bundle.master.fontSize,
    footerText: bundle.master.footerText,
    masterColor: bundle.master.color,
    masterFontFamily: bundle.master.fontFamily,
    palette: {
      accent: bundle.palette.accent,
      background: bundle.palette.background,
      border: bundle.palette.border,
      secondary: bundle.palette.secondary,
      surface: bundle.palette.surface,
      text: bundle.palette.text,
    },
    showDate: bundle.master.showDate,
    showFooter: bundle.master.showFooter,
    showSlideNumbers: bundle.master.showSlideNumbers,
    titleFontFamily: bundle.fontPair.titleFontFamily,
  })
}

function issueWeight(issue: ThemeBundleCleanupIssue) {
  if (issue.severity === "warning") return 2
  return 1
}

export function themeBundleCleanupAudit(
  bundles: CustomThemeBundle[],
  options: ThemeBundleCleanupOptions = {},
): ThemeBundleCleanupSummary {
  const nowMs = (options.now ?? new Date()).getTime()
  const staleAfterMs =
    Math.max(1, options.staleAfterDays ?? 45) * 24 * 60 * 60 * 1000
  const limit = Math.max(0, Math.floor(options.limit ?? 5))
  const issues: ThemeBundleCleanupIssue[] = []
  const fingerprints = new Map<string, CustomThemeBundle>()
  let duplicateCount = 0
  let staleCount = 0
  let unusedCount = 0

  for (const bundle of bundles) {
    const freshnessMs = themeBundleFreshnessTimestamp(bundle)
    const unused = (bundle.useCount ?? 0) === 0
    const stale = Boolean(freshnessMs && nowMs - freshnessMs > staleAfterMs)
    const fingerprint = themeBundleFingerprint(bundle)
    const original = fingerprints.get(fingerprint)

    if (!original) {
      fingerprints.set(fingerprint, bundle)
    } else {
      duplicateCount += 1
      issues.push({
        bundleId: bundle.id,
        detail: `Matches ${original.label}`,
        id: `duplicate-theme-bundle:${bundle.id}`,
        label: bundle.label,
        reason: "duplicate",
        severity: "info",
      })
    }

    if (unused) {
      unusedCount += 1
      issues.push({
        bundleId: bundle.id,
        detail: "Saved but never applied",
        id: `unused-theme-bundle:${bundle.id}`,
        label: bundle.label,
        reason: "unused",
        severity: "info",
      })
    }

    if (stale) {
      staleCount += 1
      issues.push({
        bundleId: bundle.id,
        detail: "Theme bundle has not been used recently",
        id: `stale-theme-bundle:${bundle.id}`,
        label: bundle.label,
        reason: "stale",
        severity: "warning",
      })
    }
  }

  const visibleIssues = issues
    .sort((left, right) => issueWeight(right) - issueWeight(left))
    .slice(0, limit)

  return {
    duplicateCount,
    issueCount: issues.length,
    issues: visibleIssues,
    staleCount,
    totalBundles: bundles.length,
    unusedCount,
  }
}

export function applyThemeBundleToDeck(
  deck: Deck,
  bundle: ThemeBundlePreset,
  selectedSlideId: string,
) {
  const paletteDeck = applyDesignPaletteToDeck(
    deck,
    bundle.palette,
    "deck",
    selectedSlideId,
  )
  const fontDeck = applyFontPairToDeck(
    paletteDeck,
    bundle.fontPair,
    "deck",
    selectedSlideId,
  )

  return {
    ...fontDeck,
    master: normalizeDeckMaster({
      ...fontDeck.master,
      ...bundle.master,
    }),
  }
}
