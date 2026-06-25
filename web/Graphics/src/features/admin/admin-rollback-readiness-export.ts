import type { AdminRollbackReadinessReport } from "@/features/admin/admin-rollback-readiness";

export function getAdminRollbackReadinessJson(
  report: AdminRollbackReadinessReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminRollbackReadinessCsv(
  report: AdminRollbackReadinessReport,
) {
  return [
    [
      "id",
      "status",
      "category",
      "label",
      "count",
      "target",
      "detail",
      "recommendation",
    ].join(","),
    ...report.rows.map((row) =>
      [
        row.id,
        row.status,
        row.category,
        row.label,
        row.count,
        row.target,
        row.detail,
        row.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getAdminRollbackReadinessMarkdown(
  report: AdminRollbackReadinessReport,
) {
  return [
    "# Restore And Rollback Readiness",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Rows: ${report.readyCount} ready, ${report.reviewCount} review, ${report.blockedCount} blocked`,
    "",
    "## Signals",
    "",
    `- Version anchors: ${report.versionAnchorCount}`,
    `- Files without versions: ${report.filesWithoutVersions}`,
    `- Stale shares: ${report.staleShareCount}`,
    `- Elevated shares: ${report.elevatedShareCount}`,
    `- Share audit events: ${report.shareAuditEventCount}`,
    `- Deployment links: ${report.deploymentLinkCount}`,
    "",
    "## Database State",
    "",
    `- Kind: ${report.database.databaseKind}`,
    `- Configured: ${report.database.configured}`,
    `- Auth token configured: ${report.database.authTokenConfigured}`,
    `- Users: ${report.database.users}`,
    `- Sessions: ${report.database.sessions}`,
    `- Accounts: ${report.database.accounts}`,
    `- Active files: ${report.database.activeFiles}`,
    `- Active shares: ${report.database.activeShares}`,
    `- Versions: ${report.database.versions}`,
    "",
    "## Deployment Links",
    "",
    ...(report.deploymentUrls.length > 0
      ? report.deploymentUrls.map((url) => `- ${url}`)
      : ["- No deployment links configured."]),
    "",
    "## Latest Versions",
    "",
    ...(report.latestVersions.length > 0
      ? report.latestVersions.map(
          (version) =>
            `- ${version.fileName}: ${version.versionName} (${version.createdAt})`,
        )
      : ["- No recent versions loaded."]),
    "",
    "## Readiness Rows",
    "",
    ...report.rows.map(
      (row) =>
        `- [${row.status}] ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
    ),
  ].join("\n");
}

function escapeCsvCell(value: boolean | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
