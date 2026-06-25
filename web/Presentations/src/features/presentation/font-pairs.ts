import type { Deck, FontFamily, PresentationElement, Slide } from "./types"

export type FontPairId =
  | "modern"
  | "editorial"
  | "technical"
  | "classic"
  | `custom-font:${string}`

export type FontPairScope = "slide" | "deck"

export type FontPairPreset = {
  id: FontPairId
  label: string
  description: string
  titleFontFamily: FontFamily
  bodyFontFamily: FontFamily
  masterFontFamily: FontFamily
}

export const fontFamilyOptions = [
  "geist",
  "system",
  "serif",
  "mono",
] as const satisfies readonly FontFamily[]

export const fontFamilyLabels: Record<FontFamily, string> = {
  geist: "Geist",
  system: "System",
  serif: "Serif",
  mono: "Mono",
}

export const fontFamilyCss: Record<FontFamily, string> = {
  geist: "var(--font-geist-sans), Arial, sans-serif",
  system: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'var(--font-geist-mono), "SFMono-Regular", Consolas, monospace',
}

export const fontFamilyPptxFace: Record<FontFamily, string> = {
  geist: "Aptos",
  system: "Arial",
  serif: "Georgia",
  mono: "Consolas",
}

export const fontFamilySvgFace: Record<FontFamily, string> = {
  geist: "Arial, sans-serif",
  system: "Arial, sans-serif",
  serif: 'Georgia, "Times New Roman", serif',
  mono: "Consolas, monospace",
}

export const fontPairPresets: FontPairPreset[] = [
  {
    id: "modern",
    label: "Modern",
    description: "Clean Geist titles with system body text",
    titleFontFamily: "geist",
    bodyFontFamily: "system",
    masterFontFamily: "system",
  },
  {
    id: "editorial",
    label: "Editorial",
    description: "Serif headlines with quiet readable body text",
    titleFontFamily: "serif",
    bodyFontFamily: "system",
    masterFontFamily: "serif",
  },
  {
    id: "technical",
    label: "Technical",
    description: "Mono titles for specs and precise walkthroughs",
    titleFontFamily: "mono",
    bodyFontFamily: "geist",
    masterFontFamily: "mono",
  },
  {
    id: "classic",
    label: "Classic",
    description: "Serif pairing for report and lecture decks",
    titleFontFamily: "serif",
    bodyFontFamily: "serif",
    masterFontFamily: "serif",
  },
]

const fontFamilySet = new Set<FontFamily>(fontFamilyOptions)
const bodyElementTypes = new Set<PresentationElement["type"]>([
  "text",
  "table",
  "chart",
])

export function defaultFontFamilyForElementType(
  type: PresentationElement["type"],
): FontFamily {
  return type === "title" ? "geist" : "system"
}

export function normalizeFontFamily(
  value: unknown,
  fallback: FontFamily = "geist",
): FontFamily {
  return typeof value === "string" && fontFamilySet.has(value as FontFamily)
    ? (value as FontFamily)
    : fallback
}

export function fontFamilyStyle(value: unknown) {
  return fontFamilyCss[normalizeFontFamily(value)]
}

export function pptxFontFace(value: unknown) {
  return fontFamilyPptxFace[normalizeFontFamily(value)]
}

export function svgFontFamily(value: unknown) {
  return fontFamilySvgFace[normalizeFontFamily(value)]
}

function applyFontPairToElement(
  element: PresentationElement,
  preset: FontPairPreset,
): PresentationElement {
  if (element.type === "title") {
    return {
      ...element,
      fontFamily: preset.titleFontFamily,
    }
  }

  if (bodyElementTypes.has(element.type)) {
    return {
      ...element,
      fontFamily: preset.bodyFontFamily,
    }
  }

  return element
}

function applyFontPairToSlide(slide: Slide, preset: FontPairPreset): Slide {
  return {
    ...slide,
    elements: slide.elements.map((element) =>
      applyFontPairToElement(element, preset),
    ),
  }
}

export function applyFontPairToDeck(
  deck: Deck,
  preset: FontPairPreset,
  scope: FontPairScope,
  selectedSlideId: string,
): Deck {
  let changed = false
  const slides = deck.slides.map((slide) => {
    if (scope === "slide" && slide.id !== selectedSlideId) return slide
    changed = true
    return applyFontPairToSlide(slide, preset)
  })

  if (!changed) return deck

  return {
    ...deck,
    master:
      scope === "deck"
        ? {
            ...deck.master,
            fontFamily: preset.masterFontFamily,
          }
        : deck.master,
    slides,
  }
}
