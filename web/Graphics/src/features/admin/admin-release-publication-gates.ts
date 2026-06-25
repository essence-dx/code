import type {
  AdminCollaborationHandoffOperationsReport,
  AdminCollaborationHandoffStatus,
} from "@/features/admin/admin-collaboration-handoff-operations";
import type {
  AdminPublishChannelManagerReport,
  AdminPublishChannelStatus,
} from "@/features/admin/admin-publish-channel-manager";
import type {
  AdminPublicLinkObservabilityReport,
  AdminPublicLinkStatus,
} from "@/features/admin/admin-public-link-observability";
import type {
  AdminReleaseApprovalSnapshot,
  AdminReleaseApprovalSnapshotStatus,
} from "@/features/admin/admin-release-approval-snapshots";
import type {
  AdminWorkspaceAccessBudgetReport,
  AdminWorkspaceAccessBudgetStatus,
} from "@/features/admin/admin-workspace-access-budget";
import type {
  ProductionDeploySmokeReport,
  ProductionDeploySmokeStatus,
} from "@/features/editor/production-deploy-smoke";

export type AdminReleasePublicationGateStatus = "ready" | "review" | "blocked";

export type AdminReleasePublicationGateCategory =
  | "access"
  | "approval"
  | "collaboration"
  | "deploy-smoke"
  | "public-links"
  | "publish-channels";

export type AdminReleasePublicationGateRow = {
  id: string;
  category: AdminReleasePublicationGateCategory;
  status: AdminReleasePublicationGateStatus;
  label: string;
  value: string;
  detail: string;
  recommendation: string;
  target: string | null;
  latestAt: string | null;
};

export type AdminReleasePublicationGateReport = {
  generatedAt: string;
  status: AdminReleasePublicationGateStatus;
  score: number;
  canPublish: boolean;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  deploySmokeScore: number;
  publishChannelScore: number;
  publicLinkScore: number;
  accessBudgetScore: number;
  collaborationScore: number;
  latestApprovalAt: string | null;
  approvalSnapshotCount: number;
  readyPublishChannelCount: number;
  releaseSafeSurfaceCount: number;
  unresolvedMentionCount: number;
  escalationQueueCount: number;
  riskyShareCount: number;
  rows: AdminReleasePublicationGateRow[];
  commands: string[];
};

export type AdminReleasePublicationGateInput = {
  collaborationHandoffOperations: AdminCollaborationHandoffOperationsReport;
  generatedAt?: string;
  productionDeploySmoke: ProductionDeploySmokeReport;
  publicLinkObservability: AdminPublicLinkObservabilityReport;
  publishChannels: AdminPublishChannelManagerReport;
  releaseApprovalSnapshots: AdminReleaseApprovalSnapshot[];
  workspaceAccessBudget: AdminWorkspaceAccessBudgetReport;
};

export function getAdminReleasePublicationGateReport({
  collaborationHandoffOperations,
  generatedAt = new Date().toISOString(),
  productionDeploySmoke,
  publicLinkObservability,
  publishChannels,
  releaseApprovalSnapshots,
  workspaceAccessBudget,
}: AdminReleasePublicationGateInput): AdminReleasePublicationGateReport {
  const rows = [
    getDeploySmokeGate(productionDeploySmoke),
    getPublishChannelGate(publishChannels),
    getPublicLinkGate(publicLinkObservability),
    getAccessBudgetGate(workspaceAccessBudget),
    getCollaborationGate(collaborationHandoffOperations),
    getApprovalGate(releaseApprovalSnapshots),
  ];
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const status: AdminReleasePublicationGateStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    generatedAt,
    status,
    score: Math.max(0, 100 - blockedCount * 18 - reviewCount * 7),
    canPublish: status === "ready",
    readyCount,
    reviewCount,
    blockedCount,
    deploySmokeScore: productionDeploySmoke.score,
    publishChannelScore: publishChannels.score,
    publicLinkScore: publicLinkObservability.score,
    accessBudgetScore: workspaceAccessBudget.score,
    collaborationScore: collaborationHandoffOperations.score,
    latestApprovalAt: releaseApprovalSnapshots[0]?.createdAt ?? null,
    approvalSnapshotCount: releaseApprovalSnapshots.length,
    readyPublishChannelCount: publishChannels.readyCount,
    releaseSafeSurfaceCount: publicLinkObservability.releaseSafeCount,
    unresolvedMentionCount: collaborationHandoffOperations.unresolvedMentionCount,
    escalationQueueCount: collaborationHandoffOperations.escalationQueueCount,
    riskyShareCount: workspaceAccessBudget.riskyShareCount,
    rows: rows.sort(sortPublicationGateRows),
    commands: getPublicationGateCommands(),
  };
}

function getDeploySmokeGate(
  report: ProductionDeploySmokeReport,
): AdminReleasePublicationGateRow {
  const status = fromSharedStatus(report.status);

  return {
    id: "publication-gate-deploy-smoke",
    category: "deploy-smoke",
    status,
    label: "Deploy smoke",
    value: `${report.readyCount}/${report.routeCount} ready`,
    detail: `${report.requiredRouteCount} required route${report.requiredRouteCount === 1 ? "" : "s"} checked with ${report.blockedCount} blocked and ${report.reviewCount} review item${report.reviewCount === 1 ? "" : "s"}.`,
    recommendation:
      status === "ready"
        ? "Attach the deploy smoke export to the publication approval packet."
        : "Resolve blocked required routes and refresh smoke evidence before publication.",
    target: report.baseUrl,
    latestAt: report.generatedAt,
  };
}

function getPublishChannelGate(
  report: AdminPublishChannelManagerReport,
): AdminReleasePublicationGateRow {
  const status = fromSharedStatus(report.status);

  return {
    id: "publication-gate-publish-channels",
    category: "publish-channels",
    status,
    label: "Publish channels",
    value: `${report.readyCount}/${report.channelCount} ready`,
    detail: `${report.approvalReadyCount} approved, ${report.rollbackLinkedCount} rollback-linked, ${report.staleChannelCount} stale, and ${report.routeSmokeBlockedCount} route-smoke blocked channel${report.channelCount === 1 ? "" : "s"}.`,
    recommendation:
      status === "ready"
        ? "Channels have enough approval, route, and rollback evidence for publication."
        : "Fix stale channels, blocked smoke, missing approvals, or rollback gaps before publishing.",
    target: report.channels.find((channel) => channel.status !== "ready")
      ?.targetUrl ?? report.channels[0]?.targetUrl ?? null,
    latestAt: report.generatedAt,
  };
}

function getPublicLinkGate(
  report: AdminPublicLinkObservabilityReport,
): AdminReleasePublicationGateRow {
  const status = fromSharedStatus(report.status);

  return {
    id: "publication-gate-public-links",
    category: "public-links",
    status,
    label: "Public link safety",
    value: `${report.releaseSafeCount}/${report.surfaceCount} safe`,
    detail: `${report.staleLinkCount} stale, ${report.noExpiryCount} without expiry, ${report.downloadExposureCount} with download exposure, ${report.commentExposureCount} with comment exposure, and ${report.missingReferrerNoteCount} missing referrer notes.`,
    recommendation:
      status === "ready"
        ? "Public link surfaces are release-safe and ready for the publication packet."
        : "Resolve unsafe links, expiries, exposure, referrer notes, and route-smoke blockers.",
    target: report.surfaces.find((surface) => surface.status !== "ready")
      ?.targetUrl ?? report.surfaces[0]?.targetUrl ?? null,
    latestAt: report.generatedAt,
  };
}

function getAccessBudgetGate(
  report: AdminWorkspaceAccessBudgetReport,
): AdminReleasePublicationGateRow {
  const status = fromSharedStatus(report.status);

  return {
    id: "publication-gate-access-budget",
    category: "access",
    status,
    label: "Access budget",
    value: `${report.score}/100`,
    detail: `${report.externalDomainCount} external domain${report.externalDomainCount === 1 ? "" : "s"}, ${report.elevatedCollaboratorCount} elevated collaborator${report.elevatedCollaboratorCount === 1 ? "" : "s"}, ${report.staleCollaboratorCount} stale collaborator${report.staleCollaboratorCount === 1 ? "" : "s"}, and ${report.riskyShareCount} risky share signal${report.riskyShareCount === 1 ? "" : "s"}.`,
    recommendation:
      status === "ready"
        ? "Access budget is within publication policy."
        : "Reduce external domain drift, stale collaborators, risky shares, or pending role changes.",
    target: report.rows.find((row) => row.status !== "ready")?.label ?? null,
    latestAt: report.generatedAt,
  };
}

function getCollaborationGate(
  report: AdminCollaborationHandoffOperationsReport,
): AdminReleasePublicationGateRow {
  const status = fromSharedStatus(report.status);

  return {
    id: "publication-gate-collaboration",
    category: "collaboration",
    status,
    label: "Collaboration handoff",
    value: `${report.score}/100`,
    detail: `${report.capturedRoomCount}/${report.roomCount} captured rooms, ${report.staleRoomCount} stale rooms, ${report.unresolvedMentionCount} unresolved mentions, ${report.escalationQueueCount} escalation signals, and ${report.archivedEvidenceCount} archived evidence records.`,
    recommendation:
      status === "ready"
        ? "Collaboration evidence is ready for release publication."
        : "Archive room evidence, assign handoff owners, clear stale snapshots, and resolve queues.",
    target: report.rooms.find((room) => room.status !== "ready")?.fileName ??
      report.rooms[0]?.fileName ??
      null,
    latestAt: report.generatedAt,
  };
}

function getApprovalGate(
  snapshots: AdminReleaseApprovalSnapshot[],
): AdminReleasePublicationGateRow {
  const latest = snapshots[0];

  if (!latest) {
    return {
      id: "publication-gate-approval",
      category: "approval",
      status: "blocked",
      label: "Publication approval",
      value: "Missing",
      detail:
        "No release approval snapshot exists for the current publication window.",
      recommendation:
        "Save an approval snapshot after the publication gates are ready.",
      target: null,
      latestAt: null,
    };
  }

  const status = getApprovalStatus(latest);

  return {
    id: "publication-gate-approval",
    category: "approval",
    status,
    label: "Publication approval",
    value: latest.releaseLabel,
    detail: `${latest.reviewerEmail} saved ${latest.smokeArtifacts.length} smoke artifact${latest.smokeArtifacts.length === 1 ? "" : "s"} for ${latest.deploymentUrl}.`,
    recommendation:
      status === "ready"
        ? "Approval snapshot can anchor the final publication decision."
        : "Refresh approval after preflight, incidents, smoke artifacts, and rollback notes are ready.",
    target: latest.deploymentUrl,
    latestAt: latest.createdAt,
  };
}

function getApprovalStatus(
  snapshot: AdminReleaseApprovalSnapshot,
): AdminReleasePublicationGateStatus {
  if (
    snapshot.preflightStatus === "blocked" ||
    snapshot.incidentStatus === "blocked" ||
    snapshot.smokeArtifacts.length === 0 ||
    !snapshot.rollbackNotes.trim()
  ) {
    return "blocked";
  }

  if (snapshot.preflightStatus === "review" || snapshot.incidentStatus === "review") {
    return "review";
  }

  return "ready";
}

function fromSharedStatus(
  status:
    | AdminCollaborationHandoffStatus
    | AdminPublishChannelStatus
    | AdminPublicLinkStatus
    | AdminReleaseApprovalSnapshotStatus
    | AdminWorkspaceAccessBudgetStatus
    | ProductionDeploySmokeStatus,
): AdminReleasePublicationGateStatus {
  return status;
}

function sortPublicationGateRows(
  first: AdminReleasePublicationGateRow,
  second: AdminReleasePublicationGateRow,
) {
  return (
    getStatusWeight(first.status) - getStatusWeight(second.status) ||
    first.category.localeCompare(second.category)
  );
}

function getStatusWeight(status: AdminReleasePublicationGateStatus) {
  if (status === "blocked") {
    return 0;
  }

  if (status === "review") {
    return 1;
  }

  return 2;
}

function getPublicationGateCommands() {
  return [
    "Run deploy smoke and route checks before saving a publication approval snapshot.",
    "Resolve publish-channel, public-link, access-budget, and collaboration handoff blockers before release.",
    "Attach JSON/CSV/Markdown evidence exports for the publication gate report to the release packet.",
    "Only promote public links once the publication gate status is ready.",
  ];
}
