import { randomUUID } from "node:crypto"

import { and, desc, eq, gt } from "drizzle-orm"

import type { DeckPresenceSummary } from "@/features/presence/types"
import { assertDeckOperationForUser } from "@/server/decks/collaborators"
import { getDb } from "@/server/db"
import {
  deck as deckTable,
  deckCollaborator as deckCollaboratorTable,
  deckPresence as deckPresenceTable,
  user as userTable,
} from "@/server/db/schema"
import { presenceInitials } from "@/server/presence/policy"

const ACTIVE_WINDOW_MS = 90 * 1000

function toIsoDate(value: Date | number | string) {
  return new Date(value).toISOString()
}

function rowToPresence(
  row: typeof deckPresenceTable.$inferSelect & {
    userEmail: string
    userName: string
  },
  currentUserId: string,
  role: DeckPresenceSummary["role"],
): DeckPresenceSummary {
  return {
    email: row.userEmail,
    initials: presenceInitials({ email: row.userEmail, name: row.userName }),
    isCurrentUser: row.userId === currentUserId,
    lastSeenAt: toIsoDate(row.lastSeenAt),
    name: row.userName,
    role,
    slideId: row.slideId,
    userId: row.userId,
  }
}

async function requireDeckPresenceAccess(deckId: string, userId: string) {
  const [deck] = await getDb()
    .select()
    .from(deckTable)
    .where(eq(deckTable.id, deckId))
    .limit(1)

  if (!deck) return null

  await assertDeckOperationForUser(deck, userId, "presence")

  return deck
}

export async function heartbeatDeckPresence(
  deckId: string,
  userId: string,
  slideId?: string | null,
) {
  const deck = await requireDeckPresenceAccess(deckId, userId)
  if (!deck) return null

  const db = getDb()
  const now = new Date()
  const [existing] = await db
    .select()
    .from(deckPresenceTable)
    .where(
      and(
        eq(deckPresenceTable.deckId, deckId),
        eq(deckPresenceTable.userId, userId),
      ),
    )
    .limit(1)

  if (existing) {
    await db
      .update(deckPresenceTable)
      .set({
        slideId: slideId ?? null,
        lastSeenAt: now,
        updatedAt: now,
      })
      .where(eq(deckPresenceTable.id, existing.id))
  } else {
    await db.insert(deckPresenceTable).values({
      id: randomUUID(),
      deckId,
      userId,
      slideId: slideId ?? null,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    })
  }

  return listDeckPresence(deckId, userId)
}

export async function listDeckPresence(deckId: string, userId: string) {
  const deck = await requireDeckPresenceAccess(deckId, userId)
  if (!deck) return null

  const activeSince = new Date(Date.now() - ACTIVE_WINDOW_MS)
  const db = getDb()
  const rows = await db
    .select({
      id: deckPresenceTable.id,
      deckId: deckPresenceTable.deckId,
      userId: deckPresenceTable.userId,
      slideId: deckPresenceTable.slideId,
      lastSeenAt: deckPresenceTable.lastSeenAt,
      createdAt: deckPresenceTable.createdAt,
      updatedAt: deckPresenceTable.updatedAt,
      userEmail: userTable.email,
      userName: userTable.name,
    })
    .from(deckPresenceTable)
    .innerJoin(userTable, eq(deckPresenceTable.userId, userTable.id))
    .where(
      and(
        eq(deckPresenceTable.deckId, deckId),
        gt(deckPresenceTable.lastSeenAt, activeSince),
      ),
    )
    .orderBy(desc(deckPresenceTable.lastSeenAt))
  const collaborators = await db
    .select({
      role: deckCollaboratorTable.role,
      userId: deckCollaboratorTable.userId,
    })
    .from(deckCollaboratorTable)
    .where(eq(deckCollaboratorTable.deckId, deckId))
  const roleByUserId = new Map<string, DeckPresenceSummary["role"]>(
    collaborators.map((collaborator) => [
      collaborator.userId,
      collaborator.role === "editor" ? "editor" : "viewer",
    ]),
  )

  return rows.map((row) =>
    rowToPresence(
      row,
      userId,
      row.userId === deck.ownerId
        ? "owner"
        : roleByUserId.get(row.userId) ?? "viewer",
    ),
  )
}

export async function clearDeckPresence(deckId: string, userId: string) {
  const deck = await requireDeckPresenceAccess(deckId, userId)
  if (!deck) return false

  await getDb()
    .delete(deckPresenceTable)
    .where(
      and(
        eq(deckPresenceTable.deckId, deckId),
        eq(deckPresenceTable.userId, userId),
      ),
    )

  return true
}
