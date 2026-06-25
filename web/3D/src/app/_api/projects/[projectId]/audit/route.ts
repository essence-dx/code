import { headers } from "next/headers";
import { requireProjectRole } from "@/features/projects/server/project-access-service";
import { loadProjectAuditSnapshot } from "@/features/projects/server/project-audit-service";
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
  const access = await requireProjectRole(projectId, userId, "viewer");

  if ("error" in access) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  const snapshot = await loadProjectAuditSnapshot(access.project);

  return Response.json({
    auditLog: snapshot.auditLog,
  });
}
