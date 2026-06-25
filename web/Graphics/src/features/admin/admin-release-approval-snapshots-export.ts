import type { AdminReleaseApprovalSnapshot } from "@/features/admin/admin-release-approval-snapshots";

export function getAdminReleaseApprovalSnapshotsJson(
  snapshots: AdminReleaseApprovalSnapshot[],
) {
  return JSON.stringify(snapshots, null, 2);
}

export function getAdminReleaseApprovalSnapshotsCsv(
  snapshots: AdminReleaseApprovalSnapshot[],
) {
  return [
    [
      "id",
      "release_label",
      "reviewer_email",
      "commit_sha",
      "deployment_url",
      "smoke_artifacts",
      "rollback_notes",
      "preflight_status",
      "preflight_score",
      "incident_status",
      "incident_score",
      "created_at",
    ].join(","),
    ...snapshots.map((snapshot) =>
      [
        snapshot.id,
        snapshot.releaseLabel,
        snapshot.reviewerEmail,
        snapshot.commitSha,
        snapshot.deploymentUrl,
        snapshot.smokeArtifacts.join("\n"),
        snapshot.rollbackNotes,
        snapshot.preflightStatus,
        snapshot.preflightScore,
        snapshot.incidentStatus,
        snapshot.incidentScore,
        snapshot.createdAt,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getAdminReleaseApprovalSnapshotsMarkdown(
  snapshots: AdminReleaseApprovalSnapshot[],
) {
  if (snapshots.length === 0) {
    return [
      "# Release Approval Snapshots",
      "",
      "No release approval snapshots have been recorded.",
    ].join("\n");
  }

  return [
    "# Release Approval Snapshots",
    "",
    `Snapshots: ${snapshots.length}`,
    "",
    ...snapshots.flatMap((snapshot) => [
      `## ${snapshot.releaseLabel}`,
      "",
      `- Created: ${snapshot.createdAt}`,
      `- Reviewer: ${snapshot.reviewerName} <${snapshot.reviewerEmail}>`,
      `- Commit: ${snapshot.commitSha}`,
      `- Deployment: ${snapshot.deploymentUrl}`,
      `- Preflight: ${snapshot.preflightStatus} ${snapshot.preflightScore}`,
      `- Incident review: ${snapshot.incidentStatus} ${snapshot.incidentScore}`,
      `- Smoke artifacts: ${snapshot.smokeArtifacts.length}`,
      "",
      "### Smoke Artifacts",
      "",
      ...(snapshot.smokeArtifacts.length > 0
        ? snapshot.smokeArtifacts.map((artifact) => `- ${artifact}`)
        : ["- None recorded"]),
      "",
      "### Rollback Notes",
      "",
      snapshot.rollbackNotes,
      "",
    ]),
  ].join("\n");
}

function escapeCsvCell(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
