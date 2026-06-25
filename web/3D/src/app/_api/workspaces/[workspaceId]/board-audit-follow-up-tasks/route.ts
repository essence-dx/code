import { headers } from "next/headers";
import { isPersistedBoardAuditFollowUpTasksReport } from "@/features/projects/board-audit-follow-up-tasks";
import {
  listWorkspaceBoardAuditTaskRecords,
  listWorkspaceBoardAuditTaskStates,
  recordWorkspaceBoardAuditTaskSnapshot,
} from "@/features/projects/server/board-audit-follow-up-task-service";
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
  const [records, states] = await Promise.all([
    listWorkspaceBoardAuditTaskRecords({
      currentUserId: userId,
      workspaceId,
    }),
    listWorkspaceBoardAuditTaskStates({
      currentUserId: userId,
      workspaceId,
    }),
  ]);

  if ("error" in records) {
    return Response.json({ error: records.error }, { status: records.status });
  }

  if ("error" in states) {
    return Response.json({ error: states.error }, { status: states.status });
  }

  return Response.json({ records: records.records, states: states.states });
}

export async function POST(request: Request, context: { params: Promise<{ workspaceId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as { persisted?: unknown } | null;

  if (!isPersistedBoardAuditFollowUpTasksReport(payload?.persisted)) {
    return Response.json({ error: "Invalid board audit task persistence payload" }, { status: 400 });
  }

  const { workspaceId } = await context.params;
  const result = await recordWorkspaceBoardAuditTaskSnapshot({
    currentUserId: userId,
    persisted: payload.persisted,
    workspaceId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(result, { status: 201 });
}
