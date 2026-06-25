import type {
  AdminLiveReviewActionItem,
  AdminLiveReviewAgendaItem,
  AdminLiveReviewMinuteItem,
  AdminLiveReviewSession,
  AdminLiveReviewSessionRow,
  AdminLiveReviewSessionsReport,
} from "@/features/admin/admin-live-review-sessions-types";

export function getAdminLiveReviewSessionsJson(
  report: AdminLiveReviewSessionsReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminLiveReviewSessionsCsv(
  report: AdminLiveReviewSessionsReport,
) {
  const rowHeader: Array<keyof AdminLiveReviewSessionRow> = [
    "id",
    "category",
    "status",
    "label",
    "value",
    "detail",
    "recommendation",
    "count",
    "target",
    "latestAt",
  ];
  const sessionHeader: Array<keyof AdminLiveReviewSession> = [
    "id",
    "status",
    "fileName",
    "branchName",
    "ownerRef",
    "reviewerCount",
    "openCommentCount",
    "approvalScopeCount",
    "publicShareCount",
    "agendaItemCount",
    "minutesItemCount",
    "actionItemCount",
    "blockerCount",
    "latestAt",
    "recommendation",
  ];
  const agendaHeader: Array<keyof AdminLiveReviewAgendaItem> = [
    "id",
    "sessionId",
    "category",
    "status",
    "label",
    "detail",
    "ownerRef",
    "dueAt",
    "linkedId",
  ];
  const minuteHeader: Array<keyof AdminLiveReviewMinuteItem> = [
    "id",
    "sessionId",
    "category",
    "status",
    "label",
    "detail",
    "ownerRef",
    "createdAt",
    "linkedId",
  ];
  const actionHeader: Array<keyof AdminLiveReviewActionItem> = [
    "id",
    "sessionId",
    "source",
    "status",
    "label",
    "detail",
    "ownerRef",
    "dueAt",
    "linkedId",
  ];

  return [
    ["section", ...rowHeader].join(","),
    ...report.rows.map((row) =>
      ["review-row", ...rowHeader.map((key) => row[key])]
        .map((value) => escapeCsvCell(redactSensitive(String(value ?? ""))))
        .join(","),
    ),
    ["section", ...sessionHeader].join(","),
    ...report.sessions.map((session) =>
      ["session", ...sessionHeader.map((key) => session[key])]
        .map((value) => escapeCsvCell(redactSensitive(String(value ?? ""))))
        .join(","),
    ),
    ["section", ...agendaHeader].join(","),
    ...report.agendaItems.map((item) =>
      ["agenda", ...agendaHeader.map((key) => item[key])]
        .map((value) => escapeCsvCell(redactSensitive(String(value ?? ""))))
        .join(","),
    ),
    ["section", ...minuteHeader].join(","),
    ...report.minutes.map((item) =>
      ["minutes", ...minuteHeader.map((key) => item[key])]
        .map((value) => escapeCsvCell(redactSensitive(String(value ?? ""))))
        .join(","),
    ),
    ["section", ...actionHeader].join(","),
    ...report.actionItems.map((item) =>
      ["action-item", ...actionHeader.map((key) => item[key])]
        .map((value) => escapeCsvCell(redactSensitive(String(value ?? ""))))
        .join(","),
    ),
  ].join("\n");
}

export function getAdminLiveReviewSessionsMarkdown(
  report: AdminLiveReviewSessionsReport,
) {
  return [
    "# Live Review Sessions",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Sessions: ${report.sessionCount}`,
    `Agenda items: ${report.agendaItemCount}`,
    `Minutes: ${report.minutesItemCount}`,
    `action items: ${report.actionItemCount}`,
    `Branches: ${report.linkedBranchCount}`,
    `Comments: ${report.linkedCommentCount}`,
    `Approvals: ${report.linkedApprovalCount}`,
    `Public shares: ${report.linkedPublicShareCount}`,
    "",
    "## Review Rows",
    "",
    ...report.rows.map((row) =>
      [
        `- [${row.status}] ${row.label}`,
        `  - Category: ${row.category}`,
        `  - Value: ${row.value}`,
        `  - Detail: ${row.detail}`,
        `  - Target: ${row.target ?? "none"}`,
        `  - Recommendation: ${row.recommendation}`,
      ].join("\n"),
    ),
    "",
    "## Sessions",
    "",
    ...report.sessions.map((session) =>
      [
        `- [${session.status}] ${session.fileName} / ${session.branchName}`,
        `  - Owner: ${session.ownerRef}`,
        `  - Agenda: ${session.agendaItemCount}`,
        `  - Minutes: ${session.minutesItemCount}`,
        `  - Action items: ${session.actionItemCount}`,
        `  - Public shares: ${session.publicShareCount}`,
        `  - Recommendation: ${session.recommendation}`,
      ].join("\n"),
    ),
    "",
    "## Agenda",
    "",
    ...report.agendaItems.map((item) =>
      [
        `- [${item.status}] ${item.label}`,
        `  - Category: ${item.category}`,
        `  - Owner: ${item.ownerRef}`,
        `  - Detail: ${item.detail}`,
      ].join("\n"),
    ),
    "",
    "## Minutes",
    "",
    ...report.minutes.map((item) =>
      [
        `- [${item.status}] ${item.label}`,
        `  - Category: ${item.category}`,
        `  - Owner: ${item.ownerRef}`,
        `  - Detail: ${item.detail}`,
      ].join("\n"),
    ),
    "",
    "## Action Items",
    "",
    ...report.actionItems.map((item) =>
      [
        `- [${item.status}] ${item.label}`,
        `  - Source: ${item.source}`,
        `  - Owner: ${item.ownerRef}`,
        `  - Detail: ${item.detail}`,
      ].join("\n"),
    ),
    "",
    "## Commands",
    "",
    ...report.commands.map((command) => `- \`${command}\``),
  ]
    .map(redactSensitive)
    .join("\n");
}

function redactSensitive(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\b[A-Za-z0-9_-]*(?:secret|token)[A-Za-z0-9_-]*\b/gi, "[redacted-token]")
    .replace(/\/share\/[A-Za-z0-9_-]+/g, "/share/[redacted-token]");
}

function escapeCsvCell(value: string) {
  if (!/[",\n\r]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}
