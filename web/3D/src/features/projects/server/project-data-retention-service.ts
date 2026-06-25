import { desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import { projectComment, projectDataRetentionPolicy, projectVersion, type ProjectDataRetentionPolicyRecord } from "@/db/schema";
import {
  createDefaultProjectDataRetentionPolicy,
  createProjectDataRetentionPurgeManifest,
  createProjectDataRetentionReport,
  normalizeProjectDataRetentionPolicySettings,
  type ProjectDataRetentionPolicy,
  type ProjectDataRetentionPolicySettings,
  type ProjectDataRetentionPurgeReviewStatus,
} from "@/features/projects/project-data-retention";
import { requireProjectRole } from "@/features/projects/server/project-access-service";
import { listProjectAuditEvents, recordProjectAuditEvent } from "@/features/projects/server/project-audit-event-service";

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

async function runOptionalSchemaStatement(statement: string) {
  try {
    await runSchemaStatement(statement);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";

    if (!message.includes("duplicate column")) {
      throw error;
    }
  }
}

export async function ensureProjectDataRetentionPolicySchema() {
  schemaReady ??= (async () => {
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS project_data_retention_policy (
        id text PRIMARY KEY NOT NULL,
        project_id text NOT NULL REFERENCES project(id) ON DELETE CASCADE,
        audit_log_days integer DEFAULT 730 NOT NULL,
        comment_days integer DEFAULT 365 NOT NULL,
        version_days integer DEFAULT 180 NOT NULL,
        deleted_asset_tombstone_days integer DEFAULT 730 NOT NULL,
        updated_by_user_id text REFERENCES user(id) ON DELETE SET NULL,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `);
    await runOptionalSchemaStatement("ALTER TABLE project_data_retention_policy ADD COLUMN deleted_asset_tombstone_days integer DEFAULT 730 NOT NULL");
    await runOptionalSchemaStatement("ALTER TABLE project_data_retention_policy ADD COLUMN purge_review_status text DEFAULT 'draft' NOT NULL");
    await runOptionalSchemaStatement("ALTER TABLE project_data_retention_policy ADD COLUMN purge_review_requested_at integer");
    await runOptionalSchemaStatement("ALTER TABLE project_data_retention_policy ADD COLUMN purge_approved_at integer");
    await runOptionalSchemaStatement("ALTER TABLE project_data_retention_policy ADD COLUMN purge_approved_by_user_id text REFERENCES user(id) ON DELETE SET NULL");
    await runOptionalSchemaStatement("ALTER TABLE project_data_retention_policy ADD COLUMN purge_approval_note text");
    await runOptionalSchemaStatement("ALTER TABLE project_data_retention_policy ADD COLUMN updated_by_user_id text REFERENCES user(id) ON DELETE SET NULL");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_data_retention_policy_project_idx ON project_data_retention_policy(project_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_data_retention_policy_updated_by_idx ON project_data_retention_policy(updated_by_user_id)");
    await runSchemaStatement("CREATE UNIQUE INDEX IF NOT EXISTS project_data_retention_policy_project_unique_idx ON project_data_retention_policy(project_id)");
  })();

  await schemaReady;
}

function toIso(value: Date | null | undefined) {
  return value?.toISOString() ?? null;
}

function policyFromRow(row: ProjectDataRetentionPolicyRecord | null | undefined, projectId: string): ProjectDataRetentionPolicy {
  if (!row) {
    return createDefaultProjectDataRetentionPolicy(projectId);
  }

  return {
    auditLogDays: row.auditLogDays,
    commentDays: row.commentDays,
    createdAt: toIso(row.createdAt),
    deletedAssetTombstoneDays: row.deletedAssetTombstoneDays,
    id: row.id,
    projectId: row.projectId,
    purgeApprovalNote: row.purgeApprovalNote,
    purgeApprovedAt: toIso(row.purgeApprovedAt),
    purgeApprovedByUserId: row.purgeApprovedByUserId,
    purgeReviewRequestedAt: toIso(row.purgeReviewRequestedAt),
    purgeReviewStatus: row.purgeReviewStatus,
    updatedAt: toIso(row.updatedAt),
    updatedByUserId: row.updatedByUserId,
    versionDays: row.versionDays,
  };
}

async function loadPolicy(projectId: string) {
  await ensureProjectDataRetentionPolicySchema();

  return (
    await getDb()
      .select()
      .from(projectDataRetentionPolicy)
      .where(eq(projectDataRetentionPolicy.projectId, projectId))
      .limit(1)
  )[0];
}

async function loadRetentionSources(projectId: string) {
  const [auditEvents, comments, versions] = await Promise.all([
    listProjectAuditEvents(projectId, 1000),
    getDb()
      .select({
        createdAt: projectComment.createdAt,
        id: projectComment.id,
        resolvedAt: projectComment.resolvedAt,
        updatedAt: projectComment.updatedAt,
      })
      .from(projectComment)
      .where(eq(projectComment.projectId, projectId))
      .orderBy(desc(projectComment.updatedAt))
      .limit(1000),
    getDb()
      .select({
        createdAt: projectVersion.createdAt,
        id: projectVersion.id,
        name: projectVersion.name,
      })
      .from(projectVersion)
      .where(eq(projectVersion.projectId, projectId))
      .orderBy(desc(projectVersion.createdAt))
      .limit(1000),
  ]);

  return { auditEvents, comments, versions };
}

export async function getProjectDataRetentionReport(input: { currentUserId: string; now?: Date; projectId: string }) {
  await ensureProjectDataRetentionPolicySchema();

  const access = await requireProjectRole(input.projectId, input.currentUserId, "admin");

  if ("error" in access) {
    return access;
  }

  const [policyRow, sources] = await Promise.all([loadPolicy(input.projectId), loadRetentionSources(input.projectId)]);

  return {
    project: access.project,
    report: createProjectDataRetentionReport({
      ...sources,
      now: input.now,
      policy: policyFromRow(policyRow, input.projectId),
    }),
    role: access.role,
  };
}

export async function getProjectDataRetentionPurgeManifest(input: { currentUserId: string; now?: Date; projectId: string }) {
  await ensureProjectDataRetentionPolicySchema();

  const access = await requireProjectRole(input.projectId, input.currentUserId, "admin");

  if ("error" in access) {
    return access;
  }

  const [policyRow, sources] = await Promise.all([loadPolicy(input.projectId), loadRetentionSources(input.projectId)]);
  const policy = policyFromRow(policyRow, input.projectId);

  return {
    manifest: createProjectDataRetentionPurgeManifest({
      ...sources,
      now: input.now,
      policy,
      project: {
        id: access.project.id,
        name: access.project.name,
      },
    }),
    project: access.project,
    role: access.role,
  };
}

export async function saveProjectDataRetentionPolicy(input: {
  currentUserId: string;
  policy: Partial<ProjectDataRetentionPolicySettings>;
  projectId: string;
}) {
  await ensureProjectDataRetentionPolicySchema();

  const access = await requireProjectRole(input.projectId, input.currentUserId, "admin");

  if ("error" in access) {
    return access;
  }

  const settings = normalizeProjectDataRetentionPolicySettings(input.policy);
  const now = new Date();
  const existing = await loadPolicy(input.projectId);
  const row = existing
    ? (
        await getDb()
          .update(projectDataRetentionPolicy)
          .set({
            ...settings,
            purgeApprovalNote: null,
            purgeApprovedAt: null,
            purgeApprovedByUserId: null,
            purgeReviewRequestedAt: null,
            purgeReviewStatus: "draft",
            updatedAt: now,
            updatedByUserId: input.currentUserId,
          })
          .where(eq(projectDataRetentionPolicy.id, existing.id))
          .returning()
      )[0]
    : (
        await getDb()
          .insert(projectDataRetentionPolicy)
          .values({
            ...settings,
            createdAt: now,
            id: nanoid(),
            projectId: input.projectId,
            purgeReviewStatus: "draft",
            updatedAt: now,
            updatedByUserId: input.currentUserId,
          })
          .returning()
      )[0];

  if (!row) {
    return { error: "Retention policy could not be saved", status: 500 as const };
  }

  await recordProjectAuditEvent({
    action: "retention.updated",
    actorUserId: input.currentUserId,
    category: "permissions",
    createdAt: now,
    metadata: {
      auditLogDays: settings.auditLogDays,
      commentDays: settings.commentDays,
      deletedAssetTombstoneDays: settings.deletedAssetTombstoneDays,
      versionDays: settings.versionDays,
    },
    projectId: input.projectId,
    resourceId: row.id,
    resourceType: "dataRetentionPolicy",
    summary: `${access.project.name} data retention controls were updated.`,
  });

  const sources = await loadRetentionSources(input.projectId);

  return {
    policy: policyFromRow(row, input.projectId),
    project: access.project,
    report: createProjectDataRetentionReport({
      ...sources,
      policy: policyFromRow(row, input.projectId),
    }),
    role: access.role,
  };
}

export async function updateProjectDataRetentionPurgeReview(input: {
  currentUserId: string;
  note?: string | null;
  projectId: string;
  status: ProjectDataRetentionPurgeReviewStatus;
}) {
  await ensureProjectDataRetentionPolicySchema();

  const access = await requireProjectRole(input.projectId, input.currentUserId, "admin");

  if ("error" in access) {
    return access;
  }

  const now = new Date();
  const defaultSettings = normalizeProjectDataRetentionPolicySettings(null);
  const existingPolicyRow = await loadPolicy(input.projectId);
  const policyRow =
    existingPolicyRow ??
    (
      await getDb()
        .insert(projectDataRetentionPolicy)
        .values({
          ...defaultSettings,
          createdAt: now,
          id: nanoid(),
          projectId: input.projectId,
          purgeReviewStatus: "draft",
          updatedAt: now,
          updatedByUserId: input.currentUserId,
        })
        .returning()
    )[0];

  if (!policyRow) {
    return { error: "Retention policy could not be prepared", status: 500 as const };
  }

  const approvalFields =
    input.status === "approved"
      ? {
          purgeApprovalNote: input.note ?? null,
          purgeApprovedAt: now,
          purgeApprovedByUserId: input.currentUserId,
          purgeReviewRequestedAt: policyRow.purgeReviewRequestedAt ?? now,
          purgeReviewStatus: input.status,
        }
      : input.status === "requested"
        ? {
            purgeApprovalNote: input.note ?? null,
            purgeApprovedAt: null,
            purgeApprovedByUserId: null,
            purgeReviewRequestedAt: now,
            purgeReviewStatus: input.status,
          }
        : {
            purgeApprovalNote: input.note ?? null,
            purgeApprovedAt: null,
            purgeApprovedByUserId: null,
            purgeReviewRequestedAt: input.status === "draft" ? null : policyRow.purgeReviewRequestedAt,
            purgeReviewStatus: input.status,
          };
  const rows = await getDb()
    .update(projectDataRetentionPolicy)
    .set({
      ...approvalFields,
      updatedAt: now,
      updatedByUserId: input.currentUserId,
    })
    .where(eq(projectDataRetentionPolicy.id, policyRow.id))
    .returning();
  const row = rows[0];

  if (!row) {
    return { error: "Retention purge review could not be updated", status: 500 as const };
  }

  await recordProjectAuditEvent({
    action: `retention.purge_${input.status}`,
    actorUserId: input.currentUserId,
    category: "permissions",
    createdAt: now,
    metadata: {
      note: input.note ?? null,
      purgeReviewStatus: input.status,
    },
    projectId: input.projectId,
    resourceId: row.id,
    resourceType: "dataRetentionPurgeReview",
    summary: `${access.project.name} retention purge dry run was marked ${input.status}.`,
  });

  const sources = await loadRetentionSources(input.projectId);
  const policy = policyFromRow(row, input.projectId);

  return {
    manifest: createProjectDataRetentionPurgeManifest({
      ...sources,
      policy,
      project: {
        id: access.project.id,
        name: access.project.name,
      },
    }),
    policy,
    project: access.project,
    role: access.role,
  };
}
