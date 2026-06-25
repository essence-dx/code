import type {
  AdminBranchReviewInboxReport,
  AdminBranchReviewInboxRow,
} from "@/features/admin/admin-branch-review-inbox";

export function getAdminBranchReviewInboxJson(
  report: AdminBranchReviewInboxReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminBranchReviewInboxCsv(
  report: AdminBranchReviewInboxReport,
) {
  const header: Array<keyof AdminBranchReviewInboxRow> = [
    "id",
    "status",
    "category",
    "branchName",
    "reviewerSummary",
    "label",
    "detail",
    "recommendation",
    "dueDate",
    "latestAt",
    "blockerCount",
  ];

  return [header, ...report.rows.map((row) => header.map((key) => row[key]))]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");
}

export function getAdminBranchReviewInboxMarkdown(
  report: AdminBranchReviewInboxReport,
) {
  return [
    "# Branch Review Request Inbox",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Requests: ${report.requestCount}`,
    `Reviewers: ${report.reviewerCount}`,
    `Overdue: ${report.overdueCount}`,
    `Due soon: ${report.dueSoonCount}`,
    `Merge ready: ${report.mergeReadyCount}`,
    `Blockers: ${report.blockerCount}`,
    `Evidence anchors: ${report.evidenceCount}`,
    "",
    "## Requests",
    "",
    ...report.requests.map((request) =>
      [
        `- [${request.status}] ${request.branchName} (${request.mergeIntent})`,
        `  - Reviewers: ${request.reviewerSummary}`,
        `  - SLA: ${request.slaStatus}${request.dueDate ? ` due ${request.dueDate}` : ""}`,
        `  - Merge readiness: ${request.mergeReadiness}`,
        `  - Blockers: ${request.blockers.length > 0 ? request.blockers.join("; ") : "none"}`,
        `  - Evidence: ${request.evidence.length > 0 ? request.evidence.join(", ") : "none"}`,
        `  - Recommendation: ${request.recommendation}`,
      ].join("\n"),
    ),
    "",
    "## Commands",
    "",
    ...report.commands.map((command) => `- ${command}`),
  ].join("\n");
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? "");

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
