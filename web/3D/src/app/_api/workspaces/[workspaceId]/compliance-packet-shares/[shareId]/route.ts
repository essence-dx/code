import { headers } from "next/headers";
import { revokeWorkspaceCompliancePacketShare } from "@/features/projects/server/compliance-packet-share-service";
import { auth } from "@/lib/auth";

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

export async function PATCH(request: Request, context: { params: Promise<{ shareId: string; workspaceId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as { reason?: unknown } | null;
  const { shareId, workspaceId } = await context.params;
  const result = await revokeWorkspaceCompliancePacketShare({
    currentUserId: userId,
    reason: typeof payload?.reason === "string" ? payload.reason : null,
    shareId,
    workspaceId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(result);
}
