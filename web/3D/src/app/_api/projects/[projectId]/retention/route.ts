import { headers } from "next/headers";
import { z } from "zod";
import { getProjectDataRetentionReport, saveProjectDataRetentionPolicy } from "@/features/projects/server/project-data-retention-service";
import { auth } from "@/lib/auth";

const updateRetentionPolicySchema = z.object({
  auditLogDays: z.number().int().min(7).max(3650),
  commentDays: z.number().int().min(7).max(3650),
  deletedAssetTombstoneDays: z.number().int().min(7).max(3650),
  versionDays: z.number().int().min(7).max(3650),
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
  const result = await getProjectDataRetentionReport({
    currentUserId: userId,
    projectId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ report: result.report });
}

export async function PUT(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = updateRetentionPolicySchema.safeParse(await request.json());

  if (!payload.success) {
    return Response.json({ error: "Invalid retention policy payload" }, { status: 400 });
  }

  const { projectId } = await context.params;
  const result = await saveProjectDataRetentionPolicy({
    currentUserId: userId,
    policy: payload.data,
    projectId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ report: result.report });
}
