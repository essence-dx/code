import type {
  AdminPublicLinkObservabilityReport,
  AdminPublicLinkObservabilityRow,
} from "@/features/admin/admin-public-link-observability";

export function getAdminPublicLinkObservabilityJson(
  report: AdminPublicLinkObservabilityReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminPublicLinkObservabilityCsv(
  report: AdminPublicLinkObservabilityReport,
) {
  const header: Array<keyof AdminPublicLinkObservabilityRow> = [
    "id",
    "surfaceId",
    "category",
    "status",
    "label",
    "targetUrl",
    "detail",
    "recommendation",
    "latestAt",
  ];

  return [header, ...report.rows.map((row) => header.map((key) => row[key]))]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");
}

export function getAdminPublicLinkObservabilityMarkdown(
  report: AdminPublicLinkObservabilityReport,
) {
  return [
    "# Public Link Observability",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Active shares: ${report.activeShareCount}`,
    `Public surfaces: ${report.surfaceCount}`,
    `Embed surfaces: ${report.embedSurfaceCount}`,
    `Prototype surfaces: ${report.prototypeSurfaceCount}`,
    `Stale links: ${report.staleLinkCount}`,
    `No-expiry links: ${report.noExpiryCount}`,
    `Download exposure: ${report.downloadExposureCount}`,
    `Comment exposure: ${report.commentExposureCount}`,
    `Missing referrer notes: ${report.missingReferrerNoteCount}`,
    `Release-safe surfaces: ${report.releaseSafeCount}`,
    "",
    "## Surfaces",
    "",
    ...report.surfaces.map((surface) =>
      [
        `- [${surface.status}] ${surface.label}`,
        `  - Kind: ${surface.kind}`,
        `  - Target: ${surface.targetUrl}`,
        `  - Smoke: ${surface.smokeStatus} (${surface.smokeLabel})`,
        `  - Expiry: ${surface.expiryState}`,
        `  - Referrer: ${surface.referrerNote ?? "missing"}`,
        `  - Release safe: ${surface.releaseSafe ? "yes" : "no"}`,
        `  - Blockers: ${surface.blockers.length > 0 ? surface.blockers.join("; ") : "none"}`,
        `  - Warnings: ${surface.warnings.length > 0 ? surface.warnings.join("; ") : "none"}`,
      ].join("\n"),
    ),
    "",
    "## Review Queue",
    "",
    ...report.rows.map((row) =>
      [
        `- [${row.status}] ${row.label}`,
        `  - Category: ${row.category}`,
        `  - Target: ${row.targetUrl}`,
        `  - Detail: ${row.detail}`,
        `  - Recommendation: ${row.recommendation}`,
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
