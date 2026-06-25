import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { getDb } from "@/db/client";
import { brandColor, type BrandColorRow } from "@/db/schema";
import type { BrandColorSummary } from "@/features/editor/types";

function normalizeColor(color: string) {
  return color.trim().toLowerCase();
}

function toSummary(row: BrandColorRow): BrandColorSummary {
  return {
    id: row.id,
    color: row.color,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listBrandColors(userId: string) {
  const rows = await getDb()
    .select()
    .from(brandColor)
    .where(eq(brandColor.userId, userId))
    .orderBy(desc(brandColor.updatedAt))
    .limit(24);

  return rows.map(toSummary);
}

export async function createBrandColor(input: {
  userId: string;
  color: string;
}) {
  const now = new Date();
  const color = normalizeColor(input.color);

  const [row] = await getDb()
    .insert(brandColor)
    .values({
      id: nanoid(),
      userId: input.userId,
      color,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [brandColor.userId, brandColor.color],
      set: {
        updatedAt: now,
      },
    })
    .returning();

  return toSummary(row);
}
