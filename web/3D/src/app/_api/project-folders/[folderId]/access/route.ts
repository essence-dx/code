import { headers } from "next/headers";
import { z } from "zod";
import { projectAccessRoleSchema } from "@/features/projects/access-types";
import { listFolderAccessGrants, upsertFolderAccessGrant } from "@/features/projects/server/project-access-service";
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

export async function GET(_request: Request, context: { params: Promise<{ folderId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { folderId } = await context.params;
  const result = await listFolderAccessGrants(folderId, userId);

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

export async function POST(request: Request, context: { params: Promise<{ folderId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = upsertGrantSchema.safeParse(await request.json());

  if (!payload.success) {
    return Response.json({ error: "Invalid access payload" }, { status: 400 });
  }

  const { folderId } = await context.params;
  const result = await upsertFolderAccessGrant({
    folderId,
    currentUserId: userId,
    targetUserId: payload.data.userId,
    role: payload.data.role,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ grant: result.grant }, { status: 201 });
}
