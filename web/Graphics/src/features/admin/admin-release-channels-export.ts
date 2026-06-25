import type { AdminReleaseChannelsReport } from "@/features/admin/admin-release-channels";

export function getAdminReleaseChannelsJson(report: AdminReleaseChannelsReport) {
  return JSON.stringify(report, null, 2);
}

export function getAdminReleaseChannelsCsv(report: AdminReleaseChannelsReport) {
  return [
    [
      "id",
      "channel",
      "status",
      "label",
      "value",
      "artifact_count",
      "detail",
      "recommendation",
    ].join(","),
    ...report.rows.map((row) =>
      [
        row.id,
        row.channel,
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
    "",
    [
      "channel",
      "package_name",
      "package_version",
      "release_label",
      "status",
      "score",
      "commit_sha",
      "deployment_url",
      "artifacts",
    ].join(","),
    ...report.packages.map((releasePackage) =>
      [
        releasePackage.channel,
        releasePackage.packageName,
        releasePackage.packageVersion,
        releasePackage.releaseLabel,
        releasePackage.status,
        releasePackage.score,
        releasePackage.commitSha,
        releasePackage.deploymentUrl,
        releasePackage.artifacts.length,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
    "",
    ["channel", "kind", "label", "required", "value"].join(","),
    ...report.packages.flatMap((releasePackage) =>
      releasePackage.artifacts.map((artifact) =>
        [
          artifact.channel,
          artifact.kind,
          artifact.label,
          artifact.required,
          artifact.value,
        ]
          .map(escapeCsvCell)
          .join(","),
      ),
    ),
  ].join("\n");
}

export function getAdminReleaseChannelsMarkdown(
  report: AdminReleaseChannelsReport,
) {
  return [
    "# Admin Release Channels",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Channels: ${report.readyChannelCount} ready, ${report.reviewChannelCount} review, ${report.blockedChannelCount} blocked`,
    `Artifacts: ${report.artifactCount}`,
    "",
    "## Packages",
    "",
    ...report.packages.flatMap((releasePackage) => [
      `### ${releasePackage.label}`,
      "",
      `- Package: ${releasePackage.packageName}`,
      `- Version: ${releasePackage.packageVersion}`,
      `- Release: ${releasePackage.releaseLabel}`,
      `- Status: ${releasePackage.status}`,
      `- Score: ${releasePackage.score}`,
      `- Commit: ${releasePackage.commitSha}`,
      `- Deployment: ${releasePackage.deploymentUrl}`,
      "",
      "#### Review Rows",
      "",
      ...releasePackage.rows.map(
        (row) =>
          `- [${row.status}] ${row.label} (${row.value}): ${row.detail} Recommendation: ${row.recommendation}`,
      ),
      "",
      "#### Artifacts",
      "",
      ...releasePackage.artifacts.map(
        (artifact) =>
          `- ${artifact.kind}${artifact.required ? " required" : ""}: ${artifact.label} - ${artifact.value}`,
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
