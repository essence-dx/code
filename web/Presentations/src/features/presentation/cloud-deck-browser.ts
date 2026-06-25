import type { CloudDeckSummary } from "./cloud-api"

export type CloudDeckSort =
  | "updated-desc"
  | "updated-asc"
  | "title-asc"
  | "slides-desc"

export const cloudDeckSortLabels: Record<CloudDeckSort, string> = {
  "updated-desc": "Newest first",
  "updated-asc": "Oldest first",
  "title-asc": "Title A-Z",
  "slides-desc": "Most slides",
}

function deckTime(deck: CloudDeckSummary) {
  const value = Date.parse(deck.updatedAt)
  return Number.isFinite(value) ? value : 0
}

function compareDecks(sort: CloudDeckSort) {
  return (first: CloudDeckSummary, second: CloudDeckSummary) => {
    if (sort === "title-asc") {
      return first.title.localeCompare(second.title)
    }

    if (sort === "slides-desc") {
      return (
        second.slideCount - first.slideCount ||
        deckTime(second) - deckTime(first)
      )
    }

    if (sort === "updated-asc") {
      return deckTime(first) - deckTime(second)
    }

    return deckTime(second) - deckTime(first)
  }
}

function matchesDeck(deck: CloudDeckSummary, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true

  return [
    deck.title,
    deck.theme,
    deck.accessRole,
    deck.ownerName ?? "",
    `${deck.slideCount} slides`,
  ].some((value) => value.toLowerCase().includes(normalized))
}

export function organizeCloudDecks({
  decks,
  pinnedDeckIds,
  query,
  sort,
}: {
  decks: CloudDeckSummary[]
  pinnedDeckIds: string[]
  query: string
  sort: CloudDeckSort
}) {
  const pinnedIds = new Set(pinnedDeckIds)
  const sorted = decks
    .filter((deck) => matchesDeck(deck, query))
    .sort(compareDecks(sort))

  return {
    pinnedDecks: sorted.filter((deck) => pinnedIds.has(deck.id)),
    otherDecks: sorted.filter((deck) => !pinnedIds.has(deck.id)),
    resultCount: sorted.length,
  }
}
