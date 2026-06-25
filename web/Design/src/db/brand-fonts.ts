import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { getDb } from "@/db/client";
import { brandFont, type BrandFontRow } from "@/db/schema";
import type { BrandFontRole, BrandFontSummary } from "@/features/editor/types";

function toSummary(row: BrandFontRow): BrandFontSummary {
  return {
    id: row.id,
    role: row.role as BrandFontRole,
    fontFamily: row.fontFamily,
    fontSize: row.fontSize,
    fontWeight: row.fontWeight,
    letterSpacing: row.letterSpacing,
    lineHeight: row.lineHeight,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listBrandFonts(userId: string) {
  const rows = await getDb()
    .select()
    .from(brandFont)
    .where(eq(brandFont.userId, userId))
    .orderBy(desc(brandFont.updatedAt))
    .limit(8);

  return rows.map(toSummary);
}

export async function saveBrandFont(input: {
  userId: string;
  role: BrandFontRole;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  lineHeight: number;
}) {
  const now = new Date();

  const [row] = await getDb()
    .insert(brandFont)
    .values({
      id: nanoid(),
      userId: input.userId,
      role: input.role,
      fontFamily: input.fontFamily,
      fontSize: input.fontSize,
      fontWeight: input.fontWeight,
      letterSpacing: input.letterSpacing,
      lineHeight: input.lineHeight,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [brandFont.userId, brandFont.role],
      set: {
        fontFamily: input.fontFamily,
        fontSize: input.fontSize,
        fontWeight: input.fontWeight,
        letterSpacing: input.letterSpacing,
        lineHeight: input.lineHeight,
        updatedAt: now,
      },
    })
    .returning();

  return toSummary(row);
}
