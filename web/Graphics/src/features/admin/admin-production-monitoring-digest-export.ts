import type { AdminProductionMonitoringDigest } from "@/features/admin/admin-production-monitoring-digest";

export function getAdminProductionMonitoringDigestJson(
  digest: AdminProductionMonitoringDigest,
) {
  return JSON.stringify(digest, null, 2);
}

export function getAdminProductionMonitoringDigestCsv(
  digest: AdminProductionMonitoringDigest,
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
    ...digest.rows.map((row) =>
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
    ["action_id", "actor_email", "action", "target", "created_at"].join(","),
    ...digest.recentActions.map((action) =>
      [
        action.id,
        action.actorEmail,
        action.action,
        action.targetLabel,
        action.createdAt,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getAdminProductionMonitoringDigestMarkdown(
  digest: AdminProductionMonitoringDigest,
) {
  return [
    "# Production Monitoring Digest",
    "",
    `Generated: ${digest.generatedAt}`,
    `Status: ${digest.status}`,
    `Score: ${digest.score}`,
    `Rows: ${digest.readyCount} ready, ${digest.reviewCount} review, ${digest.blockedCount} blocked`,
    "",
    "## Signals",
    "",
    `- Deploy smoke score: ${digest.deploySmokeScore}`,
    `- Runtime score: ${digest.runtimeScore}`,
    `- Runtime errors: ${digest.runtimeErrorCount}`,
    `- Runtime warnings: ${digest.runtimeWarningCount}`,
    `- Failed auth attempts: ${digest.failedAuthAttemptCount}`,
    `- Failed email deliveries: ${digest.failedEmailDeliveryCount}`,
    `- Rollback score: ${digest.rollbackScore}`,
    `- Recent admin actions: ${digest.recentAdminActionCount}`,
    `- High-impact admin actions: ${digest.highImpactAdminActionCount}`,
    "",
    "## Review Rows",
    "",
    ...digest.rows.map(
      (row) =>
        `- [${row.status}] ${row.label} (${row.value}): ${row.detail} Recommendation: ${row.recommendation}`,
    ),
    "",
    "## Recent Admin Actions",
    "",
    ...(digest.recentActions.length > 0
      ? digest.recentActions.map(
          (action) =>
            `- ${action.createdAt}: ${action.actorEmail} ${action.action} on ${action.targetLabel}`,
        )
      : ["- No recent admin actions loaded."]),
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
