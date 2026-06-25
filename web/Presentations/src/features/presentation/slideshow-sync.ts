import type { Deck } from "./types"
import type { SlideshowBlankMode } from "./slideshow-tools"

export const AUDIENCE_DISPLAY_CHANNEL = "essence-powerpoint-audience-display"
export const AUDIENCE_DISPLAY_STORAGE_KEY =
  "essence-powerpoint:audience-display"
export const AUDIENCE_DISPLAY_PATH = "/audience-display"

export type AudienceDisplaySnapshot = {
  animationStep?: number | null
  blankMode: SlideshowBlankMode
  deck: Deck
  open: boolean
  sequenceMode?: boolean
  showCaptions?: boolean
  slideIndex: number
  updatedAt: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

export function isAudienceDisplaySnapshot(
  value: unknown,
): value is AudienceDisplaySnapshot {
  if (!isRecord(value)) return false
  if (!isRecord(value.deck)) return false
  if (!Array.isArray(value.deck.slides)) return false

  return (
    typeof value.blankMode === "string" &&
    typeof value.open === "boolean" &&
    typeof value.slideIndex === "number" &&
    typeof value.updatedAt === "string"
  )
}

export function readAudienceDisplaySnapshot() {
  if (typeof window === "undefined") return null

  try {
    const value = window.localStorage.getItem(AUDIENCE_DISPLAY_STORAGE_KEY)
    if (!value) return null

    const parsed = JSON.parse(value) as unknown
    return isAudienceDisplaySnapshot(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeAudienceDisplaySnapshot(
  snapshot: AudienceDisplaySnapshot,
) {
  try {
    window.localStorage.setItem(
      AUDIENCE_DISPLAY_STORAGE_KEY,
      JSON.stringify(snapshot),
    )
    return true
  } catch {
    return false
  }
}
