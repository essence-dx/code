import { headers } from "next/headers";
import { isRoleAccessReviewCampaignReport } from "@/features/projects/role-access-review-campaigns";
import { queueWorkspaceRoleAccessReviewReminders } from "@/features/projects/server/role-access-review-history-service";
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

  const payload = (await request.json().catch(() => null)) as { campaign?: unknown } | null;

  if (!isRoleAccessReviewCampaignReport(payload?.campaign)) {
    return Response.json({ error: "Invalid role-access review campaign payload" }, { status: 400 });
  }

  const { workspaceId } = await context.params;
  const result = await queueWorkspaceRoleAccessReviewReminders({
    campaign: payload.campaign,
    currentUserId: userId,
    workspaceId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(result, { status: 201 });
}
