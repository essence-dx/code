import { headers } from "next/headers";
import { acceptWorkspaceInvite } from "@/features/workspaces/server/workspace-service";
import { auth } from "@/lib/auth";

async function getSessionUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user ?? null;
}

export async function POST(_request: Request, context: { params: Promise<{ token: string }> }) {
  const user = await getSessionUser();

  if (!user?.id || !user.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { token } = await context.params;
    const workspaceId = await acceptWorkspaceInvite({
      token,
      currentUserId: user.id,
      currentUserEmail: user.email,
    });

    return Response.json({ workspaceId });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Accept failed" }, { status: 400 });
  }
}
