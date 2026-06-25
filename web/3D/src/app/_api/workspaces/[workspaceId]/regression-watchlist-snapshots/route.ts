import { headers } from "next/headers";
import { isProjectRegressionWatchlistReport, type ProjectRegressionWatchlistItemTriageState } from "@/features/projects/regression-watchlist";
import {
  listWorkspaceRegressionWatchlistSnapshots,
  recordWorkspaceRegressionWatchlistSnapshot,
} from "@/features/projects/server/regression-watchlist-service";
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
  const history = await listWorkspaceRegressionWatchlistSnapshots({
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

  const payload = (await request.json().catch(() => null)) as { report?: unknown; states?: unknown } | null;

  if (!isProjectRegressionWatchlistReport(payload?.report)) {
    return Response.json({ error: "Invalid regression watchlist payload" }, { status: 400 });
  }

  const states = Array.isArray(payload.states) ? (payload.states as ProjectRegressionWatchlistItemTriageState[]) : [];
  const { workspaceId } = await context.params;
  const result = await recordWorkspaceRegressionWatchlistSnapshot({
    currentUserId: userId,
    report: payload.report,
    states,
    workspaceId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(result, { status: 201 });
}
