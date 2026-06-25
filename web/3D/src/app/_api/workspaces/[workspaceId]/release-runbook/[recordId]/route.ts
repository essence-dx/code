import { headers } from "next/headers";
import { z } from "zod";
import { transitionWorkspaceReleaseRunbookRecord } from "@/features/workspaces/server/workspace-release-runbook-service";
import { auth } from "@/lib/auth";

const runbookTransitionSchema = z.object({
  attachment: z
    .object({
      label: z.string().trim().min(1).max(120),
      url: z.string().trim().url().max(600),
    })
    .nullable()
    .optional(),
  comment: z.string().trim().min(1).max(1000).nullable().optional(),
  nextOwnerUserId: z.string().trim().min(1).nullable().optional(),
  nextStatus: z.enum(["blocked", "complete", "in-progress", "scheduled"]).optional(),
  note: z.string().trim().max(500).nullable().optional(),
});

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      recordId: string;
      workspaceId: string;
    }>;
  },
) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = runbookTransitionSchema.safeParse(await request.json());

  if (!payload.success) {
    return Response.json({ error: "Invalid release runbook transition payload" }, { status: 400 });
  }

  const { recordId, workspaceId } = await params;
  const result = await transitionWorkspaceReleaseRunbookRecord({
    attachment: payload.data.attachment ?? null,
    comment: payload.data.comment ?? null,
    currentUserId: userId,
    nextOwnerUserId: payload.data.nextOwnerUserId,
    nextStatus: payload.data.nextStatus,
    note: payload.data.note ?? null,
    recordId,
    workspaceId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ record: result.record });
}
