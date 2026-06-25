import {
  applyFontPairToDeck,
  fontPairPresets,
  type FontPairId,
  type FontPairPreset,
} from "./font-pairs"
import {
  applyDesignPaletteToDeck,
  designPalettes,
  type DesignPaletteId,
  type DesignPalette,
} from "./theme-palettes"
import type { Deck } from "./types"

export type TemplateThemeVariantId = "original" | DesignPalette["id"]
type BuiltInTemplateFontPairId = Exclude<FontPairId, `custom-font:${string}`>

export type TemplateThemeVariant = {
  id: TemplateThemeVariantId
  label: string
  description: string
  background: string
  text: string
  accent: string
  border: string
  fontPairId: BuiltInTemplateFontPairId
  fontLabel: string
  masterFontSize: number
}

const templateThemeSpecs: Array<{
  id: TemplateThemeVariantId
  paletteId?: DesignPaletteId
  label: string
  description: string
  fontPairId: BuiltInTemplateFontPairId
  masterFontSize: number
}> = [
  {
    id: "original",
    label: "Original",
    description: "Use the template's built-in styling",
    fontPairId: "modern",
    masterFontSize: 12,
  },
  {
    id: "editorial",
    paletteId: "editorial",
    label: "Editorial",
    description: "White canvas, blue accents, and serif headlines",
    fontPairId: "editorial",
    masterFontSize: 12,
  },
  {
    id: "graphite",
    paletteId: "graphite",
    label: "Graphite",
    description: "Dark canvas, cyan accents, and technical typography",
    fontPairId: "technical",
    masterFontSize: 13,
  },
  {
    id: "botanical",
    paletteId: "botanical",
    label: "Botanical",
    description: "Soft green canvas with editorial typography",
    fontPairId: "editorial",
    masterFontSize: 12,
  },
  {
    id: "sunrise",
    paletteId: "sunrise",
    label: "Sunrise",
    description: "Warm canvas with classic report typography",
    fontPairId: "classic",
    masterFontSize: 12,
  },
]

function paletteById(paletteId: DesignPaletteId | undefined) {
  return paletteId
    ? designPalettes.find((palette) => palette.id === paletteId) ?? null
    : null
}

function fontPairById(fontPairId: BuiltInTemplateFontPairId): FontPairPreset {
  return (
    fontPairPresets.find((preset) => preset.id === fontPairId) ??
    fontPairPresets[0]!
  )
}

function variantFromSpec(
  spec: (typeof templateThemeSpecs)[number],
): TemplateThemeVariant {
  const palette = paletteById(spec.paletteId)
  const fontPair = fontPairById(spec.fontPairId)

  return {
    id: spec.id,
    label: spec.label,
    description: spec.description,
    background: palette?.background ?? "#f8fafc",
    text: palette?.text ?? "#111827",
    accent: palette?.accent ?? "#2563eb",
    border: palette?.border ?? "#cbd5e1",
    fontPairId: spec.fontPairId,
    fontLabel: fontPair.label,
    masterFontSize: spec.masterFontSize,
  }
}

export const templateThemeVariants: TemplateThemeVariant[] =
  templateThemeSpecs.map(variantFromSpec)

function paletteForVariant(variantId: TemplateThemeVariantId) {
  return paletteById(
    templateThemeSpecs.find((variant) => variant.id === variantId)?.paletteId,
  )
}

function themeVariant(variantId: TemplateThemeVariantId) {
  return (
    templateThemeVariants.find((variant) => variant.id === variantId) ??
    templateThemeVariants[0]
  )
}

export function applyTemplateThemeVariant(
  deck: Deck,
  variantId: TemplateThemeVariantId,
) {
  const variant = themeVariant(variantId)
  const firstSlideId = deck.slides[0]?.id

  if (!firstSlideId || variant.id === "original") return deck

  const palette = paletteForVariant(variant.id)
  const fontPair = fontPairById(variant.fontPairId)
  const themedDeck = palette
    ? applyDesignPaletteToDeck(deck, palette, "deck", firstSlideId)
    : deck
  const typedDeck = applyFontPairToDeck(
    themedDeck,
    fontPair,
    "deck",
    firstSlideId,
  )

  return {
    ...typedDeck,
    master: {
      ...typedDeck.master,
      fontSize: variant.masterFontSize,
    },
  }
}
