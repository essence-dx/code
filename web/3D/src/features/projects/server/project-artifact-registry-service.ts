import { desc, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import { project, projectArtifactRegistryEntry, type ProjectArtifactRegistryEntryRecord } from "@/db/schema";
import {
  createProjectArtifactRegistryEntries,
  createProjectArtifactRegistryReportFromEntries,
  type ProjectArtifactRegistryEntry,
  type ProjectArtifactRegistryMetadata,
  type ProjectArtifactRegistryReport,
} from "@/features/projects/project-artifact-registry";
import type { ProjectExportLineageReport } from "@/features/projects/project-export-lineage";
import { requireProjectRole } from "@/features/projects/server/project-access-service";

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureProjectArtifactRegistrySchema() {
  schemaReady ??= (async () => {
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS project_artifact_registry_entry (
        id text PRIMARY KEY NOT NULL,
        project_id text NOT NULL REFERENCES project(id) ON DELETE CASCADE,
        source_key text NOT NULL,
        artifact_id text NOT NULL,
        source_version_id text NOT NULL,
        kind text NOT NULL,
        label text NOT NULL,
        status text NOT NULL,
        visibility text NOT NULL,
        signature_state text NOT NULL,
        path text,
        url text,
        requires_auth integer DEFAULT 0 NOT NULL,
        metadata text,
        registered_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_artifact_registry_entry_project_idx ON project_artifact_registry_entry(project_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_artifact_registry_entry_kind_idx ON project_artifact_registry_entry(kind)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_artifact_registry_entry_updated_idx ON project_artifact_registry_entry(updated_at)");
    await runSchemaStatement("CREATE UNIQUE INDEX IF NOT EXISTS project_artifact_registry_entry_source_key_idx ON project_artifact_registry_entry(source_key)");
  })();

  await schemaReady;
}

function toIso(value: Date) {
  return value.toISOString();
}

function toDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function entryFromRow(row: ProjectArtifactRegistryEntryRecord & { projectName?: string | null }): ProjectArtifactRegistryEntry {
  return {
    artifactId: row.artifactId,
    id: row.id,
    kind: row.kind,
    label: row.label,
    metadata: row.metadata,
    path: row.path,
    projectId: row.projectId,
    projectName: row.projectName ?? "Untitled project",
    registeredAt: toIso(row.registeredAt),
    requiresAuth: row.requiresAuth,
    signatureState: row.signatureState,
    sourceKey: row.sourceKey,
    sourceVersionId: row.sourceVersionId,
    status: row.status,
    updatedAt: toIso(row.updatedAt),
    url: row.url,
    visibility: row.visibility,
  };
}

function compactMetadata(metadata: ProjectArtifactRegistryMetadata | null) {
  if (!metadata) {
    return null;
  }

  return Object.fromEntries(Object.entries(metadata).filter((entry): entry is [string, boolean | number | string | null] => entry[1] !== undefined));
}

async function upsertArtifactRegistryEntry(entry: ProjectArtifactRegistryEntry) {
  const existing = (
    await getDb()
      .select({ id: projectArtifactRegistryEntry.id, registeredAt: projectArtifactRegistryEntry.registeredAt })
      .from(projectArtifactRegistryEntry)
      .where(sql`${projectArtifactRegistryEntry.sourceKey} = ${entry.sourceKey}`)
      .limit(1)
  )[0];
  const values = {
    artifactId: entry.artifactId,
    kind: entry.kind,
    label: entry.label,
    metadata: compactMetadata(entry.metadata),
    path: entry.path,
    projectId: entry.projectId,
    requiresAuth: entry.requiresAuth,
    signatureState: entry.signatureState,
    sourceKey: entry.sourceKey,
    sourceVersionId: entry.sourceVersionId,
    status: entry.status,
    updatedAt: toDate(entry.updatedAt),
    url: entry.url,
    visibility: entry.visibility,
  };

  if (existing) {
    const rows = await getDb()
      .update(projectArtifactRegistryEntry)
      .set(values)
      .where(sql`${projectArtifactRegistryEntry.id} = ${existing.id}`)
      .returning();

    return rows[0];
  }

  const rows = await getDb()
    .insert(projectArtifactRegistryEntry)
    .values({
      ...values,
      id: nanoid(),
      registeredAt: toDate(entry.registeredAt),
    })
    .returning();

  return rows[0];
}

export async function listProjectArtifactRegistryEntries(projectIds: string[]) {
  await ensureProjectArtifactRegistrySchema();

  if (projectIds.length === 0) {
    return [];
  }

  const rows = await getDb()
    .select({
      artifactId: projectArtifactRegistryEntry.artifactId,
      id: projectArtifactRegistryEntry.id,
      kind: projectArtifactRegistryEntry.kind,
      label: projectArtifactRegistryEntry.label,
      metadata: projectArtifactRegistryEntry.metadata,
      path: projectArtifactRegistryEntry.path,
      projectId: projectArtifactRegistryEntry.projectId,
      projectName: project.name,
      registeredAt: projectArtifactRegistryEntry.registeredAt,
      requiresAuth: projectArtifactRegistryEntry.requiresAuth,
      signatureState: projectArtifactRegistryEntry.signatureState,
      sourceKey: projectArtifactRegistryEntry.sourceKey,
      sourceVersionId: projectArtifactRegistryEntry.sourceVersionId,
      status: projectArtifactRegistryEntry.status,
      updatedAt: projectArtifactRegistryEntry.updatedAt,
      url: projectArtifactRegistryEntry.url,
      visibility: projectArtifactRegistryEntry.visibility,
    })
    .from(projectArtifactRegistryEntry)
    .innerJoin(project, sql`${project.id} = ${projectArtifactRegistryEntry.projectId}`)
    .where(inArray(projectArtifactRegistryEntry.projectId, projectIds))
    .orderBy(desc(projectArtifactRegistryEntry.updatedAt))
    .limit(240);

  return rows.map(entryFromRow);
}

export async function syncProjectArtifactRegistryReports(lineageReports: ProjectExportLineageReport[]): Promise<ProjectArtifactRegistryReport> {
  await ensureProjectArtifactRegistrySchema();

  const entries = createProjectArtifactRegistryEntries({ lineageReports });

  for (const entry of entries) {
    await upsertArtifactRegistryEntry(entry);
  }

  const projectIds = [...new Set(lineageReports.map((report) => report.project.id))];
  const registryEntries = await listProjectArtifactRegistryEntries(projectIds);

  return createProjectArtifactRegistryReportFromEntries(registryEntries);
}

export async function getProjectArtifactRegistryReport(input: { currentUserId: string; projectId: string }) {
  await ensureProjectArtifactRegistrySchema();

  const access = await requireProjectRole(input.projectId, input.currentUserId, "viewer");

  if ("error" in access) {
    return access;
  }

  const entries = await listProjectArtifactRegistryEntries([input.projectId]);

  return {
    project: access.project,
    report: createProjectArtifactRegistryReportFromEntries(entries),
    role: access.role,
  };
}
