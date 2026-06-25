import { randomUUID } from "node:crypto"

import { and, desc, eq, gt } from "drizzle-orm"

import type { DeckOperation } from "@/server/decks/access-policy"
import { assertDeckOperationForUser } from "@/server/decks/collaborators"
import { getDb } from "@/server/db"
import {
  deck as deckTable,
  deckCollaborationEvent as deckCollaborationEventTable,
} from "@/server/db/schema"

export type DeckCollaborationEventType =
  | "cursor"
  | "selection"
  | "edit-intent"
  | "object-mutation"

export type DeckCollaborationEventInput = {
  clientEventId: string
  payload: Record<string, unknown>
  type: DeckCollaborationEventType
}

export type DeckCollaborationEventSummary = DeckCollaborationEventInput & {
  id: string
  deckId: string
  role: "owner" | "editor" | "viewer"
  userId: string
  createdAt: string
}

const EVENT_LIMIT = 100
const MAX_CLIENT_EVENT_ID_LENGTH = 120
const MAX_PAYLOAD_BYTES = 4096

function toIsoDate(value: Date | number | string) {
  return new Date(value).toISOString()
}

function normalizeEventType(value: unknown): DeckCollaborationEventType | null {
  return value === "cursor" ||
    value === "selection" ||
    value === "edit-intent" ||
    value === "object-mutation"
    ? value
    : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function eventOperation(type: DeckCollaborationEventType): DeckOperation {
  return type === "edit-intent" || type === "object-mutation"
    ? "save"
    : "presence"
}

function payloadString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function payloadNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function isValidObjectMutationPayload(payload: Record<string, unknown>) {
  const slideId = payloadString(payload.slideId)
  const elements = Array.isArray(payload.elements) ? payload.elements : []

  if (!slideId || !elements.length || elements.length > 20) {
    return false
  }

  return elements.every((element) => {
    if (!isRecord(element)) return false

    return (
      Boolean(payloadString(element.id)) &&
      payloadNumber(element.x) !== null &&
      payloadNumber(element.y) !== null &&
      payloadNumber(element.width) !== null &&
      payloadNumber(element.height) !== null
    )
  })
}

function isValidEventPayload(
  type: DeckCollaborationEventType,
  payload: Record<string, unknown>,
) {
  return type === "object-mutation"
    ? isValidObjectMutationPayload(payload)
    : true
}

function rowToEventSummary(
  row: typeof deckCollaborationEventTable.$inferSelect,
): DeckCollaborationEventSummary {
  return {
    id: row.id,
    deckId: row.deckId,
    userId: row.userId,
    role: row.role === "owner" || row.role === "editor" ? row.role : "viewer",
    type: normalizeEventType(row.type) ?? "cursor",
    clientEventId: row.clientEventId,
    payload: isRecord(row.payload) ? row.payload : {},
    createdAt: toIsoDate(row.createdAt),
  }
}

export function parseDeckCollaborationEvent(
  body: unknown,
): DeckCollaborationEventInput | null {
  if (!isRecord(body)) {
    return null
  }

  const type = normalizeEventType(body.type)
  const clientEventId =
    typeof body.clientEventId === "string" ? body.clientEventId.trim() : ""
  const payload = isRecord(body.payload) ? body.payload : null

  if (
    !type ||
    !payload ||
    !isValidEventPayload(type, payload) ||
    !clientEventId ||
    clientEventId.length > MAX_CLIENT_EVENT_ID_LENGTH
  ) {
    return null
  }

  if (Buffer.byteLength(JSON.stringify(payload), "utf8") > MAX_PAYLOAD_BYTES) {
    return null
  }

  return { clientEventId, payload, type }
}

export async function listDeckCollaborationEventsForUser(
  deckId: string,
  userId: string,
  since?: string | null,
): Promise<DeckCollaborationEventSummary[] | null> {
  const db = getDb()
  const [deck] = await db
    .select()
    .from(deckTable)
    .where(eq(deckTable.id, deckId))
    .limit(1)

  if (!deck) {
    return null
  }

  await assertDeckOperationForUser(deck, userId, "presence")

  const sinceDate =
    since && Number.isFinite(Date.parse(since)) ? new Date(since) : null
  const filters = sinceDate
    ? and(
        eq(deckCollaborationEventTable.deckId, deckId),
        gt(deckCollaborationEventTable.createdAt, sinceDate),
      )
    : eq(deckCollaborationEventTable.deckId, deckId)

  const rows = await db
    .select()
    .from(deckCollaborationEventTable)
    .where(filters)
    .orderBy(desc(deckCollaborationEventTable.createdAt))
    .limit(EVENT_LIMIT)

  return rows.map(rowToEventSummary).reverse()
}

export async function createDeckCollaborationEventForUser(
  deckId: string,
  userId: string,
  input: DeckCollaborationEventInput,
): Promise<DeckCollaborationEventSummary | null> {
  const db = getDb()
  const [deck] = await db
    .select()
    .from(deckTable)
    .where(eq(deckTable.id, deckId))
    .limit(1)

  if (!deck) {
    return null
  }

  const access = await assertDeckOperationForUser(
    deck,
    userId,
    eventOperation(input.type),
  )
  const now = new Date()
  const [existing] = await db
    .select()
    .from(deckCollaborationEventTable)
    .where(
      and(
        eq(deckCollaborationEventTable.deckId, deckId),
        eq(deckCollaborationEventTable.userId, userId),
        eq(deckCollaborationEventTable.clientEventId, input.clientEventId),
      ),
    )
    .limit(1)

  if (existing) {
    return rowToEventSummary(existing)
  }

  const event = {
    id: randomUUID(),
    deckId,
    userId,
    role: access.role,
    type: input.type,
    clientEventId: input.clientEventId,
    payload: input.payload,
    createdAt: now,
  }

  await db.insert(deckCollaborationEventTable).values(event)

  return rowToEventSummary(event)
}
