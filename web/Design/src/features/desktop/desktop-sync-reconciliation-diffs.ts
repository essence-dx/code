import {
  formatAssetBytes,
  type AssetAuditRecord,
} from "@/features/assets/asset-library-audit";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import type {
  DesktopSyncConflictDiff,
  DesktopSyncRecoveryChoiceKind,
  DesktopSyncReconciliationStatus,
  DesktopSyncStaleAssetRepair,
} from "@/features/desktop/desktop-sync-reconciliation-types";
import {
  desktopSyncCloudRestoreToleranceMs,
  desktopSyncDriftToleranceMs,
  desktopSyncLargeManifestBytes,
  formatDesktopSyncTimestamp,
  sortByDesktopSyncStatusThenNewest,
} from "@/features/desktop/desktop-sync-reconciliation-utils";
import {
  latestTimestamp,
  timestamp,
} from "@/features/operations/workspace-backup-restore-utils";

export function createDesktopSyncConflictDiffs(input: {
  projects: ProjectSummary[];
  latestVersions: Map<string, ProjectVersionSummary>;
  latestCompletedExports: Map<string, ServerExportJobSummary>;
  failedExports: Map<string, ServerExportJobSummary[]>;
  manifestRecords: Map<string, AssetAuditRecord>;
  offlineConflictIds: Set<string>;
}): DesktopSyncConflictDiff[] {
  const diffs = input.projects.flatMap((project): DesktopSyncConflictDiff[] => {
    const latestVersion = input.latestVersions.get(project.id) ?? null;
    const latestExport = input.latestCompletedExports.get(project.id) ?? null;
    const failedExports = input.failedExports.get(project.id) ?? [];
    const manifest = input.manifestRecords.get(project.id) ?? null;
    const projectTime = timestamp(project.updatedAt);
    const versionTime = timestamp(latestVersion?.createdAt);
    const exportTime = timestamp(
      latestExport?.completedAt ?? latestExport?.updatedAt,
    );
    const localAhead =
      !latestVersion || projectTime - versionTime > desktopSyncDriftToleranceMs;
    const cloudAhead =
      Boolean(latestVersion) &&
      versionTime - projectTime > desktopSyncCloudRestoreToleranceMs;
    const exportBehind =
      !latestExport || projectTime - exportTime > desktopSyncDriftToleranceMs;
    const staleManifest =
      !manifest ||
      projectTime - timestamp(manifest.updatedAt) > desktopSyncDriftToleranceMs;
    const editableConflict =
      input.offlineConflictIds.has(project.id) ||
      (Boolean(project.editShareId) && project.editSharePermission === "edit");
    const hasFailedExport = failedExports.length > 0;

    if (
      !localAhead &&
      !cloudAhead &&
      !exportBehind &&
      !staleManifest &&
      !editableConflict &&
      !hasFailedExport
    ) {
      return [];
    }

    const blocked =
      hasFailedExport ||
      (editableConflict && project.approvalStatus === "changes-requested") ||
      (!latestVersion && !latestExport);
    const status: DesktopSyncReconciliationStatus = blocked
      ? "blocked"
      : "review";
    const recommendedChoice = chooseConflictRecovery({
      editableConflict,
      localAhead,
      cloudAhead,
      staleManifest,
      hasFailedExport,
    });
    const evidence = createDiffEvidence({
      latestVersion,
      latestExport,
      manifest,
      failedExports,
      hasFailedExport,
    });

    return [
      {
        id: `sync-diff-${project.id}`,
        projectId: project.id,
        projectName: project.name,
        status,
        updatedAt: latestTimestamp([
          project.updatedAt,
          latestVersion?.createdAt,
          latestExport?.updatedAt,
          manifest?.updatedAt,
          ...failedExports.map((job) => job.updatedAt),
        ]),
        localSignal: createLocalSignal({
          project,
          manifest,
          localAhead,
          staleManifest,
        }),
        cloudSignal: createCloudSignal({
          latestVersion,
          latestExport,
          failedExports,
          cloudAhead,
          exportBehind,
        }),
        diffSummary: createDiffSummary({
          project,
          localAhead,
          cloudAhead,
          exportBehind,
          staleManifest,
          editableConflict,
          hasFailedExport,
        }),
        recommendedChoice,
        href: `/editor/${project.id}`,
        evidence,
      } satisfies DesktopSyncConflictDiff,
    ];
  });

  return sortByDesktopSyncStatusThenNewest(diffs).slice(0, 12);
}

export function createDesktopSyncStaleAssetRepairs(input: {
  projects: ProjectSummary[];
  manifestRecords: Map<string, AssetAuditRecord>;
}): DesktopSyncStaleAssetRepair[] {
  const repairs = input.projects.flatMap(
    (project): DesktopSyncStaleAssetRepair[] => {
      const manifest = input.manifestRecords.get(project.id) ?? null;
      const stale =
        !manifest ||
        timestamp(project.updatedAt) - timestamp(manifest.updatedAt) >
          desktopSyncDriftToleranceMs;
      const skippedReferences = manifest?.skippedReferenceCount ?? 0;
      const largeManifest =
        (manifest?.sizeBytes ?? 0) >= desktopSyncLargeManifestBytes;

      if (!stale && skippedReferences === 0 && !largeManifest) return [];

      const status: DesktopSyncReconciliationStatus =
        !manifest || skippedReferences > 0 ? "blocked" : "review";

      return [
        {
          id: `asset-repair-${project.id}`,
          projectId: project.id,
          projectName: project.name,
          status,
          detail: createAssetRepairDetail({
            manifest,
            stale,
            skippedReferences,
            largeManifest,
          }),
          assetBytes: manifest?.sizeBytes ?? 0,
          referenceCount: manifest?.referenceCount ?? 0,
          skippedReferences,
          updatedAt: latestTimestamp([project.updatedAt, manifest?.updatedAt]),
          repairAction:
            status === "blocked"
              ? "Rebuild the local asset manifest and replace skipped embedded files before cloud sync."
              : "Refresh the desktop cache and confirm the manifest before the next offline batch.",
          href: `/editor/${project.id}`,
        } satisfies DesktopSyncStaleAssetRepair,
      ];
    },
  );

  return sortByDesktopSyncStatusThenNewest(repairs).slice(0, 10);
}

function createDiffEvidence(input: {
  latestVersion: ProjectVersionSummary | null;
  latestExport: ServerExportJobSummary | null;
  manifest: AssetAuditRecord | null;
  failedExports: ServerExportJobSummary[];
  hasFailedExport: boolean;
}) {
  return [
    input.latestVersion
      ? `Latest version ${input.latestVersion.id} at ${formatDesktopSyncTimestamp(
          input.latestVersion.createdAt,
        )}.`
      : "No cloud version snapshot is available.",
    input.latestExport
      ? `Latest completed export ${input.latestExport.fileName} at ${formatDesktopSyncTimestamp(
          input.latestExport.completedAt ?? input.latestExport.updatedAt,
        )}.`
      : "No completed export is available for offline handoff.",
    input.manifest
      ? `Project asset manifest has ${input.manifest.referenceCount ?? 0} references and ${input.manifest.skippedReferenceCount ?? 0} skipped references.`
      : "No project asset manifest is indexed.",
    input.hasFailedExport
      ? `${input.failedExports.length} failed export${input.failedExports.length === 1 ? "" : "s"} need retry before handoff.`
      : null,
  ].filter((item): item is string => Boolean(item));
}

function chooseConflictRecovery(input: {
  editableConflict: boolean;
  localAhead: boolean;
  cloudAhead: boolean;
  staleManifest: boolean;
  hasFailedExport: boolean;
}): DesktopSyncRecoveryChoiceKind {
  if (input.editableConflict) return "merge-review";
  if (input.cloudAhead) return "restore-cloud";
  if (input.localAhead) return "keep-local";
  if (input.staleManifest) return "repair-assets";
  if (input.hasFailedExport) return "retry-export";

  return "audit-sync";
}

function createLocalSignal(input: {
  project: ProjectSummary;
  manifest: AssetAuditRecord | null;
  localAhead: boolean;
  staleManifest: boolean;
}) {
  const status = input.localAhead ? "ahead" : "aligned";
  const manifestSignal = input.manifest
    ? `${input.manifest.referenceCount ?? 0} asset refs at ${formatDesktopSyncTimestamp(
        input.manifest.updatedAt,
      )}`
    : "no manifest";
  const staleSuffix = input.staleManifest ? ", manifest stale" : "";

  return `Local ${status}: project updated ${formatDesktopSyncTimestamp(
    input.project.updatedAt,
  )}, ${manifestSignal}${staleSuffix}.`;
}

function createCloudSignal(input: {
  latestVersion: ProjectVersionSummary | null;
  latestExport: ServerExportJobSummary | null;
  failedExports: ServerExportJobSummary[];
  cloudAhead: boolean;
  exportBehind: boolean;
}) {
  const versionSignal = input.latestVersion
    ? `version ${input.latestVersion.id} at ${formatDesktopSyncTimestamp(
        input.latestVersion.createdAt,
      )}`
    : "no version";
  const exportSignal = input.latestExport
    ? `export ${input.latestExport.fileName} at ${formatDesktopSyncTimestamp(
        input.latestExport.completedAt ?? input.latestExport.updatedAt,
      )}`
    : "no completed export";
  const status = input.cloudAhead
    ? "cloud ahead"
    : input.exportBehind
      ? "export behind"
      : "cloud aligned";
  const failedSuffix = input.failedExports.length
    ? `, ${input.failedExports.length} failed export${input.failedExports.length === 1 ? "" : "s"}`
    : "";

  return `${status}: ${versionSignal}, ${exportSignal}${failedSuffix}.`;
}

function createDiffSummary(input: {
  project: ProjectSummary;
  localAhead: boolean;
  cloudAhead: boolean;
  exportBehind: boolean;
  staleManifest: boolean;
  editableConflict: boolean;
  hasFailedExport: boolean;
}) {
  const reasons = [
    input.editableConflict
      ? "editable share can race with desktop edits"
      : null,
    input.localAhead
      ? "local project metadata is ahead of cloud version evidence"
      : null,
    input.cloudAhead
      ? "cloud version evidence is newer than local metadata"
      : null,
    input.exportBehind ? "completed export handoff is missing or stale" : null,
    input.staleManifest ? "offline asset manifest is missing or stale" : null,
    input.hasFailedExport ? "failed export blocks offline packaging" : null,
  ].filter((reason): reason is string => Boolean(reason));

  return `${input.project.name}: ${reasons.join("; ")}.`;
}

function createAssetRepairDetail(input: {
  manifest: AssetAuditRecord | null;
  stale: boolean;
  skippedReferences: number;
  largeManifest: boolean;
}) {
  if (!input.manifest) {
    return "Project is missing a local asset manifest for desktop/cloud reconciliation.";
  }

  const parts = [
    input.stale
      ? `Manifest last updated ${formatDesktopSyncTimestamp(input.manifest.updatedAt)}.`
      : null,
    input.skippedReferences
      ? `${input.skippedReferences} skipped references need hosted or cached replacements.`
      : null,
    input.largeManifest
      ? `${formatAssetBytes(input.manifest.sizeBytes)} should use resumable desktop handoff.`
      : null,
  ].filter((part): part is string => Boolean(part));

  return parts.join(" ");
}
