import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { user } from "@/db/schema";
import { adminErrorResponse, requireAdminUser } from "@/lib/admin";
import { jsonError, normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const updateAdminUserSchema = z.object({
  emailVerified: z.boolean(),
});

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdminUser(request);
    const { id } = await context.params;
    const input = updateAdminUserSchema.parse(await request.json());

    await getDb()
      .update(user)
      .set({
        emailVerified: input.emailVerified,
        updatedAt: new Date(),
      })
      .where(eq(user.id, id));

    const [updated] = await getDb()
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    if (!updated) {
      return jsonError("User not found.", 404);
    }

    return NextResponse.json({
      user: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        sessions: 0,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    return adminErrorResponse(error) ?? normalizeRouteError(error);
  }
}
