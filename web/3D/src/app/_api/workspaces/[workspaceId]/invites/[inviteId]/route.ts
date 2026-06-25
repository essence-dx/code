import { headers } from "next/headers";
import { revokeWorkspaceInvite } from "@/features/workspaces/server/workspace-service";
import { auth } from "@/lib/auth";

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

export async function DELETE(_request: Request, context: { params: Promise<{ workspaceId: string; inviteId: string }> }) {
  const currentUserId = await getSessionUserId();

  if (!currentUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { workspaceId, inviteId } = await context.params;
    const invite = await revokeWorkspaceInvite({ workspaceId, inviteId, currentUserId });

    if (!invite) {
      return Response.json({ error: "Invite not found" }, { status: 404 });
    }

    return Response.json({ revokedInviteId: invite.id });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Revoke failed" }, { status: 400 });
  }
}
