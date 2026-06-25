import type { AdminDesktopUpdateChannelReport } from "@/features/admin/admin-desktop-update-channel";

export function getAdminDesktopUpdateChannelJson(
  report: AdminDesktopUpdateChannelReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminDesktopUpdateChannelCsv(
  report: AdminDesktopUpdateChannelReport,
) {
  return [
    [
      "package_channel",
      "row_id",
      "status",
      "label",
      "value",
      "artifact_count",
      "detail",
      "recommendation",
    ].join(","),
    ...report.packages.flatMap((updatePackage) =>
      updatePackage.rows.map((row) =>
        [
          updatePackage.channel,
          row.id,
          row.status,
          row.label,
          row.value,
          row.artifactCount,
          row.detail,
          row.recommendation,
        ]
          .map(escapeCsvCell)
          .join(","),
      ),
    ),
    "",
    [
      "channel",
      "status",
      "score",
      "current_version",
      "target_version",
      "minimum_version",
      "rollout_percent",
      "feed_url",
      "hold_active",
      "hold_reason",
    ].join(","),
    ...report.packages.map((updatePackage) =>
      [
        updatePackage.channel,
        updatePackage.status,
        updatePackage.score,
        updatePackage.currentVersion,
        updatePackage.targetVersion,
        updatePackage.minimumVersion,
        updatePackage.rolloutPercent,
        updatePackage.feedUrl,
        updatePackage.hold.active,
        updatePackage.hold.reason,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getAdminDesktopUpdateChannelMarkdown(
  report: AdminDesktopUpdateChannelReport,
) {
  return [
    "# Desktop Update Channel Readiness",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Active channel: ${report.activeChannel}`,
    `Current version: ${report.currentVersion}`,
    `Target version: ${report.targetVersion}`,
    `Minimum version: ${report.minimumVersion}`,
    `Rollout: ${report.rolloutPercent}%`,
    `Hold: ${report.holdActive ? report.holdReason ?? "active" : "none"}`,
    "",
    "## Channels",
    "",
    ...report.packages.flatMap((updatePackage) => [
      `### ${updatePackage.label}`,
      "",
      `- Status: ${updatePackage.status}`,
      `- Score: ${updatePackage.score}`,
      `- Rollout: ${updatePackage.rolloutPercent}%`,
      `- Feed: ${updatePackage.feedUrl ?? "manual package handoff"}`,
      `- Hold: ${updatePackage.hold.active ? updatePackage.hold.reason ?? "active" : "none"}`,
      "",
      ...updatePackage.rows.map(
        (row) =>
          `- [${row.status}] ${row.label} (${row.value}): ${row.detail} Recommendation: ${row.recommendation}`,
      ),
      "",
    ]),
    "## Commands",
    "",
    ...report.commands.map((command) => `- \`${command}\``),
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
