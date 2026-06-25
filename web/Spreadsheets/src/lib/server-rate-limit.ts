import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { rateLimit } from "@/db/schema";

export type ServerRateLimitResult =
  | {
      ok: true;
      remaining: number;
      retryAfterSeconds: 0;
    }
  | {
      ok: false;
      remaining: 0;
      retryAfterSeconds: number;
    };

export async function consumeServerRateLimit({
  key,
  max,
  windowMs,
}: {
  key: string;
  max: number;
  windowMs: number;
}): Promise<ServerRateLimitResult> {
  const db = getDb();
  const now = Date.now();
  const [entry] = await db
    .select()
    .from(rateLimit)
    .where(eq(rateLimit.key, key))
    .limit(1);

  if (!entry || now - entry.lastRequest >= windowMs) {
    await db
      .insert(rateLimit)
      .values({ key, count: 1, lastRequest: now })
      .onConflictDoUpdate({
        target: rateLimit.key,
        set: { count: 1, lastRequest: now },
      });

    return {
      ok: true,
      remaining: Math.max(max - 1, 0),
      retryAfterSeconds: 0,
    };
  }

  const nextCount = entry.count + 1;
  await db
    .update(rateLimit)
    .set({ count: nextCount })
    .where(eq(rateLimit.key, key));

  if (nextCount > max) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        Math.ceil((windowMs - (now - entry.lastRequest)) / 1000),
        1,
      ),
    };
  }

  return {
    ok: true,
    remaining: Math.max(max - nextCount, 0),
    retryAfterSeconds: 0,
  };
}

export async function createServerRateLimitReservation({
  key,
}: {
  key: string;
}) {
  await getDb()
    .insert(rateLimit)
    .values({ key, count: 1, lastRequest: Date.now() })
    .onConflictDoUpdate({
      target: rateLimit.key,
      set: { count: 1, lastRequest: Date.now() },
    });
}

export async function consumeServerRateLimitReservation({
  key,
  ttlMs,
}: {
  key: string;
  ttlMs: number;
}) {
  const db = getDb();
  const now = Date.now();
  const [entry] = await db
    .select()
    .from(rateLimit)
    .where(eq(rateLimit.key, key))
    .limit(1);

  if (!entry) {
    return false;
  }

  await db.delete(rateLimit).where(eq(rateLimit.key, key));

  return now - entry.lastRequest <= ttlMs;
}
