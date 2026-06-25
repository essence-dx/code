import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { publicComments, user as users, userBlocks } from "@/db/schema";
import { jsonError, normalizeRouteError } from "@/lib/api";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

const blockRequestSchema = z.object({
  blockedUserId: z.string().min(1).max(160),
});

export async function POST(request: Request) {
  try {
    const signedInUser = await requireUser(request);
    const input = blockRequestSchema.parse(await request.json());

    if (input.blockedUserId === signedInUser.id) {
      return jsonError("You cannot block yourself.", 422);
    }

    const [blockedUser] = await getDb()
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, input.blockedUserId))
      .limit(1);

    if (!blockedUser) {
      return jsonError("User not found.", 404);
    }

    const [existing] = await getDb()
      .select({ id: userBlocks.id })
      .from(userBlocks)
      .where(
        and(
          eq(userBlocks.blockerUserId, signedInUser.id),
          eq(userBlocks.blockedUserId, input.blockedUserId),
        ),
      )
      .limit(1);

    if (existing) {
      await getDb().delete(userBlocks).where(eq(userBlocks.id, existing.id));
      return NextResponse.json({ blocked: false });
    }

    await getDb().insert(userBlocks).values({
      id: nanoid(),
      blockedUserId: input.blockedUserId,
      blockerUserId: signedInUser.id,
      createdAt: new Date(),
    });
    await getDb()
      .update(publicComments)
      .set({
        hiddenByUserId: signedInUser.id,
        status: "hidden",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(publicComments.userId, input.blockedUserId),
          eq(publicComments.targetType, "profile"),
          eq(publicComments.targetId, signedInUser.id),
        ),
      );

    return NextResponse.json({ blocked: true });
  } catch (error) {
    return normalizeRouteError(error);
  }
}
