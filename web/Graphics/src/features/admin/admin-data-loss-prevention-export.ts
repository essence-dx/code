import type {
  AdminDataLossPreventionReport,
  AdminDataLossPreventionRow,
  AdminDataLossPreventionWorkflow,
} from "@/features/admin/admin-data-loss-prevention";

export function getAdminDataLossPreventionJson(
  report: AdminDataLossPreventionReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminDataLossPreventionCsv(
  report: AdminDataLossPreventionReport,
) {
  const rowHeader: Array<keyof AdminDataLossPreventionRow> = [
    "id",
    "category",
    "status",
    "label",
    "value",
    "detail",
    "recommendation",
    "workflow",
    "latestAt",
  ];
  const workflowHeader: Array<keyof AdminDataLossPreventionWorkflow> = [
    "id",
    "status",
    "title",
    "scope",
    "owner",
    "evidence",
    "action",
  ];

  return [
    [
      "generated_at",
      "status",
      "score",
      "active_files",
      "sensitive_findings",
      "sensitive_files",
      "export_events",
      "sensitive_export_events",
      "download_exposure",
      "embed_review",
      "plugin_risk",
      "public_route_risk",
      "support_bundle_sensitive",
    ].join(","),
    [
      report.generatedAt,
      report.status,
      report.score,
      report.activeFileCount,
      report.sensitiveFindingCount,
      report.sensitiveFileCount,
      report.exportEventCount,
      report.sensitiveExportEventCount,
      report.downloadExposureCount,
      report.embedReviewCount,
      report.pluginRiskCount,
      report.publicRouteRiskCount,
      report.supportBundleSensitiveCount,
    ]
      .map(escapeCsvCell)
      .join(","),
    "",
    ["section", ...rowHeader].join(","),
    ...report.rows.map((row) =>
      ["row", ...rowHeader.map((key) => row[key])]
        .map(escapeCsvCell)
        .join(","),
    ),
    "",
    ["section", ...workflowHeader].join(","),
    ...report.workflows.map((workflow) =>
      ["workflow", ...workflowHeader.map((key) => workflow[key])]
        .map(escapeCsvCell)
        .join(","),
    ),
    "",
    ["command"].join(","),
    ...report.commands.map((command) =>
      [command].map(escapeCsvCell).join(","),
    ),
  ].join("\n");
}

export function getAdminDataLossPreventionMarkdown(
  report: AdminDataLossPreventionReport,
) {
  return [
    "# Data-Loss Prevention",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Rows: ${report.readyCount} ready, ${report.reviewCount} review, ${report.blockedCount} blocked`,
    "",
    "## Signals",
    "",
    `- Active files: ${report.activeFileCount}`,
    `- Sensitive findings: ${report.sensitiveFindingCount}`,
    `- Sensitive files: ${report.sensitiveFileCount}`,
    `- Export events: ${report.exportEventCount}`,
    `- Sensitive export events: ${report.sensitiveExportEventCount}`,
    `- Public download exposure: ${report.downloadExposureCount}`,
    `- Embed review signals: ${report.embedReviewCount}`,
    `- Plugin risk signals: ${report.pluginRiskCount}`,
    `- Public route risk signals: ${report.publicRouteRiskCount}`,
    `- Support bundle sensitive records: ${report.supportBundleSensitiveCount}`,
    "",
    "## Review Rows",
    "",
    ...report.rows.map((row) =>
      [
        `- [${row.status}] ${row.label}`,
        `  - Category: ${row.category}`,
        `  - Value: ${row.value}`,
        `  - Detail: ${row.detail}`,
        `  - Workflow: ${row.workflow}`,
        `  - Recommendation: ${row.recommendation}`,
      ].join("\n"),
    ),
    "",
    "## Workflows",
    "",
    ...report.workflows.map((workflow) =>
      [
        `- [${workflow.status}] ${workflow.title}`,
        `  - Scope: ${workflow.scope}`,
        `  - Owner: ${workflow.owner}`,
        `  - Evidence: ${workflow.evidence}`,
        `  - Action: ${workflow.action}`,
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
