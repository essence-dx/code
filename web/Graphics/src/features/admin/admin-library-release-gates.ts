import type { ComponentUsageAnalytics } from "@/features/editor/component-analytics";
import { getComponentInstanceReview } from "@/features/editor/component-instance-review";
import { getLocalLibraryStatus } from "@/features/editor/component-library-manifest";
import { getComponentVariableCoverageReport } from "@/features/editor/component-variable-coverage";
import {
  getLibraryPublishReadiness,
  type LibraryPublishReadinessStatus,
} from "@/features/editor/library-publish-readiness";
import type { DesignDocument } from "@/features/editor/types";
import type { AdminReleaseApprovalSnapshot } from "@/features/admin/admin-release-approval-snapshots";
import type {
  AdminRollbackReadinessReport,
  AdminRollbackReadinessStatus,
} from "@/features/admin/admin-rollback-readiness";

export type AdminLibraryReleaseGateStatus = "ready" | "review" | "blocked";

export type AdminLibraryReleaseGateCategory =
  | "components"
  | "tokens"
  | "approvals"
  | "rollback";

export type AdminLibraryReleaseGateRow = {
  id: string;
  status: AdminLibraryReleaseGateStatus;
  category: AdminLibraryReleaseGateCategory;
  label: string;
  value: string;
  detail: string;
  recommendation: string;
  target: string | null;
};

export type AdminLibraryReleaseGateFile = {
  fileId: string;
  fileName: string;
  ownerEmail: string;
  componentCount: number;
  readinessScore: number;
  readinessStatus: AdminLibraryReleaseGateStatus;
  readinessLabel: string;
  readinessBlockedCount: number;
  readinessReviewCount: number;
  tokenCoveragePercent: number;
  tokenBindablePropertyCount: number;
  tokenBoundPropertyCount: number;
  tokenMatchingRawPropertyCount: number;
  pendingUpdateInstanceCount: number;
  detachedInstanceCount: number;
};

export type AdminLibraryReleaseGateReport = {
  generatedAt: string;
  status: AdminLibraryReleaseGateStatus;
  score: number;
  canRelease: boolean;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  componentFileCount: number;
  componentCount: number;
  readyLibraryFileCount: number;
  reviewLibraryFileCount: number;
  blockedLibraryFileCount: number;
  tokenCoveragePercent: number;
  tokenBindablePropertyCount: number;
  tokenBoundPropertyCount: number;
  tokenMatchingRawPropertyCount: number;
  releaseApprovalCount: number;
  latestReleaseApprovalAt: string | null;
  rollbackScore: number;
  rows: AdminLibraryReleaseGateRow[];
  files: AdminLibraryReleaseGateFile[];
};

export type AdminLibraryReleaseGateFileInput = {
  fileId: string;
  fileName: string;
  ownerEmail: string;
  document: DesignDocument;
};

export type AdminLibraryReleaseGateInput = {
  files: AdminLibraryReleaseGateFileInput[];
  releaseApprovalSnapshots: AdminReleaseApprovalSnapshot[];
  rollbackReadiness: AdminRollbackReadinessReport;
  generatedAt?: string;
};

export function getAdminLibraryReleaseGateReport({
  files,
  releaseApprovalSnapshots,
  rollbackReadiness,
  generatedAt = new Date().toISOString(),
}: AdminLibraryReleaseGateInput): AdminLibraryReleaseGateReport {
  const releaseFiles = files
    .map(getLibraryFileGate)
    .filter((file): file is AdminLibraryReleaseGateFile => Boolean(file))
    .sort(sortLibraryFiles);
  const rows = [
    getComponentGateRow(releaseFiles),
    getTokenGateRow(releaseFiles),
    getApprovalGateRow(releaseApprovalSnapshots),
    getRollbackGateRow(rollbackReadiness),
  ];
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const status: AdminLibraryReleaseGateStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const tokenBindablePropertyCount = sum(
    releaseFiles.map((file) => file.tokenBindablePropertyCount),
  );
  const tokenBoundPropertyCount = sum(
    releaseFiles.map((file) => file.tokenBoundPropertyCount),
  );

  return {
    generatedAt,
    status,
    score: Math.max(0, 100 - blockedCount * 25 - reviewCount * 10),
    canRelease: status === "ready",
    readyCount,
    reviewCount,
    blockedCount,
    componentFileCount: releaseFiles.length,
    componentCount: sum(releaseFiles.map((file) => file.componentCount)),
    readyLibraryFileCount: releaseFiles.filter(
      (file) => file.readinessStatus === "ready",
    ).length,
    reviewLibraryFileCount: releaseFiles.filter(
      (file) => file.readinessStatus === "review",
    ).length,
    blockedLibraryFileCount: releaseFiles.filter(
      (file) => file.readinessStatus === "blocked",
    ).length,
    tokenCoveragePercent: getPercent(
      tokenBoundPropertyCount,
      tokenBindablePropertyCount,
    ),
    tokenBindablePropertyCount,
    tokenBoundPropertyCount,
    tokenMatchingRawPropertyCount: sum(
      releaseFiles.map((file) => file.tokenMatchingRawPropertyCount),
    ),
    releaseApprovalCount: releaseApprovalSnapshots.length,
    latestReleaseApprovalAt: releaseApprovalSnapshots[0]?.createdAt ?? null,
    rollbackScore: rollbackReadiness.score,
    rows,
    files: releaseFiles,
  };
}

function getLibraryFileGate({
  fileId,
  fileName,
  ownerEmail,
  document,
}: AdminLibraryReleaseGateFileInput): AdminLibraryReleaseGateFile | null {
  const components = Object.values(document.components ?? {});

  if (components.length === 0 && !document.libraryMetadata) {
    return null;
  }

  const variableCoverage = getComponentVariableCoverageReport(
    document,
    components,
  );
  const instanceReview = getComponentInstanceReview(
    components,
    document.pages,
    document.pendingLibraryComponentUpdates ?? {},
  );
  const publishReadiness = getLibraryPublishReadiness({
    components,
    analyticsByComponentId: {} as Record<string, ComponentUsageAnalytics>,
    libraryMetadata: document.libraryMetadata,
    libraryStatus: getLocalLibraryStatus(document),
    instanceReview,
    variableCoverage,
  });

  return {
    fileId,
    fileName,
    ownerEmail,
    componentCount: components.length,
    readinessScore: publishReadiness.score,
    readinessStatus: getReadinessGateStatus(
      publishReadiness.blockedCount,
      publishReadiness.reviewCount,
    ),
    readinessLabel: publishReadiness.label,
    readinessBlockedCount: publishReadiness.blockedCount,
    readinessReviewCount: publishReadiness.reviewCount,
    tokenCoveragePercent: variableCoverage.coveragePercent,
    tokenBindablePropertyCount: variableCoverage.bindablePropertyCount,
    tokenBoundPropertyCount: variableCoverage.boundPropertyCount,
    tokenMatchingRawPropertyCount: variableCoverage.matchingRawPropertyCount,
    pendingUpdateInstanceCount: instanceReview.pendingUpdateInstanceCount,
    detachedInstanceCount: instanceReview.detachedInstanceCount,
  };
}

function getComponentGateRow(
  files: AdminLibraryReleaseGateFile[],
): AdminLibraryReleaseGateRow {
  if (files.length === 0) {
    return {
      id: "component-readiness-missing",
      status: "blocked",
      category: "components",
      label: "Component readiness",
      value: "No libraries",
      detail:
        "No files with component-library content were found in the loaded workspace window.",
      recommendation:
        "Create or load at least one component library file before approving an organization release.",
      target: null,
    };
  }

  const blockedFiles = files.filter((file) => file.readinessStatus === "blocked");
  const reviewFiles = files.filter((file) => file.readinessStatus === "review");
  const readyFiles = files.filter((file) => file.readinessStatus === "ready");
  const status: AdminLibraryReleaseGateStatus =
    blockedFiles.length > 0
      ? "blocked"
      : reviewFiles.length > 0
        ? "review"
        : "ready";

  return {
    id: "component-readiness",
    status,
    category: "components",
    label: "Component readiness",
    value: `${readyFiles.length}/${files.length} ready`,
    detail: `${readyFiles.length} ready, ${reviewFiles.length} review, and ${blockedFiles.length} blocked library file${files.length === 1 ? "" : "s"} across ${sum(files.map((file) => file.componentCount))} component${sum(files.map((file) => file.componentCount)) === 1 ? "" : "s"}.`,
    recommendation:
      status === "ready"
        ? "Keep component readiness evidence attached to release approval exports."
        : "Resolve blocked publish-readiness items or add reviewer notes before release approval.",
    target: blockedFiles[0]?.fileName ?? reviewFiles[0]?.fileName ?? null,
  };
}

function getTokenGateRow(
  files: AdminLibraryReleaseGateFile[],
): AdminLibraryReleaseGateRow {
  const bindableCount = sum(
    files.map((file) => file.tokenBindablePropertyCount),
  );
  const boundCount = sum(files.map((file) => file.tokenBoundPropertyCount));
  const matchingRawCount = sum(
    files.map((file) => file.tokenMatchingRawPropertyCount),
  );
  const coveragePercent = getPercent(boundCount, bindableCount);
  const status = getTokenGateStatus({
    componentFileCount: files.length,
    bindableCount,
    coveragePercent,
    matchingRawCount,
  });

  return {
    id: "token-coverage",
    status,
    category: "tokens",
    label: "Token coverage",
    value: `${coveragePercent}%`,
    detail:
      bindableCount === 0
        ? "Loaded library components do not expose variable-bindable visual properties."
        : `${boundCount} of ${bindableCount} variable-bindable component properties are token-bound, with ${matchingRawCount} raw values matching existing variables.`,
    recommendation:
      status === "ready"
        ? "Token coverage meets the organization release threshold."
        : "Bind component fills, strokes, typography, layout, and effect values to document variables before release.",
    target: files
      .filter((file) => file.tokenCoveragePercent < 80)
      .sort((first, second) => first.tokenCoveragePercent - second.tokenCoveragePercent)[0]
      ?.fileName ?? null,
  };
}

function getApprovalGateRow(
  snapshots: AdminReleaseApprovalSnapshot[],
): AdminLibraryReleaseGateRow {
  const latest = snapshots[0];

  if (!latest) {
    return {
      id: "release-approval-missing",
      status: "blocked",
      category: "approvals",
      label: "Release approval",
      value: "Missing",
      detail:
        "No release approval snapshot has been recorded for the current production review window.",
      recommendation:
        "Save a release approval snapshot with commit, deployment URL, smoke artifacts, and rollback notes.",
      target: null,
    };
  }

  const status = getApprovalStatus(latest);

  return {
    id: "release-approval",
    status,
    category: "approvals",
    label: "Release approval",
    value: `${snapshots.length} snapshot${snapshots.length === 1 ? "" : "s"}`,
    detail: `${latest.releaseLabel} was approved by ${latest.reviewerEmail} with ${latest.smokeArtifacts.length} smoke artifact${latest.smokeArtifacts.length === 1 ? "" : "s"}.`,
    recommendation:
      status === "ready"
        ? "Use the latest approval snapshot as the release audit anchor."
        : "Refresh the approval snapshot after preflight, incident, and smoke evidence are ready.",
    target: latest.deploymentUrl,
  };
}

function getRollbackGateRow(
  rollbackReadiness: AdminRollbackReadinessReport,
): AdminLibraryReleaseGateRow {
  const status = fromRollbackStatus(rollbackReadiness.status);

  return {
    id: "rollback-evidence",
    status,
    category: "rollback",
    label: "Rollback evidence",
    value: `${rollbackReadiness.score}`,
    detail: `${rollbackReadiness.versionAnchorCount} version anchors, ${rollbackReadiness.staleShareCount} stale shares, ${rollbackReadiness.deploymentLinkCount} deployment links, and ${rollbackReadiness.database.activeFiles} active files are covered by rollback readiness.`,
    recommendation:
      status === "ready"
        ? "Attach rollback readiness exports to the release approval packet."
        : "Resolve rollback blockers around versions, shares, database state, or deployment links before release.",
    target: rollbackReadiness.rows.find((row) => row.status !== "ready")?.label ??
      rollbackReadiness.deploymentUrls[0] ??
      null,
  };
}

function getReadinessGateStatus(
  blockedCount: number,
  reviewCount: number,
): AdminLibraryReleaseGateStatus {
  if (blockedCount > 0) {
    return "blocked";
  }

  if (reviewCount > 0) {
    return "review";
  }

  return "ready";
}

function getTokenGateStatus({
  componentFileCount,
  bindableCount,
  coveragePercent,
  matchingRawCount,
}: {
  componentFileCount: number;
  bindableCount: number;
  coveragePercent: number;
  matchingRawCount: number;
}): AdminLibraryReleaseGateStatus {
  if (componentFileCount === 0) {
    return "blocked";
  }

  if (bindableCount === 0 || coveragePercent >= 80) {
    return "ready";
  }

  if (coveragePercent >= 40 || matchingRawCount > 0) {
    return "review";
  }

  return "blocked";
}

function getApprovalStatus(
  snapshot: AdminReleaseApprovalSnapshot,
): AdminLibraryReleaseGateStatus {
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

function fromRollbackStatus(
  status: AdminRollbackReadinessStatus,
): AdminLibraryReleaseGateStatus {
  return status;
}

function sortLibraryFiles(
  first: AdminLibraryReleaseGateFile,
  second: AdminLibraryReleaseGateFile,
) {
  const statusDifference =
    getStatusPriority(first.readinessStatus) -
    getStatusPriority(second.readinessStatus);

  if (statusDifference !== 0) {
    return statusDifference;
  }

  return first.readinessScore - second.readinessScore ||
    first.fileName.localeCompare(second.fileName);
}

function getStatusPriority(status: LibraryPublishReadinessStatus) {
  if (status === "blocked") {
    return 0;
  }

  if (status === "review") {
    return 1;
  }

  return 2;
}

function getPercent(value: number, total: number) {
  if (total === 0) {
    return 100;
  }

  return Math.round((value / total) * 100);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}
