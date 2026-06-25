import { and, desc, eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";

import { getDb } from "@/db/client";
import { user, userNotification, type UserNotificationRow } from "@/db/schema";

export type UserNotificationSummary = {
  id: string;
  type: string;
  title: string;
  body: string;
  targetHref: string | null;
  readAt: string | null;
  createdAt: string;
};

function normalizeEmail(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function toSummary(row: UserNotificationRow): UserNotificationSummary {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    targetHref: row.targetHref,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listUserNotifications(userId: string) {
  const rows = await getDb()
    .select()
    .from(userNotification)
    .where(eq(userNotification.userId, userId))
    .orderBy(desc(userNotification.createdAt))
    .limit(16);

  return rows.map(toSummary);
}

export async function createUserNotification(input: {
  userId: string;
  actorUserId?: string | null;
  type: string;
  title: string;
  body: string;
  targetHref?: string | null;
}) {
  const [row] = await getDb()
    .insert(userNotification)
    .values({
      id: nanoid(),
      userId: input.userId,
      actorUserId: input.actorUserId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      targetHref: input.targetHref ?? null,
      createdAt: new Date(),
    })
    .returning();

  return toSummary(row);
}

export async function createUserNotificationForEmail(input: {
  email: string;
  actorUserId?: string | null;
  type: string;
  title: string;
  body: string;
  targetHref?: string | null;
}) {
  const email = normalizeEmail(input.email);

  if (!email) {
    return null;
  }

  const [recipient] = await getDb()
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (!recipient) {
    return null;
  }

  return createUserNotification({
    userId: recipient.id,
    actorUserId: input.actorUserId ?? null,
    type: input.type,
    title: input.title,
    body: input.body,
    targetHref: input.targetHref ?? null,
  });
}

export async function markUserNotificationRead(input: {
  userId: string;
  notificationId: string;
}) {
  const [row] = await getDb()
    .update(userNotification)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(userNotification.id, input.notificationId),
        eq(userNotification.userId, input.userId),
        isNull(userNotification.readAt),
      ),
    )
    .returning();

  return row ? toSummary(row) : null;
}

export async function markAllUserNotificationsRead(userId: string) {
  await getDb()
    .update(userNotification)
    .set({ readAt: new Date() })
    .where(
      and(eq(userNotification.userId, userId), isNull(userNotification.readAt)),
    );
}
