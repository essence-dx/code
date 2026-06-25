import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { songs } from "@/db/schema";
import { jsonError, normalizeRouteError } from "@/lib/api";
import { cloudSongSchema } from "@/lib/library/schemas";
import { serializeSong } from "@/lib/library/mappers";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const rows = await getDb()
      .select()
      .from(songs)
      .where(eq(songs.userId, user.id))
      .orderBy(desc(songs.updatedAt));

    return NextResponse.json({ songs: rows.map(serializeSong) });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const input = cloudSongSchema.parse(await request.json());
    const now = new Date();

    const [existing] = await getDb()
      .select({ id: songs.id })
      .from(songs)
      .where(eq(songs.id, input.id))
      .limit(1);

    if (existing) {
      const [owned] = await getDb()
        .select({ id: songs.id })
        .from(songs)
        .where(and(eq(songs.id, input.id), eq(songs.userId, user.id)))
        .limit(1);

      if (!owned) {
        return jsonError("Song id already belongs to another account.", 409);
      }

      await getDb()
        .update(songs)
        .set({
          title: input.title,
          artist: input.artist,
          source: input.source,
          visibility: input.visibility,
          audioStorageKey: input.audioStorageKey ?? null,
          coverImageUrl: input.coverImageUrl ?? null,
          lyrics: input.lyrics,
          stylePrompt: input.stylePrompt,
          durationMs: input.durationMs,
          bpm: input.bpm ?? null,
          musicalKey: input.musicalKey ?? null,
          tags: input.tags,
          rightsMetadata: input.rightsMetadata,
          liked: input.liked,
          updatedAt: now,
        })
        .where(and(eq(songs.id, input.id), eq(songs.userId, user.id)));
    } else {
      await getDb().insert(songs).values({
        ...input,
        userId: user.id,
        audioStorageKey: input.audioStorageKey ?? null,
        coverImageUrl: input.coverImageUrl ?? null,
        bpm: input.bpm ?? null,
        musicalKey: input.musicalKey ?? null,
        rightsMetadata: input.rightsMetadata,
        updatedAt: now,
      });
    }

    const [saved] = await getDb()
      .select()
      .from(songs)
      .where(and(eq(songs.id, input.id), eq(songs.userId, user.id)))
      .limit(1);

    if (!saved) {
      return jsonError("Could not save song metadata.", 500);
    }

    return NextResponse.json({ song: serializeSong(saved) });
  } catch (error) {
    return normalizeRouteError(error);
  }
}
