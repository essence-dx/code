import type { AdminPluginPermissionGovernanceReport } from "@/features/admin/admin-plugin-permission-governance";

export function getAdminPluginPermissionGovernanceJson(
  report: AdminPluginPermissionGovernanceReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminPluginPermissionGovernanceCsv(
  report: AdminPluginPermissionGovernanceReport,
) {
  return [
    [
      "id",
      "status",
      "kind",
      "label",
      "value",
      "latest_at",
      "target",
      "detail",
      "recommendation",
    ].join(","),
    ...report.rows.map((row) =>
      [
        row.id,
        row.status,
        row.kind,
        row.label,
        row.value,
        row.latestAt,
        row.target,
        row.detail,
        row.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
    "",
    [
      "activity_id",
      "file_id",
      "file_name",
      "owner_email",
      "actor_name",
      "actor_email",
      "label",
      "detail",
      "created_at",
    ].join(","),
    ...report.activities.map((activity) =>
      [
        activity.id,
        activity.fileId,
        activity.fileName,
        activity.ownerEmail,
        activity.actorName,
        activity.actorEmail,
        activity.label,
        activity.detail,
        activity.createdAt,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getAdminPluginPermissionGovernanceMarkdown(
  report: AdminPluginPermissionGovernanceReport,
) {
  return [
    "# Plugin Permission Governance",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Rows: ${report.readyCount} ready, ${report.reviewCount} review, ${report.blockedCount} blocked`,
    "",
    "## Signals",
    "",
    `- Installed extensions: ${report.manifestCount}`,
    `- Permissions: ${report.permissionCount}`,
    `- Write permissions: ${report.writePermissionCount}`,
    `- Grant activity: ${report.grantActivityCount}`,
    `- Run activity: ${report.runActivityCount}`,
    `- Stale approvals: ${report.staleApprovalCount}`,
    `- Risky write activity: ${report.riskyWriteActivityCount}`,
    `- Unknown activity: ${report.unknownActivityCount}`,
    "",
    "## Review Rows",
    "",
    ...report.rows.map(
      (row) =>
        `- [${row.status}] ${row.label} (${row.value}): ${row.detail} Recommendation: ${row.recommendation}`,
    ),
    "",
    "## Recent Extension Activity",
    "",
    ...(report.activities.length > 0
      ? report.activities.map(
          (activity) =>
            `- ${activity.createdAt}: ${activity.actorName} ${activity.label} in ${activity.fileName}`,
        )
      : ["- No extension activity loaded."]),
  ].join("\n");
}

function escapeCsvCell(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
