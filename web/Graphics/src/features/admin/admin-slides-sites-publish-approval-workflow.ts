import type {
  AdminEmbedRouteAnalyticsJoinReport,
  AdminEmbedRouteAnalyticsJoinStatus,
} from "@/features/admin/admin-embed-route-analytics-join";
import type {
  AdminPublishApprovalState,
  AdminPublishChannel,
  AdminPublishChannelKind,
  AdminPublishChannelManagerReport,
  AdminPublishChannelStatus,
} from "@/features/admin/admin-publish-channel-manager";
import type { AdminReleaseApprovalSnapshot } from "@/features/admin/admin-release-approval-snapshots";
import type {
  AdminRollbackReadinessReport,
  AdminRollbackVersionRow,
} from "@/features/admin/admin-rollback-readiness";
import type {
  ScopedPublicationApprovalReport,
  ScopedPublicationApprovalScope,
  ScopedPublicationStatus,
} from "@/features/admin/admin-scoped-publication-approvals";
import type {
  ProductionDeploySmokeReport,
  ProductionDeploySmokeRow,
  ProductionDeploySmokeStatus,
} from "@/features/editor/production-deploy-smoke";

export type AdminSlidesSitesPublishApprovalWorkflowStatus =
  | "ready"
  | "review"
  | "blocked";

export type AdminSlidesSitesPublishApprovalWorkflowRowCategory =
  | "publish-approval"
  | "reviewer-assignment"
  | "rollback-bundle"
  | "route-smoke-signoff"
  | "version-anchor";

export type AdminSlidesSitesReviewerAssignment = {
  id: string;
  status: AdminSlidesSitesPublishApprovalWorkflowStatus;
  scopeKey: string;
  teamName: string;
  projectName: string;
  reviewerName: string;
  reviewerEmail: string | null;
  slaStatus: ScopedPublicationApprovalScope["slaStatus"];
  dueAt: string | null;
  fileCount: number;
  channelCount: number;
  evidence: string[];
  detail: string;
  recommendation: string;
  latestAt: string | null;
};

export type AdminSlidesSitesVersionAnchor = {
  id: string;
  status: AdminSlidesSitesPublishApprovalWorkflowStatus;
  fileId: string;
  fileName: string;
  ownerEmail: string;
  versionName: string;
  anchored: boolean;
  createdAt: string | null;
  detail: string;
  recommendation: string;
};

export type AdminSlidesSitesRouteSmokeSignoff = {
  id: string;
  status: AdminSlidesSitesPublishApprovalWorkflowStatus;
  kind: ProductionDeploySmokeRow["kind"];
  label: string;
  route: string;
  method: ProductionDeploySmokeRow["method"];
  command: string;
  evidence: string;
  detail: string;
  recommendation: string;
  latestAt: string | null;
};

export type AdminSlidesSitesRollbackBundle = {
  id: string;
  status: AdminSlidesSitesPublishApprovalWorkflowStatus;
  channelId: string;
  channelKind: AdminPublishChannelKind;
  label: string;
  ownerEmail: string;
  rollbackState: AdminPublishChannel["rollbackState"];
  versionAnchorIds: string[];
  deploymentUrls: string[];
  detail: string;
  recommendation: string;
  latestAt: string | null;
};

export type AdminSlidesSitesPublishApproval = {
  id: string;
  status: AdminSlidesSitesPublishApprovalWorkflowStatus;
  channelId: string;
  channelKind: AdminPublishChannelKind;
  label: string;
  targetUrl: string;
  approvalState: AdminPublishApprovalState;
  reviewerEmail: string | null;
  releaseSnapshotId: string | null;
  routeSmokeStatus: AdminPublishChannelStatus;
  rollbackState: AdminPublishChannel["rollbackState"];
  scopeKey: string | null;
  detail: string;
  recommendation: string;
  latestAt: string | null;
};

export type AdminSlidesSitesPublishApprovalWorkflowRow = {
  id: string;
  category: AdminSlidesSitesPublishApprovalWorkflowRowCategory;
  status: AdminSlidesSitesPublishApprovalWorkflowStatus;
  label: string;
  owner: string;
  count: number;
  detail: string;
  recommendation: string;
  latestAt: string | null;
};

export type AdminSlidesSitesPublishApprovalWorkflowReport = {
  generatedAt: string;
  status: AdminSlidesSitesPublishApprovalWorkflowStatus;
  score: number;
  reviewerAssignmentCount: number;
  versionAnchorCount: number;
  routeSmokeSignoffCount: number;
  rollbackBundleCount: number;
  publishApprovalCount: number;
  analyticsEvidenceCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  reviewerAssignments: AdminSlidesSitesReviewerAssignment[];
  versionAnchors: AdminSlidesSitesVersionAnchor[];
  routeSmokeSignoffs: AdminSlidesSitesRouteSmokeSignoff[];
  rollbackBundles: AdminSlidesSitesRollbackBundle[];
  publishApprovals: AdminSlidesSitesPublishApproval[];
  analyticsEvidence: string[];
  rows: AdminSlidesSitesPublishApprovalWorkflowRow[];
  commands: string[];
};

export type AdminSlidesSitesPublishApprovalWorkflowInput = {
  embedRouteAnalyticsJoin?: AdminEmbedRouteAnalyticsJoinReport;
  generatedAt?: string;
  productionDeploySmoke: ProductionDeploySmokeReport;
  publishChannels: AdminPublishChannelManagerReport;
  releaseApprovalSnapshots: AdminReleaseApprovalSnapshot[];
  rollbackReadiness: AdminRollbackReadinessReport;
  scopedPublicationApprovals: ScopedPublicationApprovalReport;
};

const targetChannelKinds = new Set<AdminPublishChannelKind>([
  "prototype",
  "release",
  "site",
]);

const smokeKinds = new Set<ProductionDeploySmokeRow["kind"]>([
  "prototype",
  "release-handoff",
  "share",
]);

const statusRank: Record<AdminSlidesSitesPublishApprovalWorkflowStatus, number> =
  {
    blocked: 0,
    review: 1,
    ready: 2,
  };

export function getAdminSlidesSitesPublishApprovalWorkflowReport({
  embedRouteAnalyticsJoin,
  generatedAt = new Date().toISOString(),
  productionDeploySmoke,
  publishChannels,
  releaseApprovalSnapshots,
  rollbackReadiness,
  scopedPublicationApprovals,
}: AdminSlidesSitesPublishApprovalWorkflowInput): AdminSlidesSitesPublishApprovalWorkflowReport {
  const targetChannels = publishChannels.channels
    .filter((channel) => targetChannelKinds.has(channel.kind))
    .sort(sortChannels);
  const reviewerAssignments = getReviewerAssignments(
    scopedPublicationApprovals,
  );
  const versionAnchors = getVersionAnchors({
    rollbackReadiness,
    targetChannels,
  });
  const routeSmokeSignoffs = getRouteSmokeSignoffs({
    generatedAt: productionDeploySmoke.generatedAt,
    productionDeploySmoke,
  });
  const rollbackBundles = getRollbackBundles({
    rollbackReadiness,
    targetChannels,
    versionAnchors,
  });
  const publishApprovals = getPublishApprovals({
    releaseApprovalSnapshots,
    scopedPublicationApprovals,
    targetChannels,
  });
  const analyticsEvidence = getAnalyticsEvidence(embedRouteAnalyticsJoin);
  const rows = [
    ...reviewerAssignments.map(getReviewerAssignmentRow),
    ...versionAnchors.map(getVersionAnchorRow),
    ...routeSmokeSignoffs.map(getRouteSmokeSignoffRow),
    ...rollbackBundles.map(getRollbackBundleRow),
    ...publishApprovals.map(getPublishApprovalRow),
  ].sort(sortRows);
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 14 - reviewCount * 5),
    reviewerAssignmentCount: reviewerAssignments.length,
    versionAnchorCount: versionAnchors.length,
    routeSmokeSignoffCount: routeSmokeSignoffs.length,
    rollbackBundleCount: rollbackBundles.length,
    publishApprovalCount: publishApprovals.length,
    analyticsEvidenceCount: analyticsEvidence.length,
    readyCount,
    reviewCount,
    blockedCount,
    reviewerAssignments,
    versionAnchors,
    routeSmokeSignoffs,
    rollbackBundles,
    publishApprovals,
    analyticsEvidence,
    rows,
    commands: getCommands(),
  };
}

export function getAdminSlidesSitesPublishApprovalWorkflowJson(
  report: AdminSlidesSitesPublishApprovalWorkflowReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminSlidesSitesPublishApprovalWorkflowCsv(
  report: AdminSlidesSitesPublishApprovalWorkflowReport,
) {
  return [
    [
      "id",
      "category",
      "status",
      "label",
      "owner",
      "count",
      "latest_at",
      "detail",
      "recommendation",
    ].join(","),
    ...report.rows.map((row) =>
      [
        row.id,
        row.category,
        row.status,
        row.label,
        row.owner,
        row.count,
        row.latestAt ?? "",
        row.detail,
        row.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getAdminSlidesSitesPublishApprovalWorkflowMarkdown(
  report: AdminSlidesSitesPublishApprovalWorkflowReport,
) {
  return [
    "# Slides/Sites Publish Approval Workflow",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Reviewer assignments: ${report.reviewerAssignmentCount}`,
    `Version anchors: ${report.versionAnchorCount}`,
    `Route smoke signoff: ${report.routeSmokeSignoffCount}`,
    `Rollback bundles: ${report.rollbackBundleCount}`,
    `Publish approvals: ${report.publishApprovalCount}`,
    `Analytics evidence: ${report.analyticsEvidenceCount}`,
    "",
    "This packet joins reviewer assignments, version anchors, route smoke signoff, rollback bundles, and publish approvals for Slides/Sites releases.",
    "",
    "## reviewer assignments",
    "",
    ...report.reviewerAssignments.map(
      (assignment) =>
        `- [${assignment.status}] ${assignment.scopeKey}: ${assignment.detail} ${assignment.recommendation}`,
    ),
    "",
    "## version anchors",
    "",
    ...report.versionAnchors.map(
      (anchor) =>
        `- [${anchor.status}] ${anchor.fileName}: ${anchor.versionName}. ${anchor.recommendation}`,
    ),
    "",
    "## route smoke signoff",
    "",
    ...report.routeSmokeSignoffs.map(
      (signoff) =>
        `- [${signoff.status}] ${signoff.label}: ${signoff.method} ${signoff.route}. ${signoff.recommendation}`,
    ),
    "",
    "## rollback bundles",
    "",
    ...report.rollbackBundles.map(
      (bundle) =>
        `- [${bundle.status}] ${bundle.label}: ${bundle.detail} ${bundle.recommendation}`,
    ),
    "",
    "## publish approvals",
    "",
    ...report.publishApprovals.map(
      (approval) =>
        `- [${approval.status}] ${approval.label}: ${approval.detail} ${approval.recommendation}`,
    ),
    "",
    "## analytics evidence",
    "",
    ...report.analyticsEvidence.map((item) => `- ${item}`),
    "",
    "## Commands",
    "",
    ...report.commands.map((command) => `- ${command}`),
  ].join("\n");
}

function getReviewerAssignments(
  scopedPublicationApprovals: ScopedPublicationApprovalReport,
) {
  return scopedPublicationApprovals.scopes
    .filter(
      (scope) =>
        scope.channelCount > 0 ||
        /slides?|sites?/i.test(`${scope.scopeKey} ${scope.projectName}`),
    )
    .map((scope): AdminSlidesSitesReviewerAssignment => {
      const status = getReviewerAssignmentStatus(scope);

      return {
        id: `reviewer-${slug(scope.scopeKey)}`,
        status,
        scopeKey: scope.scopeKey,
        teamName: scope.teamName,
        projectName: scope.projectName,
        reviewerName:
          scope.latestDecision?.reviewerName ??
          scope.reviewerEmail ??
          "Unassigned reviewer",
        reviewerEmail: scope.reviewerEmail,
        slaStatus: scope.slaStatus,
        dueAt: scope.slaDueAt,
        fileCount: scope.fileCount,
        channelCount: scope.channelCount,
        evidence: scope.evidence,
        detail: `${scope.reviewerSummary} ${scope.readyChannelCount}/${scope.channelCount} publication channel${scope.channelCount === 1 ? "" : "s"} are ready.`,
        recommendation:
          status === "ready"
            ? "Keep this reviewer attached to the final publish packet."
            : "Assign a reviewer, refresh SLA state, or request changes before publishing.",
        latestAt: scope.latestActivityAt ?? scope.latestDecision?.createdAt ?? null,
      };
    })
    .sort(sortReviewerAssignments);
}

function getVersionAnchors({
  rollbackReadiness,
  targetChannels,
}: {
  rollbackReadiness: AdminRollbackReadinessReport;
  targetChannels: AdminPublishChannel[];
}) {
  const targetFileIds = new Set(
    targetChannels
      .map((channel) => channel.fileId)
      .filter((fileId): fileId is string => Boolean(fileId)),
  );
  const matchedVersions = rollbackReadiness.latestVersions.filter(
    (version) => targetFileIds.size === 0 || targetFileIds.has(version.fileId),
  );
  const missingVersions = Array.from(targetFileIds)
    .filter(
      (fileId) => !matchedVersions.some((version) => version.fileId === fileId),
    )
    .map((fileId) => {
      const channel = targetChannels.find((item) => item.fileId === fileId);

      return {
        id: `missing-version-${fileId}`,
        status: "blocked" as const,
        fileId,
        fileName: channel?.fileName ?? fileId,
        ownerEmail: channel?.ownerEmail ?? "workspace",
        versionName: "Missing version anchor",
        anchored: false,
        createdAt: null,
        detail: "No named version anchor is available for this publish target.",
        recommendation:
          "Save a named version before approving this Slides/Sites publish target.",
      };
    });

  return [
    ...matchedVersions.map(toVersionAnchor),
    ...missingVersions,
  ].sort(sortVersionAnchors);
}

function getRouteSmokeSignoffs({
  generatedAt,
  productionDeploySmoke,
}: {
  generatedAt: string;
  productionDeploySmoke: ProductionDeploySmokeReport;
}) {
  return productionDeploySmoke.rows
    .filter((row) => smokeKinds.has(row.kind))
    .map(
      (row): AdminSlidesSitesRouteSmokeSignoff => ({
        id: `smoke-${row.id}`,
        status: normalizeStatus(row.status),
        kind: row.kind,
        label: row.label,
        route: row.route,
        method: row.method,
        command: row.command,
        evidence: row.evidence,
        detail: row.detail,
        recommendation:
          row.status === "ready"
            ? "Attach this route smoke result to the publish approval."
            : row.recommendation,
        latestAt: generatedAt,
      }),
    )
    .sort(sortRouteSmokeSignoffs);
}

function getRollbackBundles({
  rollbackReadiness,
  targetChannels,
  versionAnchors,
}: {
  rollbackReadiness: AdminRollbackReadinessReport;
  targetChannels: AdminPublishChannel[];
  versionAnchors: AdminSlidesSitesVersionAnchor[];
}) {
  return targetChannels.map((channel): AdminSlidesSitesRollbackBundle => {
    const matchingAnchors = channel.fileId
      ? versionAnchors.filter(
          (anchor) => anchor.fileId === channel.fileId && anchor.anchored,
        )
      : [];
    const deploymentUrls =
      channel.kind === "release" ? rollbackReadiness.deploymentUrls : [];
    const status = getRollbackBundleStatus({
      channel,
      deploymentUrls,
      matchingAnchors,
      rollbackReadinessStatus: rollbackReadiness.status,
    });

    return {
      id: `rollback-${channel.id}`,
      status,
      channelId: channel.id,
      channelKind: channel.kind,
      label: channel.label,
      ownerEmail: channel.ownerEmail,
      rollbackState: channel.rollbackState,
      versionAnchorIds: matchingAnchors.map((anchor) => anchor.id),
      deploymentUrls,
      detail:
        channel.kind === "release"
          ? `${deploymentUrls.length} deployment rollback link${deploymentUrls.length === 1 ? "" : "s"} and ${rollbackReadiness.versionAnchorCount} named version anchor${rollbackReadiness.versionAnchorCount === 1 ? "" : "s"} are available.`
          : `${matchingAnchors.length} named version anchor${matchingAnchors.length === 1 ? "" : "s"} are linked to this publish target.`,
      recommendation:
        status === "ready"
          ? "Bundle this rollback evidence with the publish approval."
          : "Attach a named version or deployment rollback link before approving publication.",
      latestAt:
        getLatestIso(matchingAnchors.map((anchor) => anchor.createdAt)) ??
        channel.latestAt,
    };
  });
}

function getPublishApprovals({
  releaseApprovalSnapshots,
  scopedPublicationApprovals,
  targetChannels,
}: {
  releaseApprovalSnapshots: AdminReleaseApprovalSnapshot[];
  scopedPublicationApprovals: ScopedPublicationApprovalReport;
  targetChannels: AdminPublishChannel[];
}) {
  const latestReleaseApproval = releaseApprovalSnapshots[0] ?? null;

  return targetChannels.map((channel): AdminSlidesSitesPublishApproval => {
    const scope = getScopeForChannel(scopedPublicationApprovals.scopes, channel);
    const status = getPublishApprovalStatus(channel);

    return {
      id: `publish-approval-${channel.id}`,
      status,
      channelId: channel.id,
      channelKind: channel.kind,
      label: channel.label,
      targetUrl: channel.targetUrl,
      approvalState: channel.approvalState,
      reviewerEmail:
        scope?.reviewerEmail ?? latestReleaseApproval?.reviewerEmail ?? null,
      releaseSnapshotId: latestReleaseApproval?.id ?? null,
      routeSmokeStatus: channel.routeSmokeStatus,
      rollbackState: channel.rollbackState,
      scopeKey: scope?.scopeKey ?? null,
      detail: `${channel.approvalState} approval, ${channel.routeSmokeStatus} route smoke, and ${channel.rollbackState} rollback are attached to ${channel.kind} publication.`,
      recommendation:
        status === "ready"
          ? "Publish approval is ready to export with release evidence."
          : "Resolve approval, route smoke, or rollback evidence before publication.",
      latestAt: channel.latestAt ?? latestReleaseApproval?.createdAt ?? null,
    };
  });
}

function getAnalyticsEvidence(
  embedRouteAnalyticsJoin: AdminEmbedRouteAnalyticsJoinReport | undefined,
) {
  if (!embedRouteAnalyticsJoin) {
    return [
      "Embed and route analytics join was not provided for this publish approval packet.",
    ];
  }

  const statusText = getStatusLabel(embedRouteAnalyticsJoin.status);

  return [
    `${embedRouteAnalyticsJoin.routeFunnelCount} route funnels joined for presentation and Sites routes.`,
    `${embedRouteAnalyticsJoin.adminExportCount} admin exports are available for publication evidence.`,
    `${embedRouteAnalyticsJoin.blockedObservedOriginCount} blocked observed origins and ${embedRouteAnalyticsJoin.downloadExposureCount} download exposure rows were found.`,
    `Analytics join is ${statusText} with score ${embedRouteAnalyticsJoin.score}.`,
  ];
}

function getReviewerAssignmentStatus(
  scope: ScopedPublicationApprovalScope,
): AdminSlidesSitesPublishApprovalWorkflowStatus {
  if (scope.status === "blocked" || !scope.reviewerEmail) {
    return "blocked";
  }

  if (
    scope.status === "review" ||
    scope.approvalState !== "approved" ||
    scope.slaStatus === "overdue"
  ) {
    return "review";
  }

  return "ready";
}

function getRollbackBundleStatus({
  channel,
  deploymentUrls,
  matchingAnchors,
  rollbackReadinessStatus,
}: {
  channel: AdminPublishChannel;
  deploymentUrls: string[];
  matchingAnchors: AdminSlidesSitesVersionAnchor[];
  rollbackReadinessStatus: AdminSlidesSitesPublishApprovalWorkflowStatus;
}): AdminSlidesSitesPublishApprovalWorkflowStatus {
  if (channel.rollbackState === "missing") {
    return "blocked";
  }

  if (channel.kind === "release") {
    if (deploymentUrls.length === 0 || rollbackReadinessStatus === "blocked") {
      return "blocked";
    }

    return channel.rollbackState === "linked" && rollbackReadinessStatus === "ready"
      ? "ready"
      : "review";
  }

  if (matchingAnchors.length === 0 || rollbackReadinessStatus === "blocked") {
    return "blocked";
  }

  return channel.rollbackState === "linked" && rollbackReadinessStatus === "ready"
    ? "ready"
    : "review";
}

function getPublishApprovalStatus(
  channel: AdminPublishChannel,
): AdminSlidesSitesPublishApprovalWorkflowStatus {
  if (
    channel.status === "blocked" ||
    channel.approvalState === "blocked" ||
    channel.routeSmokeStatus === "blocked" ||
    channel.rollbackState === "missing"
  ) {
    return "blocked";
  }

  if (
    channel.status === "review" ||
    channel.approvalState !== "approved" ||
    channel.routeSmokeStatus === "review" ||
    channel.rollbackState === "review"
  ) {
    return "review";
  }

  return "ready";
}

function toVersionAnchor(
  version: AdminRollbackVersionRow,
): AdminSlidesSitesVersionAnchor {
  return {
    id: `version-${version.id}`,
    status: "ready",
    fileId: version.fileId,
    fileName: version.fileName,
    ownerEmail: version.ownerEmail,
    versionName: version.versionName,
    anchored: true,
    createdAt: version.createdAt,
    detail: `${version.versionName} is pinned as a restore point for ${version.fileName}.`,
    recommendation:
      "Keep this named version attached to the publish approval and rollback bundle.",
  };
}

function getReviewerAssignmentRow(
  assignment: AdminSlidesSitesReviewerAssignment,
): AdminSlidesSitesPublishApprovalWorkflowRow {
  return {
    id: assignment.id,
    category: "reviewer-assignment",
    status: assignment.status,
    label: assignment.scopeKey,
    owner: assignment.reviewerEmail ?? "unassigned",
    count: assignment.channelCount,
    detail: assignment.detail,
    recommendation: assignment.recommendation,
    latestAt: assignment.latestAt,
  };
}

function getVersionAnchorRow(
  anchor: AdminSlidesSitesVersionAnchor,
): AdminSlidesSitesPublishApprovalWorkflowRow {
  return {
    id: anchor.id,
    category: "version-anchor",
    status: anchor.status,
    label: anchor.fileName,
    owner: anchor.ownerEmail,
    count: anchor.anchored ? 1 : 0,
    detail: anchor.detail,
    recommendation: anchor.recommendation,
    latestAt: anchor.createdAt,
  };
}

function getRouteSmokeSignoffRow(
  signoff: AdminSlidesSitesRouteSmokeSignoff,
): AdminSlidesSitesPublishApprovalWorkflowRow {
  return {
    id: signoff.id,
    category: "route-smoke-signoff",
    status: signoff.status,
    label: signoff.label,
    owner: signoff.kind,
    count: 1,
    detail: signoff.detail,
    recommendation: signoff.recommendation,
    latestAt: signoff.latestAt,
  };
}

function getRollbackBundleRow(
  bundle: AdminSlidesSitesRollbackBundle,
): AdminSlidesSitesPublishApprovalWorkflowRow {
  return {
    id: bundle.id,
    category: "rollback-bundle",
    status: bundle.status,
    label: bundle.label,
    owner: bundle.ownerEmail,
    count: bundle.versionAnchorIds.length + bundle.deploymentUrls.length,
    detail: bundle.detail,
    recommendation: bundle.recommendation,
    latestAt: bundle.latestAt,
  };
}

function getPublishApprovalRow(
  approval: AdminSlidesSitesPublishApproval,
): AdminSlidesSitesPublishApprovalWorkflowRow {
  return {
    id: approval.id,
    category: "publish-approval",
    status: approval.status,
    label: approval.label,
    owner: approval.reviewerEmail ?? "unassigned",
    count: approval.releaseSnapshotId ? 1 : 0,
    detail: approval.detail,
    recommendation: approval.recommendation,
    latestAt: approval.latestAt,
  };
}

function getScopeForChannel(
  scopes: ScopedPublicationApprovalScope[],
  channel: AdminPublishChannel,
) {
  const haystack = `${channel.label} ${channel.fileName} ${channel.kind}`.toLowerCase();
  const kindMatch =
    channel.kind === "prototype"
      ? "slide"
      : channel.kind === "site"
        ? "site"
        : "release";

  return (
    scopes.find((scope) =>
      `${scope.scopeKey} ${scope.projectName}`.toLowerCase().includes(kindMatch),
    ) ??
    scopes.find((scope) =>
      haystack.includes(scope.projectName.toLowerCase()),
    ) ??
    scopes[0] ??
    null
  );
}

function normalizeStatus(
  status:
    | AdminEmbedRouteAnalyticsJoinStatus
    | AdminPublishChannelStatus
    | ProductionDeploySmokeStatus
    | ScopedPublicationStatus,
): AdminSlidesSitesPublishApprovalWorkflowStatus {
  return status === "blocked" || status === "review" ? status : "ready";
}

function getStatusLabel(status: AdminEmbedRouteAnalyticsJoinStatus) {
  return normalizeStatus(status);
}

function sortChannels(left: AdminPublishChannel, right: AdminPublishChannel) {
  return (
    statusRank[normalizeStatus(left.status)] -
      statusRank[normalizeStatus(right.status)] ||
    channelKindWeight(left.kind) - channelKindWeight(right.kind) ||
    left.label.localeCompare(right.label)
  );
}

function sortReviewerAssignments(
  left: AdminSlidesSitesReviewerAssignment,
  right: AdminSlidesSitesReviewerAssignment,
) {
  return (
    statusRank[left.status] - statusRank[right.status] ||
    left.scopeKey.localeCompare(right.scopeKey)
  );
}

function sortVersionAnchors(
  left: AdminSlidesSitesVersionAnchor,
  right: AdminSlidesSitesVersionAnchor,
) {
  return (
    statusRank[left.status] - statusRank[right.status] ||
    (new Date(right.createdAt ?? 0).getTime() -
      new Date(left.createdAt ?? 0).getTime()) ||
    left.fileName.localeCompare(right.fileName)
  );
}

function sortRouteSmokeSignoffs(
  left: AdminSlidesSitesRouteSmokeSignoff,
  right: AdminSlidesSitesRouteSmokeSignoff,
) {
  return (
    statusRank[left.status] - statusRank[right.status] ||
    left.kind.localeCompare(right.kind) ||
    left.label.localeCompare(right.label)
  );
}

function sortRows(
  left: AdminSlidesSitesPublishApprovalWorkflowRow,
  right: AdminSlidesSitesPublishApprovalWorkflowRow,
) {
  return (
    statusRank[left.status] - statusRank[right.status] ||
    categoryWeight(left.category) - categoryWeight(right.category) ||
    (new Date(right.latestAt ?? 0).getTime() -
      new Date(left.latestAt ?? 0).getTime()) ||
    left.label.localeCompare(right.label)
  );
}

function channelKindWeight(kind: AdminPublishChannelKind) {
  if (kind === "prototype") {
    return 0;
  }

  if (kind === "site") {
    return 1;
  }

  if (kind === "release") {
    return 2;
  }

  return 3;
}

function categoryWeight(
  category: AdminSlidesSitesPublishApprovalWorkflowRowCategory,
) {
  const weights: Record<
    AdminSlidesSitesPublishApprovalWorkflowRowCategory,
    number
  > = {
    "reviewer-assignment": 0,
    "version-anchor": 1,
    "route-smoke-signoff": 2,
    "rollback-bundle": 3,
    "publish-approval": 4,
  };

  return weights[category];
}

function getLatestIso(values: Array<string | null>) {
  const sorted = values
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime());

  return sorted[0] ?? null;
}

function getCommands() {
  return [
    "Assign one reviewer per Slides/Sites publication scope before approval.",
    "Pin named versions for every Slides/Sites source file before publishing.",
    "Run route smoke for share, prototype, and release handoff routes before signoff.",
    "Bundle rollback links, approval snapshots, and analytics evidence with the release notes.",
  ];
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeCsvCell(value: unknown) {
  const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
