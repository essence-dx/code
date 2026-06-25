import {
  sortBranchReviewRequests,
  toBranchReviewRequest,
} from "@/features/admin/admin-branch-review-inbox-builders";
import { toBranchReviewInboxRows } from "@/features/admin/admin-branch-review-inbox-rows";
import type {
  AdminBranchReviewInboxInput,
  AdminBranchReviewInboxReport,
  AdminBranchReviewInboxRow,
} from "@/features/admin/admin-branch-review-inbox-types";

export type {
  AdminBranchReviewInboxFile,
  AdminBranchReviewInboxInput,
  AdminBranchReviewInboxReport,
  AdminBranchReviewInboxRow,
  AdminBranchReviewInboxStatus,
  AdminBranchReviewRequest,
  AdminBranchReviewSlaStatus,
} from "@/features/admin/admin-branch-review-inbox-types";

export function getAdminBranchReviewInbox({
  branches,
  files,
  generatedAt = new Date().toISOString(),
  now = Date.now(),
  productionDeploySmoke,
  releaseApprovalSnapshots,
  rollbackReadiness,
}: AdminBranchReviewInboxInput): AdminBranchReviewInboxReport {
  const filesById = new Map(files.map((file) => [file.fileId, file]));
  const requests = branches.records
    .filter((record) => record.branchStatus === "active")
    .map((record) =>
      toBranchReviewRequest({
        branchStatus: branches.status,
        file: filesById.get(record.fileId),
        now,
        productionDeploySmoke,
        record,
        releaseApprovalSnapshots,
        rollbackReadiness,
      }),
    )
    .sort(sortBranchReviewRequests);
  const rows: AdminBranchReviewInboxRow[] =
    requests.flatMap(toBranchReviewInboxRows);

  if (requests.length === 0) {
    rows.push(getEmptyInboxRow());
  }

  const blockedCount = requests.filter(
    (request) => request.status === "blocked",
  ).length;
  const reviewCount = requests.filter(
    (request) => request.status === "review",
  ).length;
  const readyCount = requests.filter((request) => request.status === "ready").length;
  const uniqueReviewerEmails = new Set(
    requests.flatMap((request) => request.reviewerEmails),
  );
  const overdueCount = requests.filter(
    (request) => request.slaStatus === "overdue",
  ).length;
  const dueSoonCount = requests.filter(
    (request) => request.slaStatus === "due-soon",
  ).length;
  const blockerCount = requests.reduce(
    (total, request) => total + request.blockerCount,
    0,
  );

  return {
    generatedAt,
    status: blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 22 - reviewCount * 8 - overdueCount * 4),
    requestCount: requests.length,
    readyCount,
    reviewCount,
    blockedCount,
    reviewerCount: uniqueReviewerEmails.size,
    overdueCount,
    dueSoonCount,
    mergeReadyCount: requests.filter(
      (request) => request.mergeReadiness === "ready",
    ).length,
    blockerCount,
    evidenceCount: requests.reduce(
      (total, request) => total + request.releaseEvidenceCount,
      0,
    ),
    requests,
    rows,
    commands: getBranchReviewInboxCommands(),
  };
}

function getEmptyInboxRow(): AdminBranchReviewInboxRow {
  return {
    id: "branch-review-inbox-empty",
    status: "review",
    category: "reviewers",
    branchName: "No active review branches",
    reviewerSummary: "No reviewers",
    label: "Review inbox is empty",
    detail:
      "No active design branches are available for reviewer assignment, SLA tracking, or merge readiness.",
    recommendation:
      "Create a branch from a named version and set merge intent to review or release candidate before production work.",
    dueDate: null,
    latestAt: null,
    blockerCount: 0,
  };
}

function getBranchReviewInboxCommands() {
  return [
    "Create branches from Versions > Branch from before risky file changes.",
    "Assign branch reviewers on unresolved comments and set due dates before review starts.",
    "Run merge compare and save merge review notes before release candidate approval.",
    "Attach deploy smoke, rollback readiness, and release approval evidence to the release packet.",
  ];
}
