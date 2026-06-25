import type {
  AdminAuditRow,
  AdminFileRow,
  AdminShareRow,
  AdminUserRow,
} from "@/features/admin/admin-data";
import type { AdminDataLossPreventionReport } from "@/features/admin/admin-data-loss-prevention";
import type { AdminReleaseRiskTimelineReport } from "@/features/admin/admin-release-risk-timeline";
import type { RoleChangeApprovalQueue } from "@/features/admin/admin-role-change-approval";
import type { AdminWorkspaceAccessBudgetReport } from "@/features/admin/admin-workspace-access-budget";
import type { AdminWorkspaceCapacityForecastReport } from "@/features/admin/admin-workspace-capacity-forecast";

export type AdminOrganizationAuditStatus = "ready" | "review" | "blocked";
export type AdminOrganizationAuditSeverity = "high" | "low" | "medium";

export type AdminOrganizationAuditCategory =
  | "access-control"
  | "admin-actions"
  | "capacity"
  | "data-protection"
  | "file-governance"
  | "release-operations"
  | "share-exposure"
  | "user-verification";

export type AdminOrganizationAuditCluster = {
  id: string;
  category: AdminOrganizationAuditCategory;
  status: AdminOrganizationAuditStatus;
  severity: AdminOrganizationAuditSeverity;
  title: string;
  detail: string;
  evidence: string;
  reviewer: string;
  recommendation: string;
  eventIds: string[];
  packetId: string;
  latestAt: string | null;
};

export type AdminOrganizationAuditReviewerQueue = {
  reviewer: string;
  status: AdminOrganizationAuditStatus;
  openClusterCount: number;
  blockedClusterCount: number;
  highSeverityCount: number;
  packetIds: string[];
};

export type AdminOrganizationAuditInvestigationPacket = {
  id: string;
  status: AdminOrganizationAuditStatus;
  severity: AdminOrganizationAuditSeverity;
  title: string;
  reviewer: string;
  summary: string;
  redactedEvidence: string;
  relatedClusterIds: string[];
  eventIds: string[];
  actions: string[];
  exportedAt: string;
};

export type AdminOrganizationAuditIntelligenceReport = {
  generatedAt: string;
  status: AdminOrganizationAuditStatus;
  score: number;
  clusterCount: number;
  packetCount: number;
  reviewerQueueCount: number;
  blockedCount: number;
  reviewCount: number;
  highSeverityCount: number;
  clusters: AdminOrganizationAuditCluster[];
  reviewerQueues: AdminOrganizationAuditReviewerQueue[];
  investigationPackets: AdminOrganizationAuditInvestigationPacket[];
  commands: string[];
};

export type AdminOrganizationAuditIntelligenceInput = {
  generatedAt?: string;
  auditEvents: AdminAuditRow[];
  users: AdminUserRow[];
  files: AdminFileRow[];
  shares: AdminShareRow[];
  roleChangeApprovals: Pick<
    RoleChangeApprovalQueue,
    "approvedCount" | "generatedAt" | "pendingCount" | "rejectedCount" | "requests"
  >;
  dataLossPrevention: Pick<
    AdminDataLossPreventionReport,
    | "blockedCount"
    | "commands"
    | "downloadExposureCount"
    | "generatedAt"
    | "publicRouteRiskCount"
    | "reviewCount"
    | "score"
    | "sensitiveFileCount"
    | "sensitiveFindingCount"
    | "status"
  >;
  workspaceAccessBudget: Pick<
    AdminWorkspaceAccessBudgetReport,
    | "commands"
    | "downloadShareCount"
    | "elevatedCollaboratorCount"
    | "externalDomainCount"
    | "generatedAt"
    | "noExpiryShareCount"
    | "pendingRoleChangeCount"
    | "riskyShareCount"
    | "score"
    | "status"
  >;
  releaseRiskTimeline: Pick<
    AdminReleaseRiskTimelineReport,
    | "commandCount"
    | "commands"
    | "correlationCount"
    | "generatedAt"
    | "highRiskCount"
    | "score"
    | "status"
  >;
  workspaceCapacityForecast: Pick<
    AdminWorkspaceCapacityForecastReport,
    | "blockedCount"
    | "collaborationRoomCount"
    | "commands"
    | "generatedAt"
    | "projected90DayStorageBytes"
    | "reviewCount"
    | "routeEventCount"
    | "score"
    | "status"
    | "storageUsedPercent"
  >;
};

const highImpactActions = new Set([
  "collaborator.role_change.approve",
  "collaborator.role_change.reject",
  "collaborator.role_change.request",
  "release.approval.snapshot",
  "session.revoke",
  "share.disable",
  "share.restore",
  "workspace.policy.update",
]);

const reviewerByCategory: Record<AdminOrganizationAuditCategory, string> = {
  "access-control": "Access reviewer",
  "admin-actions": "Admin lead",
  capacity: "Operations reviewer",
  "data-protection": "Security reviewer",
  "file-governance": "Design ops reviewer",
  "release-operations": "Release reviewer",
  "share-exposure": "Publication reviewer",
  "user-verification": "Access reviewer",
};

export function getAdminOrganizationAuditIntelligenceReport({
  auditEvents,
  dataLossPrevention,
  files,
  generatedAt = new Date().toISOString(),
  releaseRiskTimeline,
  roleChangeApprovals,
  shares,
  users,
  workspaceAccessBudget,
  workspaceCapacityForecast,
}: AdminOrganizationAuditIntelligenceInput): AdminOrganizationAuditIntelligenceReport {
  const clusters = [
    createAdminActionCluster(auditEvents),
    createAccessControlCluster(roleChangeApprovals, workspaceAccessBudget),
    createShareExposureCluster(shares, workspaceAccessBudget),
    createDataProtectionCluster(dataLossPrevention),
    createReleaseOperationsCluster(releaseRiskTimeline),
    createCapacityCluster(workspaceCapacityForecast),
    createUserVerificationCluster(users),
    createFileGovernanceCluster(files),
  ]
    .filter((cluster): cluster is AdminOrganizationAuditCluster =>
      Boolean(cluster),
    )
    .sort(sortClusters);
  const investigationPackets = clusters.map((cluster) =>
    createInvestigationPacket(cluster, generatedAt),
  );
  const reviewerQueues = getReviewerQueues(clusters);
  const blockedCount = clusters.filter((cluster) => cluster.status === "blocked")
    .length;
  const reviewCount = clusters.filter((cluster) => cluster.status === "review")
    .length;
  const highSeverityCount = clusters.filter(
    (cluster) => cluster.severity === "high",
  ).length;

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - highSeverityCount * 12 - reviewCount * 4),
    clusterCount: clusters.length,
    packetCount: investigationPackets.length,
    reviewerQueueCount: reviewerQueues.length,
    blockedCount,
    reviewCount,
    highSeverityCount,
    clusters,
    reviewerQueues,
    investigationPackets,
    commands: [
      "Export Admin > Organization audit intelligence JSON.",
      "Export Admin > Organization audit intelligence CSV.",
      "Copy redacted investigation packets into release, support, or security review handoffs.",
      ...uniqueStrings([
        ...dataLossPrevention.commands,
        ...workspaceAccessBudget.commands,
        ...releaseRiskTimeline.commands,
        ...workspaceCapacityForecast.commands,
      ]).slice(0, 6),
    ],
  };
}

export function getAdminOrganizationAuditIntelligenceJson(
  report: AdminOrganizationAuditIntelligenceReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminOrganizationAuditIntelligenceCsv(
  report: AdminOrganizationAuditIntelligenceReport,
) {
  return [
    [
      "id",
      "category",
      "status",
      "severity",
      "title",
      "detail",
      "evidence",
      "reviewer",
      "recommendation",
      "packet_id",
      "latest_at",
    ].join(","),
    ...report.clusters.map((cluster) =>
      [
        cluster.id,
        cluster.category,
        cluster.status,
        cluster.severity,
        cluster.title,
        cluster.detail,
        cluster.evidence,
        cluster.reviewer,
        cluster.recommendation,
        cluster.packetId,
        cluster.latestAt ?? "",
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getAdminOrganizationAuditIntelligenceMarkdown(
  report: AdminOrganizationAuditIntelligenceReport,
) {
  return [
    "# Organization Audit Intelligence",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Clusters: ${report.clusterCount}`,
    `Packets: ${report.packetCount}`,
    "",
    "## Reviewer Queues",
    "",
    ...report.reviewerQueues.map(
      (queue) =>
        `- [${queue.status}] ${queue.reviewer}: ${queue.openClusterCount} open clusters, ${queue.blockedClusterCount} blocked, packets ${queue.packetIds.join(", ")}`,
    ),
    "",
    "## Clusters",
    "",
    ...report.clusters.map((cluster) =>
      [
        `- [${cluster.status}/${cluster.severity}] ${cluster.title}`,
        `  - Category: ${cluster.category}`,
        `  - Reviewer: ${cluster.reviewer}`,
        `  - Detail: ${cluster.detail}`,
        `  - Evidence: ${cluster.evidence}`,
        `  - Recommendation: ${cluster.recommendation}`,
      ].join("\n"),
    ),
    "",
    "## Investigation Packets",
    "",
    ...report.investigationPackets.map((packet) =>
      [
        `- [${packet.status}/${packet.severity}] ${packet.id}`,
        `  - Reviewer: ${packet.reviewer}`,
        `  - Summary: ${packet.summary}`,
        `  - Evidence: ${packet.redactedEvidence}`,
        `  - Actions: ${packet.actions.join("; ")}`,
      ].join("\n"),
    ),
  ].join("\n");
}

function createAdminActionCluster(
  auditEvents: AdminAuditRow[],
): AdminOrganizationAuditCluster | null {
  const events = auditEvents.filter((event) => highImpactActions.has(event.action));

  if (events.length === 0) {
    return null;
  }

  const actors = uniqueStrings(events.map((event) => event.actorEmail));
  const status = events.length >= 6 ? "blocked" : "review";

  return createCluster({
    id: "audit-admin-action-burst",
    category: "admin-actions",
    status,
    title: "High-impact admin action burst",
    detail: `${events.length} high-impact admin actions across ${actors.length} actor${actors.length === 1 ? "" : "s"}.`,
    evidence: redact(
      events
        .slice(0, 8)
        .map(
          (event) =>
            `${event.createdAt}: ${event.actorEmail} ${event.action} ${event.targetLabel} ${JSON.stringify(event.metadata)}`,
        )
        .join(" | "),
    ),
    recommendation:
      "Review recent high-impact admin actions for intent, approval context, and release impact.",
    eventIds: events.map((event) => event.id),
    latestAt: getLatestAt(events.map((event) => event.createdAt)),
  });
}

function createAccessControlCluster(
  roleChangeApprovals: AdminOrganizationAuditIntelligenceInput["roleChangeApprovals"],
  workspaceAccessBudget: AdminOrganizationAuditIntelligenceInput["workspaceAccessBudget"],
): AdminOrganizationAuditCluster | null {
  const totalRisk =
    roleChangeApprovals.pendingCount +
    workspaceAccessBudget.pendingRoleChangeCount +
    workspaceAccessBudget.elevatedCollaboratorCount +
    workspaceAccessBudget.externalDomainCount;

  if (totalRisk === 0) {
    return null;
  }

  return createCluster({
    id: "audit-access-control",
    category: "access-control",
    status: totalRisk >= 8 ? "blocked" : "review",
    title: "Access control review",
    detail: `${roleChangeApprovals.pendingCount} pending role requests, ${workspaceAccessBudget.elevatedCollaboratorCount} elevated collaborators, and ${workspaceAccessBudget.externalDomainCount} external domains.`,
    evidence: redact(
      roleChangeApprovals.requests
        .slice(0, 6)
        .map(
          (request) =>
            `${request.requesterEmail} requested ${request.requestedRole} for ${request.targetEmail} on ${request.fileName}`,
        )
        .join(" | "),
    ),
    recommendation:
      "Assign pending role changes and external elevated access to an access reviewer before release.",
    eventIds: roleChangeApprovals.requests.map((request) => request.requestId),
    latestAt: roleChangeApprovals.generatedAt,
  });
}

function createShareExposureCluster(
  shares: AdminShareRow[],
  workspaceAccessBudget: AdminOrganizationAuditIntelligenceInput["workspaceAccessBudget"],
): AdminOrganizationAuditCluster | null {
  const riskyShares = shares.filter(
    (share) =>
      !share.disabledAt &&
      (share.allowDownload || !share.expiresAt || share.permissionPreset === "review"),
  );
  const riskCount =
    riskyShares.length +
    workspaceAccessBudget.riskyShareCount +
    workspaceAccessBudget.noExpiryShareCount +
    workspaceAccessBudget.downloadShareCount;

  if (riskCount === 0) {
    return null;
  }

  return createCluster({
    id: "audit-share-exposure",
    category: "share-exposure",
    status: workspaceAccessBudget.riskyShareCount > 3 ? "blocked" : "review",
    title: "Public share exposure",
    detail: `${workspaceAccessBudget.riskyShareCount} risky shares, ${workspaceAccessBudget.noExpiryShareCount} without expiry, and ${workspaceAccessBudget.downloadShareCount} allowing downloads.`,
    evidence: redact(
      riskyShares
        .slice(0, 6)
        .map(
          (share) =>
            `${share.fileName} ${share.sharePath} token ${share.token} owner ${share.ownerEmail}`,
        )
        .join(" | "),
    ),
    recommendation:
      "Review download-enabled, no-expiry, and review-scope public shares before external publication.",
    eventIds: riskyShares.map((share) => share.id),
    latestAt: getLatestAt(riskyShares.map((share) => share.createdAt)),
  });
}

function createDataProtectionCluster(
  report: AdminOrganizationAuditIntelligenceInput["dataLossPrevention"],
): AdminOrganizationAuditCluster | null {
  const findingCount =
    report.sensitiveFindingCount +
    report.downloadExposureCount +
    report.publicRouteRiskCount;

  if (findingCount === 0 && report.status === "ready") {
    return null;
  }

  return createCluster({
    id: "audit-data-protection",
    category: "data-protection",
    status: report.status,
    title: "Data protection findings",
    detail: `${report.sensitiveFindingCount} sensitive findings, ${report.sensitiveFileCount} sensitive files, ${report.downloadExposureCount} download exposures, and ${report.publicRouteRiskCount} public route risks.`,
    evidence: `DLP score ${report.score}; ${report.blockedCount} blocked and ${report.reviewCount} review rows.`,
    recommendation:
      "Clear blocked DLP rows or attach a reviewed exception packet before handoff.",
    eventIds: ["data-loss-prevention"],
    latestAt: report.generatedAt,
  });
}

function createReleaseOperationsCluster(
  report: AdminOrganizationAuditIntelligenceInput["releaseRiskTimeline"],
): AdminOrganizationAuditCluster | null {
  if (report.status === "ready" && report.highRiskCount === 0) {
    return null;
  }

  return createCluster({
    id: "audit-release-operations",
    category: "release-operations",
    status: report.status,
    title: "Release operations risk",
    detail: `${report.highRiskCount} high-risk release events and ${report.correlationCount} cross-source correlations.`,
    evidence: `Release risk score ${report.score}; ${report.commandCount} operator commands available.`,
    recommendation:
      "Attach release-risk correlations to the approval packet and close high-risk event rows.",
    eventIds: ["release-risk-timeline"],
    latestAt: report.generatedAt,
  });
}

function createCapacityCluster(
  report: AdminOrganizationAuditIntelligenceInput["workspaceCapacityForecast"],
): AdminOrganizationAuditCluster | null {
  if (report.status === "ready" && report.storageUsedPercent < 70) {
    return null;
  }

  return createCluster({
    id: "audit-capacity",
    category: "capacity",
    status: report.status,
    title: "Workspace capacity pressure",
    detail: `${report.storageUsedPercent}% storage used, ${report.routeEventCount} route events, ${report.collaborationRoomCount} collaboration rooms, and ${report.projected90DayStorageBytes} projected 90-day storage bytes.`,
    evidence: `Capacity score ${report.score}; ${report.blockedCount} blocked and ${report.reviewCount} review dimensions.`,
    recommendation:
      "Review storage, route analytics retention, and collaboration replay growth before approving scale-sensitive releases.",
    eventIds: ["workspace-capacity-forecast"],
    latestAt: report.generatedAt,
  });
}

function createUserVerificationCluster(
  users: AdminUserRow[],
): AdminOrganizationAuditCluster | null {
  const pendingUsers = users.filter((user) => !user.emailVerified);

  if (pendingUsers.length === 0) {
    return null;
  }

  return createCluster({
    id: "audit-user-verification",
    category: "user-verification",
    status: pendingUsers.some((user) => user.sessions > 0) ? "blocked" : "review",
    title: "Unverified active accounts",
    detail: `${pendingUsers.length} users need verification, with ${pendingUsers.reduce((total, user) => total + user.sessions, 0)} active sessions.`,
    evidence: redact(
      pendingUsers
        .slice(0, 6)
        .map((user) => `${user.email} has ${user.sessions} sessions`)
        .join(" | "),
    ),
    recommendation:
      "Verify active users or revoke stale unverified sessions before sensitive handoff.",
    eventIds: pendingUsers.map((user) => user.id),
    latestAt: getLatestAt(pendingUsers.map((user) => user.createdAt)),
  });
}

function createFileGovernanceCluster(
  files: AdminFileRow[],
): AdminOrganizationAuditCluster | null {
  const reviewFiles = files.filter(
    (file) =>
      !file.trashedAt &&
      (file.openCommentCount > 0 ||
        file.brokenPrototypeCount > 0 ||
        file.staleShareCount > 0),
  );

  if (reviewFiles.length === 0) {
    return null;
  }

  return createCluster({
    id: "audit-file-governance",
    category: "file-governance",
    status: reviewFiles.some((file) => file.brokenPrototypeCount > 0)
      ? "blocked"
      : "review",
    title: "File governance review",
    detail: `${reviewFiles.length} files have unresolved comments, broken prototypes, or stale public share posture.`,
    evidence: redact(
      reviewFiles
        .slice(0, 6)
        .map(
          (file) =>
            `${file.name} owner ${file.ownerEmail}: ${file.openCommentCount} comments, ${file.brokenPrototypeCount} broken prototypes, ${file.staleShareCount} stale shares`,
        )
        .join(" | "),
    ),
    recommendation:
      "Assign file owners to close review comments, repair prototype links, and clean stale shares.",
    eventIds: reviewFiles.map((file) => file.id),
    latestAt: getLatestAt(reviewFiles.map((file) => file.updatedAt)),
  });
}

function createCluster({
  category,
  detail,
  eventIds,
  evidence,
  id,
  latestAt,
  recommendation,
  status,
  title,
}: Omit<
  AdminOrganizationAuditCluster,
  "packetId" | "reviewer" | "severity"
>): AdminOrganizationAuditCluster {
  return {
    id,
    category,
    status,
    severity: getSeverity(status),
    title,
    detail: redact(detail),
    evidence: redact(evidence),
    reviewer: reviewerByCategory[category],
    recommendation,
    eventIds,
    packetId: `packet-${id}`,
    latestAt,
  };
}

function createInvestigationPacket(
  cluster: AdminOrganizationAuditCluster,
  generatedAt: string,
): AdminOrganizationAuditInvestigationPacket {
  return {
    id: cluster.packetId,
    status: cluster.status,
    severity: cluster.severity,
    title: cluster.title,
    reviewer: cluster.reviewer,
    summary: redact(`${cluster.detail} ${cluster.recommendation}`),
    redactedEvidence: redact(cluster.evidence),
    relatedClusterIds: [cluster.id],
    eventIds: cluster.eventIds,
    actions: [
      cluster.recommendation,
      `Assign ${cluster.reviewer} and attach this redacted packet to the relevant review queue.`,
    ],
    exportedAt: generatedAt,
  };
}

function getReviewerQueues(clusters: AdminOrganizationAuditCluster[]) {
  const byReviewer = new Map<string, AdminOrganizationAuditCluster[]>();

  for (const cluster of clusters) {
    byReviewer.set(cluster.reviewer, [
      ...(byReviewer.get(cluster.reviewer) ?? []),
      cluster,
    ]);
  }

  return [...byReviewer.entries()]
    .map(([reviewer, rows]) => ({
      reviewer,
      status: getWorstStatus(rows.map((row) => row.status)),
      openClusterCount: rows.length,
      blockedClusterCount: rows.filter((row) => row.status === "blocked")
        .length,
      highSeverityCount: rows.filter((row) => row.severity === "high").length,
      packetIds: rows.map((row) => row.packetId),
    }))
    .sort(
      (left, right) =>
        getStatusWeight(right.status) - getStatusWeight(left.status) ||
        right.highSeverityCount - left.highSeverityCount ||
        left.reviewer.localeCompare(right.reviewer),
    );
}

function getSeverity(
  status: AdminOrganizationAuditStatus,
): AdminOrganizationAuditSeverity {
  if (status === "blocked") {
    return "high";
  }

  return status === "review" ? "medium" : "low";
}

function getWorstStatus(
  statuses: AdminOrganizationAuditStatus[],
): AdminOrganizationAuditStatus {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  if (statuses.includes("review")) {
    return "review";
  }

  return "ready";
}

function sortClusters(
  left: AdminOrganizationAuditCluster,
  right: AdminOrganizationAuditCluster,
) {
  const statusDelta =
    getStatusWeight(right.status) - getStatusWeight(left.status);

  if (statusDelta !== 0) {
    return statusDelta;
  }

  const latestDelta =
    Date.parse(right.latestAt ?? "") - Date.parse(left.latestAt ?? "");

  if (Number.isFinite(latestDelta) && latestDelta !== 0) {
    return latestDelta;
  }

  return left.title.localeCompare(right.title);
}

function getStatusWeight(status: AdminOrganizationAuditStatus) {
  if (status === "blocked") {
    return 3;
  }

  return status === "review" ? 2 : 1;
}

function getLatestAt(values: string[]) {
  const timestamps = values
    .map((value) => Date.parse(value))
    .filter(Number.isFinite)
    .sort((left, right) => right - left);

  return timestamps[0] ? new Date(timestamps[0]).toISOString() : null;
}

function redact(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(
      /\b(token|secret|password|api[_-]?key|auth[_-]?token)\b\s*[:=]?\s*["']?[^"',\s}]+/gi,
      "$1 [redacted-secret]",
    )
    .replace(/\b[A-Z0-9_-]*secret[A-Z0-9_-]*\b/gi, "[redacted-secret]");
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? "");

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
