import { headers } from "next/headers";
import { isBoardApprovalPostApprovalTrackerReport } from "@/features/projects/board-approval-post-approval-tracker";
import { promoteWorkspaceBoardPostApprovalActions } from "@/features/projects/server/board-approval-post-approval-promotion-service";
import { auth } from "@/lib/auth";

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

export async function POST(request: Request, context: { params: Promise<{ workspaceId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as { tracker?: unknown } | null;

  if (!isBoardApprovalPostApprovalTrackerReport(payload?.tracker)) {
    return Response.json({ error: "Invalid board post-approval tracker payload" }, { status: 400 });
  }

  const { workspaceId } = await context.params;
  const result = await promoteWorkspaceBoardPostApprovalActions({
    currentUserId: userId,
    tracker: payload.tracker,
    workspaceId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(result, { status: 201 });
}
