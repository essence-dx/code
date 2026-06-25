import type { Deck, PresentationElement } from "./types"
import { designPalettes, type DesignPalette } from "./theme-palettes"

export type CustomDesignPalette = DesignPalette & {
  createdAt: string
}

export type CustomDesignPaletteBundle = {
  version: 1
  palettes: CustomDesignPalette[]
}

export type CustomDesignPaletteImportResult = {
  palettes: CustomDesignPalette[]
  added: number
  skipped: number
}

export type RecommendedCustomDesignPaletteOptions = {
  limit?: number
}

const CUSTOM_DESIGN_PALETTES_STORAGE_KEY =
  "essence-powerpoint-custom-design-palettes"
const MAX_CUSTOM_DESIGN_PALETTES = 20
const fallbackPalette = designPalettes[0]!
export const customDesignPalettesFileName = "essence-design-palettes.json"

function customPaletteId(): `custom:${string}` {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `custom:${crypto.randomUUID()}`
  }

  return `custom:${Date.now()}`
}

function safeColor(value: string | undefined, fallback: string) {
  if (!value || value === "transparent") return fallback
  return value
}

function firstElementColor(
  elements: PresentationElement[],
  selector: (element: PresentationElement) => string | undefined,
  fallback: string,
) {
  return safeColor(
    elements.map(selector).find((value) => value && value !== "transparent"),
    fallback,
  )
}

function chartColors(elements: PresentationElement[], accent: string, secondary: string) {
  const colors = elements.flatMap((element) =>
    element.type === "chart" ? element.chartData.map((datum) => datum.color) : [],
  )
  const uniqueColors = Array.from(new Set([accent, secondary, ...colors]))

  return [...uniqueColors, ...fallbackPalette.chartColors].slice(0, 4)
}

function parseCustomDesignPalette(value: unknown): CustomDesignPalette | null {
  if (!value || typeof value !== "object") return null

  const palette = value as Partial<CustomDesignPalette>
  const chartColorValues = Array.isArray(palette.chartColors)
    ? palette.chartColors.filter((color): color is string => typeof color === "string")
    : []

  if (
    !palette.id?.startsWith("custom:") ||
    typeof palette.label !== "string" ||
    typeof palette.createdAt !== "string"
  ) {
    return null
  }

  return {
    id: palette.id,
    label: palette.label,
    description:
      typeof palette.description === "string"
        ? palette.description
        : "Saved from the current deck",
    background: safeColor(palette.background, fallbackPalette.background),
    surface: safeColor(palette.surface, fallbackPalette.surface),
    text: safeColor(palette.text, fallbackPalette.text),
    mutedText: safeColor(palette.mutedText, fallbackPalette.mutedText),
    accent: safeColor(palette.accent, fallbackPalette.accent),
    secondary: safeColor(palette.secondary, fallbackPalette.secondary),
    border: safeColor(palette.border, fallbackPalette.border),
    chartColors: [...chartColorValues, ...fallbackPalette.chartColors].slice(0, 4),
    createdAt: palette.createdAt,
  }
}

function parseCustomDesignPaletteList(value: unknown) {
  const records = Array.isArray(value)
    ? value
    : value &&
        typeof value === "object" &&
        (value as Partial<CustomDesignPaletteBundle>).version === 1 &&
        Array.isArray((value as Partial<CustomDesignPaletteBundle>).palettes)
      ? (value as Partial<CustomDesignPaletteBundle>).palettes
      : null

  if (!records) return []

  return records
    .map(parseCustomDesignPalette)
    .filter((palette): palette is CustomDesignPalette => Boolean(palette))
}

function readTimestamp(value: string | undefined) {
  if (!value) return 0

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function paletteColorCoverage(palette: CustomDesignPalette) {
  return new Set([
    palette.accent,
    palette.background,
    palette.border,
    palette.mutedText,
    palette.secondary,
    palette.surface,
    palette.text,
    ...palette.chartColors,
  ]).size
}

export function serializeCustomDesignPalettes(
  palettes: CustomDesignPalette[],
) {
  return JSON.stringify(
    {
      version: 1,
      palettes,
    } satisfies CustomDesignPaletteBundle,
    null,
    2,
  )
}

export function parseCustomDesignPalettesText(value: string) {
  try {
    return parseCustomDesignPaletteList(JSON.parse(value))
  } catch {
    return []
  }
}

function customPaletteStorage() {
  return typeof window === "undefined" ? null : window.localStorage
}

export function designPaletteFromDeck(
  deck: Deck,
  selectedSlideId: string,
  name: string,
  now = new Date(),
): CustomDesignPalette {
  const slide =
    deck.slides.find((item) => item.id === selectedSlideId) ?? deck.slides[0]
  const elements = slide?.elements ?? []
  const accent = firstElementColor(
    elements,
    (element) =>
      element.type === "shape"
        ? element.shapeStrokeColor || element.background
        : element.type === "icon"
          ? element.color
          : undefined,
    fallbackPalette.accent,
  )
  const secondary = firstElementColor(
    elements,
    (element) => (element.type === "shape" ? element.background : undefined),
    fallbackPalette.secondary,
  )
  const label = name.trim().slice(0, 60) || `${deck.title || "Deck"} palette`

  return {
    id: customPaletteId(),
    label,
    description: "Saved from the current deck",
    background: safeColor(slide?.background, fallbackPalette.background),
    surface: firstElementColor(
      elements,
      (element) => element.background,
      fallbackPalette.surface,
    ),
    text: firstElementColor(
      elements,
      (element) =>
        element.type === "title" || element.type === "text"
          ? element.color
          : undefined,
      fallbackPalette.text,
    ),
    mutedText: safeColor(deck.master.color, fallbackPalette.mutedText),
    accent,
    secondary,
    border: firstElementColor(
      elements,
      (element) =>
        element.type === "shape"
          ? element.shapeStrokeColor
          : element.type === "table"
            ? element.tableBorderColor
            : undefined,
      fallbackPalette.border,
    ),
    chartColors: chartColors(elements, accent, secondary),
    createdAt: now.toISOString(),
  }
}

export function readCustomDesignPalettes() {
  const storage = customPaletteStorage()
  if (!storage) return []

  try {
    const values = JSON.parse(
      storage.getItem(CUSTOM_DESIGN_PALETTES_STORAGE_KEY) ?? "[]",
    )

    return parseCustomDesignPaletteList(values)
  } catch {
    return []
  }
}

export function saveCustomDesignPalette(
  deck: Deck,
  selectedSlideId: string,
  name: string,
) {
  const palette = designPaletteFromDeck(deck, selectedSlideId, name)
  const palettes = [palette, ...readCustomDesignPalettes()].slice(
    0,
    MAX_CUSTOM_DESIGN_PALETTES,
  )
  customPaletteStorage()?.setItem(
    CUSTOM_DESIGN_PALETTES_STORAGE_KEY,
    JSON.stringify(palettes),
  )

  return palettes
}

export function deleteCustomDesignPalette(paletteId: string) {
  const palettes = readCustomDesignPalettes().filter(
    (palette) => palette.id !== paletteId,
  )
  customPaletteStorage()?.setItem(
    CUSTOM_DESIGN_PALETTES_STORAGE_KEY,
    JSON.stringify(palettes),
  )

  return palettes
}

export function importCustomDesignPalettesFromText(
  value: string,
): CustomDesignPaletteImportResult {
  const imported = parseCustomDesignPalettesText(value)
  const existing = readCustomDesignPalettes()
  const existingIds = new Set(existing.map((palette) => palette.id))
  const fresh = imported.filter((palette) => !existingIds.has(palette.id))
  const availableSlots = Math.max(
    0,
    MAX_CUSTOM_DESIGN_PALETTES - existing.length,
  )
  const accepted = fresh.slice(0, availableSlots)
  const palettes = [...accepted, ...existing].slice(0, MAX_CUSTOM_DESIGN_PALETTES)

  customPaletteStorage()?.setItem(
    CUSTOM_DESIGN_PALETTES_STORAGE_KEY,
    JSON.stringify(palettes),
  )

  return {
    palettes,
    added: accepted.length,
    skipped: imported.length - accepted.length,
  }
}

export function recommendedCustomDesignPalettes(
  palettes: CustomDesignPalette[],
  options: RecommendedCustomDesignPaletteOptions = {},
) {
  const limit = Math.max(0, Math.floor(options.limit ?? 3))

  if (!limit) return []

  return [...palettes]
    .sort((left, right) => {
      const rightCreated = readTimestamp(right.createdAt)
      const leftCreated = readTimestamp(left.createdAt)

      if (rightCreated !== leftCreated) return rightCreated - leftCreated

      const rightCoverage = paletteColorCoverage(right)
      const leftCoverage = paletteColorCoverage(left)

      if (rightCoverage !== leftCoverage) return rightCoverage - leftCoverage

      return left.label.localeCompare(right.label)
    })
    .slice(0, limit)
}
