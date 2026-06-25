import type { AdminSelfHostedBackupReadinessReport } from "@/features/admin/admin-self-hosted-backup-readiness";

export function getAdminSelfHostedBackupReadinessJson(
  report: AdminSelfHostedBackupReadinessReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminSelfHostedBackupReadinessCsv(
  report: AdminSelfHostedBackupReadinessReport,
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
      "database_kind",
      "database_configured",
      "database_auth_ready",
      "backup_schedule_configured",
      "backup_target_configured",
      "backup_command_configured",
      "version_anchors",
      "files_without_versions",
      "active_shares",
      "stale_shares",
      "elevated_shares",
      "release_approvals",
      "deploy_smoke_score",
      "rollback_score",
    ].join(","),
    [
      report.databaseKind,
      report.databaseConfigured,
      report.databaseAuthReady,
      report.backupScheduleConfigured,
      report.backupTargetConfigured,
      report.backupCommandConfigured,
      report.versionAnchorCount,
      report.filesWithoutVersions,
      report.activeShareCount,
      report.staleShareCount,
      report.elevatedShareCount,
      report.releaseApprovalCount,
      report.deploySmokeScore,
      report.rollbackScore,
    ]
      .map(escapeCsvCell)
      .join(","),
    "",
    ["command"].join(","),
    ...report.commands.map((command) => [command].map(escapeCsvCell).join(",")),
  ].join("\n");
}

export function getAdminSelfHostedBackupReadinessMarkdown(
  report: AdminSelfHostedBackupReadinessReport,
) {
  return [
    "# Self-Hosted Backup Readiness",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Rows: ${report.readyCount} ready, ${report.reviewCount} review, ${report.blockedCount} blocked`,
    "",
    "## Signals",
    "",
    `- Database: ${report.databaseKind}`,
    `- Database configured: ${formatBoolean(report.databaseConfigured)}`,
    `- Database auth ready: ${formatBoolean(report.databaseAuthReady)}`,
    `- Backup schedule configured: ${formatBoolean(report.backupScheduleConfigured)}`,
    `- Backup target configured: ${formatBoolean(report.backupTargetConfigured)}`,
    `- Backup command configured: ${formatBoolean(report.backupCommandConfigured)}`,
    `- Version anchors: ${report.versionAnchorCount}`,
    `- Files without versions: ${report.filesWithoutVersions}`,
    `- Active shares: ${report.activeShareCount}`,
    `- Stale shares: ${report.staleShareCount}`,
    `- Elevated shares: ${report.elevatedShareCount}`,
    `- Release approvals: ${report.releaseApprovalCount}`,
    `- Deploy smoke score: ${report.deploySmokeScore}`,
    `- Rollback score: ${report.rollbackScore}`,
    "",
    "## Commands",
    "",
    ...report.commands.map((command) => `- \`${command}\``),
    "",
    "## Review Rows",
    "",
    ...report.rows.map(
      (row) =>
        `- [${row.status}] ${row.label} (${row.value}): ${row.detail} Recommendation: ${row.recommendation}`,
    ),
  ].join("\n");
}

function formatBoolean(value: boolean) {
  return value ? "yes" : "no";
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
