import {
  fontPairPresets,
  normalizeFontFamily,
  type FontPairPreset,
} from "./font-pairs"
import {
  designPaletteFromDeck,
  type CustomDesignPalette,
} from "./custom-design-palettes"
import { designPalettes, type DesignPalette } from "./theme-palettes"
import type { BrandKitPreset } from "./brand-kits"
import type { Deck, FontFamily, PresentationElement } from "./types"

export type CustomBrandKit = BrandKitPreset & {
  id: `custom-brand:${string}`
  createdAt: string
}

export type CustomBrandKitBundle = {
  version: 1
  kits: CustomBrandKit[]
}

export type CustomBrandKitImportResult = {
  kits: CustomBrandKit[]
  added: number
  skipped: number
}

export type RecommendedCustomBrandKitOptions = {
  limit?: number
}

const CUSTOM_BRAND_KITS_STORAGE_KEY = "essence-powerpoint-custom-brand-kits"
const MAX_CUSTOM_BRAND_KITS = 16
const fallbackPalette = designPalettes[0]!
const fallbackFontPair = fontPairPresets[0]!
export const customBrandKitsFileName = "essence-brand-kits.json"

function customBrandKitId(): `custom-brand:${string}` {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `custom-brand:${crypto.randomUUID()}`
  }

  return `custom-brand:${Date.now()}`
}

function customFontPairId(): `custom-font:${string}` {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `custom-font:${crypto.randomUUID()}`
  }

  return `custom-font:${Date.now()}`
}

function customBrandKitStorage() {
  return typeof window === "undefined" ? null : window.localStorage
}

function safeColor(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function clampMasterFontSize(value: unknown) {
  return Math.max(6, Math.min(24, readNumber(value, 10)))
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

function fontPairFromDeck(deck: Deck, selectedSlideId: string, name: string): FontPairPreset {
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

function parsePalette(value: unknown): DesignPalette {
  const palette = value && typeof value === "object" ? (value as Partial<DesignPalette>) : {}
  const chartColors = Array.isArray(palette.chartColors)
    ? palette.chartColors.filter((color): color is string => typeof color === "string")
    : []

  return {
    id:
      typeof palette.id === "string" && palette.id.startsWith("custom:")
        ? (palette.id as CustomDesignPalette["id"])
        : fallbackPalette.id,
    label: readString(palette.label, fallbackPalette.label),
    description: readString(palette.description, "Imported brand kit palette"),
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
    description: readString(fontPair.description, "Imported brand kit fonts"),
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

function parseCustomBrandKit(value: unknown): CustomBrandKit | null {
  if (!value || typeof value !== "object") return null

  const kit = value as Partial<CustomBrandKit>

  if (
    !kit.id?.startsWith("custom-brand:") ||
    typeof kit.label !== "string" ||
    typeof kit.createdAt !== "string"
  ) {
    return null
  }

  return {
    id: kit.id,
    label: kit.label.trim().slice(0, 60) || "Custom brand kit",
    description:
      typeof kit.description === "string"
        ? kit.description
        : "Imported visual system",
    palette: parsePalette(kit.palette),
    fontPair: parseFontPair(kit.fontPair),
    masterFontSize: clampMasterFontSize(kit.masterFontSize),
    createdAt: kit.createdAt,
  }
}

function parseCustomBrandKitList(value: unknown) {
  const records = Array.isArray(value)
    ? value
    : value &&
        typeof value === "object" &&
        (value as Partial<CustomBrandKitBundle>).version === 1 &&
        Array.isArray((value as Partial<CustomBrandKitBundle>).kits)
      ? (value as Partial<CustomBrandKitBundle>).kits
      : null

  if (!records) return []

  return records
    .map(parseCustomBrandKit)
    .filter((kit): kit is CustomBrandKit => Boolean(kit))
}

function readTimestamp(value: string | undefined) {
  if (!value) return 0

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function brandKitColorCoverage(kit: CustomBrandKit) {
  return new Set([
    kit.palette.accent,
    kit.palette.background,
    kit.palette.border,
    kit.palette.secondary,
    kit.palette.surface,
    kit.palette.text,
    ...kit.palette.chartColors,
  ]).size
}

export function serializeCustomBrandKits(kits: CustomBrandKit[]) {
  return JSON.stringify(
    {
      version: 1,
      kits,
    } satisfies CustomBrandKitBundle,
    null,
    2,
  )
}

export function parseCustomBrandKitsText(value: string) {
  try {
    return parseCustomBrandKitList(JSON.parse(value))
  } catch {
    return []
  }
}

export function customBrandKitFromDeck(
  deck: Deck,
  selectedSlideId: string,
  name: string,
  now = new Date(),
): CustomBrandKit {
  const label = name.trim().slice(0, 60) || `${deck.title || "Deck"} brand kit`

  return {
    id: customBrandKitId(),
    label,
    description: "Saved from the current deck",
    palette: designPaletteFromDeck(deck, selectedSlideId, label, now),
    fontPair: fontPairFromDeck(deck, selectedSlideId, label),
    masterFontSize: clampMasterFontSize(deck.master.fontSize),
    createdAt: now.toISOString(),
  }
}

export function readCustomBrandKits() {
  const storage = customBrandKitStorage()
  if (!storage) return []

  try {
    return parseCustomBrandKitList(
      JSON.parse(storage.getItem(CUSTOM_BRAND_KITS_STORAGE_KEY) ?? "[]"),
    )
  } catch {
    return []
  }
}

export function saveCustomBrandKit(
  deck: Deck,
  selectedSlideId: string,
  name: string,
) {
  const kit = customBrandKitFromDeck(deck, selectedSlideId, name)
  const kits = [kit, ...readCustomBrandKits()].slice(0, MAX_CUSTOM_BRAND_KITS)

  customBrandKitStorage()?.setItem(
    CUSTOM_BRAND_KITS_STORAGE_KEY,
    JSON.stringify(kits),
  )

  return kits
}

export function deleteCustomBrandKit(kitId: string) {
  const kits = readCustomBrandKits().filter((kit) => kit.id !== kitId)

  customBrandKitStorage()?.setItem(
    CUSTOM_BRAND_KITS_STORAGE_KEY,
    JSON.stringify(kits),
  )

  return kits
}

export function importCustomBrandKitsFromText(
  value: string,
): CustomBrandKitImportResult {
  const imported = parseCustomBrandKitsText(value)
  const existing = readCustomBrandKits()
  const existingIds = new Set(existing.map((kit) => kit.id))
  const fresh = imported.filter((kit) => !existingIds.has(kit.id))
  const availableSlots = Math.max(0, MAX_CUSTOM_BRAND_KITS - existing.length)
  const accepted = fresh.slice(0, availableSlots)
  const kits = [...accepted, ...existing].slice(0, MAX_CUSTOM_BRAND_KITS)

  customBrandKitStorage()?.setItem(
    CUSTOM_BRAND_KITS_STORAGE_KEY,
    JSON.stringify(kits),
  )

  return {
    kits,
    added: accepted.length,
    skipped: imported.length - accepted.length,
  }
}

export function recommendedCustomBrandKits(
  kits: CustomBrandKit[],
  options: RecommendedCustomBrandKitOptions = {},
) {
  const limit = Math.max(0, Math.floor(options.limit ?? 3))

  if (!limit) return []

  return [...kits]
    .sort((left, right) => {
      const rightCreated = readTimestamp(right.createdAt)
      const leftCreated = readTimestamp(left.createdAt)

      if (rightCreated !== leftCreated) return rightCreated - leftCreated

      const rightCoverage = brandKitColorCoverage(right)
      const leftCoverage = brandKitColorCoverage(left)

      if (rightCoverage !== leftCoverage) return rightCoverage - leftCoverage

      return left.label.localeCompare(right.label)
    })
    .slice(0, limit)
}
