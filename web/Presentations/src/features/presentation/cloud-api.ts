import type { Deck } from "./types"
import type { DeckMergeConflict } from "./deck-merge"
import type { DeckPresenceResponse } from "../presence/types"

export type CloudDeckSummary = {
  id: string
  accessRole: "owner" | "editor" | "viewer"
  ownerName: string | null
  title: string
  theme: Deck["theme"]
  slideCount: number
  updatedAt: string
}

export type CloudDeckVersionSummary = {
  id: string
  deckId: string
  title: string
  theme: Deck["theme"]
  slideCount: number
  source: "autosave" | "manual" | "restore"
  createdAt: string
}

export type CloudDeckShareSummary = {
  id: string
  deckId: string
  token: string
  permission: "view"
  enabled: boolean
  expiresAt: string | null
  expired: boolean
  allowDownloads: boolean
  requiresAccessCode: boolean
  viewCount: number
  lastViewedAt: string | null
  createdAt: string
  updatedAt: string
}

export type CloudDeckCollaboratorSummary = {
  id: string
  deckId: string
  email: string
  name: string
  role: "editor" | "viewer"
  status: "active" | "pending"
  createdAt: string
  updatedAt: string
}

export type CloudDeckCollaborationEvent = {
  id: string
  deckId: string
  userId: string
  role: "owner" | "editor" | "viewer"
  type: "cursor" | "selection" | "edit-intent" | "object-mutation"
  clientEventId: string
  payload: Record<string, unknown>
  createdAt: string
}

export type CloudDeckMergeResponse =
  | {
      status: "merged"
      deck: Deck
      conflicts: []
      mergedAssets: number
      mergedSlides: number
    }
  | {
      status: "conflict"
      deck: null
      conflicts: DeckMergeConflict[]
      mergedAssets: number
      mergedSlides: number
    }

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T
  if (!response.ok) {
    const error = payload as { error?: string }
    throw new Error(error.error ?? "Request failed")
  }

  return payload
}

export async function listCloudDecks() {
  const payload = await readJson<{ decks: CloudDeckSummary[] }>(
    await fetch("/api/decks"),
  )
  return payload.decks
}

export async function saveCloudDeck(
  deck: Deck,
  options: {
    knownUpdatedAt?: string
    source?: CloudDeckVersionSummary["source"]
  } = {},
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (options.knownUpdatedAt) {
    headers["X-Deck-Known-Updated-At"] = options.knownUpdatedAt
  }
  if (options.source) {
    headers["X-Deck-Save-Source"] = options.source
  }

  const payload = await readJson<{ deck: Deck }>(
    await fetch("/api/decks", {
      method: "POST",
      headers,
      body: JSON.stringify({ deck }),
    }),
  )
  return payload.deck
}

export async function loadCloudDeck(deckId: string) {
  const payload = await readJson<{ deck: Deck }>(
    await fetch(`/api/decks/${deckId}`),
  )
  return payload.deck
}

export async function deleteCloudDeck(deckId: string) {
  await readJson<{ deleted: boolean }>(
    await fetch(`/api/decks/${deckId}`, {
      method: "DELETE",
    }),
  )
}

export async function mergeCloudDeck(
  deckId: string,
  input: {
    baseDeck: Deck
    localDeck: Deck
  },
) {
  const response = await fetch(`/api/decks/${deckId}/merge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })
  const payload = (await response.json()) as CloudDeckMergeResponse & {
    error?: string
  }

  if (response.status === 409 && payload.status === "conflict") {
    return payload
  }
  if (!response.ok) {
    throw new Error(payload.error ?? "Could not merge cloud deck")
  }

  return payload
}

export async function listCloudDeckVersions(deckId: string) {
  const payload = await readJson<{ versions: CloudDeckVersionSummary[] }>(
    await fetch(`/api/decks/${deckId}/versions`),
  )
  return payload.versions
}

export async function restoreCloudDeckVersion(
  deckId: string,
  revisionId: string,
) {
  const payload = await readJson<{ deck: Deck }>(
    await fetch(`/api/decks/${deckId}/versions/${revisionId}/restore`, {
      method: "POST",
    }),
  )
  return payload.deck
}

export async function loadCloudDeckVersion(deckId: string, revisionId: string) {
  const payload = await readJson<{ deck: Deck }>(
    await fetch(`/api/decks/${deckId}/versions/${revisionId}`),
  )
  return payload.deck
}

export async function listCloudDeckShares(deckId: string) {
  const payload = await readJson<{ shares: CloudDeckShareSummary[] }>(
    await fetch(`/api/decks/${deckId}/shares`),
  )
  return payload.shares
}

export async function createCloudDeckShare(deckId: string) {
  const payload = await readJson<{ share: CloudDeckShareSummary }>(
    await fetch(`/api/decks/${deckId}/shares`, {
      method: "POST",
    }),
  )
  return payload.share
}

export async function updateCloudDeckShare(
  shareId: string,
  patch: {
    accessCodeAction?: "generate" | "clear"
    allowDownloads?: boolean
    enabled?: boolean
    expiresAt?: string | null
  },
) {
  return readJson<{ accessCode?: string; share: CloudDeckShareSummary }>(
    await fetch(`/api/deck-shares/${shareId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    }),
  )
}

export async function deleteCloudDeckShare(shareId: string) {
  await readJson<{ deleted: boolean }>(
    await fetch(`/api/deck-shares/${shareId}`, {
      method: "DELETE",
    }),
  )
}

export async function listCloudDeckCollaborators(deckId: string) {
  const payload = await readJson<{
    collaborators: CloudDeckCollaboratorSummary[]
  }>(await fetch(`/api/decks/${deckId}/collaborators`))
  return payload.collaborators
}

export async function upsertCloudDeckCollaborator(
  deckId: string,
  input: {
    email: string
    role: CloudDeckCollaboratorSummary["role"]
  },
) {
  const payload = await readJson<{
    collaborator: CloudDeckCollaboratorSummary
  }>(
    await fetch(`/api/decks/${deckId}/collaborators`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  )
  return payload.collaborator
}

export async function deleteCloudDeckCollaborator(
  deckId: string,
  collaboratorId: string,
) {
  await readJson<{ deleted: boolean }>(
    await fetch(`/api/decks/${deckId}/collaborators`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collaboratorId }),
    }),
  )
}

export async function listDeckPresence(deckId: string) {
  const payload = await readJson<DeckPresenceResponse>(
    await fetch(`/api/decks/${deckId}/presence`, { cache: "no-store" }),
  )
  return payload.presences
}

export async function heartbeatDeckPresence(deckId: string, slideId: string) {
  const payload = await readJson<DeckPresenceResponse>(
    await fetch(`/api/decks/${deckId}/presence`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ slideId }),
    }),
  )
  return payload.presences
}

export async function clearDeckPresence(deckId: string) {
  await readJson<{ deleted: boolean }>(
    await fetch(`/api/decks/${deckId}/presence`, {
      method: "DELETE",
    }),
  )
}

export async function listCloudDeckCollaborationEvents(
  deckId: string,
  since?: string,
) {
  const search = since ? `?since=${encodeURIComponent(since)}` : ""
  const payload = await readJson<{ events: CloudDeckCollaborationEvent[] }>(
    await fetch(`/api/decks/${deckId}/collaboration-events${search}`, {
      cache: "no-store",
    }),
  )
  return payload.events
}

export async function createCloudDeckCollaborationEvent(
  deckId: string,
  input: {
    clientEventId: string
    payload: Record<string, unknown>
    type: CloudDeckCollaborationEvent["type"]
  },
) {
  const payload = await readJson<{ event: CloudDeckCollaborationEvent }>(
    await fetch(`/api/decks/${deckId}/collaboration-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  )
  return payload.event
}

export async function unlockSharedDeck(token: string, accessCode: string) {
  return readJson<{ allowDownloads: boolean; deck: Deck }>(
    await fetch(`/api/shared-decks/${token}/unlock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accessCode }),
    }),
  )
}
