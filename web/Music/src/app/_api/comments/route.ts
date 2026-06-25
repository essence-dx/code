import { and, eq, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import {
  hookPosts,
  playlists,
  publicComments,
  songs,
  user as users,
} from "@/db/schema";
import { jsonError, normalizeRouteError } from "@/lib/api";
import { isUserBlocked } from "@/lib/blocks";
import { serializePublicComment, type PublicCommentTargetType } from "@/lib/comments";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

const commentTargetTypeSchema = z.enum(["song", "playlist", "profile", "hook"]);

const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(1200),
  parentId: z.string().max(160).optional().nullable(),
  targetId: z.string().min(1).max(160),
  targetType: commentTargetTypeSchema,
});

type CommentTarget = {
  label: string;
  ownerId: string | null;
};

export async function POST(request: Request) {
  try {
    const signedInUser = await requireUser(request);
    const input = createCommentSchema.parse(await request.json());
    const target = await resolveCommentTarget(input.targetType, input.targetId);

    if (!target) {
      return jsonError("Comment target is not available.", 404);
    }

    if (
      target.ownerId &&
      target.ownerId !== signedInUser.id &&
      (await isUserBlocked(target.ownerId, signedInUser.id))
    ) {
      return jsonError("This creator is not accepting your interaction.", 403);
    }

    if (input.parentId) {
      const [parent] = await getDb()
        .select({ id: publicComments.id })
        .from(publicComments)
        .where(
          and(
            eq(publicComments.id, input.parentId),
            eq(publicComments.targetType, input.targetType),
            eq(publicComments.targetId, input.targetId),
            eq(publicComments.status, "visible"),
          ),
        )
        .limit(1);

      if (!parent) {
        return jsonError("Reply target is not available.", 404);
      }
    }

    const now = new Date();
    const [comment] = await getDb()
      .insert(publicComments)
      .values({
        id: nanoid(),
        body: input.body,
        createdAt: now,
        parentId: input.parentId || null,
        targetId: input.targetId,
        targetType: input.targetType,
        updatedAt: now,
        userId: signedInUser.id,
      })
      .returning();

    return NextResponse.json({
      comment: serializePublicComment({
        ...comment,
        authorId: signedInUser.id,
        authorName: signedInUser.name,
      }),
    });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const signedInUser = await requireUser(request);
    const input = z
      .object({
        action: z.enum(["hide", "restore"]),
        id: z.string().min(1).max(160),
      })
      .parse(await request.json());
    const [comment] = await getDb()
      .select()
      .from(publicComments)
      .where(eq(publicComments.id, input.id))
      .limit(1);

    if (!comment) {
      return jsonError("Comment not found.", 404);
    }

    const target = await resolveCommentTarget(comment.targetType, comment.targetId);

    if (!target || target.ownerId !== signedInUser.id) {
      return jsonError("Only the creator can moderate this comment.", 403);
    }

    const [updated] = await getDb()
      .update(publicComments)
      .set({
        hiddenByUserId: input.action === "hide" ? signedInUser.id : null,
        status: input.action === "hide" ? "hidden" : "visible",
        updatedAt: new Date(),
      })
      .where(eq(publicComments.id, input.id))
      .returning();

    return NextResponse.json({ comment: serializeCommentForResponse(updated) });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const signedInUser = await requireUser(request);
    const input = z
      .object({
        id: z.string().min(1).max(160),
      })
      .parse(await request.json());
    const [comment] = await getDb()
      .select()
      .from(publicComments)
      .where(eq(publicComments.id, input.id))
      .limit(1);

    if (!comment) {
      return jsonError("Comment not found.", 404);
    }

    const target = await resolveCommentTarget(comment.targetType, comment.targetId);
    const canDelete = comment.userId === signedInUser.id || target?.ownerId === signedInUser.id;

    if (!canDelete) {
      return jsonError("You cannot delete this comment.", 403);
    }

    await getDb()
      .update(publicComments)
      .set({
        body: "",
        hiddenByUserId: signedInUser.id,
        status: "deleted",
        updatedAt: new Date(),
      })
      .where(eq(publicComments.id, input.id));

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

async function resolveCommentTarget(
  targetType: PublicCommentTargetType,
  targetId: string,
): Promise<CommentTarget | null> {
  if (targetType === "song") {
    const [song] = await getDb()
      .select({
        label: songs.title,
        ownerId: songs.userId,
      })
      .from(songs)
      .innerJoin(users, eq(songs.userId, users.id))
      .where(
        and(
          eq(songs.id, targetId),
          or(eq(songs.visibility, "public"), eq(songs.visibility, "link-only")),
          eq(songs.moderationStatus, "clean"),
          eq(users.profileModerationStatus, "clean"),
        ),
      )
      .limit(1);

    return song ?? null;
  }

  if (targetType === "playlist") {
    const [playlist] = await getDb()
      .select({
        label: playlists.name,
        ownerId: playlists.userId,
      })
      .from(playlists)
      .innerJoin(users, eq(playlists.userId, users.id))
      .where(
        and(
          eq(playlists.id, targetId),
          or(eq(playlists.visibility, "public"), eq(playlists.visibility, "link-only")),
          eq(playlists.moderationStatus, "clean"),
          eq(users.profileModerationStatus, "clean"),
        ),
      )
      .limit(1);

    return playlist ?? null;
  }

  if (targetType === "hook") {
    const [hook] = await getDb()
      .select({
        label: hookPosts.songTitle,
        ownerId: hookPosts.userId,
      })
      .from(hookPosts)
      .innerJoin(users, eq(hookPosts.userId, users.id))
      .where(
        and(
          eq(hookPosts.id, targetId),
          eq(hookPosts.visibility, "public"),
          eq(hookPosts.moderationStatus, "clean"),
          eq(users.profileModerationStatus, "clean"),
        ),
      )
      .limit(1);

    return hook ?? null;
  }

  const [profile] = await getDb()
    .select({
      label: users.name,
      ownerId: users.id,
    })
    .from(users)
    .where(
      and(
        eq(users.id, targetId),
        eq(users.profileModerationStatus, "clean"),
        eq(users.profileCommentsEnabled, true),
      ),
    )
    .limit(1);

  return profile ?? null;
}

function serializeCommentForResponse(comment: typeof publicComments.$inferSelect) {
  return serializePublicComment({
    ...comment,
    authorId: comment.userId,
    authorName: "",
  });
}
