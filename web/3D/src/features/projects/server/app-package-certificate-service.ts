import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import { projectAppPackageCertificate, type ProjectAppPackageCertificateRecordRow } from "@/db/schema";
import {
  createProjectAppPackageCertificateReport,
  getRequiredAppPackageCertificatePlatforms,
  isValidSha256Fingerprint,
  normalizeCertificateFingerprint,
  type ProjectAppPackageCertificateInput,
  type ProjectAppPackageCertificateMetadata,
  type ProjectAppPackageCertificateRecord,
  type ProjectAppPackageCertificateReport,
} from "@/features/projects/app-package-certificates";
import type { ProjectArtifactRegistryReport } from "@/features/projects/project-artifact-registry";
import { recordProjectAuditEvent } from "@/features/projects/server/project-audit-event-service";
import { requireProjectRole } from "@/features/projects/server/project-access-service";

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureProjectAppPackageCertificateSchema() {
  schemaReady ??= (async () => {
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS project_app_package_certificate (
        id text PRIMARY KEY NOT NULL,
        project_id text NOT NULL REFERENCES project(id) ON DELETE CASCADE,
        preset_id text,
        platform text NOT NULL,
        source_artifact_id text,
        subject text NOT NULL,
        issuer text NOT NULL,
        serial_number text NOT NULL,
        fingerprint_sha256 text NOT NULL,
        bundle_identifier text,
        team_id text,
        metadata text,
        valid_from integer NOT NULL,
        expires_at integer NOT NULL,
        uploaded_at integer NOT NULL,
        verified_at integer NOT NULL,
        revoked_at integer
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_app_package_certificate_project_idx ON project_app_package_certificate(project_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_app_package_certificate_platform_idx ON project_app_package_certificate(project_id, platform)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_app_package_certificate_expires_idx ON project_app_package_certificate(expires_at)");
    await runSchemaStatement(
      "CREATE UNIQUE INDEX IF NOT EXISTS project_app_package_certificate_unique_idx ON project_app_package_certificate(project_id, preset_id, platform, fingerprint_sha256)",
    );
  })();

  await schemaReady;
}

function toIso(value: Date) {
  return value.toISOString();
}

function toDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function compactMetadata(metadata: ProjectAppPackageCertificateMetadata | null | undefined) {
  if (!metadata) {
    return null;
  }

  return Object.fromEntries(Object.entries(metadata).filter((entry): entry is [string, boolean | number | string | null] => entry[1] !== undefined));
}

function certificateFromRow(row: ProjectAppPackageCertificateRecordRow): ProjectAppPackageCertificateRecord {
  return {
    bundleIdentifier: row.bundleIdentifier,
    expiresAt: toIso(row.expiresAt),
    fingerprintSha256: row.fingerprintSha256,
    id: row.id,
    issuer: row.issuer,
    metadata: row.metadata,
    platform: row.platform,
    presetId: row.presetId,
    projectId: row.projectId,
    revokedAt: row.revokedAt ? toIso(row.revokedAt) : null,
    serialNumber: row.serialNumber,
    sourceArtifactId: row.sourceArtifactId,
    subject: row.subject,
    teamId: row.teamId,
    uploadedAt: toIso(row.uploadedAt),
    validFrom: toIso(row.validFrom),
    verifiedAt: toIso(row.verifiedAt),
  };
}

function validateCertificateInput(input: ProjectAppPackageCertificateInput) {
  if (!isValidSha256Fingerprint(input.fingerprintSha256)) {
    return "Certificate fingerprint must be a SHA-256 fingerprint.";
  }

  const validFrom = toDate(input.validFrom);
  const expiresAt = toDate(input.expiresAt);
  const verifiedAt = input.verifiedAt ? toDate(input.verifiedAt) : new Date();
  const revokedAt = input.revokedAt ? toDate(input.revokedAt) : null;

  if (!validFrom || !expiresAt || !verifiedAt || (input.revokedAt && !revokedAt)) {
    return "Certificate date fields must be valid ISO dates.";
  }

  if (validFrom.getTime() >= expiresAt.getTime()) {
    return "Certificate expiration must be after its validity start.";
  }

  if (input.presetId && !getRequiredAppPackageCertificatePlatforms(input.presetId).includes(input.platform)) {
    return "Certificate platform does not match the selected app package preset.";
  }

  return null;
}

export async function listProjectAppPackageCertificates(projectIds: string[]) {
  await ensureProjectAppPackageCertificateSchema();

  if (projectIds.length === 0) {
    return [];
  }

  const rows = await getDb()
    .select()
    .from(projectAppPackageCertificate)
    .where(inArray(projectAppPackageCertificate.projectId, projectIds))
    .orderBy(desc(projectAppPackageCertificate.verifiedAt))
    .limit(240);

  return rows.map(certificateFromRow);
}

export async function saveProjectAppPackageCertificate(input: {
  certificate: ProjectAppPackageCertificateInput;
  currentUserId: string;
  projectId: string;
}) {
  await ensureProjectAppPackageCertificateSchema();

  const access = await requireProjectRole(input.projectId, input.currentUserId, "admin");

  if ("error" in access) {
    return access;
  }

  const validationError = validateCertificateInput(input.certificate);

  if (validationError) {
    return { error: validationError, status: 400 as const };
  }

  const now = new Date();
  const presetId = input.certificate.presetId ?? null;
  const fingerprintSha256 = normalizeCertificateFingerprint(input.certificate.fingerprintSha256);
  const values = {
    bundleIdentifier: input.certificate.bundleIdentifier ?? null,
    expiresAt: toDate(input.certificate.expiresAt) ?? now,
    fingerprintSha256,
    issuer: input.certificate.issuer.trim(),
    metadata: compactMetadata(input.certificate.metadata),
    platform: input.certificate.platform,
    presetId,
    projectId: input.projectId,
    revokedAt: input.certificate.revokedAt ? (toDate(input.certificate.revokedAt) ?? null) : null,
    serialNumber: input.certificate.serialNumber.trim(),
    sourceArtifactId: input.certificate.sourceArtifactId ?? null,
    subject: input.certificate.subject.trim(),
    teamId: input.certificate.teamId ?? null,
    uploadedAt: now,
    validFrom: toDate(input.certificate.validFrom) ?? now,
    verifiedAt: input.certificate.verifiedAt ? (toDate(input.certificate.verifiedAt) ?? now) : now,
  };
  const existing = (
    await getDb()
      .select({ id: projectAppPackageCertificate.id, uploadedAt: projectAppPackageCertificate.uploadedAt })
      .from(projectAppPackageCertificate)
      .where(
        and(
          eq(projectAppPackageCertificate.projectId, input.projectId),
          presetId === null ? sql`${projectAppPackageCertificate.presetId} IS NULL` : eq(projectAppPackageCertificate.presetId, presetId),
          eq(projectAppPackageCertificate.platform, input.certificate.platform),
          eq(projectAppPackageCertificate.fingerprintSha256, fingerprintSha256),
        ),
      )
      .limit(1)
  )[0];

  const rows = existing
    ? await getDb()
        .update(projectAppPackageCertificate)
        .set({
          ...values,
          uploadedAt: existing.uploadedAt,
        })
        .where(eq(projectAppPackageCertificate.id, existing.id))
        .returning()
    : await getDb()
        .insert(projectAppPackageCertificate)
        .values({
          ...values,
          id: nanoid(),
        })
        .returning();
  const certificate = certificateFromRow(rows[0]);

  await recordProjectAuditEvent({
    action: "certificate.ingested",
    actorUserId: input.currentUserId,
    category: "releases",
    metadata: {
      expiresAt: certificate.expiresAt,
      platform: certificate.platform,
      presetId: certificate.presetId,
      sourceArtifactId: certificate.sourceArtifactId,
    },
    projectId: input.projectId,
    resourceId: certificate.id,
    resourceType: "appPackageCertificate",
    summary: `${access.project.name} ${certificate.platform} signing certificate was ingested.`,
  });

  return { certificate };
}

export async function getProjectAppPackageCertificateReport(input: {
  artifactRegistryReport: ProjectArtifactRegistryReport;
  currentUserId: string;
  projectId: string;
}): Promise<{ error: string; status: 403 | 404 } | { report: ProjectAppPackageCertificateReport }> {
  const access = await requireProjectRole(input.projectId, input.currentUserId, "viewer");

  if ("error" in access) {
    return access;
  }

  const certificates = await listProjectAppPackageCertificates([input.projectId]);

  return {
    report: createProjectAppPackageCertificateReport({
      artifactRegistryReport: input.artifactRegistryReport,
      certificates,
    }),
  };
}
