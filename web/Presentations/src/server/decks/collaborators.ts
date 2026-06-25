import { randomUUID } from "node:crypto"

import { and, desc, eq } from "drizzle-orm"

import {
  assertDeckOperationAccess,
  resolveDeckActorRole,
  type DeckCollaboratorRole,
  type DeckOperation,
} from "@/server/decks/access-policy"
import { getDb } from "@/server/db"
import {
  deck as deckTable,
  deckCollaborator as deckCollaboratorTable,
  deckCollaboratorInvite as deckCollaboratorInviteTable,
  user as userTable,
} from "@/server/db/schema"
import {
  createDeckCollaboratorAddedNotifications,
  createDeckCollaboratorRemovedNotifications,
  createDeckCollaboratorUpdatedNotifications,
} from "@/server/notifications/repository"

export type DeckCollaboratorSummary = {
  id: string
  deckId: string
  email: string
  name: string
  role: DeckCollaboratorRole
  status: "active" | "pending"
  createdAt: string
  updatedAt: string
}

export type DeckCollaboratorUpsertInput = {
  email: string
  role: DeckCollaboratorRole
}

export type DeckCollaboratorUpsertResult =
  | {
      ok: true
      collaborator: DeckCollaboratorSummary
    }
  | {
      ok: false
      error: string
      status: 400 | 403 | 404
    }

function toIsoDate(value: Date | number | string) {
  return new Date(value).toISOString()
}

function normalizeCollaboratorEmail(value: string) {
  return value.trim().toLowerCase()
}

function normalizeCollaboratorRole(value: unknown): DeckCollaboratorRole | null {
  return value === "editor" || value === "viewer" ? value : null
}

function rowToCollaboratorSummary(row: {
  createdAt: Date | number | string
  deckId: string
  email: string
  id: string
  name: string
  role: string
  status?: "active" | "pending"
  updatedAt: Date | number | string
}): DeckCollaboratorSummary {
  return {
    id: row.id,
    deckId: row.deckId,
    email: row.email,
    name: row.name,
    role: normalizeCollaboratorRole(row.role) ?? "viewer",
    status: row.status ?? "active",
    createdAt: toIsoDate(row.createdAt),
    updatedAt: toIsoDate(row.updatedAt),
  }
}

export function parseDeckCollaboratorUpsert(
  body: unknown,
): DeckCollaboratorUpsertInput | null {
  if (!body || typeof body !== "object") {
    return null
  }

  const record = body as { email?: unknown; role?: unknown }
  const email =
    typeof record.email === "string" ? normalizeCollaboratorEmail(record.email) : ""
  const role = normalizeCollaboratorRole(record.role)

  if (!email || !email.includes("@") || !role) {
    return null
  }

  return { email, role }
}

export async function getDeckCollaboratorRole(
  deckId: string,
  userId: string,
): Promise<DeckCollaboratorRole | null> {
  const [collaborator] = await getDb()
    .select({ role: deckCollaboratorTable.role })
    .from(deckCollaboratorTable)
    .where(
      and(
        eq(deckCollaboratorTable.deckId, deckId),
        eq(deckCollaboratorTable.userId, userId),
      ),
    )
    .limit(1)

  return normalizeCollaboratorRole(collaborator?.role)
}

export async function assertDeckOperationForUser(
  deck: typeof deckTable.$inferSelect,
  userId: string,
  operation: DeckOperation,
) {
  const collaboratorRole =
    deck.ownerId === userId ? null : await getDeckCollaboratorRole(deck.id, userId)

  return assertDeckOperationAccess({
    operation,
    role: resolveDeckActorRole({
      collaboratorRole,
      ownerId: deck.ownerId ?? "",
      userId,
    }),
  })
}

export async function acceptPendingDeckInvitesForUser(
  userId: string,
  email: string,
) {
  const normalizedEmail = normalizeCollaboratorEmail(email)
  if (!normalizedEmail) return 0

  const db = getDb()
  const [targetUser] = await db
    .select({ email: userTable.email, name: userTable.name })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1)
  const invites = await db
    .select()
    .from(deckCollaboratorInviteTable)
    .where(
      and(
        eq(deckCollaboratorInviteTable.invitedEmail, normalizedEmail),
        eq(deckCollaboratorInviteTable.status, "pending"),
      ),
    )

  if (!invites.length) return 0

  const now = new Date()
  let accepted = 0

  for (const invite of invites) {
    const role = normalizeCollaboratorRole(invite.role) ?? "viewer"
    const [deck] = await db
      .select()
      .from(deckTable)
      .where(eq(deckTable.id, invite.deckId))
      .limit(1)

    if (!deck || deck.ownerId === userId) {
      await db
        .update(deckCollaboratorInviteTable)
        .set({
          acceptedAt: now,
          acceptedById: userId,
          status: "accepted",
          updatedAt: now,
        })
        .where(eq(deckCollaboratorInviteTable.id, invite.id))
      continue
    }

    const [existing] = await db
      .select()
      .from(deckCollaboratorTable)
      .where(
        and(
          eq(deckCollaboratorTable.deckId, invite.deckId),
          eq(deckCollaboratorTable.userId, userId),
        ),
      )
      .limit(1)

    if (existing) {
      await db
        .update(deckCollaboratorTable)
        .set({
          invitedEmail: normalizedEmail,
          invitedById: invite.invitedById,
          role,
          updatedAt: now,
        })
        .where(eq(deckCollaboratorTable.id, existing.id))
    } else {
      await db.insert(deckCollaboratorTable).values({
        id: randomUUID(),
        deckId: invite.deckId,
        userId,
        invitedEmail: normalizedEmail,
        role,
        invitedById: invite.invitedById,
        createdAt: now,
        updatedAt: now,
      })
    }

    await db
      .update(deckCollaboratorInviteTable)
      .set({
        acceptedAt: now,
        acceptedById: userId,
        status: "accepted",
        updatedAt: now,
      })
      .where(eq(deckCollaboratorInviteTable.id, invite.id))
    await createDeckCollaboratorAddedNotifications({
      collaboratorId: invite.id,
      deckId: invite.deckId,
      deckTitle: deck.title,
      ownerId: deck.ownerId,
      role,
      targetEmail: targetUser?.email ?? normalizedEmail,
      targetName: targetUser?.name ?? normalizedEmail,
      targetUserId: userId,
    })
    accepted += 1
  }

  return accepted
}

export async function listDeckCollaboratorsForOwner(
  deckId: string,
  ownerId: string,
): Promise<DeckCollaboratorSummary[] | null> {
  const db = getDb()
  const [deck] = await db
    .select()
    .from(deckTable)
    .where(eq(deckTable.id, deckId))
    .limit(1)

  if (!deck) {
    return null
  }

  await assertDeckOperationForUser(deck, ownerId, "share")

  const activeRows = await db
    .select({
      id: deckCollaboratorTable.id,
      deckId: deckCollaboratorTable.deckId,
      role: deckCollaboratorTable.role,
      createdAt: deckCollaboratorTable.createdAt,
      updatedAt: deckCollaboratorTable.updatedAt,
      email: userTable.email,
      name: userTable.name,
    })
    .from(deckCollaboratorTable)
    .innerJoin(userTable, eq(deckCollaboratorTable.userId, userTable.id))
    .where(eq(deckCollaboratorTable.deckId, deckId))
    .orderBy(desc(deckCollaboratorTable.updatedAt))
  const pendingRows = await db
    .select({
      id: deckCollaboratorInviteTable.id,
      deckId: deckCollaboratorInviteTable.deckId,
      email: deckCollaboratorInviteTable.invitedEmail,
      role: deckCollaboratorInviteTable.role,
      createdAt: deckCollaboratorInviteTable.createdAt,
      updatedAt: deckCollaboratorInviteTable.updatedAt,
    })
    .from(deckCollaboratorInviteTable)
    .where(
      and(
        eq(deckCollaboratorInviteTable.deckId, deckId),
        eq(deckCollaboratorInviteTable.status, "pending"),
      ),
    )
    .orderBy(desc(deckCollaboratorInviteTable.updatedAt))

  return [
    ...activeRows.map((row) =>
      rowToCollaboratorSummary({ ...row, status: "active" }),
    ),
    ...pendingRows.map((row) =>
      rowToCollaboratorSummary({
        ...row,
        name: "Pending invite",
        status: "pending",
      }),
    ),
  ].sort(
    (first, second) =>
      Date.parse(second.updatedAt) - Date.parse(first.updatedAt),
  )
}

export async function upsertDeckCollaboratorForOwner(
  deckId: string,
  ownerId: string,
  input: DeckCollaboratorUpsertInput,
): Promise<DeckCollaboratorUpsertResult | null> {
  const db = getDb()
  const [deck] = await db
    .select()
    .from(deckTable)
    .where(eq(deckTable.id, deckId))
    .limit(1)

  if (!deck) {
    return null
  }

  await assertDeckOperationForUser(deck, ownerId, "share")

  const email = normalizeCollaboratorEmail(input.email)
  const [targetUser] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1)

  if (!targetUser) {
    const now = new Date()
    const [existingInvite] = await db
      .select()
      .from(deckCollaboratorInviteTable)
      .where(
        and(
          eq(deckCollaboratorInviteTable.deckId, deckId),
          eq(deckCollaboratorInviteTable.invitedEmail, email),
        ),
      )
      .limit(1)

    if (existingInvite) {
      const roleChanged = existingInvite.role !== input.role

      await db
        .update(deckCollaboratorInviteTable)
        .set({
          acceptedAt: null,
          acceptedById: null,
          invitedById: ownerId,
          role: input.role,
          status: "pending",
          updatedAt: now,
        })
        .where(eq(deckCollaboratorInviteTable.id, existingInvite.id))

      if (roleChanged || existingInvite.status !== "pending") {
        await createDeckCollaboratorUpdatedNotifications({
          collaboratorId: existingInvite.id,
          deckId,
          deckTitle: deck.title,
          ownerId: deck.ownerId,
          role: input.role,
          targetEmail: email,
          targetName: "Pending invite",
          targetUserId: null,
        })
      }

      return {
        ok: true,
        collaborator: rowToCollaboratorSummary({
          id: existingInvite.id,
          deckId: existingInvite.deckId,
          createdAt: existingInvite.createdAt,
          email,
          name: "Pending invite",
          role: input.role,
          status: "pending",
          updatedAt: now,
        }),
      }
    }

    const invite = {
      id: randomUUID(),
      deckId,
      invitedEmail: email,
      role: input.role,
      status: "pending",
      invitedById: ownerId,
      acceptedById: null,
      acceptedAt: null,
      createdAt: now,
      updatedAt: now,
    }

    await db.insert(deckCollaboratorInviteTable).values(invite)
    await createDeckCollaboratorAddedNotifications({
      collaboratorId: invite.id,
      deckId,
      deckTitle: deck.title,
      ownerId: deck.ownerId,
      role: input.role,
      targetEmail: email,
      targetName: "Pending invite",
      targetUserId: null,
    })

    return {
      ok: true,
      collaborator: rowToCollaboratorSummary({
        id: invite.id,
        deckId: invite.deckId,
        createdAt: invite.createdAt,
        email,
        name: "Pending invite",
        role: invite.role,
        status: "pending",
        updatedAt: invite.updatedAt,
      }),
    }
  }

  if (targetUser.id === ownerId) {
    return {
      ok: false,
      error: "Owners already have full deck access.",
      status: 400,
    }
  }

  const now = new Date()
  const [existing] = await db
    .select()
    .from(deckCollaboratorTable)
    .where(
      and(
        eq(deckCollaboratorTable.deckId, deckId),
        eq(deckCollaboratorTable.userId, targetUser.id),
      ),
    )
    .limit(1)

  if (existing) {
    const roleChanged = existing.role !== input.role

    await db
      .update(deckCollaboratorTable)
      .set({
        invitedEmail: email,
        invitedById: ownerId,
        role: input.role,
        updatedAt: now,
      })
      .where(eq(deckCollaboratorTable.id, existing.id))

    if (roleChanged) {
      await createDeckCollaboratorUpdatedNotifications({
        collaboratorId: existing.id,
        deckId,
        deckTitle: deck.title,
        ownerId: deck.ownerId,
        role: input.role,
        targetEmail: targetUser.email,
        targetName: targetUser.name,
        targetUserId: targetUser.id,
      })
    }

    return {
      ok: true,
      collaborator: rowToCollaboratorSummary({
        id: existing.id,
        deckId: existing.deckId,
        createdAt: existing.createdAt,
        email: targetUser.email,
        name: targetUser.name,
        role: input.role,
        updatedAt: now,
      }),
    }
  }

  await db
    .delete(deckCollaboratorInviteTable)
    .where(
      and(
        eq(deckCollaboratorInviteTable.deckId, deckId),
        eq(deckCollaboratorInviteTable.invitedEmail, email),
      ),
    )

  const collaborator = {
    id: randomUUID(),
    deckId,
    userId: targetUser.id,
    invitedEmail: email,
    role: input.role,
    invitedById: ownerId,
    createdAt: now,
    updatedAt: now,
  }

  await db.insert(deckCollaboratorTable).values(collaborator)
  await createDeckCollaboratorAddedNotifications({
    collaboratorId: collaborator.id,
    deckId,
    deckTitle: deck.title,
    ownerId: deck.ownerId,
    role: input.role,
    targetEmail: targetUser.email,
    targetName: targetUser.name,
    targetUserId: targetUser.id,
  })

  return {
    ok: true,
    collaborator: rowToCollaboratorSummary({
      ...collaborator,
      email: targetUser.email,
      name: targetUser.name,
    }),
  }
}

export async function removeDeckCollaboratorForOwner(
  deckId: string,
  ownerId: string,
  collaboratorId: string,
) {
  const db = getDb()
  const [deck] = await db
    .select()
    .from(deckTable)
    .where(eq(deckTable.id, deckId))
    .limit(1)

  if (!deck) {
    return null
  }

  await assertDeckOperationForUser(deck, ownerId, "share")
  const [collaborator] = await db
    .select({
      id: deckCollaboratorTable.id,
      role: deckCollaboratorTable.role,
      userId: deckCollaboratorTable.userId,
      email: userTable.email,
      name: userTable.name,
    })
    .from(deckCollaboratorTable)
    .innerJoin(userTable, eq(deckCollaboratorTable.userId, userTable.id))
    .where(
      and(
        eq(deckCollaboratorTable.id, collaboratorId),
        eq(deckCollaboratorTable.deckId, deckId),
      ),
    )
    .limit(1)

  if (!collaborator) {
    const [invite] = await db
      .select()
      .from(deckCollaboratorInviteTable)
      .where(
        and(
          eq(deckCollaboratorInviteTable.id, collaboratorId),
          eq(deckCollaboratorInviteTable.deckId, deckId),
        ),
      )
      .limit(1)

    if (!invite) {
      return false
    }

    await db
      .update(deckCollaboratorInviteTable)
      .set({
        status: "revoked",
        updatedAt: new Date(),
      })
      .where(eq(deckCollaboratorInviteTable.id, invite.id))
    await createDeckCollaboratorRemovedNotifications({
      collaboratorId: invite.id,
      deckId,
      deckTitle: deck.title,
      ownerId: deck.ownerId,
      targetEmail: invite.invitedEmail,
      targetName: "Pending invite",
      targetUserId: null,
    })

    return true
  }

  await db
    .delete(deckCollaboratorTable)
    .where(
      and(
        eq(deckCollaboratorTable.id, collaboratorId),
        eq(deckCollaboratorTable.deckId, deckId),
      ),
    )
  await createDeckCollaboratorRemovedNotifications({
    collaboratorId: collaborator.id,
    deckId,
    deckTitle: deck.title,
    ownerId: deck.ownerId,
    targetEmail: collaborator.email,
    targetName: collaborator.name,
    targetUserId: collaborator.userId,
  })

  return true
}
