import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { hookPosts } from "@/db/schema";
import { jsonError, normalizeRouteError } from "@/lib/api";
import { serializeHookPost } from "@/lib/hooks/mappers";
import { cloudHookPostSchema } from "@/lib/hooks/schemas";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const rows = await getDb()
      .select()
      .from(hookPosts)
      .where(eq(hookPosts.userId, user.id))
      .orderBy(desc(hookPosts.updatedAt));

    return NextResponse.json({ hooks: rows.map(serializeHookPost) });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const input = cloudHookPostSchema.parse(await request.json());
    const now = new Date();
    const [existing] = await getDb()
      .select({ id: hookPosts.id, userId: hookPosts.userId })
      .from(hookPosts)
      .where(eq(hookPosts.id, input.id))
      .limit(1);

    if (existing && existing.userId !== user.id) {
      return jsonError("Hook id already belongs to another account.", 409);
    }

    const values = {
      artist: input.artist,
      durationMs: input.durationMs,
      lyrics: input.lyrics,
      overlayText: input.overlayText,
      publishedAt: input.visibility === "public" ? now : null,
      songTitle: input.songTitle,
      sourceSongId: input.sourceSongId ?? null,
      startMs: input.startMs,
      stylePrompt: input.stylePrompt,
      tags: input.tags,
      updatedAt: now,
      videoByteSize: input.videoByteSize,
      videoStorageKey: input.videoStorageKey ?? null,
      videoType: input.videoType,
      visibility: input.visibility,
    };

    if (existing) {
      await getDb()
        .update(hookPosts)
        .set(values)
        .where(and(eq(hookPosts.id, input.id), eq(hookPosts.userId, user.id)));
    } else {
      await getDb().insert(hookPosts).values({
        ...values,
        id: input.id,
        userId: user.id,
      });
    }

    const [saved] = await getDb()
      .select()
      .from(hookPosts)
      .where(and(eq(hookPosts.id, input.id), eq(hookPosts.userId, user.id)))
      .limit(1);

    if (!saved) {
      return jsonError("Could not save hook post.", 500);
    }

    return NextResponse.json({
      hook: serializeHookPost(saved),
      shareUrl: saved.visibility === "public" ? `/h/${saved.id}` : null,
    });
  } catch (error) {
    return normalizeRouteError(error);
  }
}
