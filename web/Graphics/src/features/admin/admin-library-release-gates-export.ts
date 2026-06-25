import type { AdminLibraryReleaseGateReport } from "@/features/admin/admin-library-release-gates";

export function getAdminLibraryReleaseGateJson(
  report: AdminLibraryReleaseGateReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminLibraryReleaseGateCsv(
  report: AdminLibraryReleaseGateReport,
) {
  return [
    [
      "id",
      "status",
      "category",
      "label",
      "value",
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
        row.value,
        row.target,
        row.detail,
        row.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
    "",
    [
      "file_id",
      "file_name",
      "owner_email",
      "readiness_status",
      "readiness_score",
      "components",
      "token_coverage",
      "pending_updates",
      "detached_instances",
    ].join(","),
    ...report.files.map((file) =>
      [
        file.fileId,
        file.fileName,
        file.ownerEmail,
        file.readinessStatus,
        file.readinessScore,
        file.componentCount,
        file.tokenCoveragePercent,
        file.pendingUpdateInstanceCount,
        file.detachedInstanceCount,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getAdminLibraryReleaseGateMarkdown(
  report: AdminLibraryReleaseGateReport,
) {
  return [
    "# Organization Library Release Gates",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Can release: ${report.canRelease ? "yes" : "no"}`,
    `Gates: ${report.readyCount} ready, ${report.reviewCount} review, ${report.blockedCount} blocked`,
    "",
    "## Signals",
    "",
    `- Library files: ${report.componentFileCount}`,
    `- Components: ${report.componentCount}`,
    `- Token coverage: ${report.tokenCoveragePercent}%`,
    `- Release approval snapshots: ${report.releaseApprovalCount}`,
    `- Latest approval: ${report.latestReleaseApprovalAt ?? "none"}`,
    `- Rollback score: ${report.rollbackScore}`,
    "",
    "## Gate Rows",
    "",
    ...report.rows.map(
      (row) =>
        `- [${row.status}] ${row.label} (${row.value}): ${row.detail} Recommendation: ${row.recommendation}`,
    ),
    "",
    "## Library Files",
    "",
    ...(report.files.length > 0
      ? report.files.map(
          (file) =>
            `- [${file.readinessStatus}] ${file.fileName}: readiness ${file.readinessScore}, ${file.componentCount} components, token coverage ${file.tokenCoveragePercent}%`,
        )
      : ["- No component library files were found."]),
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
