import type {
  AdminBranchReviewInboxRow,
  AdminBranchReviewInboxStatus,
  AdminBranchReviewRequest,
  AdminBranchReviewSlaStatus,
} from "@/features/admin/admin-branch-review-inbox-types";

export function toBranchReviewInboxRows(item: AdminBranchReviewRequest) {
  return [
    {
      id: `${item.id}-reviewers`,
      status: item.reviewers.length > 0 ? "ready" : "blocked",
      category: "reviewers",
      branchName: item.branchName,
      reviewerSummary: item.reviewerSummary,
      label: "Reviewer assignment",
      detail: `${item.reviewerSummary} owns ${item.openCommentCount} open review comments.`,
      recommendation:
        item.reviewers.length > 0
          ? "Keep reviewer ownership visible until the merge decision is recorded."
          : "Assign at least one reviewer to unresolved branch review comments.",
      dueDate: item.dueDate,
      latestAt: item.updatedAt,
      blockerCount: item.reviewers.length > 0 ? 0 : 1,
    },
    {
      id: `${item.id}-sla`,
      status: toStatusFromSla(item.slaStatus),
      category: "sla",
      branchName: item.branchName,
      reviewerSummary: item.reviewerSummary,
      label: "SLA state",
      detail: `SLA is ${item.slaStatus}${item.dueDate ? ` with due date ${item.dueDate}` : ""}.`,
      recommendation:
        item.slaStatus === "clear"
          ? "Keep the branch due date current until merge."
          : "Set or refresh the reviewer due date before release review.",
      dueDate: item.dueDate,
      latestAt: item.updatedAt,
      blockerCount: item.slaStatus === "overdue" ? 1 : 0,
    },
    {
      id: `${item.id}-merge`,
      status: item.mergeReadiness,
      category: "merge-readiness",
      branchName: item.branchName,
      reviewerSummary: item.reviewerSummary,
      label: "Merge readiness",
      detail: `${item.mergeReviewCount} merge review records and ${item.openCommentCount} open comments.`,
      recommendation:
        item.mergeReadiness === "ready"
          ? "Branch has enough evidence for merge review handoff."
          : "Resolve blockers and record a merge review before approval.",
      dueDate: item.dueDate,
      latestAt: item.latestMergeReviewAt,
      blockerCount: item.blockerCount,
    },
    {
      id: `${item.id}-evidence`,
      status: item.releaseEvidenceCount >= 3 ? "ready" : "review",
      category: "release-evidence",
      branchName: item.branchName,
      reviewerSummary: item.reviewerSummary,
      label: "Release evidence",
      detail: `${item.releaseEvidenceCount} release evidence anchors are attached.`,
      recommendation:
        "Keep merge review, smoke, rollback, and release approval evidence together.",
      dueDate: item.dueDate,
      latestAt: item.latestMergeReviewAt,
      blockerCount: Math.max(0, 3 - item.releaseEvidenceCount),
    },
  ] satisfies AdminBranchReviewInboxRow[];
}

function toStatusFromSla(
  slaStatus: AdminBranchReviewSlaStatus,
): AdminBranchReviewInboxStatus {
  if (slaStatus === "overdue" || slaStatus === "unassigned") {
    return "blocked";
  }

  return slaStatus === "clear" ? "ready" : "review";
}
