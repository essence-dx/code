import { and, eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { songAudioFiles, songs } from "@/db/schema";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const [row] = await getDb()
      .select({
        mimeType: songAudioFiles.mimeType,
        byteSize: songAudioFiles.byteSize,
        dataBase64: songAudioFiles.dataBase64,
      })
      .from(songs)
      .innerJoin(songAudioFiles, eq(songAudioFiles.songId, songs.id))
      .where(
        and(
          eq(songs.shareSlug, slug),
          or(eq(songs.visibility, "public"), eq(songs.visibility, "link-only")),
          eq(songs.moderationStatus, "clean"),
        ),
      )
      .limit(1);

    if (!row) {
      return jsonError("Shared audio not found.", 404);
    }

    const body = Buffer.from(row.dataBase64, "base64");

    return new Response(body, {
      headers: {
        "Cache-Control": "private, max-age=300",
        "Content-Length": String(row.byteSize),
        "Content-Type": row.mimeType,
      },
    });
  } catch (error) {
    return normalizeRouteError(error);
  }
}
