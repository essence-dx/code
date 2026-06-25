import { headers } from "next/headers";
import { isBoardAssuranceNotificationRoutingReport } from "@/features/projects/board-assurance-notification-history";
import {
  listWorkspaceBoardAssuranceNotificationHistory,
  recordWorkspaceBoardAssuranceNotificationHistory,
} from "@/features/projects/server/board-assurance-notification-history-service";
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
  const history = await listWorkspaceBoardAssuranceNotificationHistory({
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

  const payload = (await request.json().catch(() => null)) as { acknowledgedRouteDedupeKeys?: unknown; report?: unknown } | null;

  if (!isBoardAssuranceNotificationRoutingReport(payload?.report)) {
    return Response.json({ error: "Invalid board assurance notification routing payload" }, { status: 400 });
  }

  const acknowledgedRouteDedupeKeys = Array.isArray(payload?.acknowledgedRouteDedupeKeys)
    ? payload.acknowledgedRouteDedupeKeys.filter((value): value is string => typeof value === "string")
    : [];
  const { workspaceId } = await context.params;
  const result = await recordWorkspaceBoardAssuranceNotificationHistory({
    acknowledgedRouteDedupeKeys,
    currentUserId: userId,
    report: payload.report,
    workspaceId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(result, { status: 201 });
}
