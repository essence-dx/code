import { headers } from "next/headers";
import { z } from "zod";
import { cadConversionWorkerAdapterIds, createProjectCadConversionQueueReport } from "@/features/projects/cad-conversion-worker";
import { enqueueProjectCadConversionJob, listProjectCadConversionJobs } from "@/features/projects/server/cad-conversion-job-service";
import { getProjectArtifactRegistryReport } from "@/features/projects/server/project-artifact-registry-service";
import { auth } from "@/lib/auth";

const enqueueCadConversionJobSchema = z.object({
  adapterId: z.enum(cadConversionWorkerAdapterIds).optional(),
  maxAttempts: z.number().int().min(1).max(8).optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).nullable().optional(),
  sourceBytes: z.number().int().min(1).max(1024 * 1024 * 1024),
  sourceFileName: z.string().trim().min(1).max(240),
  target: z.enum(["glb", "obj", "stl"]).optional(),
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
  const access = await getProjectArtifactRegistryReport({
    currentUserId: userId,
    projectId,
  });

  if ("error" in access) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  const jobs = await listProjectCadConversionJobs([projectId]);

  return Response.json({ report: createProjectCadConversionQueueReport(jobs) });
}

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = enqueueCadConversionJobSchema.safeParse(await request.json());

  if (!payload.success) {
    return Response.json({ error: "Invalid CAD conversion job payload" }, { status: 400 });
  }

  const { projectId } = await context.params;
  const result = await enqueueProjectCadConversionJob({
    ...payload.data,
    currentUserId: userId,
    metadata: payload.data.metadata ?? null,
    projectId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ job: result.job });
}
