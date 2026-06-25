import { and, asc, eq, max } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { playlistSongs, playlists, songs } from "@/db/schema";
import { jsonError, normalizeRouteError } from "@/lib/api";
import { playlistSongSchema } from "@/lib/library/schemas";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const ownsPlaylist = await assertPlaylistOwner(id, user.id);

    if (!ownsPlaylist) {
      return jsonError("Playlist not found.", 404);
    }

    const rows = await getDb()
      .select({ link: playlistSongs, song: songs })
      .from(playlistSongs)
      .innerJoin(songs, eq(playlistSongs.songId, songs.id))
      .where(and(eq(playlistSongs.playlistId, id), eq(songs.userId, user.id)))
      .orderBy(asc(playlistSongs.position));

    return NextResponse.json({ songs: rows });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const input = playlistSongSchema.parse(await request.json());

    const ownsPlaylist = await assertPlaylistOwner(id, user.id);
    if (!ownsPlaylist) {
      return jsonError("Playlist not found.", 404);
    }

    const [song] = await getDb()
      .select({ id: songs.id })
      .from(songs)
      .where(and(eq(songs.id, input.songId), eq(songs.userId, user.id)))
      .limit(1);

    if (!song) {
      return jsonError("Sync this track before adding it to a playlist.", 404);
    }

    const [{ position }] = await getDb()
      .select({ position: max(playlistSongs.position) })
      .from(playlistSongs)
      .where(eq(playlistSongs.playlistId, id));
    const nextPosition = Number(position ?? -1) + 1;

    await getDb()
      .insert(playlistSongs)
      .values({
        playlistId: id,
        songId: input.songId,
        position: nextPosition,
      })
      .onConflictDoNothing();

    return NextResponse.json({ ok: true });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const input = playlistSongSchema.parse(await request.json());

    const ownsPlaylist = await assertPlaylistOwner(id, user.id);
    if (!ownsPlaylist) {
      return jsonError("Playlist not found.", 404);
    }

    await getDb()
      .delete(playlistSongs)
      .where(
        and(
          eq(playlistSongs.playlistId, id),
          eq(playlistSongs.songId, input.songId),
        ),
      );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

async function assertPlaylistOwner(playlistId: string, userId: string) {
  const [playlist] = await getDb()
    .select({ id: playlists.id })
    .from(playlists)
    .where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)))
    .limit(1);

  return Boolean(playlist);
}
