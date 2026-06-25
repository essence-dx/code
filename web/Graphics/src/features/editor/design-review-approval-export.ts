import type {
  DesignReviewApprovalReport,
  DesignReviewApprovalRow,
} from "@/features/editor/design-review-approval-types";

export function getDesignReviewApprovalCsv(
  report: DesignReviewApprovalReport,
  rows: DesignReviewApprovalRow[] = report.rows,
) {
  const header: Array<keyof DesignReviewApprovalRow> = [
    "id",
    "status",
    "category",
    "label",
    "pageName",
    "reviewerName",
    "dueDate",
    "metric",
    "layerIds",
    "commentIds",
    "gateId",
    "detail",
    "recommendation",
  ];

  return [
    [
      "score",
      "status",
      "pages",
      "layers",
      "ready_for_dev_layers",
      "open_comments",
      "assigned_comments",
      "unassigned_comments",
      "missing_due_dates",
      "overdue_comments",
      "due_soon_comments",
      "approvers",
      "blocked_gates",
      "review_gates",
      "evidence",
      "blocked",
      "review",
    ].join(","),
    [
      report.score,
      report.status,
      report.pageCount,
      report.layerCount,
      report.readyForDevLayerCount,
      report.openCommentCount,
      report.assignedCommentCount,
      report.unassignedCommentCount,
      report.missingDueDateCount,
      report.overdueCommentCount,
      report.dueSoonCommentCount,
      report.approverCount,
      report.blockedGateCount,
      report.reviewGateCount,
      report.evidenceCount,
      report.blockedCount,
      report.reviewCount,
    ]
      .map(escapeCsvCell)
      .join(","),
    "",
    header.join(","),
    ...rows.map((row) =>
      header
        .map((key) =>
          escapeCsvCell(
            Array.isArray(row[key]) ? row[key].join("; ") : row[key],
          ),
        )
        .join(","),
    ),
  ].join("\n");
}

export function getDesignReviewApprovalMarkdown(
  report: DesignReviewApprovalReport,
  rows: DesignReviewApprovalRow[] = report.rows,
) {
  return [
    "# Design Review Approval",
    "",
    `Score: ${report.score}`,
    `Status: ${report.status}`,
    `Open comments: ${report.openCommentCount}`,
    `Assigned comments: ${report.assignedCommentCount}`,
    `Unassigned comments: ${report.unassignedCommentCount}`,
    `Missing due dates: ${report.missingDueDateCount}`,
    `Overdue comments: ${report.overdueCommentCount}`,
    `Approvers: ${report.approverCount}`,
    `Blocked gates: ${report.blockedGateCount}`,
    `Review gates: ${report.reviewGateCount}`,
    `Evidence count: ${report.evidenceCount}`,
    "",
    "## Approvers",
    ...(report.approvers.length > 0
      ? report.approvers.map(
          (approver) =>
            `- ${approver.name}${approver.email ? ` <${approver.email}>` : ""}: ${approver.openCommentCount} open, ${approver.overdueCommentCount} overdue, pages ${approver.pageNames.join("; ")}`,
        )
      : ["- No reviewers assigned."]),
    "",
    "## Release Gates",
    ...report.gates.map(
      (gate) =>
        `- [${gate.status}] ${gate.label}: score ${gate.score}, ${gate.blockedCount} blocked, ${gate.reviewCount} review, ${gate.evidenceCount} evidence.`,
    ),
    "",
    "## Approval Queue",
    ...(rows.length > 0
      ? rows.map(
          (row) =>
            `- [${row.status}] ${row.category} / ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
        )
      : ["- No design review approval rows."]),
  ].join("\n");
}

export function getDesignReviewApprovalBundleJson(
  report: DesignReviewApprovalReport,
  rows: DesignReviewApprovalRow[] = report.rows,
) {
  return JSON.stringify(
    {
      type: "essence.design-review-approval",
      version: 1,
      generatedAt: new Date().toISOString(),
      summary: {
        score: report.score,
        status: report.status,
        pages: report.pageCount,
        layers: report.layerCount,
        readyForDevLayers: report.readyForDevLayerCount,
        openComments: report.openCommentCount,
        assignedComments: report.assignedCommentCount,
        unassignedComments: report.unassignedCommentCount,
        missingDueDates: report.missingDueDateCount,
        overdueComments: report.overdueCommentCount,
        dueSoonComments: report.dueSoonCommentCount,
        approvers: report.approverCount,
        blockedGates: report.blockedGateCount,
        reviewGates: report.reviewGateCount,
        evidence: report.evidenceCount,
        blocked: report.blockedCount,
        review: report.reviewCount,
      },
      approvers: report.approvers,
      gates: report.gates,
      rows,
    },
    null,
    2,
  );
}

function escapeCsvCell(
  value: boolean | number | string | null | undefined,
) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
