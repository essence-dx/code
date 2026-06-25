import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import { project, projectCadConversionJob, type ProjectCadConversionJobRecordRow } from "@/db/schema";
import {
  completeProjectCadConversionJob,
  createProjectCadConversionJob,
  createProjectCadConversionQueueReport,
  failProjectCadConversionJob,
  retryProjectCadConversionJob,
  startProjectCadConversionJob,
  type CadConversionWorkerAdapterId,
  type ProjectCadConversionJobMetadata,
  type ProjectCadConversionJobRecord,
  type ProjectCadConversionQueueReport,
} from "@/features/projects/cad-conversion-worker";
import type { CadConversionTarget } from "@/features/editor/utils/cad-conversion-validation";
import { recordProjectAuditEvent } from "@/features/projects/server/project-audit-event-service";
import { requireProjectRole } from "@/features/projects/server/project-access-service";

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureProjectCadConversionJobSchema() {
  schemaReady ??= (async () => {
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS project_cad_conversion_job (
        id text PRIMARY KEY NOT NULL,
        workspace_id text REFERENCES workspace(id) ON DELETE SET NULL,
        project_id text NOT NULL REFERENCES project(id) ON DELETE CASCADE,
        source_file_name text NOT NULL,
        source_bytes integer NOT NULL,
        source_kind text NOT NULL,
        target text NOT NULL,
        adapter_id text NOT NULL,
        command text NOT NULL,
        output_file_name text NOT NULL,
        status text NOT NULL,
        attempts integer DEFAULT 0 NOT NULL,
        max_attempts integer DEFAULT 3 NOT NULL,
        diagnostics text NOT NULL,
        logs text DEFAULT '[]' NOT NULL,
        metadata text,
        error_message text,
        result_path text,
        queued_at integer NOT NULL,
        started_at integer,
        finished_at integer,
        next_attempt_at integer,
        updated_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_cad_conversion_job_workspace_idx ON project_cad_conversion_job(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_cad_conversion_job_project_idx ON project_cad_conversion_job(project_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_cad_conversion_job_status_idx ON project_cad_conversion_job(status)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_cad_conversion_job_updated_idx ON project_cad_conversion_job(updated_at)");
  })();

  await schemaReady;
}

function toIso(value: Date | null) {
  return value ? value.toISOString() : null;
}

function toDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function compactMetadata(metadata: ProjectCadConversionJobMetadata | null | undefined) {
  if (!metadata) {
    return null;
  }

  return Object.fromEntries(Object.entries(metadata).filter((entry): entry is [string, boolean | number | string | null] => entry[1] !== undefined));
}

function jobFromRow(row: ProjectCadConversionJobRecordRow & { projectName?: string | null }): ProjectCadConversionJobRecord {
  return {
    adapterId: row.adapterId,
    attempts: row.attempts,
    command: row.command,
    diagnostics: row.diagnostics,
    errorMessage: row.errorMessage,
    finishedAt: toIso(row.finishedAt),
    id: row.id,
    logs: row.logs,
    maxAttempts: row.maxAttempts,
    metadata: row.metadata,
    nextAttemptAt: toIso(row.nextAttemptAt),
    outputFileName: row.outputFileName,
    projectId: row.projectId,
    projectName: row.projectName ?? "Untitled project",
    queuedAt: row.queuedAt.toISOString(),
    resultPath: row.resultPath,
    sourceBytes: row.sourceBytes,
    sourceFileName: row.sourceFileName,
    sourceKind: row.sourceKind,
    startedAt: toIso(row.startedAt),
    status: row.status,
    target: row.target,
    updatedAt: row.updatedAt.toISOString(),
    workspaceId: row.workspaceId,
  };
}

function valuesFromJob(job: ProjectCadConversionJobRecord) {
  return {
    adapterId: job.adapterId,
    attempts: job.attempts,
    command: job.command,
    diagnostics: job.diagnostics,
    errorMessage: job.errorMessage,
    finishedAt: toDate(job.finishedAt),
    logs: job.logs,
    maxAttempts: job.maxAttempts,
    metadata: compactMetadata(job.metadata),
    nextAttemptAt: toDate(job.nextAttemptAt),
    outputFileName: job.outputFileName,
    projectId: job.projectId,
    queuedAt: toDate(job.queuedAt) ?? new Date(),
    resultPath: job.resultPath,
    sourceBytes: job.sourceBytes,
    sourceFileName: job.sourceFileName,
    sourceKind: job.sourceKind,
    startedAt: toDate(job.startedAt),
    status: job.status,
    target: job.target,
    updatedAt: toDate(job.updatedAt) ?? new Date(),
    workspaceId: job.workspaceId,
  };
}

async function saveJob(job: ProjectCadConversionJobRecord) {
  const values = valuesFromJob(job);

  if (job.id) {
    const rows = await getDb()
      .update(projectCadConversionJob)
      .set(values)
      .where(eq(projectCadConversionJob.id, job.id))
      .returning();

    return rows[0] ? jobFromRow(rows[0]) : null;
  }

  const rows = await getDb()
    .insert(projectCadConversionJob)
    .values({
      ...values,
      id: nanoid(),
    })
    .returning();

  return jobFromRow(rows[0]);
}

export async function listProjectCadConversionJobs(projectIds: string[]) {
  await ensureProjectCadConversionJobSchema();

  if (projectIds.length === 0) {
    return [];
  }

  const rows = await getDb()
    .select({
      adapterId: projectCadConversionJob.adapterId,
      attempts: projectCadConversionJob.attempts,
      command: projectCadConversionJob.command,
      diagnostics: projectCadConversionJob.diagnostics,
      errorMessage: projectCadConversionJob.errorMessage,
      finishedAt: projectCadConversionJob.finishedAt,
      id: projectCadConversionJob.id,
      logs: projectCadConversionJob.logs,
      maxAttempts: projectCadConversionJob.maxAttempts,
      metadata: projectCadConversionJob.metadata,
      nextAttemptAt: projectCadConversionJob.nextAttemptAt,
      outputFileName: projectCadConversionJob.outputFileName,
      projectId: projectCadConversionJob.projectId,
      projectName: project.name,
      queuedAt: projectCadConversionJob.queuedAt,
      resultPath: projectCadConversionJob.resultPath,
      sourceBytes: projectCadConversionJob.sourceBytes,
      sourceFileName: projectCadConversionJob.sourceFileName,
      sourceKind: projectCadConversionJob.sourceKind,
      startedAt: projectCadConversionJob.startedAt,
      status: projectCadConversionJob.status,
      target: projectCadConversionJob.target,
      updatedAt: projectCadConversionJob.updatedAt,
      workspaceId: projectCadConversionJob.workspaceId,
    })
    .from(projectCadConversionJob)
    .innerJoin(project, eq(project.id, projectCadConversionJob.projectId))
    .where(inArray(projectCadConversionJob.projectId, projectIds))
    .orderBy(desc(projectCadConversionJob.updatedAt))
    .limit(160);

  return rows.map(jobFromRow);
}

export async function enqueueProjectCadConversionJob(input: {
  adapterId?: CadConversionWorkerAdapterId;
  currentUserId: string;
  maxAttempts?: number;
  metadata?: ProjectCadConversionJobMetadata | null;
  projectId: string;
  sourceBytes: number;
  sourceFileName: string;
  target?: CadConversionTarget;
}) {
  await ensureProjectCadConversionJobSchema();

  const access = await requireProjectRole(input.projectId, input.currentUserId, "editor");

  if ("error" in access) {
    return access;
  }

  const created = createProjectCadConversionJob({
    adapterId: input.adapterId,
    maxAttempts: input.maxAttempts,
    metadata: input.metadata,
    projectId: input.projectId,
    projectName: access.project.name,
    sourceBytes: input.sourceBytes,
    sourceFileName: input.sourceFileName,
    target: input.target,
    workspaceId: access.project.workspaceId,
  });

  if ("error" in created) {
    return { error: created.error, status: 400 as const };
  }

  const job = await saveJob(created.job);

  if (!job) {
    return { error: "CAD conversion job could not be queued", status: 500 as const };
  }

  await recordProjectAuditEvent({
    action: "cad_conversion.queued",
    actorUserId: input.currentUserId,
    category: "exports",
    metadata: {
      adapterId: job.adapterId,
      sourceFileName: job.sourceFileName,
      target: job.target,
    },
    projectId: input.projectId,
    resourceId: job.id,
    resourceType: "cadConversionJob",
    summary: `${access.project.name} queued ${job.sourceFileName} for ${job.adapterId.toUpperCase()} conversion.`,
  });

  return { job };
}

async function getJobForProject(projectId: string, jobId: string) {
  const rows = await getDb()
    .select()
    .from(projectCadConversionJob)
    .where(and(eq(projectCadConversionJob.projectId, projectId), eq(projectCadConversionJob.id, jobId)))
    .limit(1);

  return rows[0] ? jobFromRow(rows[0]) : null;
}

export async function transitionProjectCadConversionJob(input: {
  currentUserId: string;
  errorMessage?: string;
  jobId: string;
  projectId: string;
  resultPath?: string;
  retryable?: boolean;
  transition: "complete" | "fail" | "retry" | "start";
}) {
  await ensureProjectCadConversionJobSchema();

  const access = await requireProjectRole(input.projectId, input.currentUserId, "editor");

  if ("error" in access) {
    return access;
  }

  const currentJob = await getJobForProject(input.projectId, input.jobId);

  if (!currentJob) {
    return { error: "CAD conversion job not found", status: 404 as const };
  }

  const nextJob =
    input.transition === "start"
      ? startProjectCadConversionJob(currentJob)
      : input.transition === "complete"
        ? completeProjectCadConversionJob({
            job: currentJob,
            resultPath: input.resultPath ?? currentJob.resultPath ?? currentJob.outputFileName,
          })
        : input.transition === "retry"
          ? retryProjectCadConversionJob(currentJob)
          : failProjectCadConversionJob({
              job: currentJob,
              message: input.errorMessage ?? "CAD conversion worker failed.",
              retryable: input.retryable ?? true,
            });
  const savedJob = await saveJob(nextJob);

  if (!savedJob) {
    return { error: "CAD conversion job could not be updated", status: 500 as const };
  }

  await recordProjectAuditEvent({
    action: `cad_conversion.${input.transition}`,
    actorUserId: input.currentUserId,
    category: "exports",
    metadata: {
      adapterId: savedJob.adapterId,
      attempts: savedJob.attempts,
      status: savedJob.status,
      target: savedJob.target,
    },
    projectId: input.projectId,
    resourceId: savedJob.id,
    resourceType: "cadConversionJob",
    summary: `${access.project.name} CAD conversion job moved to ${savedJob.status}.`,
  });

  return { job: savedJob };
}

export async function getProjectCadConversionQueueReport(input: {
  currentUserId: string;
  projectId: string;
}): Promise<{ error: string; status: 403 | 404 } | { report: ProjectCadConversionQueueReport }> {
  const access = await requireProjectRole(input.projectId, input.currentUserId, "viewer");

  if ("error" in access) {
    return access;
  }

  const jobs = await listProjectCadConversionJobs([input.projectId]);

  return {
    report: createProjectCadConversionQueueReport(jobs),
  };
}
