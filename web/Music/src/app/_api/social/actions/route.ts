import { and, eq, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  hookPosts,
  playlists,
  socialActions,
  songs,
  user as users,
} from "@/db/schema";
import { jsonError, normalizeRouteError } from "@/lib/api";
import { isUserBlocked } from "@/lib/blocks";
import {
  getSocialCounts,
  socialActionRequestSchema,
  type SocialActionKind,
  type SocialTargetType,
} from "@/lib/social";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

type SocialTarget = {
  label: string;
  ownerId: string | null;
};

export async function POST(request: Request) {
  try {
    const signedInUser = await requireUser(request);
    const input = socialActionRequestSchema.parse(await request.json());
    const target = await resolveSocialTarget(input.targetType, input.targetId);

    if (!target) {
      return jsonError("This public item is not available.", 404);
    }

    if (
      target.ownerId &&
      target.ownerId !== signedInUser.id &&
      (await isUserBlocked(target.ownerId, signedInUser.id))
    ) {
      return jsonError("This creator is not accepting your interaction.", 403);
    }

    const targetError = validateActionTarget(input.kind, input.targetType);

    if (targetError) {
      return jsonError(targetError, 422);
    }

    const db = getDb();
    const [existing] = await db
      .select({ id: socialActions.id })
      .from(socialActions)
      .where(
        and(
          eq(socialActions.userId, signedInUser.id),
          eq(socialActions.kind, input.kind),
          eq(socialActions.targetType, input.targetType),
          eq(socialActions.targetId, input.targetId),
        ),
      )
      .limit(1);

    let active = true;

    if (existing) {
      await db.delete(socialActions).where(eq(socialActions.id, existing.id));
      active = false;
    } else {
      await db.insert(socialActions).values({
        id: nanoid(),
        createdAt: new Date(),
        kind: input.kind,
        targetId: input.targetId,
        targetLabel: target.label,
        targetType: input.targetType,
        userId: signedInUser.id,
      });
    }

    return NextResponse.json({
      active,
      counts: await getSocialCounts(input.targetType, input.targetId),
    });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

function validateActionTarget(
  kind: SocialActionKind,
  targetType: SocialTargetType,
) {
  if (kind === "follow" && targetType !== "profile") {
    return "Creator follows can only target profiles.";
  }

  if (kind === "repost" && targetType !== "song" && targetType !== "hook") {
    return "Reposts can only target songs or hooks.";
  }

  if (kind === "like" && targetType === "profile") {
    return "Likes can target songs or playlists.";
  }

  return "";
}

async function resolveSocialTarget(
  targetType: SocialTargetType,
  targetId: string,
): Promise<SocialTarget | null> {
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
          or(
            eq(playlists.visibility, "public"),
            eq(playlists.visibility, "link-only"),
          ),
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
      ),
    )
    .limit(1);

  return profile ?? null;
}
