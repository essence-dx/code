import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { songs } from "@/db/schema";
import { jsonError, normalizeRouteError } from "@/lib/api";
import { serializeSong } from "@/lib/library/mappers";
import { getSongRightsReadiness } from "@/lib/library/rights";
import { songVisibilitySchema } from "@/lib/library/schemas";
import { scanPublicSongMetadata } from "@/lib/moderation";
import { requireUser } from "@/lib/session";
import { z } from "zod";

export const runtime = "nodejs";

const publishSongSchema = z.object({
  visibility: songVisibilitySchema,
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const input = publishSongSchema.parse(await request.json());

    const [song] = await getDb()
      .select()
      .from(songs)
      .where(and(eq(songs.id, id), eq(songs.userId, user.id)))
      .limit(1);

    if (!song) {
      return jsonError("Song not found.", 404);
    }

    if (input.visibility === "public" && song.moderationStatus === "hidden") {
      return jsonError("This track is hidden by moderation review.", 403);
    }

    if (input.visibility === "public") {
      const rights = getSongRightsReadiness(song.rightsMetadata);

      if (!rights.ready) {
        return jsonError("Public sharing needs rights metadata first.", 422, {
          findings: rights.issues,
        });
      }

      const findings = scanPublicSongMetadata(song);

      if (findings.length) {
        return jsonError(
          "Public sharing needs metadata review before discovery.",
          422,
          { findings },
        );
      }
    }

    const now = new Date();
    const shareSlug =
      input.visibility === "private"
        ? song.shareSlug
        : song.shareSlug ?? (await createShareSlug());

    await getDb()
      .update(songs)
      .set({
        visibility: input.visibility,
        moderationStatus:
          song.moderationStatus === "hidden"
            ? "hidden"
            : input.visibility === "public"
              ? "clean"
              : song.moderationStatus,
        shareSlug,
        publishedAt:
          input.visibility === "private" ? null : (song.publishedAt ?? now),
        updatedAt: now,
      })
      .where(and(eq(songs.id, id), eq(songs.userId, user.id)));

    const [updated] = await getDb()
      .select()
      .from(songs)
      .where(and(eq(songs.id, id), eq(songs.userId, user.id)))
      .limit(1);

    if (!updated) {
      return jsonError("Could not update publishing state.", 500);
    }

    return NextResponse.json({
      song: serializeSong(updated),
      shareUrl: input.visibility === "private" ? null : `/s/${shareSlug}`,
    });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

async function createShareSlug() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const shareSlug = nanoid(12);
    const [existing] = await getDb()
      .select({ id: songs.id })
      .from(songs)
      .where(eq(songs.shareSlug, shareSlug))
      .limit(1);

    if (!existing) {
      return shareSlug;
    }
  }

  throw new Error("Could not create a unique share link.");
}
