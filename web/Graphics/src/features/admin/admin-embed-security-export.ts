import type { AdminEmbedSecurityReport } from "@/features/admin/admin-embed-security";

export function getAdminEmbedSecurityJson(report: AdminEmbedSecurityReport) {
  return JSON.stringify(report, null, 2);
}

export function getAdminEmbedSecurityCsv(report: AdminEmbedSecurityReport) {
  const rows = [
    [
      "target_id",
      "status",
      "file",
      "owner",
      "frame_policy",
      "sandbox_preset",
      "allowed_origins",
      "observed_origins",
      "blocked_origins",
      "events",
      "last_7d",
      "latest_at",
      "recommendation",
    ],
    ...report.targets.map((target) => [
      target.id,
      target.status,
      target.fileName,
      target.ownerEmail,
      target.framePolicy,
      target.sandboxPreset,
      target.allowedOrigins.join("; "),
      target.observedOrigins.join("; "),
      target.blockedObservedOrigins.join("; "),
      target.eventCount,
      target.last7dCount,
      target.latestAt ?? "",
      target.recommendation,
    ]),
  ];

  return rows
    .map((row) => row.map((value) => csvEscape(String(value))).join(","))
    .join("\n");
}

export function getAdminEmbedSecurityMarkdown(
  report: AdminEmbedSecurityReport,
) {
  return [
    "# Embed Security",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    "",
    "## Metrics",
    "",
    `- Embed shares: ${report.embedShareCount}`,
    `- Configured allowlists: ${report.configuredAllowlistCount}`,
    `- Allowlist policies: ${report.allowlistPolicyCount}`,
    `- Self policies: ${report.selfPolicyCount}`,
    `- Blocked observed origins: ${report.blockedObservedOriginCount}`,
    `- Missing host evidence: ${report.missingHostEvidenceCount}`,
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
  ].join("\n");
}

function csvEscape(value: string) {
  if (!/[",\n]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}
