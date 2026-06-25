import type { CloudDeckCollaborationEvent } from "./cloud-api"

export type CollaborationSelection = {
  action: string | null
  createdAt: string
  elementIds: string[]
  eventId: string
  role: CloudDeckCollaborationEvent["role"]
  slideId: string
  type: "selection" | "edit-intent"
  userId: string
}

const DEFAULT_SELECTION_MAX_AGE_MS = 20_000

function payloadString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function uniquePayloadStrings(value: unknown) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? [value]
      : []

  return Array.from(
    new Set(
      values
        .map((item) => payloadString(item))
        .filter(Boolean)
        .slice(0, 50),
    ),
  )
}

export function collaborationSelectionFromEvent(
  event: CloudDeckCollaborationEvent,
): CollaborationSelection | null {
  if (event.type !== "selection" && event.type !== "edit-intent") return null

  const slideId = payloadString(event.payload.slideId)
  const elementIds = uniquePayloadStrings(
    event.payload.elementIds ?? event.payload.elementId,
  )

  if (!slideId) return null

  return {
    action: payloadString(event.payload.action) || null,
    createdAt: event.createdAt,
    elementIds,
    eventId: event.id,
    role: event.role,
    slideId,
    type: event.type,
    userId: event.userId,
  }
}

export function recentCollaborationSelections(
  events: CloudDeckCollaborationEvent[],
  options: {
    activeSlideId?: string | null
    currentUserId?: string | null
    maxAgeMs?: number
    now?: number
    requireElements?: boolean
    type?: CollaborationSelection["type"]
  } = {},
) {
  const now = options.now ?? Date.now()
  const maxAgeMs = options.maxAgeMs ?? DEFAULT_SELECTION_MAX_AGE_MS
  const latestByUser = new Map<string, CollaborationSelection>()

  for (const event of events) {
    const selection = collaborationSelectionFromEvent(event)
    if (!selection) continue
    if (options.type && selection.type !== options.type) continue
    if (options.requireElements && !selection.elementIds.length) continue
    if (options.currentUserId && selection.userId === options.currentUserId) {
      continue
    }
    if (options.activeSlideId && selection.slideId !== options.activeSlideId) {
      continue
    }
    if (now - Date.parse(selection.createdAt) > maxAgeMs) {
      continue
    }

    const existing = latestByUser.get(selection.userId)
    if (
      !existing ||
      Date.parse(existing.createdAt) <= Date.parse(selection.createdAt)
    ) {
      latestByUser.set(selection.userId, selection)
    }
  }

  return Array.from(latestByUser.values()).sort(
    (left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt),
  )
}
