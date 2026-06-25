import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { publicComments, user as users } from "@/db/schema";

export type PublicCommentTargetType = "song" | "playlist" | "profile" | "hook";

export type PublicCommentRow = {
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  id: string;
  parentId: string | null;
  status: "visible" | "hidden" | "deleted";
  targetId: string;
  targetType: PublicCommentTargetType;
  updatedAt: string;
};

export async function getPublicComments(
  targetType: PublicCommentTargetType,
  targetId: string,
) {
  const rows = await getDb()
    .select({
      authorId: users.id,
      authorName: users.name,
      body: publicComments.body,
      createdAt: publicComments.createdAt,
      id: publicComments.id,
      parentId: publicComments.parentId,
      status: publicComments.status,
      targetId: publicComments.targetId,
      targetType: publicComments.targetType,
      updatedAt: publicComments.updatedAt,
    })
    .from(publicComments)
    .innerJoin(users, eq(publicComments.userId, users.id))
    .where(
      and(
        eq(publicComments.targetType, targetType),
        eq(publicComments.targetId, targetId),
        eq(publicComments.status, "visible"),
        eq(users.profileModerationStatus, "clean"),
      ),
    )
    .orderBy(asc(publicComments.createdAt));

  return rows.map(serializePublicComment);
}

export async function getCommentCount(
  targetType: PublicCommentTargetType,
  targetId: string,
) {
  const [row] = await getDb()
    .select({
      total: sql<number>`count(*)`,
    })
    .from(publicComments)
    .where(
      and(
        eq(publicComments.targetType, targetType),
        eq(publicComments.targetId, targetId),
        eq(publicComments.status, "visible"),
      ),
    )
    .limit(1);

  return Number(row?.total ?? 0);
}

export async function getCommentCounts(
  targetType: PublicCommentTargetType,
  targetIds: string[],
) {
  const uniqueIds = Array.from(new Set(targetIds));
  const counts = new Map<string, number>();

  if (!uniqueIds.length) {
    return counts;
  }

  const rows = await getDb()
    .select({
      targetId: publicComments.targetId,
      total: sql<number>`count(*)`,
    })
    .from(publicComments)
    .where(
      and(
        eq(publicComments.targetType, targetType),
        eq(publicComments.status, "visible"),
        inArray(publicComments.targetId, uniqueIds),
      ),
    )
    .groupBy(publicComments.targetId);

  for (const row of rows) {
    counts.set(row.targetId, Number(row.total ?? 0));
  }

  return counts;
}

export function serializePublicComment(row: {
  authorId: string;
  authorName: string;
  body: string;
  createdAt: Date | string;
  id: string;
  parentId: string | null;
  status: "visible" | "hidden" | "deleted";
  targetId: string;
  targetType: PublicCommentTargetType;
  updatedAt: Date | string;
}): PublicCommentRow {
  return {
    ...row,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}
