import { headers } from "next/headers";
import { z } from "zod";
import { isBoardAuditTaskCloseoutStatus } from "@/features/projects/board-audit-follow-up-tasks";
import { upsertWorkspaceBoardAuditTaskState } from "@/features/projects/server/board-audit-follow-up-task-service";
import { auth } from "@/lib/auth";

const boardAuditTaskStateSchema = z.object({
  closedAt: z.string().datetime().nullable().optional(),
  closeoutNote: z.string().trim().max(700).nullable().optional(),
  dueAt: z.string().datetime(),
  ownerEmail: z.string().trim().email().nullable().optional(),
  ownerName: z.string().trim().min(1).max(160),
  ownerUserId: z.string().trim().min(1).nullable().optional(),
  status: z.string().refine(isBoardAuditTaskCloseoutStatus),
  taskId: z.string().trim().min(1).max(240),
  title: z.string().trim().min(1).max(240),
});

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

  const payload = boardAuditTaskStateSchema.safeParse(await request.json().catch(() => null));

  if (!payload.success) {
    return Response.json({ error: "Invalid board audit task state payload" }, { status: 400 });
  }

  const { workspaceId } = await context.params;
  const result = await upsertWorkspaceBoardAuditTaskState({
    closedAt: payload.data.closedAt ? new Date(payload.data.closedAt) : null,
    closeoutNote: payload.data.closeoutNote ?? null,
    currentUserId: userId,
    dueAt: new Date(payload.data.dueAt),
    ownerEmail: payload.data.ownerEmail ?? null,
    ownerName: payload.data.ownerName,
    ownerUserId: payload.data.ownerUserId ?? null,
    status: payload.data.status,
    taskId: payload.data.taskId,
    title: payload.data.title,
    workspaceId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ state: result.state });
}
