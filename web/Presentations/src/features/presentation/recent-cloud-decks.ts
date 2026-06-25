import type { CloudDeckSummary } from "./cloud-api"
import type { Deck } from "./types"

const RECENT_CLOUD_DECKS_KEY = "essence-powerpoint-recent-cloud-decks"
const PINNED_CLOUD_DECKS_KEY = "essence-powerpoint-pinned-cloud-decks"
const MAX_RECENT_DECKS = 6

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isCloudDeckSummary(value: unknown): value is CloudDeckSummary {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.accessRole === undefined ||
      value.accessRole === "owner" ||
      value.accessRole === "editor" ||
      value.accessRole === "viewer") &&
    typeof value.title === "string" &&
    typeof value.theme === "string" &&
    typeof value.slideCount === "number" &&
    typeof value.updatedAt === "string"
  )
}

function writeRecentCloudDecks(decks: CloudDeckSummary[]) {
  try {
    window.localStorage.setItem(RECENT_CLOUD_DECKS_KEY, JSON.stringify(decks))
  } catch {
    return
  }
}

function writePinnedCloudDeckIds(deckIds: string[]) {
  try {
    window.localStorage.setItem(PINNED_CLOUD_DECKS_KEY, JSON.stringify(deckIds))
  } catch {
    return
  }
}

export function deckToCloudDeckSummary(
  deck: Deck,
  access: Pick<CloudDeckSummary, "accessRole" | "ownerName"> = {
    accessRole: "owner",
    ownerName: null,
  },
): CloudDeckSummary {
  return {
    id: deck.id,
    accessRole: access.accessRole,
    ownerName: access.ownerName,
    title: deck.title,
    theme: deck.theme,
    slideCount: deck.slides.length,
    updatedAt: deck.updatedAt,
  }
}

export function cloudDeckShortcutReadiness(input: {
  currentDeckId: string
  pinnedDeckIds: string[]
  recentDecks: CloudDeckSummary[]
  signedIn: boolean
}) {
  const pinnedIds = new Set(input.pinnedDeckIds)
  const visiblePinnedCount = input.recentDecks.filter((deck) =>
    pinnedIds.has(deck.id),
  ).length
  const currentDeckTracked = input.recentDecks.some(
    (deck) => deck.id === input.currentDeckId,
  )

  if (!input.signedIn) {
    return {
      currentDeckTracked,
      detail: "Sign in to open saved cloud shortcuts.",
      pinnedCount: visiblePinnedCount,
      recentCount: input.recentDecks.length,
      state: "signed-out" as const,
      title: "Sign in required",
    }
  }

  if (!input.recentDecks.length) {
    return {
      currentDeckTracked,
      detail: "Save or open a cloud deck to build backstage shortcuts.",
      pinnedCount: visiblePinnedCount,
      recentCount: 0,
      state: "empty" as const,
      title: "No recent cloud decks",
    }
  }

  return {
    currentDeckTracked,
    detail: currentDeckTracked
      ? "Backstage opens restore autosave and conflict tracking."
      : "Open a saved shortcut to restore autosave and conflict tracking.",
    pinnedCount: visiblePinnedCount,
    recentCount: input.recentDecks.length,
    state: "ready" as const,
    title: "Cloud shortcuts ready",
  }
}

export function readRecentCloudDecks() {
  try {
    const raw = window.localStorage.getItem(RECENT_CLOUD_DECKS_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter(isCloudDeckSummary) : []
  } catch {
    return []
  }
}

export function readPinnedCloudDeckIds() {
  try {
    const raw = window.localStorage.getItem(PINNED_CLOUD_DECKS_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : []
  } catch {
    return []
  }
}

export function rememberRecentCloudDeck(
  deck: Deck,
  current: CloudDeckSummary[],
  access?: Pick<CloudDeckSummary, "accessRole" | "ownerName">,
) {
  const summary = deckToCloudDeckSummary(deck, access)
  const next = [
    summary,
    ...current.filter((item) => item.id !== summary.id),
  ].slice(0, MAX_RECENT_DECKS)

  writeRecentCloudDecks(next)
  return next
}

export function togglePinnedCloudDeck(deckId: string, current: string[]) {
  const next = current.includes(deckId)
    ? current.filter((item) => item !== deckId)
    : [deckId, ...current]

  writePinnedCloudDeckIds(next)
  return next
}

export function forgetPinnedCloudDeck(deckId: string, current: string[]) {
  const next = current.filter((item) => item !== deckId)
  writePinnedCloudDeckIds(next)
  return next
}

export function forgetRecentCloudDeck(
  deckId: string,
  current: CloudDeckSummary[],
) {
  const next = current.filter((item) => item.id !== deckId)
  writeRecentCloudDecks(next)
  return next
}
