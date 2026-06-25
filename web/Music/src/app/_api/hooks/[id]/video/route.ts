import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { hookPosts, hookVideoFiles } from "@/db/schema";
import { jsonError, normalizeRouteError } from "@/lib/api";
import { hookVideoUploadSchema } from "@/lib/hooks/schemas";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const [row] = await getDb()
      .select({
        dataBase64: hookVideoFiles.dataBase64,
        byteSize: hookVideoFiles.byteSize,
        mimeType: hookVideoFiles.mimeType,
      })
      .from(hookVideoFiles)
      .innerJoin(hookPosts, eq(hookVideoFiles.hookId, hookPosts.id))
      .where(
        and(
          eq(hookVideoFiles.hookId, id),
          eq(hookPosts.visibility, "public"),
          eq(hookPosts.moderationStatus, "clean"),
        ),
      )
      .limit(1);

    if (!row) {
      return jsonError("Hook video not found.", 404);
    }

    const bytes = Buffer.from(row.dataBase64, "base64");

    return new Response(bytes, {
      headers: {
        "cache-control": "public, max-age=3600",
        "content-length": String(row.byteSize),
        "content-type": row.mimeType,
      },
    });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return jsonError("Sign in required.", 401);
    }

    const { id } = await context.params;
    const input = hookVideoUploadSchema.parse(await request.json());
    const [hook] = await getDb()
      .select({ id: hookPosts.id })
      .from(hookPosts)
      .where(and(eq(hookPosts.id, id), eq(hookPosts.userId, session.user.id)))
      .limit(1);

    if (!hook) {
      return jsonError("Hook post not found.", 404);
    }

    const decodedSize = Buffer.byteLength(input.dataBase64, "base64");

    if (decodedSize !== input.byteSize) {
      return jsonError("Hook video payload size does not match.", 400);
    }

    const now = new Date();
    await getDb()
      .insert(hookVideoFiles)
      .values({
        hookId: id,
        byteSize: input.byteSize,
        dataBase64: input.dataBase64,
        mimeType: input.mimeType,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: hookVideoFiles.hookId,
        set: {
          byteSize: input.byteSize,
          dataBase64: input.dataBase64,
          mimeType: input.mimeType,
          updatedAt: now,
        },
      });

    await getDb()
      .update(hookPosts)
      .set({
        videoByteSize: input.byteSize,
        videoStorageKey: `db:${id}`,
        videoType: input.mimeType,
        updatedAt: now,
      })
      .where(eq(hookPosts.id, id));

    return NextResponse.json({ byteSize: input.byteSize, ok: true });
  } catch (error) {
    return normalizeRouteError(error);
  }
}
