import { and, eq } from "drizzle-orm";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { songs } from "@/db/schema";
import { jsonError, normalizeRouteError } from "@/lib/api";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

const maxBlobAudioBytes = 500 * 1024 * 1024;

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ClientPayload = {
  songId: string;
  userId?: string;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return jsonError("Large audio upload storage is not configured.", 503);
    }

    const { id } = await context.params;
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const user = await requireUser(request);
        const payload = parseClientPayload(clientPayload);

        if (payload.songId !== id) {
          throw new Error("Song id does not match upload payload.");
        }

        const [song] = await getDb()
          .select({ id: songs.id })
          .from(songs)
          .where(and(eq(songs.id, id), eq(songs.userId, user.id)))
          .limit(1);

        if (!song) {
          throw new Error("Song not found.");
        }

        return {
          allowedContentTypes: ["audio/*"],
          maximumSizeInBytes: maxBlobAudioBytes,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ songId: id, userId: user.id }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = parseClientPayload(tokenPayload);

        await getDb()
          .update(songs)
          .set({
            audioStorageKey: `blob:${blob.url}`,
            updatedAt: new Date(),
          })
          .where(eq(songs.id, payload.songId));
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return normalizeRouteError(error);
  }
}

function parseClientPayload(payload: string | null | undefined): ClientPayload {
  if (!payload) {
    throw new Error("Missing upload payload.");
  }

  const parsed = JSON.parse(payload) as ClientPayload;

  if (!parsed.songId) {
    throw new Error("Missing song id in upload payload.");
  }

  return parsed;
}
