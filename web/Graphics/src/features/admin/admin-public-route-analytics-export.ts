import type { AdminPublicRouteAnalyticsReport } from "@/features/admin/admin-public-route-analytics";

export function getAdminPublicRouteAnalyticsJson(
  report: AdminPublicRouteAnalyticsReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminPublicRouteAnalyticsCsv(
  report: AdminPublicRouteAnalyticsReport,
) {
  const rows = [
    [
      "route_id",
      "status",
      "file",
      "owner",
      "kind",
      "events",
      "last_24h",
      "last_7d",
      "token_scope",
      "referrer_kinds",
      "referrer_origins",
      "user_agents",
      "hosts",
      "latest_at",
      "retention_expires_at",
      "recommendation",
    ],
    ...report.routes.map((route) => [
      route.id,
      route.status,
      route.fileName,
      route.ownerEmail,
      route.routeKind,
      route.eventCount,
      route.last24hCount,
      route.last7dCount,
      route.tokenScope,
      route.referrerKinds.join("; "),
      route.referrerOrigins.join("; "),
      route.userAgentFamilies.join("; "),
      route.hostnames.join("; "),
      route.latestAt ?? "",
      route.earliestRetentionExpiresAt ?? "",
      route.recommendation,
    ]),
  ];

  return rows
    .map((row) => row.map((value) => csvEscape(String(value))).join(","))
    .join("\n");
}

export function getAdminPublicRouteAnalyticsMarkdown(
  report: AdminPublicRouteAnalyticsReport,
) {
  const lines = [
    "# Public Route Analytics",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Storage available: ${report.storageAvailable ? "yes" : "no"}`,
    `Retention: ${report.retentionDays} days`,
    "",
    "## Metrics",
    "",
    `- Active shares: ${report.activeShareCount}`,
    `- Routes: ${report.routeCount}`,
    `- Retained events: ${report.eventCount}`,
    `- Last 24h events: ${report.last24hEventCount}`,
    `- Last 7d events: ${report.last7dEventCount}`,
    `- External referrers: ${report.externalReferrerCount}`,
    `- Bot events: ${report.botEventCount}`,
    `- Missing coverage: ${report.missingCoverageCount}`,
    `- Retention expired: ${report.retentionExpiredCount}`,
    "",
    "## Review Queue",
    "",
    ...report.rows.slice(0, 20).map((row) =>
      [
        `- [${row.status}] ${row.label}`,
        `  - Detail: ${row.detail}`,
        `  - Recommendation: ${row.recommendation}`,
      ].join("\n"),
    ),
    "",
    "## Commands",
    "",
    ...report.commands.map((command) => `- ${command}`),
  ];

  return lines.join("\n");
}

function csvEscape(value: string) {
  if (!/[",\n]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}
