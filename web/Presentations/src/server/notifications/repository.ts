import { randomUUID } from "node:crypto"

import { and, count, desc, eq, gt, isNull } from "drizzle-orm"

import { getDb } from "@/server/db"
import {
  notification as notificationTable,
  user as userTable,
} from "@/server/db/schema"
import type {
  AppNotification,
  AppNotificationType,
  NotificationsResponse,
} from "@/features/notifications/types"
import {
  cleanNotificationMentionKey,
  notificationCommentPreview,
  notificationMentionKeysForUser,
  shareViewDedupeCutoff,
} from "@/server/notifications/policy"

const NOTIFICATION_LIMIT = 30

function toIsoDate(value: Date | number | string) {
  return new Date(value).toISOString()
}

function rowToNotification(
  row: typeof notificationTable.$inferSelect,
): AppNotification {
  return {
    id: row.id,
    type: row.type as AppNotification["type"],
    deckId: row.deckId,
    title: row.title,
    body: row.body,
    href: row.href,
    readAt: row.readAt ? toIsoDate(row.readAt) : null,
    createdAt: toIsoDate(row.createdAt),
  }
}

async function createNotification(input: {
  userId: string | null
  deckId: string | null
  type: AppNotificationType
  sourceId?: string | null
  title: string
  body: string
  href?: string
}) {
  if (!input.userId) return null

  const [created] = await getDb()
    .insert(notificationTable)
    .values({
      id: randomUUID(),
      userId: input.userId,
      deckId: input.deckId,
      type: input.type,
      sourceId: input.sourceId ?? null,
      title: input.title,
      body: input.body,
      href: input.href ?? "",
      readAt: null,
      createdAt: new Date(),
    })
    .returning()

  return created ? rowToNotification(created) : null
}

export async function listNotificationsForUser(
  userId: string,
): Promise<NotificationsResponse> {
  const db = getDb()
  const rows = await db
    .select()
    .from(notificationTable)
    .where(eq(notificationTable.userId, userId))
    .orderBy(desc(notificationTable.createdAt))
    .limit(NOTIFICATION_LIMIT)
  const [unread] = await db
    .select({ value: count() })
    .from(notificationTable)
    .where(
      and(eq(notificationTable.userId, userId), isNull(notificationTable.readAt)),
    )

  return {
    notifications: rows.map(rowToNotification),
    unreadCount: unread?.value ?? 0,
  }
}

export async function markAllNotificationsRead(userId: string) {
  await getDb()
    .update(notificationTable)
    .set({ readAt: new Date() })
    .where(
      and(eq(notificationTable.userId, userId), isNull(notificationTable.readAt)),
    )

  return listNotificationsForUser(userId)
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const db = getDb()
  const [row] = await db
    .select()
    .from(notificationTable)
    .where(
      and(
        eq(notificationTable.id, notificationId),
        eq(notificationTable.userId, userId),
      ),
    )
    .limit(1)

  if (!row) return null
  if (!row.readAt) {
    await db
      .update(notificationTable)
      .set({ readAt: new Date() })
      .where(eq(notificationTable.id, notificationId))
  }

  return listNotificationsForUser(userId)
}

export async function createShareViewNotification(input: {
  deckId: string
  deckTitle: string
  ownerId: string | null
  shareId: string
  shareToken: string
}) {
  if (!input.ownerId) return null

  const db = getDb()
  const recentCutoff = shareViewDedupeCutoff()
  const [recent] = await db
    .select()
    .from(notificationTable)
    .where(
      and(
        eq(notificationTable.userId, input.ownerId),
        eq(notificationTable.type, "share_view"),
        eq(notificationTable.sourceId, input.shareId),
        gt(notificationTable.createdAt, recentCutoff),
      ),
    )
    .orderBy(desc(notificationTable.createdAt))
    .limit(1)

  if (recent) return rowToNotification(recent)

  return createNotification({
    userId: input.ownerId,
    deckId: input.deckId,
    type: "share_view",
    sourceId: input.shareId,
    title: "Shared deck viewed",
    body: `"${input.deckTitle}" was opened from a shared link.`,
    href: `/share/${input.shareToken}`,
  })
}

export async function createShareCreatedNotification(input: {
  deckId: string
  deckTitle: string
  ownerId: string | null
  shareId: string
  shareToken: string
}) {
  return createNotification({
    userId: input.ownerId,
    deckId: input.deckId,
    type: "share_created",
    sourceId: input.shareId,
    title: "Shared link created",
    body: `"${input.deckTitle}" now has a view-only link.`,
    href: `/share/${input.shareToken}`,
  })
}

export async function createShareUpdatedNotification(input: {
  changes: string[]
  deckId: string
  deckTitle: string
  ownerId: string | null
  shareId: string
  shareToken: string
}) {
  if (!input.changes.length) return null

  return createNotification({
    userId: input.ownerId,
    deckId: input.deckId,
    type: "share_updated",
    sourceId: input.shareId,
    title: "Shared link updated",
    body: `"${input.deckTitle}" sharing changed: ${input.changes.join(", ")}.`,
    href: `/share/${input.shareToken}`,
  })
}

export async function createShareDeletedNotification(input: {
  deckId: string
  deckTitle: string
  ownerId: string | null
  shareId: string
}) {
  return createNotification({
    userId: input.ownerId,
    deckId: input.deckId,
    type: "share_deleted",
    sourceId: input.shareId,
    title: "Shared link deleted",
    body: `A shared link for "${input.deckTitle}" was removed.`,
  })
}

export async function createVersionRestoredNotification(input: {
  deckId: string
  deckTitle: string
  ownerId: string | null
  revisionId: string
  revisionTitle: string
}) {
  return createNotification({
    userId: input.ownerId,
    deckId: input.deckId,
    type: "version_restored",
    sourceId: input.revisionId,
    title: "Version restored",
    body: `"${input.deckTitle}" was restored from "${input.revisionTitle}".`,
  })
}

export async function createDeckCollaboratorAddedNotifications(input: {
  collaboratorId: string
  deckId: string
  deckTitle: string
  ownerId: string | null
  role: "editor" | "viewer"
  targetEmail: string
  targetName: string
  targetUserId?: string | null
}) {
  const href = `/`
  const created = await Promise.all([
    createNotification({
      userId: input.ownerId,
      deckId: input.deckId,
      type: "collaborator_added",
      sourceId: input.collaboratorId,
      title: "Collaborator added",
      body: `${input.targetName || input.targetEmail} ${input.targetUserId ? "can" : "was invited to"} ${input.role === "editor" ? "edit" : "view"} "${input.deckTitle}".`,
      href,
    }),
    input.targetUserId
      ? createNotification({
          userId: input.targetUserId,
          deckId: input.deckId,
          type: "collaborator_added",
          sourceId: input.collaboratorId,
          title: "Deck shared with you",
          body: `You can ${input.role === "editor" ? "edit" : "view"} "${input.deckTitle}".`,
          href,
        })
      : Promise.resolve(null),
  ])

  return created.filter((item): item is AppNotification => Boolean(item))
}

export async function createDeckCollaboratorUpdatedNotifications(input: {
  collaboratorId: string
  deckId: string
  deckTitle: string
  ownerId: string | null
  role: "editor" | "viewer"
  targetEmail: string
  targetName: string
  targetUserId?: string | null
}) {
  const href = `/`
  const created = await Promise.all([
    createNotification({
      userId: input.ownerId,
      deckId: input.deckId,
      type: "collaborator_updated",
      sourceId: input.collaboratorId,
      title: "Collaborator access updated",
      body: `${input.targetName || input.targetEmail} can now ${input.role === "editor" ? "edit" : "view"} "${input.deckTitle}".`,
      href,
    }),
    input.targetUserId
      ? createNotification({
          userId: input.targetUserId,
          deckId: input.deckId,
          type: "collaborator_updated",
          sourceId: input.collaboratorId,
          title: "Deck access updated",
          body: `You can now ${input.role === "editor" ? "edit" : "view"} "${input.deckTitle}".`,
          href,
        })
      : Promise.resolve(null),
  ])

  return created.filter((item): item is AppNotification => Boolean(item))
}

export async function createDeckCollaboratorRemovedNotifications(input: {
  collaboratorId: string
  deckId: string
  deckTitle: string
  ownerId: string | null
  targetEmail: string
  targetName: string
  targetUserId?: string | null
}) {
  const created = await Promise.all([
    createNotification({
      userId: input.ownerId,
      deckId: input.deckId,
      type: "collaborator_removed",
      sourceId: input.collaboratorId,
      title: "Collaborator removed",
      body: `${input.targetName || input.targetEmail} no longer has access to "${input.deckTitle}".`,
    }),
    input.targetUserId
      ? createNotification({
          userId: input.targetUserId,
          deckId: input.deckId,
          type: "collaborator_removed",
          sourceId: input.collaboratorId,
          title: "Deck access removed",
          body: `Your access to "${input.deckTitle}" was removed.`,
        })
      : Promise.resolve(null),
  ])

  return created.filter((item): item is AppNotification => Boolean(item))
}

export async function createCommentMentionNotifications(input: {
  actorId: string | null
  commentBody: string
  commentId: string
  deckId: string
  deckTitle: string
  mentions: string[]
  slideTitle: string
}) {
  const mentionKeys = new Set(
    input.mentions.map(cleanNotificationMentionKey).filter(Boolean),
  )
  if (!mentionKeys.size) return []

  const db = getDb()
  const users = await db
    .select({
      id: userTable.id,
      email: userTable.email,
      name: userTable.name,
    })
    .from(userTable)
    .where(
      and(eq(userTable.banned, false), eq(userTable.emailVerified, true)),
    )
  const mentionedUsers = users.filter((user) => {
    if (user.id === input.actorId) return false

    const userKeys = notificationMentionKeysForUser(user)
    return [...mentionKeys].some((mention) => userKeys.has(mention))
  })
  const created: AppNotification[] = []

  for (const mentionedUser of mentionedUsers) {
    const [existing] = await db
      .select({ id: notificationTable.id })
      .from(notificationTable)
      .where(
        and(
          eq(notificationTable.userId, mentionedUser.id),
          eq(notificationTable.type, "comment_mention"),
          eq(notificationTable.sourceId, input.commentId),
        ),
      )
      .limit(1)

    if (existing) continue

    const notification = await createNotification({
      userId: mentionedUser.id,
      deckId: input.deckId,
      type: "comment_mention",
      sourceId: input.commentId,
      title: "You were mentioned",
      body: `"${input.deckTitle}" / "${input.slideTitle}": ${notificationCommentPreview(input.commentBody)}`,
    })

    if (notification) created.push(notification)
  }

  return created
}
