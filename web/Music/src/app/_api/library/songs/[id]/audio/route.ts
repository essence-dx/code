import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { songAudioFiles, songs } from "@/db/schema";
import { jsonError, normalizeRouteError } from "@/lib/api";
import { songAudioUploadSchema } from "@/lib/library/schemas";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const input = songAudioUploadSchema.parse(await request.json());

    const [song] = await getDb()
      .select({ id: songs.id })
      .from(songs)
      .where(and(eq(songs.id, id), eq(songs.userId, user.id)))
      .limit(1);

    if (!song) {
      return jsonError("Song not found.", 404);
    }

    const decodedSize = Buffer.byteLength(input.dataBase64, "base64");

    if (decodedSize !== input.byteSize) {
      return jsonError("Audio payload size does not match.", 400);
    }

    const now = new Date();
    await getDb()
      .insert(songAudioFiles)
      .values({
        songId: id,
        mimeType: input.mimeType,
        byteSize: input.byteSize,
        dataBase64: input.dataBase64,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: songAudioFiles.songId,
        set: {
          mimeType: input.mimeType,
          byteSize: input.byteSize,
          dataBase64: input.dataBase64,
          updatedAt: now,
        },
      });

    return NextResponse.json({ ok: true, byteSize: input.byteSize });
  } catch (error) {
    return normalizeRouteError(error);
  }
}
