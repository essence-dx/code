import { headers } from "next/headers";
import { heartbeatProjectPresence, listProjectPresence } from "@/features/projects/server/project-presence-service";
import { projectPresenceHeartbeatSchema } from "@/features/projects/presence-types";
import { auth } from "@/lib/auth";

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

export async function GET(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const result = await listProjectPresence(projectId, userId);

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(result);
}

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = projectPresenceHeartbeatSchema.safeParse(await request.json());

  if (!payload.success) {
    return Response.json({ error: "Invalid presence payload" }, { status: 400 });
  }

  const { projectId } = await context.params;
  const result = await heartbeatProjectPresence({
    projectId,
    userId,
    cursor: payload.data.cursor ?? null,
    selectedObjectId: payload.data.selectedObjectId ?? null,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ ok: true });
}
