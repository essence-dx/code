import type {
  AdminPublishChannelManagerReport,
  AdminPublishChannelRow,
} from "@/features/admin/admin-publish-channel-manager-types";

export function getAdminPublishChannelManagerJson(
  report: AdminPublishChannelManagerReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminPublishChannelManagerCsv(
  report: AdminPublishChannelManagerReport,
) {
  const header: Array<keyof AdminPublishChannelRow> = [
    "id",
    "channelId",
    "kind",
    "status",
    "category",
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

export function getAdminPublishChannelManagerMarkdown(
  report: AdminPublishChannelManagerReport,
) {
  return [
    "# Publish Channel Manager",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Channels: ${report.channelCount}`,
    `Prototype: ${report.prototypeChannelCount}`,
    `Share: ${report.shareChannelCount}`,
    `Site-style: ${report.siteChannelCount}`,
    `Release: ${report.releaseChannelCount}`,
    `Stale: ${report.staleChannelCount}`,
    `Approvals ready: ${report.approvalReadyCount}`,
    `Rollback linked: ${report.rollbackLinkedCount}`,
    `Smoke blocked: ${report.routeSmokeBlockedCount}`,
    "",
    "## Channels",
    "",
    ...report.channels.map((channel) =>
      [
        `- [${channel.status}] ${channel.label} (${channel.kind})`,
        `  - Target: ${channel.targetUrl}`,
        `  - Smoke: ${channel.routeSmokeStatus} (${channel.routeSmokeLabel})`,
        `  - Approval: ${channel.approvalState}`,
        `  - Rollback: ${channel.rollbackState}`,
        `  - Blockers: ${channel.blockers.length > 0 ? channel.blockers.join("; ") : "none"}`,
        `  - Warnings: ${channel.warnings.length > 0 ? channel.warnings.join("; ") : "none"}`,
        `  - Recommendation: ${channel.recommendation}`,
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
