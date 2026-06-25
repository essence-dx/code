import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { playlists } from "@/db/schema";
import { normalizeRouteError } from "@/lib/api";
import { playlistSchema } from "@/lib/library/schemas";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const rows = await getDb()
      .select()
      .from(playlists)
      .where(eq(playlists.userId, user.id))
      .orderBy(desc(playlists.updatedAt));

    return NextResponse.json({ playlists: rows });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const input = playlistSchema.parse(await request.json());
    const id = nanoid();

    await getDb().insert(playlists).values({
      id,
      userId: user.id,
      ...input,
    });

    const [playlist] = await getDb()
      .select()
      .from(playlists)
      .where(eq(playlists.id, id))
      .limit(1);

    return NextResponse.json({ playlist });
  } catch (error) {
    return normalizeRouteError(error);
  }
}
