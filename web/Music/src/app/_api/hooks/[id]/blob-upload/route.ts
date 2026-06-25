import { and, eq } from "drizzle-orm";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { hookPosts } from "@/db/schema";
import { jsonError, normalizeRouteError } from "@/lib/api";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

const maxBlobHookVideoBytes = 500 * 1024 * 1024;

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ClientPayload = {
  hookId: string;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return jsonError("Large hook video storage is not configured.", 503);
    }

    const { id } = await context.params;
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const user = await requireUser(request);
        const payload = parseClientPayload(clientPayload);

        if (payload.hookId !== id) {
          throw new Error("Hook id does not match upload payload.");
        }

        const [hook] = await getDb()
          .select({ id: hookPosts.id })
          .from(hookPosts)
          .where(and(eq(hookPosts.id, id), eq(hookPosts.userId, user.id)))
          .limit(1);

        if (!hook) {
          throw new Error("Hook post not found.");
        }

        return {
          allowedContentTypes: ["video/*"],
          maximumSizeInBytes: maxBlobHookVideoBytes,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ hookId: id }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = parseClientPayload(tokenPayload);

        await getDb()
          .update(hookPosts)
          .set({
            videoStorageKey: `blob:${blob.url}`,
            updatedAt: new Date(),
          })
          .where(eq(hookPosts.id, payload.hookId));
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

  if (!parsed.hookId) {
    throw new Error("Missing hook id in upload payload.");
  }

  return parsed;
}
