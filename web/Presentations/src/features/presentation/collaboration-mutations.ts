import type { CloudDeckCollaborationEvent } from "./cloud-api"
import type { PresentationElement, SlideElementType } from "./types"

export type CollaborationMutationAction =
  | "move"
  | "resize"
  | "rotate"
  | "text"
  | "update"

export type CollaborationMutationElement = {
  content: string | null
  contentPreview: string
  height: number
  id: string
  rotation: number
  type: SlideElementType | "unknown"
  width: number
  x: number
  y: number
}

export type CollaborationObjectMutation = {
  action: CollaborationMutationAction
  createdAt: string
  elements: CollaborationMutationElement[]
  eventId: string
  role: CloudDeckCollaborationEvent["role"]
  slideId: string
  type: "object-mutation"
  userId: string
}

const DEFAULT_MUTATION_MAX_AGE_MS = 12_000
const MAX_MUTATION_ELEMENTS = 16
const MAX_CONTENT_PREVIEW_LENGTH = 80
const MAX_CONTENT_VALUE_LENGTH = 1_000

const elementTypes = new Set<string>([
  "title",
  "text",
  "shape",
  "icon",
  "image",
  "video",
  "audio",
  "table",
  "chart",
])

function payloadString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function payloadNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value))
}

function normalizePercent(value: unknown, fallback = 0) {
  const numeric = payloadNumber(value)
  return Math.round(clampPercent(numeric ?? fallback) * 10) / 10
}

function normalizeDimension(value: unknown, fallback = 1) {
  const numeric = payloadNumber(value)
  return Math.round(Math.max(0.1, Math.min(100, numeric ?? fallback)) * 10) / 10
}

function normalizeRotation(value: unknown) {
  const numeric = payloadNumber(value)
  return Math.round(((((numeric ?? 0) % 360) + 360) % 360) * 10) / 10
}

function normalizeAction(value: unknown): CollaborationMutationAction {
  const action = payloadString(value)
  if (
    action === "move" ||
    action === "resize" ||
    action === "rotate" ||
    action === "text"
  ) {
    return action
  }

  return "update"
}

function normalizeElementType(value: unknown): SlideElementType | "unknown" {
  const type = payloadString(value)
  return elementTypes.has(type) ? (type as SlideElementType) : "unknown"
}

function contentPreview(value: unknown) {
  return payloadString(value).slice(0, MAX_CONTENT_PREVIEW_LENGTH)
}

function contentValue(value: unknown) {
  return typeof value === "string"
    ? value.slice(0, MAX_CONTENT_VALUE_LENGTH)
    : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function mutationElementFromPayload(
  value: unknown,
): CollaborationMutationElement | null {
  if (!isRecord(value)) return null

  const id = payloadString(value.id)
  const x = payloadNumber(value.x)
  const y = payloadNumber(value.y)
  const width = payloadNumber(value.width)
  const height = payloadNumber(value.height)

  if (!id || x === null || y === null || width === null || height === null) {
    return null
  }

  return {
    content: contentValue(value.content),
    contentPreview: contentPreview(value.contentPreview),
    height: normalizeDimension(height),
    id,
    rotation: normalizeRotation(value.rotation),
    type: normalizeElementType(value.type),
    width: normalizeDimension(width),
    x: normalizePercent(x),
    y: normalizePercent(y),
  }
}

function mutationElementFromElement(
  element: PresentationElement,
): CollaborationMutationElement {
  return {
    content: contentValue(element.content),
    contentPreview: contentPreview(element.content),
    height: normalizeDimension(element.height),
    id: element.id,
    rotation: normalizeRotation(element.rotation),
    type: element.type,
    width: normalizeDimension(element.width),
    x: normalizePercent(element.x),
    y: normalizePercent(element.y),
  }
}

export function collaborationMutationPayloadFromElements(input: {
  action: CollaborationMutationAction | string
  elements: PresentationElement[]
  slideId: string
}): Record<string, unknown> | null {
  const slideId = payloadString(input.slideId)
  const elements = input.elements
    .filter((element) => payloadString(element.id))
    .slice(0, MAX_MUTATION_ELEMENTS)
    .map(mutationElementFromElement)

  if (!slideId || !elements.length) return null

  return {
    action: normalizeAction(input.action),
    elements,
    slideId,
  }
}

export function collaborationMutationFromEvent(
  event: CloudDeckCollaborationEvent,
): CollaborationObjectMutation | null {
  if (event.type !== "object-mutation") return null

  const slideId = payloadString(event.payload.slideId)
  const payloadElements = Array.isArray(event.payload.elements)
    ? event.payload.elements
    : []
  const elements = payloadElements
    .slice(0, MAX_MUTATION_ELEMENTS)
    .map(mutationElementFromPayload)
    .filter((element): element is CollaborationMutationElement => Boolean(element))

  if (!slideId || !elements.length) return null

  return {
    action: normalizeAction(event.payload.action),
    createdAt: event.createdAt,
    elements,
    eventId: event.id,
    role: event.role,
    slideId,
    type: "object-mutation",
    userId: event.userId,
  }
}

export function recentCollaborationMutations(
  events: CloudDeckCollaborationEvent[],
  options: {
    activeSlideId?: string | null
    currentUserId?: string | null
    maxAgeMs?: number
    now?: number
  } = {},
) {
  const now = options.now ?? Date.now()
  const maxAgeMs = options.maxAgeMs ?? DEFAULT_MUTATION_MAX_AGE_MS
  const latestByUser = new Map<string, CollaborationObjectMutation>()

  for (const event of events) {
    const mutation = collaborationMutationFromEvent(event)
    if (!mutation) continue
    if (options.currentUserId && mutation.userId === options.currentUserId) {
      continue
    }
    if (options.activeSlideId && mutation.slideId !== options.activeSlideId) {
      continue
    }
    if (now - Date.parse(mutation.createdAt) > maxAgeMs) {
      continue
    }

    const existing = latestByUser.get(mutation.userId)
    if (
      !existing ||
      Date.parse(existing.createdAt) <= Date.parse(mutation.createdAt)
    ) {
      latestByUser.set(mutation.userId, mutation)
    }
  }

  return Array.from(latestByUser.values()).sort(
    (left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt),
  )
}
