import { headers } from "next/headers";
import { recordProjectAuditEvent } from "@/features/projects/server/project-audit-event-service";
import { revokeProjectAccessGrant } from "@/features/projects/server/project-access-service";
import { auth } from "@/lib/auth";

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

export async function DELETE(_request: Request, context: { params: Promise<{ projectId: string; grantId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { grantId, projectId } = await context.params;
  const result = await revokeProjectAccessGrant({
    grantId,
    projectId,
    currentUserId: userId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  await recordProjectAuditEvent({
    action: "access.revoked",
    actorUserId: userId,
    category: "permissions",
    projectId,
    resourceId: result.grantId,
    resourceType: "accessGrant",
    summary: `Project ${result.grant.role} access was revoked.`,
    tombstone: {
      createdAt: result.grant.createdAt.toISOString(),
      createdByUserId: result.grant.createdByUserId,
      role: result.grant.role,
      targetUserId: result.grant.userId,
      updatedAt: result.grant.updatedAt.toISOString(),
    },
  });

  return Response.json({ deletedGrantId: result.grantId });
}
