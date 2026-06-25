import type { AdminAuditMetadata } from "@/db/schema";

export const RELEASE_APPROVAL_ACTION = "release.approval.snapshot";

export type AdminReleaseApprovalSnapshotStatus = "ready" | "review" | "blocked";

export type AdminReleaseApprovalSnapshot = {
  id: string;
  releaseLabel: string;
  reviewerEmail: string;
  reviewerName: string;
  commitSha: string;
  deploymentUrl: string;
  smokeArtifacts: string[];
  rollbackNotes: string;
  preflightStatus: AdminReleaseApprovalSnapshotStatus;
  preflightScore: number;
  incidentStatus: AdminReleaseApprovalSnapshotStatus;
  incidentScore: number;
  createdAt: string;
};

export type AdminReleaseApprovalDefaults = {
  commitSha: string;
  deploymentUrl: string;
};

export type ReleaseApprovalSnapshotInput = {
  snapshotId: string;
  releaseLabel: string;
  reviewerEmail: string;
  reviewerName: string;
  commitSha: string;
  deploymentUrl: string;
  smokeArtifacts: string[];
  rollbackNotes: string;
  preflightStatus: AdminReleaseApprovalSnapshotStatus;
  preflightScore: number;
  incidentStatus: AdminReleaseApprovalSnapshotStatus;
  incidentScore: number;
};

type ReleaseApprovalAuditEvent = {
  id: string;
  actorEmail: string;
  action: string;
  targetLabel: string;
  metadata: AdminAuditMetadata;
  createdAt: string;
};

export function getAdminReleaseApprovalSnapshots(
  events: ReleaseApprovalAuditEvent[],
): AdminReleaseApprovalSnapshot[] {
  return events
    .filter((event) => event.action === RELEASE_APPROVAL_ACTION)
    .map(parseReleaseApprovalSnapshot)
    .filter((snapshot): snapshot is AdminReleaseApprovalSnapshot =>
      Boolean(snapshot),
    )
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    );
}

export function createReleaseApprovalSnapshotMetadata({
  snapshotId,
  releaseLabel,
  reviewerEmail,
  reviewerName,
  commitSha,
  deploymentUrl,
  smokeArtifacts,
  rollbackNotes,
  preflightStatus,
  preflightScore,
  incidentStatus,
  incidentScore,
}: ReleaseApprovalSnapshotInput): AdminAuditMetadata {
  return {
    snapshotId,
    releaseLabel,
    reviewerEmail,
    reviewerName,
    commitSha,
    deploymentUrl,
    smokeArtifactsText: smokeArtifacts.join("\n"),
    smokeArtifactCount: smokeArtifacts.length,
    rollbackNotes,
    preflightStatus,
    preflightScore,
    incidentStatus,
    incidentScore,
  };
}

export function parseSmokeArtifacts(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function parseReleaseApprovalSnapshot(
  event: ReleaseApprovalAuditEvent,
): AdminReleaseApprovalSnapshot | null {
  const metadata = event.metadata;
  const snapshotId = getString(metadata.snapshotId) || event.id;
  const commitSha = getString(metadata.commitSha);
  const deploymentUrl = getString(metadata.deploymentUrl);
  const rollbackNotes = getString(metadata.rollbackNotes);

  if (!commitSha || !deploymentUrl || !rollbackNotes) {
    return null;
  }

  return {
    id: snapshotId,
    releaseLabel:
      getString(metadata.releaseLabel) || event.targetLabel || "Release",
    reviewerEmail: getString(metadata.reviewerEmail) || event.actorEmail,
    reviewerName: getString(metadata.reviewerName) || event.actorEmail,
    commitSha,
    deploymentUrl,
    smokeArtifacts: parseSmokeArtifacts(getString(metadata.smokeArtifactsText)),
    rollbackNotes,
    preflightStatus: getSnapshotStatus(metadata.preflightStatus),
    preflightScore: getScore(metadata.preflightScore),
    incidentStatus: getSnapshotStatus(metadata.incidentStatus),
    incidentScore: getScore(metadata.incidentScore),
    createdAt: event.createdAt,
  };
}

function getString(value: AdminAuditMetadata[string]) {
  return typeof value === "string" ? value.trim() : "";
}

function getScore(value: AdminAuditMetadata[string]) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getSnapshotStatus(
  value: AdminAuditMetadata[string],
): AdminReleaseApprovalSnapshotStatus {
  return value === "ready" || value === "review" || value === "blocked"
    ? value
    : "review";
}
