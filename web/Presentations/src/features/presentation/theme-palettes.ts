import type { Deck, PresentationElement, Slide } from "./types"
import { isLinearShape } from "./shape-formatting"

export type DesignPaletteId =
  | "editorial"
  | "graphite"
  | "botanical"
  | "sunrise"
  | `custom:${string}`

export type DesignPaletteScope = "slide" | "deck"

export type DesignPalette = {
  id: DesignPaletteId
  label: string
  description: string
  background: string
  surface: string
  text: string
  mutedText: string
  accent: string
  secondary: string
  border: string
  chartColors: string[]
}

export const designPalettes: DesignPalette[] = [
  {
    id: "editorial",
    label: "Editorial",
    description: "White canvas with black type and blue accents",
    background: "#ffffff",
    surface: "#f8fafc",
    text: "#111827",
    mutedText: "#475569",
    accent: "#2563eb",
    secondary: "#f59e0b",
    border: "#cbd5e1",
    chartColors: ["#2563eb", "#f59e0b", "#10b981", "#ef4444"],
  },
  {
    id: "graphite",
    label: "Graphite",
    description: "Dark slides with cyan and amber contrast",
    background: "#111827",
    surface: "#1f2937",
    text: "#f8fafc",
    mutedText: "#cbd5e1",
    accent: "#22d3ee",
    secondary: "#fbbf24",
    border: "#475569",
    chartColors: ["#22d3ee", "#fbbf24", "#a78bfa", "#34d399"],
  },
  {
    id: "botanical",
    label: "Botanical",
    description: "Soft green base with ink and coral accents",
    background: "#f0fdf4",
    surface: "#dcfce7",
    text: "#13251a",
    mutedText: "#3f5f47",
    accent: "#15803d",
    secondary: "#fb7185",
    border: "#86efac",
    chartColors: ["#15803d", "#fb7185", "#0ea5e9", "#a16207"],
  },
  {
    id: "sunrise",
    label: "Sunrise",
    description: "Warm paper with violet and orange highlights",
    background: "#fff7ed",
    surface: "#ffedd5",
    text: "#2f1b0c",
    mutedText: "#7c2d12",
    accent: "#ea580c",
    secondary: "#7c3aed",
    border: "#fed7aa",
    chartColors: ["#ea580c", "#7c3aed", "#0891b2", "#65a30d"],
  },
]

function isTransparentFill(value: string) {
  return !value || value === "transparent"
}

function shapeFill(palette: DesignPalette, index: number) {
  return index % 3 === 0
    ? palette.accent
    : index % 3 === 1
      ? palette.secondary
      : palette.surface
}

function paletteElement(
  element: PresentationElement,
  palette: DesignPalette,
  index: number,
): PresentationElement {
  if (element.type === "title") {
    return {
      ...element,
      color: palette.text,
      background: "transparent",
    }
  }

  if (element.type === "text") {
    return {
      ...element,
      color: element.fontWeight >= 600 ? palette.text : palette.mutedText,
      background: isTransparentFill(element.background)
        ? "transparent"
        : palette.surface,
    }
  }

  if (element.type === "icon") {
    return {
      ...element,
      color: palette.accent,
      background: isTransparentFill(element.background)
        ? "transparent"
        : palette.surface,
    }
  }

  if (element.type === "shape") {
    return {
      ...element,
      background: isLinearShape(element) ? "transparent" : shapeFill(palette, index),
      shapeStrokeColor: isLinearShape(element) ? palette.accent : palette.border,
    }
  }

  if (element.type === "table") {
    return {
      ...element,
      color: palette.text,
      background: palette.surface,
      tableBorderColor: palette.border,
      tableStyle: "plain",
    }
  }

  if (element.type === "chart") {
    return {
      ...element,
      color: palette.text,
      chartAxisColor: palette.border,
      chartData: element.chartData.map((datum, datumIndex) => ({
        ...datum,
        color: palette.chartColors[datumIndex % palette.chartColors.length],
      })),
    }
  }

  return element
}

function paletteSlide(slide: Slide, palette: DesignPalette): Slide {
  return {
    ...slide,
    background: palette.background,
    elements: slide.elements.map((element, index) =>
      paletteElement(element, palette, index),
    ),
  }
}

export function applyDesignPaletteToDeck(
  deck: Deck,
  palette: DesignPalette,
  scope: DesignPaletteScope,
  selectedSlideId: string,
) {
  let changed = false
  const slides = deck.slides.map((slide) => {
    if (scope === "slide" && slide.id !== selectedSlideId) return slide
    changed = true
    return paletteSlide(slide, palette)
  })

  if (!changed) return deck

  return {
    ...deck,
    master: {
      ...deck.master,
      color: palette.mutedText,
    },
    slides,
  }
}
