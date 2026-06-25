import type { CloudDeckCollaborationEvent } from "./cloud-api"

export type CollaborationCursor = {
  createdAt: string
  eventId: string
  role: CloudDeckCollaborationEvent["role"]
  slideId: string
  userId: string
  x: number
  y: number
}

const DEFAULT_CURSOR_MAX_AGE_MS = 15_000

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value))
}

function numberPayloadValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

export function collaborationCursorFromEvent(
  event: CloudDeckCollaborationEvent,
): CollaborationCursor | null {
  if (event.type !== "cursor") return null

  const slideId =
    typeof event.payload.slideId === "string" ? event.payload.slideId : ""
  const x = numberPayloadValue(event.payload.x)
  const y = numberPayloadValue(event.payload.y)

  if (!slideId || x === null || y === null) return null

  return {
    createdAt: event.createdAt,
    eventId: event.id,
    role: event.role,
    slideId,
    userId: event.userId,
    x: clampPercent(x),
    y: clampPercent(y),
  }
}

export function recentCollaborationCursors(
  events: CloudDeckCollaborationEvent[],
  options: {
    activeSlideId?: string | null
    currentUserId?: string | null
    maxAgeMs?: number
    now?: number
  } = {},
) {
  const now = options.now ?? Date.now()
  const maxAgeMs = options.maxAgeMs ?? DEFAULT_CURSOR_MAX_AGE_MS
  const latestByUser = new Map<string, CollaborationCursor>()

  for (const event of events) {
    const cursor = collaborationCursorFromEvent(event)
    if (!cursor) continue
    if (options.currentUserId && cursor.userId === options.currentUserId) {
      continue
    }
    if (options.activeSlideId && cursor.slideId !== options.activeSlideId) {
      continue
    }
    if (now - Date.parse(cursor.createdAt) > maxAgeMs) {
      continue
    }

    const existing = latestByUser.get(cursor.userId)
    if (!existing || Date.parse(existing.createdAt) <= Date.parse(cursor.createdAt)) {
      latestByUser.set(cursor.userId, cursor)
    }
  }

  return Array.from(latestByUser.values()).sort(
    (left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt),
  )
}
