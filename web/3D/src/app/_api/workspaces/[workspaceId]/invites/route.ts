import { headers } from "next/headers";
import { z } from "zod";
import { createWorkspaceInvite } from "@/features/workspaces/server/workspace-service";
import { workspaceInviteRoleSchema } from "@/features/workspaces/types";
import { auth } from "@/lib/auth";

const createInviteSchema = z.object({
  email: z.string().trim().email().max(320),
  role: workspaceInviteRoleSchema,
});

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

export async function POST(request: Request, context: { params: Promise<{ workspaceId: string }> }) {
  const currentUserId = await getSessionUserId();

  if (!currentUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = createInviteSchema.safeParse(await request.json());

  if (!payload.success) {
    return Response.json({ error: "Invalid invite payload" }, { status: 400 });
  }

  try {
    const { workspaceId } = await context.params;
    const invite = await createWorkspaceInvite({
      workspaceId,
      currentUserId,
      email: payload.data.email,
      role: payload.data.role,
    });

    return Response.json(
      {
        invite: {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          token: invite.token,
          expiresAt: invite.expiresAt.toISOString(),
          createdAt: invite.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invite failed" }, { status: 400 });
  }
}
