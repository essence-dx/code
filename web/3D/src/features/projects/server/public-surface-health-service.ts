import { and, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import { project, projectPublicSurfaceHealthSnapshot } from "@/db/schema";
import {
  createProjectPublicSurfaceHealthReportFromSnapshots,
  type ProjectPublicSurfaceHealthReport,
  type ProjectPublicSurfaceHealthSnapshot,
} from "@/features/projects/public-surface-health";
import { getWorkspaceAccess } from "@/features/workspaces/server/workspace-service";

type ServiceResult<T> = T | { error: string; status: number };

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureProjectPublicSurfaceHealthSnapshotSchema() {
  schemaReady ??= (async () => {
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS project_public_surface_health_snapshot (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
        project_id text REFERENCES project(id) ON DELETE SET NULL,
        batch_id text NOT NULL,
        source_key text NOT NULL,
        source_version_id text NOT NULL,
        surface text NOT NULL,
        label text NOT NULL,
        status text NOT NULL,
        status_code integer,
        latency_ms integer,
        path text,
        url text,
        screenshot_artifact_id text,
        screenshot_hash text,
        screenshot_width integer,
        screenshot_height integer,
        screenshot_byte_size integer,
        screenshot_captured_at integer,
        screenshot_path text,
        screenshot_state text NOT NULL,
        screenshot_diff_score integer,
        screenshot_diff_summary text,
        issues text NOT NULL DEFAULT '[]',
        checked_at integer NOT NULL,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_public_surface_health_snapshot_workspace_idx ON project_public_surface_health_snapshot(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_public_surface_health_snapshot_project_idx ON project_public_surface_health_snapshot(project_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_public_surface_health_snapshot_status_idx ON project_public_surface_health_snapshot(workspace_id, status)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_public_surface_health_snapshot_checked_idx ON project_public_surface_health_snapshot(workspace_id, checked_at)");
    await runSchemaStatement(
      "CREATE UNIQUE INDEX IF NOT EXISTS project_public_surface_health_snapshot_batch_source_idx ON project_public_surface_health_snapshot(workspace_id, batch_id, source_key)",
    );
  })();

  await schemaReady;
}

export function getPublicSurfaceHealthBatchId(env: Record<string, string | undefined> = process.env) {
  return env.VERCEL_GIT_COMMIT_SHA ?? env.VERCEL_DEPLOYMENT_ID ?? env.VERCEL_URL ?? "local-dashboard";
}

function toDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function toIso(value: Date) {
  return value.toISOString();
}

function parseIssues(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) {
    return value.filter((entry) => typeof entry === "string");
  }

  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

interface PublicSurfaceHealthSnapshotRow {
  batchId: string;
  checkedAt: Date;
  id: string;
  issues: string[] | string;
  label: string;
  latencyMs: number | null;
  path: string | null;
  projectId: string | null;
  projectName: string | null;
  screenshotArtifactId: string | null;
  screenshotByteSize: number | null;
  screenshotCapturedAt: Date | null;
  screenshotDiffScore: number | null;
  screenshotDiffSummary: string | null;
  screenshotHash: string | null;
  screenshotHeight: number | null;
  screenshotPath: string | null;
  screenshotState: ProjectPublicSurfaceHealthSnapshot["screenshotState"];
  screenshotWidth: number | null;
  sourceKey: string;
  sourceVersionId: string;
  status: ProjectPublicSurfaceHealthSnapshot["status"];
  statusCode: number | null;
  surface: ProjectPublicSurfaceHealthSnapshot["surface"];
  url: string | null;
  workspaceId: string;
}

function snapshotFromRow(row: PublicSurfaceHealthSnapshotRow): ProjectPublicSurfaceHealthSnapshot {
  return {
    batchId: row.batchId,
    checkedAt: toIso(row.checkedAt),
    id: row.id,
    issues: parseIssues(row.issues),
    label: row.label,
    latencyMs: row.latencyMs,
    path: row.path,
    projectId: row.projectId ?? "deleted-project",
    projectName: row.projectName ?? "Deleted project",
    screenshotArtifactId: row.screenshotArtifactId,
    screenshotByteSize: row.screenshotByteSize,
    screenshotCapturedAt: row.screenshotCapturedAt ? toIso(row.screenshotCapturedAt) : null,
    screenshotDiffScore: row.screenshotDiffScore,
    screenshotDiffSummary: row.screenshotDiffSummary,
    screenshotHash: row.screenshotHash,
    screenshotHeight: row.screenshotHeight,
    screenshotPath: row.screenshotPath,
    screenshotState: row.screenshotState,
    screenshotWidth: row.screenshotWidth,
    sourceKey: row.sourceKey,
    sourceVersionId: row.sourceVersionId,
    status: row.status,
    statusCode: row.statusCode,
    surface: row.surface,
    url: row.url,
    workspaceId: row.workspaceId,
  };
}

export async function listProjectPublicSurfaceHealthSnapshots(input: {
  currentUserId: string;
  limit?: number;
  workspaceId: string;
}): Promise<ServiceResult<{ snapshots: ProjectPublicSurfaceHealthSnapshot[] }>> {
  const access = await getWorkspaceAccess(input.workspaceId, input.currentUserId);

  if (!access) {
    return { error: "Workspace access is required.", status: 403 };
  }

  await ensureProjectPublicSurfaceHealthSnapshotSchema();

  const rows = await getDb()
    .select({
      batchId: projectPublicSurfaceHealthSnapshot.batchId,
      checkedAt: projectPublicSurfaceHealthSnapshot.checkedAt,
      id: projectPublicSurfaceHealthSnapshot.id,
      issues: projectPublicSurfaceHealthSnapshot.issues,
      label: projectPublicSurfaceHealthSnapshot.label,
      latencyMs: projectPublicSurfaceHealthSnapshot.latencyMs,
      path: projectPublicSurfaceHealthSnapshot.path,
      projectId: projectPublicSurfaceHealthSnapshot.projectId,
      projectName: project.name,
      screenshotArtifactId: projectPublicSurfaceHealthSnapshot.screenshotArtifactId,
      screenshotByteSize: projectPublicSurfaceHealthSnapshot.screenshotByteSize,
      screenshotCapturedAt: projectPublicSurfaceHealthSnapshot.screenshotCapturedAt,
      screenshotDiffScore: projectPublicSurfaceHealthSnapshot.screenshotDiffScore,
      screenshotDiffSummary: projectPublicSurfaceHealthSnapshot.screenshotDiffSummary,
      screenshotHash: projectPublicSurfaceHealthSnapshot.screenshotHash,
      screenshotHeight: projectPublicSurfaceHealthSnapshot.screenshotHeight,
      screenshotPath: projectPublicSurfaceHealthSnapshot.screenshotPath,
      screenshotState: projectPublicSurfaceHealthSnapshot.screenshotState,
      screenshotWidth: projectPublicSurfaceHealthSnapshot.screenshotWidth,
      sourceKey: projectPublicSurfaceHealthSnapshot.sourceKey,
      sourceVersionId: projectPublicSurfaceHealthSnapshot.sourceVersionId,
      status: projectPublicSurfaceHealthSnapshot.status,
      statusCode: projectPublicSurfaceHealthSnapshot.statusCode,
      surface: projectPublicSurfaceHealthSnapshot.surface,
      url: projectPublicSurfaceHealthSnapshot.url,
      workspaceId: projectPublicSurfaceHealthSnapshot.workspaceId,
    })
    .from(projectPublicSurfaceHealthSnapshot)
    .leftJoin(project, eq(project.id, projectPublicSurfaceHealthSnapshot.projectId))
    .where(eq(projectPublicSurfaceHealthSnapshot.workspaceId, input.workspaceId))
    .orderBy(desc(projectPublicSurfaceHealthSnapshot.checkedAt))
    .limit(input.limit ?? 360);

  return {
    snapshots: rows.map(snapshotFromRow),
  };
}

export async function recordProjectPublicSurfaceHealthReport(input: {
  batchId?: string;
  currentUserId: string;
  report: ProjectPublicSurfaceHealthReport;
  workspaceId: string;
}): Promise<ServiceResult<{ report: ProjectPublicSurfaceHealthReport }>> {
  const access = await getWorkspaceAccess(input.workspaceId, input.currentUserId);

  if (!access) {
    return { error: "Workspace access is required.", status: 403 };
  }

  await ensureProjectPublicSurfaceHealthSnapshotSchema();

  const now = new Date();
  const batchId = input.batchId ?? input.report.snapshots[0]?.batchId ?? getPublicSurfaceHealthBatchId();

  await getDb()
    .delete(projectPublicSurfaceHealthSnapshot)
    .where(and(eq(projectPublicSurfaceHealthSnapshot.workspaceId, input.workspaceId), eq(projectPublicSurfaceHealthSnapshot.batchId, batchId)));

  if (input.report.snapshots.length > 0) {
    await getDb()
      .insert(projectPublicSurfaceHealthSnapshot)
      .values(
        input.report.snapshots.map((snapshot) => ({
          batchId,
          checkedAt: toDate(snapshot.checkedAt),
          createdAt: now,
          id: nanoid(),
          issues: snapshot.issues,
          label: snapshot.label,
          latencyMs: snapshot.latencyMs,
          path: snapshot.path,
          projectId: snapshot.projectId,
          screenshotArtifactId: snapshot.screenshotArtifactId,
          screenshotByteSize: snapshot.screenshotByteSize,
          screenshotCapturedAt: snapshot.screenshotCapturedAt ? toDate(snapshot.screenshotCapturedAt) : null,
          screenshotDiffScore: snapshot.screenshotDiffScore,
          screenshotDiffSummary: snapshot.screenshotDiffSummary,
          screenshotHash: snapshot.screenshotHash,
          screenshotHeight: snapshot.screenshotHeight,
          screenshotPath: snapshot.screenshotPath,
          screenshotState: snapshot.screenshotState,
          screenshotWidth: snapshot.screenshotWidth,
          sourceKey: snapshot.sourceKey,
          sourceVersionId: snapshot.sourceVersionId,
          status: snapshot.status,
          statusCode: snapshot.statusCode,
          surface: snapshot.surface,
          updatedAt: now,
          url: snapshot.url,
          workspaceId: input.workspaceId,
        })),
      );
  }

  const history = await listProjectPublicSurfaceHealthSnapshots({
    currentUserId: input.currentUserId,
    workspaceId: input.workspaceId,
  });

  if ("error" in history) {
    return history;
  }

  return {
    report: createProjectPublicSurfaceHealthReportFromSnapshots(
      input.report.snapshots.map((snapshot) => ({ ...snapshot, batchId, workspaceId: input.workspaceId })),
      history.snapshots,
      input.report.generatedAt,
    ),
  };
}
