import { and, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import { workspaceSceneQaBaseline, type WorkspaceSceneQaBaselineRecord } from "@/db/schema";
import {
  createSceneQaBaselineRecordsFromReport,
  createSceneQaBaselineTrendReport,
  type SceneQaBaselineRecord,
  type SceneQaBaselineTrendReport,
} from "@/features/projects/scene-qa-baseline-trends";
import type { SceneQaSnapshotReport } from "@/features/projects/scene-qa-snapshots";
import { getWorkspaceAccess } from "@/features/workspaces/server/workspace-service";

type ServiceResult<T> = T | { error: string; status: number };

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureWorkspaceSceneQaBaselineSchema() {
  schemaReady ??= (async () => {
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS workspace_scene_qa_baseline (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
        project_id text REFERENCES project(id) ON DELETE SET NULL,
        template_id text,
        deployment_id text NOT NULL,
        comparison_id text NOT NULL,
        snapshot_comparison_id text NOT NULL,
        surface text NOT NULL,
        target_name text NOT NULL,
        status text NOT NULL,
        actual_signature text,
        expected_signature text,
        issue_count integer NOT NULL DEFAULT 0,
        issues text NOT NULL DEFAULT '[]',
        path text,
        captured_at integer NOT NULL,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_scene_qa_baseline_workspace_idx ON workspace_scene_qa_baseline(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_scene_qa_baseline_deployment_idx ON workspace_scene_qa_baseline(workspace_id, deployment_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_scene_qa_baseline_captured_idx ON workspace_scene_qa_baseline(workspace_id, captured_at)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_scene_qa_baseline_project_idx ON workspace_scene_qa_baseline(project_id)");
    await runSchemaStatement(
      "CREATE UNIQUE INDEX IF NOT EXISTS workspace_scene_qa_baseline_workspace_deployment_comparison_idx ON workspace_scene_qa_baseline(workspace_id, deployment_id, comparison_id)",
    );
  })();

  await schemaReady;
}

export function getSceneQaDeploymentId(env: Record<string, string | undefined> = process.env) {
  return env.VERCEL_GIT_COMMIT_SHA ?? env.VERCEL_DEPLOYMENT_ID ?? env.VERCEL_URL ?? "local-dashboard";
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : "";
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

function toBaselineRecord(row: WorkspaceSceneQaBaselineRecord): SceneQaBaselineRecord {
  return {
    actualSignature: row.actualSignature,
    capturedAt: toIso(row.capturedAt),
    comparisonId: row.comparisonId,
    deploymentId: row.deploymentId,
    expectedSignature: row.expectedSignature,
    issueCount: row.issueCount,
    issues: parseIssues(row.issues),
    path: row.path,
    projectId: row.projectId,
    snapshotComparisonId: row.snapshotComparisonId,
    status: row.status,
    surface: row.surface,
    targetName: row.targetName,
    templateId: row.templateId,
    workspaceId: row.workspaceId,
  };
}

export async function listWorkspaceSceneQaBaselineTrendReport(input: {
  currentUserId: string;
  limit?: number;
  workspaceId: string;
}): Promise<ServiceResult<{ trendReport: SceneQaBaselineTrendReport }>> {
  const access = await getWorkspaceAccess(input.workspaceId, input.currentUserId);

  if (!access) {
    return { error: "Workspace access is required.", status: 403 };
  }

  await ensureWorkspaceSceneQaBaselineSchema();

  const rows = await getDb()
    .select()
    .from(workspaceSceneQaBaseline)
    .where(eq(workspaceSceneQaBaseline.workspaceId, input.workspaceId))
    .orderBy(desc(workspaceSceneQaBaseline.capturedAt))
    .limit(input.limit ?? 320);

  return { trendReport: createSceneQaBaselineTrendReport(rows.map(toBaselineRecord)) };
}

export async function recordWorkspaceSceneQaBaselineReport(input: {
  currentUserId: string;
  deploymentId?: string;
  report: SceneQaSnapshotReport;
  workspaceId: string;
}): Promise<ServiceResult<{ trendReport: SceneQaBaselineTrendReport }>> {
  const access = await getWorkspaceAccess(input.workspaceId, input.currentUserId);

  if (!access) {
    return { error: "Workspace access is required.", status: 403 };
  }

  await ensureWorkspaceSceneQaBaselineSchema();

  const now = new Date();
  const deploymentId = input.deploymentId ?? getSceneQaDeploymentId();
  const generatedAt = new Date(input.report.generatedAt);
  const capturedAt = Number.isNaN(generatedAt.getTime()) ? now : generatedAt;
  const records = createSceneQaBaselineRecordsFromReport({
    deploymentId,
    report: input.report,
    workspaceId: input.workspaceId,
  });

  await getDb().delete(workspaceSceneQaBaseline).where(and(eq(workspaceSceneQaBaseline.workspaceId, input.workspaceId), eq(workspaceSceneQaBaseline.deploymentId, deploymentId)));

  if (records.length > 0) {
    await getDb()
      .insert(workspaceSceneQaBaseline)
      .values(
        records.map((record) => ({
          actualSignature: record.actualSignature,
          capturedAt,
          comparisonId: record.comparisonId,
          createdAt: now,
          deploymentId: record.deploymentId,
          expectedSignature: record.expectedSignature,
          id: nanoid(),
          issueCount: record.issueCount,
          issues: record.issues,
          path: record.path,
          projectId: record.projectId,
          snapshotComparisonId: record.snapshotComparisonId,
          status: record.status,
          surface: record.surface,
          targetName: record.targetName,
          templateId: record.templateId,
          updatedAt: now,
          workspaceId: record.workspaceId,
        })),
      );
  }

  return listWorkspaceSceneQaBaselineTrendReport({
    currentUserId: input.currentUserId,
    workspaceId: input.workspaceId,
  });
}
