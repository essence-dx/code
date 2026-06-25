import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { session, user } from "@/db/schema";

export type AccountProfile = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AccountSessionSummary = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

function toProfile(row: typeof user.$inferSelect): AccountProfile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toSessionSummary(
  row: typeof session.$inferSelect,
): AccountSessionSummary {
  return {
    id: row.id,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getAccountProfile(userId: string) {
  const [row] = await getDb()
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return row ? toProfile(row) : null;
}

export async function updateAccountDisplayName(input: {
  userId: string;
  name: string;
}) {
  const name = input.name.trim().slice(0, 80);

  if (!name) {
    return null;
  }

  const [row] = await getDb()
    .update(user)
    .set({
      name,
      updatedAt: new Date(),
    })
    .where(eq(user.id, input.userId))
    .returning();

  return row ? toProfile(row) : null;
}

export async function listAccountSessions(userId: string) {
  const rows = await getDb()
    .select()
    .from(session)
    .where(eq(session.userId, userId))
    .orderBy(desc(session.updatedAt))
    .limit(12);

  return rows.map(toSessionSummary);
}

export async function revokeAccountSession(input: {
  userId: string;
  sessionId: string;
}) {
  await getDb()
    .delete(session)
    .where(
      and(eq(session.id, input.sessionId), eq(session.userId, input.userId)),
    );
}

export async function deleteAccount(userId: string) {
  await getDb().delete(user).where(eq(user.id, userId));
}
