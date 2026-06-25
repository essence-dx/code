import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { socialActions } from "@/db/schema";

export const socialActionKindSchema = z.enum(["like", "follow", "repost"]);
export const socialTargetTypeSchema = z.enum([
  "song",
  "profile",
  "playlist",
  "hook",
]);

export const socialActionRequestSchema = z.object({
  kind: socialActionKindSchema,
  targetId: z.string().min(1).max(160),
  targetType: socialTargetTypeSchema,
});

export type SocialActionKind = z.infer<typeof socialActionKindSchema>;
export type SocialTargetType = z.infer<typeof socialTargetTypeSchema>;

export type SocialCounts = Record<SocialActionKind, number>;

export async function getSocialCounts(
  targetType: SocialTargetType,
  targetId: string,
): Promise<SocialCounts> {
  const rows = await getDb()
    .select({
      kind: socialActions.kind,
      total: sql<number>`count(*)`,
    })
    .from(socialActions)
    .where(
      and(
        eq(socialActions.targetType, targetType),
        eq(socialActions.targetId, targetId),
      ),
    )
    .groupBy(socialActions.kind);
  const counts = emptySocialCounts();

  for (const row of rows) {
    counts[row.kind] = Number(row.total ?? 0);
  }

  return counts;
}

export function emptySocialCounts(): SocialCounts {
  return {
    follow: 0,
    like: 0,
    repost: 0,
  };
}
