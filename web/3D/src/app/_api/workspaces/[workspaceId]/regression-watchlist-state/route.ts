import { headers } from "next/headers";
import { z } from "zod";
import { updateWorkspaceRegressionWatchlistItemState } from "@/features/projects/server/regression-watchlist-service";
import { auth } from "@/lib/auth";

const watchlistStateSchema = z.object({
  itemId: z.string().trim().min(1).max(240),
  note: z.string().trim().max(500).nullable().optional(),
  projectId: z.string().trim().min(1),
  snoozedUntil: z.string().datetime().nullable().optional(),
  status: z.enum(["open", "resolved", "snoozed", "watching"]),
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

  const payload = watchlistStateSchema.safeParse(await request.json());

  if (!payload.success) {
    return Response.json({ error: "Invalid regression watchlist state payload" }, { status: 400 });
  }

  const { workspaceId } = await context.params;
  const result = await updateWorkspaceRegressionWatchlistItemState({
    currentUserId: userId,
    itemId: payload.data.itemId,
    note: payload.data.note ?? null,
    projectId: payload.data.projectId,
    snoozedUntil: payload.data.snoozedUntil ? new Date(payload.data.snoozedUntil) : null,
    status: payload.data.status,
    title: payload.data.title,
    workspaceId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ state: result.state });
}
