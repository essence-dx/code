import type { AccessibilityPrivacyReleaseChecklist } from "@/features/admin/admin-accessibility-privacy-release";
import type { AdminDesktopUpdateChannelReport } from "@/features/admin/admin-desktop-update-channel";
import type { AdminReleaseArchiveItem } from "@/features/admin/admin-release-archive-retention-core";
import {
  addDays,
  createArchiveItem,
  searchable,
} from "@/features/admin/admin-release-archive-retention-core";
import type { AdminOperatorRehearsalReport } from "@/features/admin/admin-operator-rehearsals";
import type { AdminReleaseApprovalSnapshot } from "@/features/admin/admin-release-approval-snapshots";
import type { AdminReleaseArtifactManifestReport } from "@/features/admin/admin-release-artifact-manifest";
import type { AdminReleaseChannelsReport } from "@/features/admin/admin-release-channels";
import type { AdminRollbackReadinessReport } from "@/features/admin/admin-rollback-readiness";
import type { ProductionDeploySmokeReport } from "@/features/editor/production-deploy-smoke";

export function getCurrentReleaseArchiveItems({
  accessibilityPrivacyRelease,
  desktopUpdateChannels,
  latestApproval,
  operatorRehearsals,
  productionDeploySmoke,
  releaseArtifactManifest,
  releaseChannels,
  retentionDays,
  rollbackReadiness,
}: {
  accessibilityPrivacyRelease: AccessibilityPrivacyReleaseChecklist;
  desktopUpdateChannels: AdminDesktopUpdateChannelReport;
  latestApproval: AdminReleaseApprovalSnapshot | null;
  operatorRehearsals: AdminOperatorRehearsalReport;
  productionDeploySmoke: ProductionDeploySmokeReport;
  releaseArtifactManifest: AdminReleaseArtifactManifestReport;
  releaseChannels: AdminReleaseChannelsReport;
  retentionDays: number;
  rollbackReadiness: AdminRollbackReadinessReport;
}): AdminReleaseArchiveItem[] {
  const releaseLabel =
    latestApproval?.releaseLabel ??
    releaseChannels.packages[0]?.releaseLabel ??
    "Current release";

  return [
    createArchiveItem({
      id: `manifest-${releaseArtifactManifest.manifestId}`,
      kind: "manifest",
      status: releaseArtifactManifest.status,
      label: "Signed artifact manifest",
      releaseLabel,
      createdAt: releaseArtifactManifest.generatedAt,
      retentionUntil: addDays(releaseArtifactManifest.generatedAt, retentionDays),
      searchableText: searchable(
        releaseLabel,
        releaseArtifactManifest.manifestId,
        releaseArtifactManifest.checksum,
        releaseArtifactManifest.signature,
        "signed manifest desktop web self-hosted offline vault support bundle",
      ),
      summary: `${releaseArtifactManifest.artifactCount} artifacts, ${releaseArtifactManifest.signedArtifactCount} signed, ${releaseArtifactManifest.blockedArtifactCount} blocked.`,
      recommendation:
        "Archive manifest JSON, CSV, checksum, and signature with each release record.",
      artifactCount: releaseArtifactManifest.artifactCount,
      sourceId: releaseArtifactManifest.manifestId,
    }),
    createArchiveItem({
      id: "packages-release-channels",
      kind: "package",
      status: releaseChannels.status,
      label: "Release channel packages",
      releaseLabel,
      createdAt: releaseChannels.generatedAt,
      retentionUntil: addDays(releaseChannels.generatedAt, retentionDays),
      searchableText: searchable(
        releaseLabel,
        ...releaseChannels.packages.map(
          (releasePackage) => releasePackage.packageName,
        ),
        "web desktop self-hosted package release channels",
      ),
      summary: `${releaseChannels.channelCount} channels, ${releaseChannels.artifactCount} artifacts, ${releaseChannels.commandCount} commands.`,
      recommendation:
        "Keep web, desktop, and self-hosted package exports searchable by channel, version, and commit.",
      artifactCount: releaseChannels.artifactCount,
      sourceId: "release-channels",
    }),
    createArchiveItem({
      id: "smoke-production-routes",
      kind: "smoke",
      status: productionDeploySmoke.status,
      label: "Production smoke reports",
      releaseLabel,
      createdAt: productionDeploySmoke.generatedAt,
      retentionUntil: addDays(productionDeploySmoke.generatedAt, retentionDays),
      searchableText: searchable(
        releaseLabel,
        productionDeploySmoke.baseUrl,
        productionDeploySmoke.shareToken,
        "auth editor admin share prototype release handoff smoke",
      ),
      summary: `${productionDeploySmoke.readyCount} ready, ${productionDeploySmoke.reviewCount} review, and ${productionDeploySmoke.blockedCount} blocked route checks.`,
      recommendation:
        "Archive route-health JSON and Markdown beside the deployment URL and share token used for smoke checks.",
      artifactCount: productionDeploySmoke.rows.length,
      sourceId: "production-deploy-smoke",
    }),
    createArchiveItem({
      id: "privacy-release-checklist",
      kind: "privacy",
      status: accessibilityPrivacyRelease.status,
      label: "Privacy and accessibility checklist",
      releaseLabel,
      createdAt: accessibilityPrivacyRelease.generatedAt,
      retentionUntil: addDays(
        accessibilityPrivacyRelease.generatedAt,
        retentionDays,
      ),
      searchableText: searchable(
        releaseLabel,
        "privacy accessibility editor admin share prototype checklist",
        accessibilityPrivacyRelease.score,
      ),
      summary: `${accessibilityPrivacyRelease.readyCount} ready, ${accessibilityPrivacyRelease.reviewCount} review, and ${accessibilityPrivacyRelease.blockedCount} blocked release checks.`,
      recommendation:
        "Keep privacy and accessibility release exports searchable by surface and release score.",
      artifactCount: accessibilityPrivacyRelease.rows.length,
      sourceId: "accessibility-privacy-release",
    }),
    createArchiveItem({
      id: "rollback-readiness-bundle",
      kind: "rollback",
      status: rollbackReadiness.status,
      label: "Rollback readiness bundle",
      releaseLabel,
      createdAt: rollbackReadiness.generatedAt,
      retentionUntil: addDays(rollbackReadiness.generatedAt, retentionDays),
      searchableText: searchable(
        releaseLabel,
        "rollback restore versions shares database deployment",
        rollbackReadiness.deploymentUrls.join(" "),
      ),
      summary: `${rollbackReadiness.versionAnchorCount} version anchors, ${rollbackReadiness.deploymentLinkCount} deployment links, and ${rollbackReadiness.shareAuditEventCount} share audit events.`,
      recommendation:
        "Archive rollback readiness with deployment links, share exposure, and version restore anchors.",
      artifactCount:
        rollbackReadiness.rows.length + rollbackReadiness.latestVersions.length,
      sourceId: "rollback-readiness",
    }),
    createArchiveItem({
      id: "operator-rehearsal-bundle",
      kind: "operator-rehearsal",
      status: operatorRehearsals.status,
      label: "Operator rehearsal bundle",
      releaseLabel,
      createdAt: operatorRehearsals.generatedAt,
      retentionUntil: addDays(operatorRehearsals.generatedAt, retentionDays),
      searchableText: searchable(
        releaseLabel,
        "operator rehearsal restore import export share privacy desktop self-hosted",
      ),
      summary: `${operatorRehearsals.runCount} drills, ${operatorRehearsals.stepCount} steps, and ${operatorRehearsals.commandCount} commands.`,
      recommendation:
        "Archive rehearsal exports so future release operators can replay the exact handoff drill.",
      artifactCount: operatorRehearsals.stepCount,
      sourceId: "operator-rehearsals",
    }),
    createArchiveItem({
      id: "desktop-update-channel-bundle",
      kind: "desktop-update",
      status: desktopUpdateChannels.status,
      label: "Desktop update channel bundle",
      releaseLabel,
      createdAt: desktopUpdateChannels.generatedAt,
      retentionUntil: addDays(desktopUpdateChannels.generatedAt, retentionDays),
      searchableText: searchable(
        releaseLabel,
        desktopUpdateChannels.activeChannel,
        desktopUpdateChannels.currentVersion,
        desktopUpdateChannels.targetVersion,
        "desktop update stable beta canary rollout hold",
      ),
      summary: `${desktopUpdateChannels.packageCount} update channels, active ${desktopUpdateChannels.activeChannel}, rollout ${desktopUpdateChannels.rolloutPercent}%.`,
      recommendation:
        "Archive desktop update-channel readiness before increasing rollout exposure.",
      artifactCount: desktopUpdateChannels.rows.length,
      sourceId: "desktop-update-channels",
    }),
  ];
}
