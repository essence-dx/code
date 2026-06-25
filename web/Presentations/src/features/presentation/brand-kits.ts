import {
  applyFontPairToDeck,
  fontPairPresets,
  type FontPairPreset,
} from "./font-pairs"
import {
  applyDesignPaletteToDeck,
  designPalettes,
  type DesignPalette,
} from "./theme-palettes"
import type { Deck } from "./types"

export type BrandKitId =
  | "studio-launch"
  | "boardroom"
  | "editorial-report"
  | "technical-brief"
  | `custom-brand:${string}`

export type BrandKitScope = "slide" | "deck"

export type BrandKitPreset = {
  id: BrandKitId
  label: string
  description: string
  palette: DesignPalette
  fontPair: FontPairPreset
  masterFontSize: number
}

function palette(id: DesignPalette["id"]) {
  return designPalettes.find((item) => item.id === id) ?? designPalettes[0]!
}

function fontPair(id: FontPairPreset["id"]) {
  return fontPairPresets.find((item) => item.id === id) ?? fontPairPresets[0]!
}

export const brandKitPresets: BrandKitPreset[] = [
  {
    id: "studio-launch",
    label: "Studio Launch",
    description: "Clean product deck with sharp accent colors",
    palette: palette("editorial"),
    fontPair: fontPair("modern"),
    masterFontSize: 10,
  },
  {
    id: "boardroom",
    label: "Boardroom",
    description: "Dark executive readout with strong contrast",
    palette: palette("graphite"),
    fontPair: fontPair("modern"),
    masterFontSize: 9,
  },
  {
    id: "editorial-report",
    label: "Editorial Report",
    description: "Serif-led narrative deck for research and reports",
    palette: palette("sunrise"),
    fontPair: fontPair("editorial"),
    masterFontSize: 10,
  },
  {
    id: "technical-brief",
    label: "Technical Brief",
    description: "Precise system-style deck for specs and walkthroughs",
    palette: palette("botanical"),
    fontPair: fontPair("technical"),
    masterFontSize: 9,
  },
]

export function applyBrandKitToDeck(
  deck: Deck,
  kit: BrandKitPreset,
  scope: BrandKitScope,
  selectedSlideId: string,
): Deck {
  const originalMaster = deck.master
  const paletteDeck = applyDesignPaletteToDeck(
    deck,
    kit.palette,
    scope,
    selectedSlideId,
  )
  const fontDeck = applyFontPairToDeck(
    paletteDeck,
    kit.fontPair,
    scope,
    selectedSlideId,
  )

  if (fontDeck === deck) return deck

  if (scope === "slide") {
    return {
      ...fontDeck,
      master: originalMaster,
    }
  }

  return {
    ...fontDeck,
    master: {
      ...fontDeck.master,
      color: kit.palette.mutedText,
      fontFamily: kit.fontPair.masterFontFamily,
      fontSize: kit.masterFontSize,
    },
  }
}
