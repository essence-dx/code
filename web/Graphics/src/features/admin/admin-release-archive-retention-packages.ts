import {
  addDays,
  createArchiveItem,
  createArchivePackage,
  searchable,
  type AdminReleaseArchiveItem,
  type AdminReleaseArchivePackage,
} from "@/features/admin/admin-release-archive-retention-core";
import { getCurrentReleaseArchiveItems } from "@/features/admin/admin-release-archive-retention-current";
import type { AdminReleaseArchiveRetentionInput } from "@/features/admin/admin-release-archive-retention";
import type { AdminReleaseApprovalSnapshot } from "@/features/admin/admin-release-approval-snapshots";

export function getReleaseArchivePackages({
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
}: Omit<AdminReleaseArchiveRetentionInput, "retentionPrivacy"> & {
  generatedAt: string;
  retentionDays: number;
}): AdminReleaseArchivePackage[] {
  const latestApproval = releaseApprovalSnapshots[0] ?? null;
  const currentReleaseLabel =
    latestApproval?.releaseLabel ??
    releaseChannels.packages[0]?.releaseLabel ??
    "Current release";

  return [
    createArchivePackage({
      id: "current-release-archive-package",
      label: "Current release archive",
      releaseLabel: currentReleaseLabel,
      items: getCurrentReleaseArchiveItems({
        accessibilityPrivacyRelease,
        desktopUpdateChannels,
        latestApproval,
        operatorRehearsals,
        productionDeploySmoke,
        releaseArtifactManifest,
        releaseChannels,
        retentionDays,
        rollbackReadiness,
      }),
    }),
    ...releaseApprovalSnapshots.slice(0, 10).map((snapshot) =>
      createArchivePackage({
        id: `approval-archive-${snapshot.id}`,
        label: snapshot.releaseLabel,
        releaseLabel: snapshot.releaseLabel,
        items: getApprovalArchiveItems({
          generatedAt,
          retentionDays,
          snapshot,
        }),
      }),
    ),
  ];
}

function getApprovalArchiveItems({
  generatedAt,
  retentionDays,
  snapshot,
}: {
  generatedAt: string;
  retentionDays: number;
  snapshot: AdminReleaseApprovalSnapshot;
}): AdminReleaseArchiveItem[] {
  return [
    createArchiveItem({
      id: `approval-${snapshot.id}`,
      kind: "approval",
      status: getSnapshotArchiveStatus(snapshot),
      label: "Release approval snapshot",
      releaseLabel: snapshot.releaseLabel,
      createdAt: snapshot.createdAt,
      retentionUntil: addDays(snapshot.createdAt, retentionDays),
      searchableText: searchable(
        snapshot.releaseLabel,
        snapshot.reviewerEmail,
        snapshot.commitSha,
        snapshot.deploymentUrl,
        snapshot.rollbackNotes,
        snapshot.smokeArtifacts.join(" "),
      ),
      summary: `${snapshot.reviewerEmail} approved ${snapshot.commitSha} with ${snapshot.smokeArtifacts.length} smoke artifacts.`,
      recommendation:
        "Keep approval snapshots searchable by reviewer, commit, deployment URL, smoke artifacts, and rollback notes.",
      artifactCount: snapshot.smokeArtifacts.length + 1,
      sourceId: snapshot.id,
    }),
    createArchiveItem({
      id: `approval-smoke-${snapshot.id}`,
      kind: "smoke",
      status: snapshot.preflightStatus,
      label: "Approval smoke artifact references",
      releaseLabel: snapshot.releaseLabel,
      createdAt: snapshot.createdAt,
      retentionUntil: addDays(snapshot.createdAt, retentionDays),
      searchableText: searchable(
        snapshot.releaseLabel,
        snapshot.smokeArtifacts.join(" "),
        snapshot.deploymentUrl,
        "approval smoke artifacts",
      ),
      summary: `${snapshot.smokeArtifacts.length} smoke artifact references were attached to the approval snapshot.`,
      recommendation:
        "Ensure referenced smoke artifacts are stored beside the release archive package.",
      artifactCount: snapshot.smokeArtifacts.length,
      sourceId: snapshot.id,
    }),
    createArchiveItem({
      id: `approval-rollback-${snapshot.id}`,
      kind: "rollback",
      status: snapshot.incidentStatus,
      label: "Approval rollback notes",
      releaseLabel: snapshot.releaseLabel,
      createdAt: snapshot.createdAt,
      retentionUntil: addDays(generatedAt, retentionDays),
      searchableText: searchable(
        snapshot.releaseLabel,
        snapshot.rollbackNotes,
        "approval rollback recovery notes",
      ),
      summary: snapshot.rollbackNotes,
      recommendation:
        "Keep rollback notes attached to the release archive until the retention window closes.",
      artifactCount: 1,
      sourceId: snapshot.id,
    }),
  ];
}

function getSnapshotArchiveStatus(snapshot: AdminReleaseApprovalSnapshot) {
  if (
    snapshot.preflightStatus === "blocked" ||
    snapshot.incidentStatus === "blocked"
  ) {
    return "blocked";
  }

  return snapshot.preflightStatus === "review" ||
    snapshot.incidentStatus === "review"
    ? "review"
    : "ready";
}
