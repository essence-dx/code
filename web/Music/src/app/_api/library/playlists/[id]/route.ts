import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { playlists } from "@/db/schema";
import { jsonError, normalizeRouteError } from "@/lib/api";
import { updatePlaylistSchema } from "@/lib/library/schemas";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const input = updatePlaylistSchema.parse(await request.json());

    await getDb()
      .update(playlists)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(playlists.id, id), eq(playlists.userId, user.id)));

    const [playlist] = await getDb()
      .select()
      .from(playlists)
      .where(and(eq(playlists.id, id), eq(playlists.userId, user.id)))
      .limit(1);

    if (!playlist) {
      return jsonError("Playlist not found.", 404);
    }

    return NextResponse.json({ playlist });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;

    await getDb()
      .delete(playlists)
      .where(and(eq(playlists.id, id), eq(playlists.userId, user.id)));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return normalizeRouteError(error);
  }
}
