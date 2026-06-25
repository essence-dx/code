import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { songs } from "@/db/schema";
import { jsonError, normalizeRouteError } from "@/lib/api";
import { serializeSong } from "@/lib/library/mappers";
import { updateCloudSongSchema } from "@/lib/library/schemas";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const input = updateCloudSongSchema.parse(await request.json());
    const now = new Date();

    await getDb()
      .update(songs)
      .set({
        ...input,
        audioStorageKey: input.audioStorageKey ?? undefined,
        coverImageUrl: input.coverImageUrl ?? undefined,
        bpm: input.bpm ?? undefined,
        musicalKey: input.musicalKey ?? undefined,
        updatedAt: now,
      })
      .where(and(eq(songs.id, id), eq(songs.userId, user.id)));

    const [song] = await getDb()
      .select()
      .from(songs)
      .where(and(eq(songs.id, id), eq(songs.userId, user.id)))
      .limit(1);

    if (!song) {
      return jsonError("Song not found.", 404);
    }

    return NextResponse.json({ song: serializeSong(song) });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;

    await getDb()
      .delete(songs)
      .where(and(eq(songs.id, id), eq(songs.userId, user.id)));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return normalizeRouteError(error);
  }
}
