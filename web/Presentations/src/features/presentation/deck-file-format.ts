import type { FilePickerType } from "./browser-downloads"

export const essenceDeckFileExtension = ".essdeck"
export const legacyDeckFileExtension = ".json"
export const essenceDeckMimeType =
  "application/vnd.essence.powerpoint.deck+json"
export const legacyDeckMimeType = "application/json"

export const deckFileAcceptExtensions = [
  essenceDeckFileExtension,
  legacyDeckFileExtension,
] as const

export const deckFileInputAccept = [
  essenceDeckFileExtension,
  essenceDeckMimeType,
  legacyDeckFileExtension,
  legacyDeckMimeType,
].join(",")

export const deckFilePickerTypes = [
  {
    description: "Essence deck file",
    accept: {
      [essenceDeckMimeType]: [essenceDeckFileExtension],
      [legacyDeckMimeType]: [legacyDeckFileExtension],
    },
  },
] satisfies FilePickerType[]

export function safeDeckFileStem(name: string) {
  return (
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
    "essence-deck"
  )
}

export function deckFileName(name: string) {
  return `${safeDeckFileStem(name)}${essenceDeckFileExtension}`
}
