import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createServerExportJob,
  listServerExportJobs,
} from "@/db/server-export-jobs";
import { getProject } from "@/db/projects";
import { auth } from "@/lib/auth";
import {
  createWorkspaceReleaseOperationEnforcementDecision,
  recordBlockedReleaseOperation,
} from "@/lib/release-operation-enforcement-server";

const exportFormatSchema = z.enum([
  "png",
  "transparent-png",
  "jpg",
  "webp",
  "svg",
  "pdf",
  "multipage-pdf",
  "print-pdf",
  "docx",
  "xlsx",
  "gif",
  "mp4",
  "media-sequence",
  "html",
]);

const createExportJobSchema = z.object({
  jobId: z
    .string()
    .min(8)
    .max(90)
    .regex(/^export-[a-z0-9-]+$/),
  projectId: z.string().min(1).max(120),
  projectName: z.string().min(1).max(180),
  format: exportFormatSchema,
  formatLabel: z.string().min(1).max(80),
  fileName: z.string().min(1).max(220),
  status: z.enum(["queued", "running"]).optional(),
  progress: z.number().min(0).max(100).optional(),
});

async function getSession(request: Request) {
  return auth.api.getSession({
    headers: request.headers,
  });
}

export async function GET(request: Request) {
  const session = await getSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobs = await listServerExportJobs(session.user.id);

  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const session = await getSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createExportJobSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid export job" }, { status: 400 });
  }

  const project = await getProject({
    userId: session.user.id,
    projectId: parsed.data.projectId,
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const enforcement = await createWorkspaceReleaseOperationEnforcementDecision({
    userId: session.user.id,
    operation: {
      id: parsed.data.jobId,
      kind: "create-export-job",
      targetType: "project",
      targetId: project.id,
      label: `Queue ${parsed.data.formatLabel} export`,
      relatedIds: [parsed.data.jobId],
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
        error: "Export release enforcement blocked this job.",
        decision: enforcement,
      },
      { status: 409 },
    );
  }

  const job = await createServerExportJob({
    id: parsed.data.jobId,
    userId: session.user.id,
    projectId: parsed.data.projectId,
    projectName: parsed.data.projectName,
    format: parsed.data.format,
    formatLabel: parsed.data.formatLabel,
    fileName: parsed.data.fileName,
    status: parsed.data.status,
    progress: parsed.data.progress,
  });

  return NextResponse.json({ job }, { status: 201 });
}
