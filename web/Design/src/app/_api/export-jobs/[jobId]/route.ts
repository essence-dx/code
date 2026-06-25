import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getServerExportJob,
  updateServerExportJob,
} from "@/db/server-export-jobs";
import {
  maxStoredExportArtifactDataUrlLength,
  maxStoredExportArtifactBytes,
} from "@/features/editor/server-export-job-model";
import { auth } from "@/lib/auth";
import {
  createWorkspaceReleaseOperationEnforcementDecision,
  recordBlockedReleaseOperation,
} from "@/lib/release-operation-enforcement-server";

type ExportJobRouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

const artifactSchema = z.object({
  artifactName: z.string().min(1).max(220),
  artifactMimeType: z.string().min(1).max(120),
  artifactSizeBytes: z.number().int().min(0).max(200_000_000),
  artifactDataUrl: z
    .string()
    .max(maxStoredExportArtifactDataUrlLength)
    .nullable(),
});

const updateExportJobSchema = z.object({
  status: z.enum(["queued", "running", "completed", "failed"]).optional(),
  progress: z.number().min(0).max(100).optional(),
  artifact: artifactSchema.optional(),
  failureMessage: z.string().max(600).nullable().optional(),
});

async function getSession(request: Request) {
  return auth.api.getSession({
    headers: request.headers,
  });
}

export async function PATCH(request: Request, context: ExportJobRouteContext) {
  const session = await getSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await context.params;
  const parsed = updateExportJobSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid export job" }, { status: 400 });
  }

  const artifact = parsed.data.artifact;
  const mutatesExportArtifact =
    Boolean(artifact) || parsed.data.status === "completed";

  if (mutatesExportArtifact) {
    const existingJob = await getServerExportJob({
      userId: session.user.id,
      jobId,
    });

    if (!existingJob) {
      return NextResponse.json(
        { error: "Export job not found" },
        { status: 404 },
      );
    }

    const enforcement =
      await createWorkspaceReleaseOperationEnforcementDecision({
        userId: session.user.id,
        operation: {
          id: `complete-${jobId}`,
          kind: "complete-export-artifact",
          targetType: "project",
          targetId: existingJob.projectId,
          label: `Complete ${existingJob.formatLabel} export`,
          relatedIds: [jobId],
          requestedByEmail: session.user.email,
        },
      });

    if (!enforcement.canMutate) {
      await recordBlockedReleaseOperation({
        userId: session.user.id,
        decision: enforcement,
      });

      return NextResponse.json(
        {
          error: "Export artifact release enforcement blocked this update.",
          decision: enforcement,
        },
        { status: 409 },
      );
    }
  }

  const job = await updateServerExportJob({
    userId: session.user.id,
    jobId,
    status: parsed.data.status,
    progress: parsed.data.progress,
    failureMessage: parsed.data.failureMessage,
    artifactName: artifact?.artifactName,
    artifactMimeType: artifact?.artifactMimeType,
    artifactSizeBytes: artifact?.artifactSizeBytes,
    artifactDataUrl: artifact
      ? artifact.artifactSizeBytes <= maxStoredExportArtifactBytes
        ? artifact.artifactDataUrl
        : null
      : undefined,
  });

  if (!job) {
    return NextResponse.json(
      { error: "Export job not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ job });
}
