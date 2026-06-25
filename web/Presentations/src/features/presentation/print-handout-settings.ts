export type HandoutLayout = "slides" | "notes" | "two-up" | "four-up" | "outline"

export type HandoutOrientation = "landscape" | "portrait"

export type HandoutSettings = {
  layout: HandoutLayout
  orientation: HandoutOrientation
  includeNotes: boolean
  includeComments: boolean
  includeSlideNumbers: boolean
  includeDate: boolean
}

export const handoutLayoutLabels: Record<HandoutLayout, string> = {
  slides: "Full slides",
  notes: "Notes pages",
  "two-up": "2 slides",
  "four-up": "4 slides",
  outline: "Outline",
}

export const handoutOrientationLabels: Record<HandoutOrientation, string> = {
  landscape: "Landscape",
  portrait: "Portrait",
}

export const defaultHandoutSettings: HandoutSettings = {
  layout: "slides",
  orientation: "landscape",
  includeNotes: true,
  includeComments: true,
  includeSlideNumbers: true,
  includeDate: false,
}
