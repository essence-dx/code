import type { AdminReleaseApprovalSnapshot } from "@/features/admin/admin-release-approval-snapshots";
import type { RetentionPrivacyReport } from "@/features/admin/admin-retention-privacy";
import type { AdminRollbackReadinessReport } from "@/features/admin/admin-rollback-readiness";
import type { AdminSelfHostedBackupReadinessReport } from "@/features/admin/admin-self-hosted-backup-readiness";
import type { AdminSupportBundle } from "@/features/admin/admin-support-bundle";
import type { ProductionDeploySmokeReport } from "@/features/editor/production-deploy-smoke";
import type { DesignDocument } from "@/features/editor/types";

export const adminOfflineVaultKind = "essence-offline-vault" as const;
export const adminOfflineVaultVersion = 1 as const;

export type AdminOfflineVaultStatus = "ready" | "review" | "blocked";

export type AdminOfflineVaultDesignFile = {
  id: string;
  name: string;
  ownerEmail: string;
  scope: string;
  teamName: string;
  projectName: string;
  updatedAt: string;
  trashedAt: string | null;
  document: DesignDocument;
};

export type AdminOfflineVaultCheckKind =
  | "backup"
  | "checksum"
  | "design-files"
  | "identity"
  | "release"
  | "retention"
  | "rollback"
  | "schema"
  | "smoke"
  | "support";

export type AdminOfflineVaultValidationRow = {
  id: string;
  kind: AdminOfflineVaultCheckKind;
  status: AdminOfflineVaultStatus;
  label: string;
  value: string;
  detail: string;
  recommendation: string;
};

export type AdminOfflineVaultManifest = {
  status: AdminOfflineVaultStatus;
  score: number;
  designFileCount: number;
  activeDesignFileCount: number;
  trashedDesignFileCount: number;
  pageCount: number;
  layerCount: number;
  componentCount: number;
  variableCount: number;
  supportBundleScore: number;
  backupReadinessScore: number;
  rollbackScore: number;
  productionDeploySmokeScore: number;
  retentionPrivacyScore: number;
  releaseApprovalCount: number;
  estimatedBytes: number;
  checksum: string;
};

export type AdminOfflineVaultBackupSnapshot = {
  selfHostedBackupReadiness: AdminSelfHostedBackupReadinessReport;
  rollbackReadiness: AdminRollbackReadinessReport;
  productionDeploySmoke: ProductionDeploySmokeReport;
  releaseApprovalSnapshots: AdminReleaseApprovalSnapshot[];
  retentionPrivacy: RetentionPrivacyReport;
};

export type AdminOfflineVaultPackage = {
  kind: typeof adminOfflineVaultKind;
  version: typeof adminOfflineVaultVersion;
  packageId: string;
  generatedAt: string;
  exportedBy: string;
  designFiles: AdminOfflineVaultDesignFile[];
  supportBundle: AdminSupportBundle;
  backupSnapshot: AdminOfflineVaultBackupSnapshot;
  manifest: AdminOfflineVaultManifest;
  restoreGuide: string[];
};

export type CreateAdminOfflineVaultPackageInput = {
  packageId: string;
  generatedAt: string;
  exportedBy: string;
  designFiles: AdminOfflineVaultDesignFile[];
  supportBundle: AdminSupportBundle;
  backupSnapshot: AdminOfflineVaultBackupSnapshot;
};

export type AdminOfflineVaultImportReport = {
  valid: boolean;
  status: AdminOfflineVaultStatus;
  score: number;
  packageId: string | null;
  generatedAt: string | null;
  exportedBy: string | null;
  designFileCount: number;
  estimatedBytes: number;
  rows: AdminOfflineVaultValidationRow[];
};

export function createAdminOfflineVaultPackage({
  backupSnapshot,
  designFiles,
  exportedBy,
  generatedAt,
  packageId,
  supportBundle,
}: CreateAdminOfflineVaultPackageInput): AdminOfflineVaultPackage {
  const basePackage = {
    kind: adminOfflineVaultKind,
    version: adminOfflineVaultVersion,
    packageId,
    generatedAt,
    exportedBy,
    designFiles,
    supportBundle,
    backupSnapshot,
    restoreGuide: getRestoreGuide(),
  } satisfies Omit<AdminOfflineVaultPackage, "manifest">;
  const rows = getAdminOfflineVaultValidationRows(basePackage);
  const manifestWithoutChecksum = getManifestWithoutChecksum(basePackage, rows);
  const vault: AdminOfflineVaultPackage = {
    ...basePackage,
    manifest: {
      ...manifestWithoutChecksum,
      checksum: createStableChecksum(
        getChecksumSeed(basePackage, manifestWithoutChecksum),
      ),
    },
  };

  return vault;
}

export function getAdminOfflineVaultJson(vault: AdminOfflineVaultPackage) {
  return JSON.stringify(vault, null, 2);
}

export function validateAdminOfflineVaultPackage(
  value: unknown,
): AdminOfflineVaultImportReport {
  if (!isRecord(value)) {
    return createInvalidImportReport("Package must be a JSON object.");
  }

  const rows: AdminOfflineVaultValidationRow[] = [];
  const packageId = readString(value.packageId);
  const generatedAt = readString(value.generatedAt);
  const exportedBy = readString(value.exportedBy);
  const designFiles = Array.isArray(value.designFiles) ? value.designFiles : [];
  const estimatedBytes = getEstimatedBytes(value);

  rows.push(
    getIdentityRow({
      exportedBy,
      generatedAt,
      kind: readString(value.kind),
      packageId,
      version: readNumber(value.version),
    }),
  );

  if (
    value.kind === adminOfflineVaultKind &&
    value.version === adminOfflineVaultVersion &&
    packageId &&
    generatedAt &&
    exportedBy &&
    Array.isArray(value.designFiles) &&
    isRecord(value.supportBundle) &&
    isRecord(value.backupSnapshot) &&
    isRecord(value.manifest)
  ) {
    const vault = value as AdminOfflineVaultPackage;
    rows.push(...getAdminOfflineVaultValidationRows(vault));
    rows.push(getChecksumRow(vault));
  } else {
    rows.push({
      id: "vault-schema",
      kind: "schema",
      status: "blocked",
      label: "Package schema",
      value: "Missing required offline vault sections",
      detail:
        "The package must include design files, a support bundle, a backup snapshot, and a manifest.",
      recommendation:
        "Import a JSON package created from the current Offline vault panel.",
    });
  }

  const status = getWorstStatus(rows.map((row) => row.status));
  const score = getScore(rows);

  return {
    valid: status !== "blocked",
    status,
    score,
    packageId,
    generatedAt,
    exportedBy,
    designFileCount: designFiles.length,
    estimatedBytes,
    rows,
  };
}

function getAdminOfflineVaultValidationRows(
  vault: Omit<AdminOfflineVaultPackage, "manifest"> | AdminOfflineVaultPackage,
): AdminOfflineVaultValidationRow[] {
  const designStats = getDesignStats(vault.designFiles);
  const backupSnapshot = vault.backupSnapshot;

  return [
    getDesignFilesRow(vault.designFiles, designStats),
    getSupportBundleRow(vault.supportBundle),
    getBackupRow(backupSnapshot.selfHostedBackupReadiness),
    getRollbackRow(backupSnapshot.rollbackReadiness),
    getSmokeRow(backupSnapshot.productionDeploySmoke),
    getRetentionRow(backupSnapshot.retentionPrivacy),
    getReleaseRow(backupSnapshot.releaseApprovalSnapshots),
  ];
}

function getManifestWithoutChecksum(
  vault: Omit<AdminOfflineVaultPackage, "manifest">,
  rows: AdminOfflineVaultValidationRow[],
): Omit<AdminOfflineVaultManifest, "checksum"> {
  const designStats = getDesignStats(vault.designFiles);
  const estimatedBytes = getEstimatedBytes({
    ...vault,
    manifest: { checksum: "" },
  });

  return {
    status: getWorstStatus(rows.map((row) => row.status)),
    score: getScore(rows),
    designFileCount: vault.designFiles.length,
    activeDesignFileCount: vault.designFiles.filter((file) => !file.trashedAt)
      .length,
    trashedDesignFileCount: vault.designFiles.filter((file) => file.trashedAt)
      .length,
    pageCount: designStats.pageCount,
    layerCount: designStats.layerCount,
    componentCount: designStats.componentCount,
    variableCount: designStats.variableCount,
    supportBundleScore: vault.supportBundle.score,
    backupReadinessScore: vault.backupSnapshot.selfHostedBackupReadiness.score,
    rollbackScore: vault.backupSnapshot.rollbackReadiness.score,
    productionDeploySmokeScore: vault.backupSnapshot.productionDeploySmoke.score,
    retentionPrivacyScore: vault.backupSnapshot.retentionPrivacy.score,
    releaseApprovalCount: vault.backupSnapshot.releaseApprovalSnapshots.length,
    estimatedBytes,
  };
}

function getDesignFilesRow(
  designFiles: AdminOfflineVaultDesignFile[],
  designStats: ReturnType<typeof getDesignStats>,
): AdminOfflineVaultValidationRow {
  if (designFiles.length === 0) {
    return {
      id: "vault-design-files",
      kind: "design-files",
      status: "blocked",
      label: "Design files",
      value: "0 files",
      detail: "The package has no design documents to restore offline.",
      recommendation: "Create or load design files before exporting the vault.",
    };
  }

  const emptyDocuments = designFiles.filter(
    (file) => file.document.pages.length === 0,
  ).length;

  return {
    id: "vault-design-files",
    kind: "design-files",
    status: emptyDocuments > 0 ? "review" : "ready",
    label: "Design files",
    value: `${designFiles.length} files, ${designStats.pageCount} pages, ${designStats.layerCount} layers`,
    detail:
      emptyDocuments > 0
        ? `${emptyDocuments} exported file records have no pages.`
        : "Design documents are included with owner, team, project, and document payloads.",
    recommendation:
      emptyDocuments > 0
        ? "Review empty documents before using this package as a backup source."
        : "Keep this JSON package with the matching support and backup exports.",
  };
}

function getSupportBundleRow(
  supportBundle: AdminSupportBundle,
): AdminOfflineVaultValidationRow {
  return {
    id: "vault-support-bundle",
    kind: "support",
    status: supportBundle.status,
    label: "Support bundle",
    value: `${supportBundle.score}/100, ${supportBundle.summary.auditEvents} audit rows`,
    detail:
      "The vault includes workspace support evidence for users, files, shares, sessions, notifications, audit rows, and rollback context.",
    recommendation:
      supportBundle.status === "ready"
        ? "Support evidence is ready for offline triage."
        : "Review support bundle findings before treating the vault as release-grade.",
  };
}

function getBackupRow(
  report: AdminSelfHostedBackupReadinessReport,
): AdminOfflineVaultValidationRow {
  return {
    id: "vault-backup-snapshot",
    kind: "backup",
    status: report.status,
    label: "Backup snapshot",
    value: `${report.score}/100, ${report.rows.length} checks`,
    detail:
      "The package includes self-hosted backup readiness, backup target posture, database state, and artifact commands.",
    recommendation:
      report.status === "ready"
        ? "Backup evidence is ready to archive."
        : "Resolve backup readiness warnings before relying on this package alone.",
  };
}

function getRollbackRow(
  report: AdminRollbackReadinessReport,
): AdminOfflineVaultValidationRow {
  return {
    id: "vault-rollback-snapshot",
    kind: "rollback",
    status: report.status,
    label: "Rollback snapshot",
    value: `${report.score}/100, ${report.versionAnchorCount} version anchors`,
    detail:
      "Rollback readiness is included so the package can be reviewed with named versions, share exposure, database state, and deployment links.",
    recommendation:
      report.status === "ready"
        ? "Rollback evidence is ready for release records."
        : "Add missing named versions or deployment links before release archival.",
  };
}

function getSmokeRow(
  report: ProductionDeploySmokeReport,
): AdminOfflineVaultValidationRow {
  return {
    id: "vault-smoke-snapshot",
    kind: "smoke",
    status: report.status,
    label: "Deploy smoke",
    value: `${report.score}/100, ${report.requiredRouteCount} required routes`,
    detail:
      "Production smoke route expectations are stored with auth, editor, admin, share, prototype, and handoff checks.",
    recommendation:
      report.status === "ready"
        ? "Deploy smoke evidence is ready to archive."
        : "Complete blocked smoke checks before approving a release vault.",
  };
}

function getRetentionRow(
  report: RetentionPrivacyReport,
): AdminOfflineVaultValidationRow {
  return {
    id: "vault-retention-privacy",
    kind: "retention",
    status: report.status,
    label: "Retention privacy",
    value: `${report.score}/100, ${report.settings.supportBundlePrivacyMode} bundle mode`,
    detail:
      "Retention settings and sensitive support bundle redaction posture are included with the package.",
    recommendation:
      report.supportBundleRedactionEnabled
        ? "Privacy controls are active for support evidence."
        : "Enable support bundle redaction before sharing vault packages externally.",
  };
}

function getReleaseRow(
  snapshots: AdminReleaseApprovalSnapshot[],
): AdminOfflineVaultValidationRow {
  return {
    id: "vault-release-approvals",
    kind: "release",
    status: snapshots.length > 0 ? "ready" : "review",
    label: "Release approvals",
    value:
      snapshots.length === 1
        ? "1 approval snapshot"
        : `${snapshots.length} approval snapshots`,
    detail:
      snapshots.length > 0
        ? "Release approval records are bundled with reviewer, deployment, rollback, and smoke artifact details."
        : "The vault has no release approval snapshots yet.",
    recommendation:
      snapshots.length > 0
        ? "Keep the approval snapshot with the vault package."
        : "Capture at least one release approval snapshot before production release archival.",
  };
}

function getChecksumRow(vault: AdminOfflineVaultPackage) {
  const manifestWithoutChecksum = {
    ...vault.manifest,
    checksum: undefined,
  };
  const expected = createStableChecksum(
    getChecksumSeed(vault, manifestWithoutChecksum),
  );
  const matches = vault.manifest.checksum === expected;

  return {
    id: "vault-checksum",
    kind: "checksum",
    status: matches ? "ready" : "blocked",
    label: "Checksum",
    value: matches ? "Matches package payload" : "Checksum mismatch",
    detail: matches
      ? "The imported package checksum matches the design files, support bundle, backup snapshots, and manifest fields."
      : "The package contents changed after export or were generated by an incompatible tool.",
    recommendation: matches
      ? "Package integrity is ready for offline review."
      : "Re-export the vault before restoring or sharing this package.",
  } satisfies AdminOfflineVaultValidationRow;
}

function getIdentityRow({
  exportedBy,
  generatedAt,
  kind,
  packageId,
  version,
}: {
  exportedBy: string | null;
  generatedAt: string | null;
  kind: string | null;
  packageId: string | null;
  version: number | null;
}): AdminOfflineVaultValidationRow {
  const valid =
    kind === adminOfflineVaultKind &&
    version === adminOfflineVaultVersion &&
    Boolean(packageId && generatedAt && exportedBy);

  return {
    id: "vault-identity",
    kind: "identity",
    status: valid ? "ready" : "blocked",
    label: "Package identity",
    value:
      packageId && generatedAt
        ? `${packageId} generated ${generatedAt}`
        : "Missing package identity",
    detail: valid
      ? "The package kind, version, id, timestamp, and exporter are present."
      : "The package is missing a supported kind, version, id, timestamp, or exporter.",
    recommendation: valid
      ? "Continue with import validation."
      : "Use an Essence offline vault package generated by this workspace.",
  };
}

function getDesignStats(designFiles: AdminOfflineVaultDesignFile[]) {
  return designFiles.reduce(
    (total, file) => {
      total.pageCount += file.document.pages.length;
      total.layerCount += file.document.pages.reduce(
        (count, page) => count + page.layers.length,
        0,
      );
      total.componentCount += Object.keys(file.document.components ?? {}).length;
      total.variableCount += Object.keys(
        file.document.variableDefinitions ?? file.document.variables ?? {},
      ).length;

      return total;
    },
    {
      pageCount: 0,
      layerCount: 0,
      componentCount: 0,
      variableCount: 0,
    },
  );
}

function getRestoreGuide() {
  return [
    "Validate the package checksum before restore planning.",
    "Review retention privacy settings before sharing diagnostic evidence.",
    "Restore design documents first, then verify named versions and public share exposure.",
    "Run the archived smoke commands against the target deployment after restore.",
    "Keep this JSON with the Markdown and CSV summaries for audit review.",
  ];
}

function getChecksumSeed(
  vault: Omit<AdminOfflineVaultPackage, "manifest"> | AdminOfflineVaultPackage,
  manifest: Omit<AdminOfflineVaultManifest, "checksum"> | Partial<AdminOfflineVaultManifest>,
) {
  return JSON.stringify({
    kind: vault.kind,
    version: vault.version,
    packageId: vault.packageId,
    generatedAt: vault.generatedAt,
    exportedBy: vault.exportedBy,
    designFiles: vault.designFiles,
    supportBundle: vault.supportBundle,
    backupSnapshot: vault.backupSnapshot,
    manifest: {
      ...manifest,
      checksum: undefined,
    },
    restoreGuide: vault.restoreGuide,
  });
}

function createStableChecksum(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function getWorstStatus(statuses: AdminOfflineVaultStatus[]) {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  return statuses.includes("review") ? "review" : "ready";
}

function getScore(rows: AdminOfflineVaultValidationRow[]) {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;

  return Math.max(0, 100 - blockedCount * 22 - reviewCount * 8);
}

function createInvalidImportReport(detail: string): AdminOfflineVaultImportReport {
  return {
    valid: false,
    status: "blocked",
    score: 0,
    packageId: null,
    generatedAt: null,
    exportedBy: null,
    designFileCount: 0,
    estimatedBytes: 0,
    rows: [
      {
        id: "vault-json",
        kind: "schema",
        status: "blocked",
        label: "Package JSON",
        value: "Invalid package",
        detail,
        recommendation: "Choose a JSON file exported from the Offline vault panel.",
      },
    ],
  };
}

function getEstimatedBytes(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
