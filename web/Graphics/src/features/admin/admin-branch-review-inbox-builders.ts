import type {
  AdminDesignBranchRecord,
  AdminDesignBranchStatus,
} from "@/features/admin/admin-design-branches";
import type { AdminRollbackReadinessReport } from "@/features/admin/admin-rollback-readiness";
import type { AdminReleaseApprovalSnapshot } from "@/features/admin/admin-release-approval-snapshots";
import type { ProductionDeploySmokeReport } from "@/features/editor/production-deploy-smoke";
import type {
  DesignComment,
  DesignDocument,
  DesignMergeReviewRecord,
} from "@/features/editor/types";
import type {
  AdminBranchReviewInboxFile,
  AdminBranchReviewInboxStatus,
  AdminBranchReviewRequest,
  AdminBranchReviewSlaStatus,
} from "@/features/admin/admin-branch-review-inbox-types";

export function toBranchReviewRequest({
  branchStatus,
  file,
  now,
  productionDeploySmoke,
  record,
  releaseApprovalSnapshots,
  rollbackReadiness,
}: {
  branchStatus: AdminDesignBranchStatus;
  file: AdminBranchReviewInboxFile | undefined;
  now: number;
  productionDeploySmoke: ProductionDeploySmokeReport;
  record: AdminDesignBranchRecord;
  releaseApprovalSnapshots: AdminReleaseApprovalSnapshot[];
  rollbackReadiness: AdminRollbackReadinessReport;
}): AdminBranchReviewRequest {
  const comments = file ? getOpenComments(file.document) : [];
  const reviewers = getReviewers(comments);
  const dueDate = getEarliestDueDate(comments);
  const slaStatus = getSlaStatus({ comments, dueDate, now, reviewers });
  const mergeReviews = file?.document.mergeReviews ?? [];
  const latestMergeReviewAt = getLatestMergeReviewAt(mergeReviews);
  const isReleaseCandidate = record.mergeIntent === "release-candidate";
  const isReviewIntent =
    record.mergeIntent === "review" || record.mergeIntent === "release-candidate";
  const evidence = getReleaseEvidence({
    latestMergeReviewAt,
    productionDeploySmoke,
    releaseApprovalSnapshots,
    rollbackReadiness,
  });
  const blockers = getBlockers({
    branchStatus,
    comments,
    file,
    isReleaseCandidate,
    isReviewIntent,
    mergeReviews,
    productionDeploySmoke,
    record,
    releaseApprovalSnapshots,
    rollbackReadiness,
    slaStatus,
  });
  const mergeReadiness = getMergeReadiness({
    blockers,
    comments,
    isReviewIntent,
    mergeReviews,
    record,
  });
  const status = getRequestStatus({ blockers, mergeReadiness, slaStatus });

  return {
    id: record.id,
    status,
    branchId: record.id,
    branchName: record.branchName,
    branchFileId: record.fileId,
    branchFileName: record.fileName,
    ownerEmail: record.ownerEmail,
    mergeIntent: record.mergeIntent,
    reviewers: reviewers.map((reviewer) => reviewer.name),
    reviewerEmails: reviewers.map((reviewer) => reviewer.email),
    reviewerSummary:
      reviewers.length > 0
        ? reviewers.map((reviewer) => reviewer.name).join(", ")
        : "Unassigned",
    slaStatus,
    dueDate,
    mergeReadiness,
    openCommentCount: comments.length,
    mergeReviewCount: mergeReviews.length,
    latestMergeReviewAt,
    releaseEvidenceCount: evidence.length,
    blockerCount: blockers.length,
    blockers,
    evidence,
    recommendation: getRecommendation({ blockers, mergeReadiness, slaStatus }),
    updatedAt: file?.updatedAt ?? record.updatedAt,
  };
}

export function sortBranchReviewRequests(
  left: AdminBranchReviewRequest,
  right: AdminBranchReviewRequest,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    new Date(left.dueDate ?? left.updatedAt).getTime() -
      new Date(right.dueDate ?? right.updatedAt).getTime()
  );
}

function getOpenComments(document: DesignDocument) {
  return document.pages
    .flatMap((page) => page.comments ?? [])
    .filter((comment) => !comment.resolved);
}

function getReviewers(comments: DesignComment[]) {
  const reviewers = new Map<string, { email: string; name: string }>();

  for (const comment of comments) {
    const email = comment.assigneeEmail?.trim();

    if (email) {
      reviewers.set(email, {
        email,
        name: comment.assigneeName?.trim() || email,
      });
    }
  }

  return [...reviewers.values()];
}

function getEarliestDueDate(comments: DesignComment[]) {
  return (
    comments
      .map((comment) => comment.dueDate)
      .filter((date): date is string => Boolean(date))
      .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0] ??
    null
  );
}

function getSlaStatus({
  comments,
  dueDate,
  now,
  reviewers,
}: {
  comments: DesignComment[];
  dueDate: string | null;
  now: number;
  reviewers: Array<{ email: string; name: string }>;
}): AdminBranchReviewSlaStatus {
  if (comments.length === 0) {
    return "clear";
  }
  if (reviewers.length === 0) {
    return "unassigned";
  }
  if (!dueDate) {
    return "unscheduled";
  }
  const dueAt = new Date(dueDate).getTime();

  if (!Number.isFinite(dueAt)) {
    return "unscheduled";
  }

  if (dueAt < now) {
    return "overdue";
  }

  return dueAt - now <= 48 * 60 * 60 * 1000 ? "due-soon" : "clear";
}

function getLatestMergeReviewAt(reviews: DesignMergeReviewRecord[]) {
  return (
    reviews
      .map((review) => review.createdAt)
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ??
    null
  );
}

function getReleaseEvidence({
  latestMergeReviewAt,
  productionDeploySmoke,
  releaseApprovalSnapshots,
  rollbackReadiness,
}: {
  latestMergeReviewAt: string | null;
  productionDeploySmoke: ProductionDeploySmokeReport;
  releaseApprovalSnapshots: AdminReleaseApprovalSnapshot[];
  rollbackReadiness: AdminRollbackReadinessReport;
}) {
  return [
    latestMergeReviewAt ? "merge review" : "",
    productionDeploySmoke.status !== "blocked" ? "deploy smoke" : "",
    rollbackReadiness.status !== "blocked" ? "rollback readiness" : "",
    releaseApprovalSnapshots.length > 0 ? "release approval" : "",
  ].filter(Boolean);
}

function getBlockers({
  branchStatus,
  comments,
  file,
  isReleaseCandidate,
  isReviewIntent,
  mergeReviews,
  productionDeploySmoke,
  record,
  releaseApprovalSnapshots,
  rollbackReadiness,
  slaStatus,
}: {
  branchStatus: AdminDesignBranchStatus;
  comments: DesignComment[];
  file: AdminBranchReviewInboxFile | undefined;
  isReleaseCandidate: boolean;
  isReviewIntent: boolean;
  mergeReviews: DesignMergeReviewRecord[];
  productionDeploySmoke: ProductionDeploySmokeReport;
  record: AdminDesignBranchRecord;
  releaseApprovalSnapshots: AdminReleaseApprovalSnapshot[];
  rollbackReadiness: AdminRollbackReadinessReport;
  slaStatus: AdminBranchReviewSlaStatus;
}) {
  return [
    !file ? "Branch file is missing from the admin file window." : "",
    branchStatus === "blocked" ? "Branch governance is blocked." : "",
    !record.hasRestorePoint ? "Restore point is missing." : "",
    isReviewIntent && slaStatus === "unassigned"
      ? "Reviewer assignment is missing."
      : "",
    slaStatus === "overdue" ? "Reviewer SLA is overdue." : "",
    isReviewIntent && mergeReviews.length === 0
      ? "Merge review record is missing."
      : "",
    isReleaseCandidate && comments.length > 0
      ? "Release candidate still has open comments."
      : "",
    isReleaseCandidate && releaseApprovalSnapshots.length === 0
      ? "Release approval snapshot is missing."
      : "",
    isReleaseCandidate && productionDeploySmoke.status === "blocked"
      ? "Deploy smoke is blocked."
      : "",
    isReleaseCandidate && rollbackReadiness.status === "blocked"
      ? "Rollback readiness is blocked."
      : "",
  ].filter(Boolean);
}

function getMergeReadiness({
  blockers,
  comments,
  isReviewIntent,
  mergeReviews,
  record,
}: {
  blockers: string[];
  comments: DesignComment[];
  isReviewIntent: boolean;
  mergeReviews: DesignMergeReviewRecord[];
  record: AdminDesignBranchRecord;
}): AdminBranchReviewInboxStatus {
  if (blockers.some((blocker) => /missing|blocked|overdue/i.test(blocker))) {
    return "blocked";
  }

  if (
    comments.length > 0 ||
    (isReviewIntent && mergeReviews.length === 0) ||
    record.updatedAgeDays >= 14
  ) {
    return "review";
  }

  return "ready";
}

function getRequestStatus({
  blockers,
  mergeReadiness,
  slaStatus,
}: {
  blockers: string[];
  mergeReadiness: AdminBranchReviewInboxStatus;
  slaStatus: AdminBranchReviewSlaStatus;
}): AdminBranchReviewInboxStatus {
  if (mergeReadiness === "blocked" || slaStatus === "overdue") {
    return "blocked";
  }

  if (blockers.length > 0 || mergeReadiness === "review" || slaStatus !== "clear") {
    return "review";
  }

  return "ready";
}

function getRecommendation({
  blockers,
  mergeReadiness,
  slaStatus,
}: {
  blockers: string[];
  mergeReadiness: AdminBranchReviewInboxStatus;
  slaStatus: AdminBranchReviewSlaStatus;
}) {
  if (blockers.length > 0) {
    return `Resolve ${blockers[0].toLowerCase()}`;
  }

  if (slaStatus !== "clear") {
    return "Refresh reviewer assignment and due date before release review.";
  }

  return mergeReadiness === "ready"
    ? "Ready for merge review handoff."
    : "Record merge review evidence before approval.";
}

function statusWeight(status: AdminBranchReviewInboxStatus) {
  if (status === "blocked") {
    return 0;
  }

  return status === "review" ? 1 : 2;
}
