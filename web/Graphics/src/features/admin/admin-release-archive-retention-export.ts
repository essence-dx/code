import type { AdminReleaseArchiveRetentionReport } from "@/features/admin/admin-release-archive-retention";

export function getAdminReleaseArchiveRetentionJson(
  report: AdminReleaseArchiveRetentionReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminReleaseArchiveRetentionCsv(
  report: AdminReleaseArchiveRetentionReport,
) {
  return [
    [
      "package_id",
      "package_label",
      "item_id",
      "kind",
      "status",
      "label",
      "release_label",
      "created_at",
      "retention_until",
      "artifact_count",
      "summary",
      "recommendation",
    ].join(","),
    ...report.packages.flatMap((archivePackage) =>
      archivePackage.items.map((item) =>
        [
          archivePackage.id,
          archivePackage.label,
          item.id,
          item.kind,
          item.status,
          item.label,
          item.releaseLabel,
          item.createdAt,
          item.retentionUntil,
          item.artifactCount,
          item.summary,
          item.recommendation,
        ]
          .map(escapeCsvCell)
          .join(","),
      ),
    ),
    "",
    [
      "package_id",
      "status",
      "score",
      "label",
      "release_label",
      "created_at",
      "retention_until",
      "item_count",
    ].join(","),
    ...report.packages.map((archivePackage) =>
      [
        archivePackage.id,
        archivePackage.status,
        archivePackage.score,
        archivePackage.label,
        archivePackage.releaseLabel,
        archivePackage.createdAt,
        archivePackage.retentionUntil,
        archivePackage.itemCount,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getAdminReleaseArchiveRetentionMarkdown(
  report: AdminReleaseArchiveRetentionReport,
) {
  return [
    "# Release Archive Retention",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Retention days: ${report.retentionDays}`,
    `Packages: ${report.packageCount}`,
    `Items: ${report.itemCount}`,
    `Searchable items: ${report.searchableCount}`,
    "",
    "## Packages",
    "",
    ...report.packages.flatMap((archivePackage) => [
      `### ${archivePackage.label}`,
      "",
      `- Status: ${archivePackage.status}`,
      `- Score: ${archivePackage.score}`,
      `- Release: ${archivePackage.releaseLabel}`,
      `- Retention until: ${archivePackage.retentionUntil}`,
      "",
      ...archivePackage.items.map(
        (item) =>
          `- [${item.status}] ${item.kind} / ${item.label}: ${item.summary} Retain until ${item.retentionUntil}. Recommendation: ${item.recommendation}`,
      ),
      "",
    ]),
    "## Commands",
    "",
    ...report.commands.map((command) => `- ${command}`),
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
