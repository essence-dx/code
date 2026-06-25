import type {
  ScopedPublicationApprovalReport,
  ScopedPublicationApprovalRow,
  ScopedPublicationApprovalScope,
} from "@/features/admin/admin-scoped-publication-approvals";

export function getScopedPublicationApprovalJson(
  report: ScopedPublicationApprovalReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getScopedPublicationApprovalCsv(
  report: ScopedPublicationApprovalReport,
) {
  const scopeHeader: Array<keyof ScopedPublicationApprovalScope> = [
    "scopeKey",
    "teamName",
    "projectName",
    "status",
    "approvalState",
    "reviewerSummary",
    "slaStatus",
    "slaDueAt",
    "fileCount",
    "channelCount",
    "readyChannelCount",
    "blockedChannelCount",
    "rollbackAnchorCount",
    "branchRequestCount",
    "branchBlockerCount",
    "releaseEvidenceDiffCount",
    "latestActivityAt",
    "recommendation",
  ];
  const rowHeader: Array<keyof ScopedPublicationApprovalRow> = [
    "id",
    "scopeKey",
    "teamName",
    "projectName",
    "category",
    "status",
    "label",
    "value",
    "detail",
    "recommendation",
    "latestAt",
  ];

  return [
    ["section", ...scopeHeader],
    ...report.scopes.map((scope) => [
      "scope",
      ...scopeHeader.map((key) => scope[key]),
    ]),
    [],
    ["section", ...rowHeader],
    ...report.rows.map((row) => ["row", ...rowHeader.map((key) => row[key])]),
  ]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");
}

export function getScopedPublicationApprovalMarkdown(
  report: ScopedPublicationApprovalReport,
) {
  return [
    "# Scoped Publication Approvals",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Scopes: ${report.scopeCount}`,
    `Approved scopes: ${report.approvedScopeCount}`,
    `Missing approvals: ${report.missingApprovalCount}`,
    `Stale approvals: ${report.staleApprovalCount}`,
    `Overdue scopes: ${report.overdueScopeCount}`,
    `Release evidence diffs: ${report.releaseEvidenceDiffCount}`,
    "",
    "## Scopes",
    "",
    ...report.scopes.map((scope) =>
      [
        `- [${scope.status}] ${scope.scopeKey}`,
        `  - Approval: ${scope.approvalState}`,
        `  - Reviewer: ${scope.reviewerSummary}`,
        `  - SLA: ${scope.slaStatus}${scope.slaDueAt ? ` due ${scope.slaDueAt}` : ""}`,
        `  - Channels: ${scope.readyChannelCount}/${scope.channelCount}`,
        `  - Rollback anchors: ${scope.rollbackAnchorCount}`,
        `  - Evidence diffs: ${scope.releaseEvidenceDiffCount}`,
        `  - Recommendation: ${scope.recommendation}`,
      ].join("\n"),
    ),
    "",
    "## Commands",
    "",
    ...report.commands.map((command) => `- ${command}`),
  ].join("\n");
}

function escapeCsvCell(value: unknown) {
  const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
