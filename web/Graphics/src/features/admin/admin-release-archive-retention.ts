import type { AccessibilityPrivacyReleaseChecklist } from "@/features/admin/admin-accessibility-privacy-release";
import type { AdminDesktopUpdateChannelReport } from "@/features/admin/admin-desktop-update-channel";
import {
  getRowsScore,
  getRowsStatus,
  isExpired,
  uniqueStrings,
  type AdminReleaseArchiveRetentionReport,
} from "@/features/admin/admin-release-archive-retention-core";
import { getReleaseArchivePackages } from "@/features/admin/admin-release-archive-retention-packages";
import type { AdminOperatorRehearsalReport } from "@/features/admin/admin-operator-rehearsals";
import type { AdminReleaseApprovalSnapshot } from "@/features/admin/admin-release-approval-snapshots";
import type { AdminReleaseArtifactManifestReport } from "@/features/admin/admin-release-artifact-manifest";
import type { AdminReleaseChannelsReport } from "@/features/admin/admin-release-channels";
import type { RetentionPrivacyReport } from "@/features/admin/admin-retention-privacy";
import type { AdminRollbackReadinessReport } from "@/features/admin/admin-rollback-readiness";
import type { ProductionDeploySmokeReport } from "@/features/editor/production-deploy-smoke";

export type {
  AdminReleaseArchiveItem,
  AdminReleaseArchiveItemKind,
  AdminReleaseArchivePackage,
  AdminReleaseArchiveRetentionReport,
  AdminReleaseArchiveRetentionStatus,
} from "@/features/admin/admin-release-archive-retention-core";

export type AdminReleaseArchiveRetentionInput = {
  accessibilityPrivacyRelease: AccessibilityPrivacyReleaseChecklist;
  desktopUpdateChannels: AdminDesktopUpdateChannelReport;
  generatedAt?: string;
  operatorRehearsals: AdminOperatorRehearsalReport;
  productionDeploySmoke: ProductionDeploySmokeReport;
  releaseApprovalSnapshots: AdminReleaseApprovalSnapshot[];
  releaseArtifactManifest: AdminReleaseArtifactManifestReport;
  releaseChannels: AdminReleaseChannelsReport;
  retentionPrivacy: RetentionPrivacyReport;
  rollbackReadiness: AdminRollbackReadinessReport;
};

export function getAdminReleaseArchiveRetentionReport({
  accessibilityPrivacyRelease,
  desktopUpdateChannels,
  generatedAt = new Date().toISOString(),
  operatorRehearsals,
  productionDeploySmoke,
  releaseApprovalSnapshots,
  releaseArtifactManifest,
  releaseChannels,
  retentionPrivacy,
  rollbackReadiness,
}: AdminReleaseArchiveRetentionInput): AdminReleaseArchiveRetentionReport {
  const retentionDays = retentionPrivacy.settings.auditLogRetentionDays;
  const packages = getReleaseArchivePackages({
    accessibilityPrivacyRelease,
    desktopUpdateChannels,
    generatedAt,
    operatorRehearsals,
    productionDeploySmoke,
    releaseApprovalSnapshots,
    releaseArtifactManifest,
    releaseChannels,
    retentionDays,
    rollbackReadiness,
  });
  const items = packages.flatMap((archivePackage) => archivePackage.items);
  const now = new Date(generatedAt).getTime();
  const readyCount = items.filter((item) => item.status === "ready").length;
  const reviewCount = items.filter((item) => item.status === "review").length;
  const blockedCount = items.filter((item) => item.status === "blocked").length;
  const expiredCount = items.filter((item) =>
    isExpired(item.retentionUntil, now),
  ).length;
  const commands = uniqueStrings([
    "Export Admin > Release archive retention JSON.",
    "Export Admin > Release archive retention CSV.",
    "Search the Release archive retention panel by release label, commit, deployment URL, package name, smoke artifact, privacy surface, or rollback note.",
    "Store signed manifests, approvals, smoke reports, privacy checklists, and rollback bundles until the archive retention window closes.",
  ]);

  return {
    generatedAt,
    status:
      expiredCount > 0
        ? "review"
        : getRowsStatus(items.map((item) => item.status)),
    score: Math.max(0, getRowsScore(items) - expiredCount * 4),
    retentionDays,
    packageCount: packages.length,
    itemCount: items.length,
    approvalCount: items.filter((item) => item.kind === "approval").length,
    smokeCount: items.filter((item) => item.kind === "smoke").length,
    privacyCount: items.filter((item) => item.kind === "privacy").length,
    rollbackCount: items.filter((item) => item.kind === "rollback").length,
    manifestCount: items.filter((item) => item.kind === "manifest").length,
    readyCount,
    reviewCount,
    blockedCount,
    expiredCount,
    searchableCount: items.filter((item) => item.searchableText.length > 0).length,
    packages,
    items,
    commands,
  };
}
