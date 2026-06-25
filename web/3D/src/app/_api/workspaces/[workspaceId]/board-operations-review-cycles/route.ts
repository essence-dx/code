import { headers } from "next/headers";
import {
  isBoardOperationsControlCenterReport,
  isBoardOperationsReviewCycle,
} from "@/features/projects/board-operations-review-cycle-history";
import {
  listWorkspaceBoardOperationsReviewCycleHistory,
  recordWorkspaceBoardOperationsReviewCycleHistory,
} from "@/features/projects/server/board-operations-review-cycle-history-service";
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
  const history = await listWorkspaceBoardOperationsReviewCycleHistory({
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

  const payload = (await request.json().catch(() => null)) as { controlCenter?: unknown; reviewCycle?: unknown } | null;

  if (!isBoardOperationsControlCenterReport(payload?.controlCenter) || !isBoardOperationsReviewCycle(payload?.reviewCycle)) {
    return Response.json({ error: "Invalid board operations review cycle payload" }, { status: 400 });
  }

  const { workspaceId } = await context.params;
  const result = await recordWorkspaceBoardOperationsReviewCycleHistory({
    controlCenter: payload.controlCenter,
    currentUserId: userId,
    reviewCycle: payload.reviewCycle,
    workspaceId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(result, { status: 201 });
}
