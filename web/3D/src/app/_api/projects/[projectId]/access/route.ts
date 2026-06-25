import { headers } from "next/headers";
import { z } from "zod";
import { listProjectAccessGrants, upsertProjectAccessGrant } from "@/features/projects/server/project-access-service";
import { projectAccessRoleSchema } from "@/features/projects/access-types";
import { recordProjectAuditEvent } from "@/features/projects/server/project-audit-event-service";
import { auth } from "@/lib/auth";

const upsertGrantSchema = z.object({
  userId: z.string().min(1),
  role: projectAccessRoleSchema,
});

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
  const result = await listProjectAccessGrants(projectId, userId);

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({
    grants: result.grants.map((grant) => ({
      ...grant,
      createdAt: grant.createdAt.toISOString(),
      updatedAt: grant.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = upsertGrantSchema.safeParse(await request.json());

  if (!payload.success) {
    return Response.json({ error: "Invalid access payload" }, { status: 400 });
  }

  const { projectId } = await context.params;
  const result = await upsertProjectAccessGrant({
    projectId,
    currentUserId: userId,
    targetUserId: payload.data.userId,
    role: payload.data.role,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  await recordProjectAuditEvent({
    action: result.action === "created" ? "access.granted" : "access.changed",
    actorUserId: userId,
    category: "permissions",
    metadata: {
      role: result.grant.role,
      targetUserId: result.grant.userId,
    },
    projectId,
    resourceId: result.grant.id,
    resourceType: "accessGrant",
    summary: `Project access was ${result.action === "created" ? "granted" : "changed"} to ${result.grant.role}.`,
  });

  return Response.json({ grant: result.grant }, { status: 201 });
}
