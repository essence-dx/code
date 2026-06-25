import { headers } from "next/headers";
import { z } from "zod";
import { transitionProjectCadConversionJob } from "@/features/projects/server/cad-conversion-job-service";
import { auth } from "@/lib/auth";

const transitionCadConversionJobSchema = z.object({
  errorMessage: z.string().trim().min(1).max(500).optional(),
  resultPath: z.string().trim().min(1).max(500).optional(),
  retryable: z.boolean().optional(),
  transition: z.enum(["complete", "fail", "retry", "start"]),
});

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

export async function PATCH(request: Request, context: { params: Promise<{ jobId: string; projectId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = transitionCadConversionJobSchema.safeParse(await request.json());

  if (!payload.success) {
    return Response.json({ error: "Invalid CAD conversion transition payload" }, { status: 400 });
  }

  const { jobId, projectId } = await context.params;
  const result = await transitionProjectCadConversionJob({
    ...payload.data,
    currentUserId: userId,
    jobId,
    projectId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ job: result.job });
}
