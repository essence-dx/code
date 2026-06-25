import { headers } from "next/headers";
import { isExecutiveReleaseIntelligenceReport } from "@/features/projects/executive-release-snapshots";
import { listWorkspaceExecutiveReleaseSnapshotHistory, recordWorkspaceExecutiveReleaseSnapshot } from "@/features/projects/server/executive-release-snapshot-service";
import { auth } from "@/lib/auth";

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

export async function GET(_request: Request, context: { params: Promise<{ workspaceId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await context.params;
  const history = await listWorkspaceExecutiveReleaseSnapshotHistory({
    currentUserId: userId,
    workspaceId,
  });

  if ("error" in history) {
    return Response.json({ error: history.error }, { status: history.status });
  }

  return Response.json({ history });
}

export async function POST(request: Request, context: { params: Promise<{ workspaceId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as { report?: unknown } | null;

  if (!isExecutiveReleaseIntelligenceReport(payload?.report)) {
    return Response.json({ error: "Invalid executive release intelligence report payload" }, { status: 400 });
  }

  const { workspaceId } = await context.params;
  const result = await recordWorkspaceExecutiveReleaseSnapshot({
    currentUserId: userId,
    report: payload.report,
    workspaceId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(result, { status: 201 });
}
